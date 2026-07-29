-- TASK-PRO-001: product and product category schema and RLS.
--
-- This migration adds the product data foundation for CoreOps: product categories,
-- products, tenant-scoped RLS, cross-tenant integrity constraints, immutability triggers,
-- and an audited database-only archive RPC.

create or replace function public.current_user_can_read_products(
  checked_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and memberships.role in ('owner', 'admin', 'staff', 'viewer', 'technician')
  );
$$;

create or replace function public.current_user_can_manage_products(
  checked_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and memberships.role in ('owner', 'admin', 'staff')
  );
$$;

create or replace function public.current_user_can_archive_products(
  checked_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and memberships.role in ('owner', 'admin')
  );
$$;

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  parent_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_categories_name_not_blank check (length(btrim(name)) > 0),
  constraint product_categories_name_length check (length(name) <= 100),
  constraint product_categories_organization_id_id_unique unique (organization_id, id),
  constraint product_categories_parent_org_fkey foreign key (organization_id, parent_id)
    references public.product_categories (organization_id, id)
    on delete restrict
);

create unique index product_categories_organization_lower_name_unique_idx
  on public.product_categories (organization_id, lower(name));

create index product_categories_organization_name_idx
  on public.product_categories (organization_id, name);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  product_type text not null,
  name text not null,
  sku text null,
  category_id uuid null,
  unit text not null,
  description text null,
  cost_price numeric(18,2) not null default 0.00,
  selling_price numeric(18,2) not null default 0.00,
  track_inventory boolean not null default true,
  minimum_stock numeric(18,3) null,
  is_active boolean not null default true,
  image_path text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,

  constraint products_product_type_valid check (
    product_type in ('goods', 'service')
  ),
  constraint products_name_not_blank check (length(btrim(name)) > 0),
  constraint products_name_length check (length(name) <= 200),
  constraint products_unit_not_blank check (length(btrim(unit)) > 0),
  constraint products_unit_length check (length(unit) <= 30),
  constraint products_description_length check (
    description is null or length(description) <= 5000
  ),
  constraint products_cost_price_non_negative check (cost_price >= 0),
  constraint products_selling_price_non_negative check (selling_price >= 0),
  constraint products_minimum_stock_non_negative check (
    minimum_stock is null or minimum_stock >= 0
  ),
  constraint products_organization_id_id_unique unique (organization_id, id),
  constraint products_category_org_fkey foreign key (organization_id, category_id)
    references public.product_categories (organization_id, id)
    on delete restrict
);

create unique index products_organization_lower_sku_unique_idx
  on public.products (organization_id, lower(sku))
  where sku is not null;

create index products_organization_name_idx
  on public.products (organization_id, name);

create index products_organization_sku_idx
  on public.products (organization_id, sku);

create index products_organization_category_idx
  on public.products (organization_id, category_id);

create index products_organization_is_active_idx
  on public.products (organization_id, is_active);

create trigger product_categories_set_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.prevent_product_categories_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'product_categories.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'product_categories.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'product_categories.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_categories_prevent_immutable_update
before update on public.product_categories
for each row execute function public.prevent_product_categories_immutable_update();

create or replace function public.prevent_products_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'products.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'products.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_by <> old.created_by then
    raise exception 'products.created_by cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'products.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger products_prevent_immutable_update
before update on public.products
for each row execute function public.prevent_products_immutable_update();

create or replace function public.archive_product(target_product_id uuid)
returns table (
  product_id uuid,
  organization_id uuid,
  is_active boolean,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  target_product public.products;
  saved_product public.products;
begin
  if authenticated_user_id is null then
    raise exception 'product authentication required' using errcode = '42501';
  end if;

  select *
    into target_product
  from public.products products
  where products.id = target_product_id
  for update;

  if not found then
    raise exception 'product not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_archive_products(target_product.organization_id) then
    raise exception 'product permission denied' using errcode = '42501';
  end if;

  if not target_product.is_active or target_product.archived_at is not null then
    raise exception 'product already archived' using errcode = 'P0001';
  end if;

  update public.products products
  set is_active = false,
    archived_at = now()
  where products.id = target_product.id
  returning * into saved_product;

  perform public.record_organization_audit_event(
    saved_product.organization_id,
    authenticated_user_id,
    'product.archived',
    'product',
    saved_product.id,
    jsonb_build_object('is_active', target_product.is_active),
    jsonb_build_object(
      'is_active', saved_product.is_active,
      'archived_at', saved_product.archived_at
    ),
    '{}'::jsonb
  );

  return query select
    saved_product.id,
    saved_product.organization_id,
    saved_product.is_active,
    saved_product.archived_at;
end;
$$;

alter table public.product_categories enable row level security;
alter table public.products enable row level security;

create policy product_categories_select_readers
on public.product_categories
for select
to authenticated
using (public.current_user_can_read_products(organization_id));

create policy product_categories_insert_managers
on public.product_categories
for insert
to authenticated
with check (public.current_user_can_manage_products(organization_id));

create policy product_categories_update_managers
on public.product_categories
for update
to authenticated
using (public.current_user_can_manage_products(organization_id))
with check (public.current_user_can_manage_products(organization_id));

create policy product_categories_delete_managers
on public.product_categories
for delete
to authenticated
using (public.current_user_can_manage_products(organization_id));

create policy products_select_readers
on public.products
for select
to authenticated
using (public.current_user_can_read_products(organization_id));

create policy products_insert_managers
on public.products
for insert
to authenticated
with check (
  public.current_user_can_manage_products(organization_id)
  and created_by = auth.uid()
  and is_active = true
  and archived_at is null
);

create policy products_update_managers
on public.products
for update
to authenticated
using (
  public.current_user_can_manage_products(organization_id)
  and is_active = true
  and archived_at is null
)
with check (
  public.current_user_can_manage_products(organization_id)
  and is_active = true
  and archived_at is null
);

revoke all on table public.product_categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;

grant select, insert, update, delete on table public.product_categories to authenticated;
grant select, insert, update on table public.products to authenticated;

revoke execute on function public.current_user_can_read_products(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_manage_products(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_archive_products(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.archive_product(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prevent_product_categories_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_products_immutable_update() from public, anon, authenticated, service_role;

grant execute on function public.current_user_can_read_products(uuid) to authenticated;
grant execute on function public.current_user_can_manage_products(uuid) to authenticated;
grant execute on function public.current_user_can_archive_products(uuid) to authenticated;
grant execute on function public.archive_product(uuid) to authenticated;
