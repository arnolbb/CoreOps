-- TASK-INV-001: warehouse and inventory ledger schema and RLS.
--
-- This migration adds the inventory ledger data foundation for CoreOps: warehouses,
-- inventory balances, inventory transactions, tenant-scoped RLS, cross-tenant
-- integrity constraints, immutability triggers, and idempotency indexes.

create or replace function public.current_user_can_read_inventory(
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

create or replace function public.current_user_can_manage_inventory(
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

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  code text not null,
  address text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouses_name_not_blank check (length(btrim(name)) > 0),
  constraint warehouses_name_length check (length(name) <= 100),
  constraint warehouses_code_not_blank check (length(btrim(code)) > 0),
  constraint warehouses_code_length check (length(code) <= 30),
  constraint warehouses_organization_id_id_unique unique (organization_id, id)
);

create unique index warehouses_organization_lower_code_unique_idx
  on public.warehouses (organization_id, lower(code));

create index warehouses_organization_name_idx
  on public.warehouses (organization_id, name);

create table public.inventory_balances (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  product_id uuid not null,
  quantity numeric(18,3) not null default 0.000,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),

  constraint inventory_balances_pkey primary key (warehouse_id, product_id),
  constraint inventory_balances_warehouse_org_fkey foreign key (organization_id, warehouse_id)
    references public.warehouses (organization_id, id)
    on delete restrict,
  constraint inventory_balances_product_org_fkey foreign key (organization_id, product_id)
    references public.products (organization_id, id)
    on delete restrict
);

create index inventory_balances_organization_warehouse_idx
  on public.inventory_balances (organization_id, warehouse_id);

create index inventory_balances_organization_product_idx
  on public.inventory_balances (organization_id, product_id);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  warehouse_id uuid not null,
  product_id uuid not null,
  transaction_type text not null,
  quantity_delta numeric(18,3) not null,
  quantity_before numeric(18,3) not null,
  quantity_after numeric(18,3) not null,
  reference_type text null,
  reference_id uuid null,
  reason text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  idempotency_key text null,

  constraint inventory_transactions_transaction_type_valid check (
    transaction_type in (
      'opening_stock',
      'adjustment_in',
      'adjustment_out',
      'sale_out',
      'return_in',
      'transfer_in',
      'transfer_out'
    )
  ),
  constraint inventory_transactions_warehouse_org_fkey foreign key (organization_id, warehouse_id)
    references public.warehouses (organization_id, id)
    on delete restrict,
  constraint inventory_transactions_product_org_fkey foreign key (organization_id, product_id)
    references public.products (organization_id, id)
    on delete restrict,
  constraint inventory_transactions_reason_length check (
    reason is null or length(reason) <= 2000
  ),
  constraint inventory_transactions_idempotency_key_length check (
    idempotency_key is null or length(idempotency_key) <= 128
  )
);

create unique index inventory_transactions_organization_idempotency_key_unique_idx
  on public.inventory_transactions (organization_id, idempotency_key)
  where idempotency_key is not null;

create index inventory_transactions_organization_product_created_at_idx
  on public.inventory_transactions (organization_id, product_id, created_at desc);

create index inventory_transactions_organization_warehouse_product_idx
  on public.inventory_transactions (organization_id, warehouse_id, product_id);

create index inventory_transactions_organization_reference_idx
  on public.inventory_transactions (organization_id, reference_type, reference_id);

create trigger warehouses_set_updated_at
before update on public.warehouses
for each row execute function public.set_updated_at();

create trigger inventory_balances_set_updated_at
before update on public.inventory_balances
for each row execute function public.set_updated_at();

create or replace function public.prevent_warehouses_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'warehouses.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'warehouses.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'warehouses.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger warehouses_prevent_immutable_update
before update on public.warehouses
for each row execute function public.prevent_warehouses_immutable_update();

create or replace function public.prevent_inventory_balances_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.warehouse_id <> old.warehouse_id then
    raise exception 'inventory_balances.warehouse_id cannot be changed' using errcode = '23514';
  end if;

  if new.product_id <> old.product_id then
    raise exception 'inventory_balances.product_id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'inventory_balances.organization_id cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger inventory_balances_prevent_immutable_update
before update on public.inventory_balances
for each row execute function public.prevent_inventory_balances_immutable_update();

create or replace function public.prevent_inventory_transactions_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'inventory_transactions are append-only and cannot be updated' using errcode = '23514';
end;
$$;

create trigger inventory_transactions_prevent_immutable_update
before update on public.inventory_transactions
for each row execute function public.prevent_inventory_transactions_immutable_update();

alter table public.warehouses enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_transactions enable row level security;

create policy warehouses_select_readers
on public.warehouses
for select
to authenticated
using (public.current_user_can_read_inventory(organization_id));

create policy warehouses_insert_managers
on public.warehouses
for insert
to authenticated
with check (public.current_user_can_manage_inventory(organization_id));

create policy warehouses_update_managers
on public.warehouses
for update
to authenticated
using (public.current_user_can_manage_inventory(organization_id))
with check (public.current_user_can_manage_inventory(organization_id));

create policy inventory_balances_select_readers
on public.inventory_balances
for select
to authenticated
using (public.current_user_can_read_inventory(organization_id));

create policy inventory_balances_insert_managers
on public.inventory_balances
for insert
to authenticated
with check (public.current_user_can_manage_inventory(organization_id));

create policy inventory_balances_update_managers
on public.inventory_balances
for update
to authenticated
using (public.current_user_can_manage_inventory(organization_id))
with check (public.current_user_can_manage_inventory(organization_id));

create policy inventory_transactions_select_readers
on public.inventory_transactions
for select
to authenticated
using (public.current_user_can_read_inventory(organization_id));

create policy inventory_transactions_insert_managers
on public.inventory_transactions
for insert
to authenticated
with check (
  public.current_user_can_manage_inventory(organization_id)
  and created_by = auth.uid()
);

revoke all on table public.warehouses from anon, authenticated;
revoke all on table public.inventory_balances from anon, authenticated;
revoke all on table public.inventory_transactions from anon, authenticated;

grant select, insert, update on table public.warehouses to authenticated;
grant select, insert, update on table public.inventory_balances to authenticated;
grant select, insert on table public.inventory_transactions to authenticated;

revoke execute on function public.current_user_can_read_inventory(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_manage_inventory(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prevent_warehouses_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_inventory_balances_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_inventory_transactions_immutable_update() from public, anon, authenticated, service_role;

grant execute on function public.current_user_can_read_inventory(uuid) to authenticated;
grant execute on function public.current_user_can_manage_inventory(uuid) to authenticated;
