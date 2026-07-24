-- TASK-CUS-001: customer schema and RLS.
--
-- This migration adds the customer data foundation for CoreOps: customers,
-- addresses, tags, customer/tag relationships, tenant-scoped RLS, cross-tenant
-- integrity constraints, and an audited database-only archive RPC.

create or replace function public.current_user_can_read_customers(
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
      and memberships.role in ('owner', 'admin', 'staff', 'viewer')
  );
$$;

create or replace function public.current_user_can_create_customers(
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

create or replace function public.current_user_can_update_customers(
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

create or replace function public.current_user_can_archive_customers(
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

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_type text not null,
  display_name text not null,
  company_name text null,
  phone text null,
  email public.citext null,
  status text not null default 'active',
  notes text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,

  constraint customers_customer_type_valid check (
    customer_type in ('individual', 'business')
  ),
  constraint customers_status_valid check (status in ('active', 'archived')),
  constraint customers_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint customers_display_name_length check (length(display_name) <= 200),
  constraint customers_company_name_length check (
    company_name is null or length(company_name) <= 200
  ),
  constraint customers_phone_length check (phone is null or length(phone) <= 40),
  constraint customers_email_length check (email is null or length(email::text) <= 320),
  constraint customers_email_format check (
    email is null or email::text ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint customers_notes_length check (notes is null or length(notes) <= 5000),
  constraint customers_archive_state_consistent check (
    (
      status = 'active'
      and archived_at is null
    )
    or
    (
      status = 'archived'
      and archived_at is not null
    )
  ),
  constraint customers_organization_id_id_unique unique (organization_id, id)
);

create index customers_organization_display_name_idx
  on public.customers (organization_id, display_name);

create index customers_organization_phone_idx
  on public.customers (organization_id, phone);

create index customers_organization_email_idx
  on public.customers (organization_id, email);

create index customers_organization_status_idx
  on public.customers (organization_id, status);

create index customers_organization_created_at_idx
  on public.customers (organization_id, created_at desc);

create index customers_organization_created_by_idx
  on public.customers (organization_id, created_by);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  label text not null,
  address_line_1 text not null,
  address_line_2 text null,
  city text null,
  province text null,
  postal_code text null,
  country_code char(2) not null,
  latitude numeric null,
  longitude numeric null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customer_addresses_customer_org_fkey foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete restrict,
  constraint customer_addresses_label_not_blank check (length(btrim(label)) > 0),
  constraint customer_addresses_label_length check (length(label) <= 80),
  constraint customer_addresses_address_line_1_not_blank check (
    length(btrim(address_line_1)) > 0
  ),
  constraint customer_addresses_address_line_1_length check (length(address_line_1) <= 300),
  constraint customer_addresses_address_line_2_length check (
    address_line_2 is null or length(address_line_2) <= 300
  ),
  constraint customer_addresses_city_length check (city is null or length(city) <= 120),
  constraint customer_addresses_province_length check (
    province is null or length(province) <= 120
  ),
  constraint customer_addresses_postal_code_length check (
    postal_code is null or length(postal_code) <= 30
  ),
  constraint customer_addresses_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint customer_addresses_latitude_range check (
    latitude is null or (latitude >= -90 and latitude <= 90)
  ),
  constraint customer_addresses_longitude_range check (
    longitude is null or (longitude >= -180 and longitude <= 180)
  )
);

create unique index customer_addresses_one_primary_per_customer_idx
  on public.customer_addresses (organization_id, customer_id)
  where is_primary;

create index customer_addresses_organization_customer_idx
  on public.customer_addresses (organization_id, customer_id);

create index customer_addresses_organization_primary_idx
  on public.customer_addresses (organization_id, customer_id, is_primary);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  color_token text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tags_name_not_blank check (length(btrim(name)) > 0),
  constraint tags_name_length check (length(name) <= 80),
  constraint tags_color_token_length check (
    color_token is null or length(color_token) <= 64
  ),
  constraint tags_organization_id_id_unique unique (organization_id, id)
);

create unique index tags_organization_lower_name_unique_idx
  on public.tags (organization_id, lower(name));

create index tags_organization_name_idx
  on public.tags (organization_id, name);

create table public.customer_tags (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),

  constraint customer_tags_customer_tag_pk primary key (customer_id, tag_id),
  constraint customer_tags_customer_org_fkey foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete restrict,
  constraint customer_tags_tag_org_fkey foreign key (organization_id, tag_id)
    references public.tags (organization_id, id)
    on delete restrict
);

create index customer_tags_organization_customer_idx
  on public.customer_tags (organization_id, customer_id);

create index customer_tags_organization_tag_idx
  on public.customer_tags (organization_id, tag_id);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

create or replace function public.prevent_customers_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'customers.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'customers.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_by <> old.created_by then
    raise exception 'customers.created_by cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'customers.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger customers_prevent_immutable_update
before update on public.customers
for each row execute function public.prevent_customers_immutable_update();

create or replace function public.prevent_customer_addresses_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'customer_addresses.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'customer_addresses.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.customer_id <> old.customer_id then
    raise exception 'customer_addresses.customer_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'customer_addresses.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger customer_addresses_prevent_immutable_update
before update on public.customer_addresses
for each row execute function public.prevent_customer_addresses_immutable_update();

create or replace function public.prevent_tags_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'tags.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'tags.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'tags.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tags_prevent_immutable_update
before update on public.tags
for each row execute function public.prevent_tags_immutable_update();

create or replace function public.customer_is_active_in_organization(
  checked_organization_id uuid,
  checked_customer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers customers
    where customers.organization_id = checked_organization_id
      and customers.id = checked_customer_id
      and customers.status = 'active'
      and customers.archived_at is null
  );
$$;

create or replace function public.archive_customer(target_customer_id uuid)
returns table (
  customer_id uuid,
  organization_id uuid,
  status text,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  target_customer public.customers;
  saved_customer public.customers;
begin
  if authenticated_user_id is null then
    raise exception 'customer authentication required' using errcode = '42501';
  end if;

  select *
    into target_customer
  from public.customers customers
  where customers.id = target_customer_id
  for update;

  if not found then
    raise exception 'customer not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_archive_customers(target_customer.organization_id) then
    raise exception 'customer permission denied' using errcode = '42501';
  end if;

  if target_customer.status = 'archived' then
    raise exception 'customer already archived' using errcode = 'P0001';
  end if;

  update public.customers customers
  set status = 'archived',
    archived_at = now()
  where customers.id = target_customer.id
  returning * into saved_customer;

  perform public.record_organization_audit_event(
    saved_customer.organization_id,
    authenticated_user_id,
    'customer.archived',
    'customer',
    saved_customer.id,
    jsonb_build_object('status', target_customer.status),
    jsonb_build_object(
      'status', saved_customer.status,
      'archived_at', saved_customer.archived_at
    ),
    '{}'::jsonb
  );

  return query select
    saved_customer.id,
    saved_customer.organization_id,
    saved_customer.status,
    saved_customer.archived_at;
end;
$$;

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.tags enable row level security;
alter table public.customer_tags enable row level security;

create policy customers_select_customer_readers
on public.customers
for select
to authenticated
using (public.current_user_can_read_customers(organization_id));

create policy customers_insert_customer_creators
on public.customers
for insert
to authenticated
with check (
  public.current_user_can_create_customers(organization_id)
  and created_by = auth.uid()
  and status = 'active'
  and archived_at is null
);

create policy customers_update_active_customer_editors
on public.customers
for update
to authenticated
using (
  public.current_user_can_update_customers(organization_id)
  and status = 'active'
  and archived_at is null
)
with check (
  public.current_user_can_update_customers(organization_id)
  and status = 'active'
  and archived_at is null
);

create policy customer_addresses_select_customer_readers
on public.customer_addresses
for select
to authenticated
using (public.current_user_can_read_customers(organization_id));

create policy customer_addresses_insert_customer_editors
on public.customer_addresses
for insert
to authenticated
with check (
  public.current_user_can_update_customers(organization_id)
  and public.customer_is_active_in_organization(organization_id, customer_id)
);

create policy customer_addresses_update_customer_editors
on public.customer_addresses
for update
to authenticated
using (
  public.current_user_can_update_customers(organization_id)
  and public.customer_is_active_in_organization(organization_id, customer_id)
)
with check (
  public.current_user_can_update_customers(organization_id)
  and public.customer_is_active_in_organization(organization_id, customer_id)
);

create policy tags_select_customer_readers
on public.tags
for select
to authenticated
using (public.current_user_can_read_customers(organization_id));

create policy tags_insert_customer_editors
on public.tags
for insert
to authenticated
with check (public.current_user_can_update_customers(organization_id));

create policy tags_update_customer_editors
on public.tags
for update
to authenticated
using (public.current_user_can_update_customers(organization_id))
with check (public.current_user_can_update_customers(organization_id));

create policy customer_tags_select_customer_readers
on public.customer_tags
for select
to authenticated
using (public.current_user_can_read_customers(organization_id));

create policy customer_tags_insert_customer_editors
on public.customer_tags
for insert
to authenticated
with check (
  public.current_user_can_update_customers(organization_id)
  and public.customer_is_active_in_organization(organization_id, customer_id)
);

create policy customer_tags_delete_customer_editors
on public.customer_tags
for delete
to authenticated
using (
  public.current_user_can_update_customers(organization_id)
  and public.customer_is_active_in_organization(organization_id, customer_id)
);

revoke all on table public.customers from anon, authenticated;
revoke all on table public.customer_addresses from anon, authenticated;
revoke all on table public.tags from anon, authenticated;
revoke all on table public.customer_tags from anon, authenticated;

grant select, insert, update on table public.customers to authenticated;
grant select, insert, update on table public.customer_addresses to authenticated;
grant select, insert, update on table public.tags to authenticated;
grant select, insert, delete on table public.customer_tags to authenticated;

revoke execute on function public.current_user_can_read_customers(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_create_customers(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_update_customers(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_archive_customers(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.customer_is_active_in_organization(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.archive_customer(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prevent_customers_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_customer_addresses_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_tags_immutable_update() from public, anon, authenticated, service_role;

grant execute on function public.current_user_can_read_customers(uuid) to authenticated;
grant execute on function public.current_user_can_create_customers(uuid) to authenticated;
grant execute on function public.current_user_can_update_customers(uuid) to authenticated;
grant execute on function public.current_user_can_archive_customers(uuid) to authenticated;
grant execute on function public.customer_is_active_in_organization(uuid, uuid) to authenticated;
grant execute on function public.archive_customer(uuid) to authenticated;
