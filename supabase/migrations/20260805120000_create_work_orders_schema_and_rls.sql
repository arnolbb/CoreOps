-- TASK-WOR-001: work orders, items, attachments, storage policies, and atomic RPCs.
--
-- This migration adds the work order foundation for CoreOps:
--   - prerequisites on customer_addresses and inventory_transactions
--   - work_orders, work_order_items, and work_order_attachments tables
--   - tenant-scoped RLS + technician assignment scoping on customers/addresses
--   - private 'work-order-attachments' storage bucket and storage.objects RLS policies
--   - private WO-YYYY-XXXX number generator and 6 SECURITY DEFINER RPCs

-- 1. Prerequisites

alter table public.customer_addresses
  add constraint customer_addresses_organization_customer_id_unique
  unique (organization_id, customer_id, id);

alter table public.inventory_transactions
  drop constraint inventory_transactions_transaction_type_valid;

alter table public.inventory_transactions
  add constraint inventory_transactions_transaction_type_valid check (
    transaction_type in (
      'opening_stock',
      'adjustment_in',
      'adjustment_out',
      'sale_out',
      'return_in',
      'transfer_in',
      'transfer_out',
      'work_order_out',
      'work_order_return'
    )
  );

-- 2. Tables, Constraints, Indexes, and Triggers

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_number text not null,
  customer_id uuid not null,
  customer_address_id uuid null,
  work_type text not null,
  priority text not null default 'normal',
  status text not null default 'draft',
  assigned_to uuid null,
  scheduled_start timestamptz null,
  scheduled_end timestamptz null,
  description text not null,
  completion_notes text null,
  cancellation_reason text null,
  started_at timestamptz null,
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint work_orders_work_order_number_not_blank check (length(btrim(work_order_number)) > 0),
  constraint work_orders_work_order_number_length check (length(work_order_number) <= 50),
  constraint work_orders_work_type_valid check (
    work_type in (
      'installation',
      'repair',
      'service',
      'maintenance',
      'inspection',
      'delivery_support',
      'general'
    )
  ),
  constraint work_orders_priority_valid check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint work_orders_status_valid check (
    status in ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  constraint work_orders_scheduled_window_valid check (
    scheduled_start is null or scheduled_end is null or scheduled_end >= scheduled_start
  ),
  constraint work_orders_description_not_blank check (length(btrim(description)) > 0),
  constraint work_orders_description_length check (length(description) <= 5000),
  constraint work_orders_completion_notes_length check (
    completion_notes is null or length(completion_notes) <= 5000
  ),
  constraint work_orders_cancellation_reason_length check (
    cancellation_reason is null or length(cancellation_reason) <= 2000
  ),
  constraint work_orders_organization_id_id_unique unique (organization_id, id),
  constraint work_orders_customer_org_fkey foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete restrict,
  constraint work_orders_customer_address_org_fkey foreign key (
    organization_id,
    customer_id,
    customer_address_id
  )
    references public.customer_addresses (organization_id, customer_id, id)
    on delete restrict,
  constraint work_orders_assigned_to_org_fkey foreign key (organization_id, assigned_to)
    references public.organization_memberships (organization_id, user_id)
    on delete restrict
);

create unique index work_orders_organization_lower_number_unique_idx
  on public.work_orders (organization_id, lower(work_order_number));

create index work_orders_organization_status_scheduled_start_idx
  on public.work_orders (organization_id, status, scheduled_start);

create index work_orders_organization_assigned_to_status_idx
  on public.work_orders (organization_id, assigned_to, status);

create index work_orders_organization_customer_idx
  on public.work_orders (organization_id, customer_id);

create index work_orders_organization_created_at_idx
  on public.work_orders (organization_id, created_at desc);

create table public.work_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null,
  product_id uuid not null,
  warehouse_id uuid not null,
  name_snapshot text not null,
  unit_snapshot text not null,
  quantity numeric(18,3) not null,
  inventory_transaction_id uuid null references public.inventory_transactions(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint work_order_items_name_snapshot_not_blank check (length(btrim(name_snapshot)) > 0),
  constraint work_order_items_name_snapshot_length check (length(name_snapshot) <= 200),
  constraint work_order_items_unit_snapshot_not_blank check (length(btrim(unit_snapshot)) > 0),
  constraint work_order_items_unit_snapshot_length check (length(unit_snapshot) <= 30),
  constraint work_order_items_quantity_positive check (quantity > 0),
  constraint work_order_items_organization_id_id_unique unique (organization_id, id),
  constraint work_order_items_work_order_org_fkey foreign key (organization_id, work_order_id)
    references public.work_orders (organization_id, id)
    on delete restrict,
  constraint work_order_items_product_org_fkey foreign key (organization_id, product_id)
    references public.products (organization_id, id)
    on delete restrict,
  constraint work_order_items_warehouse_org_fkey foreign key (organization_id, warehouse_id)
    references public.warehouses (organization_id, id)
    on delete restrict
);

create index work_order_items_organization_work_order_idx
  on public.work_order_items (organization_id, work_order_id, created_at asc);

create index work_order_items_organization_product_idx
  on public.work_order_items (organization_id, product_id);

create index work_order_items_organization_warehouse_idx
  on public.work_order_items (organization_id, warehouse_id);

create index work_order_items_inventory_transaction_idx
  on public.work_order_items (inventory_transaction_id)
  where inventory_transaction_id is not null;

create table public.work_order_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  attachment_type text not null,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint work_order_attachments_storage_path_not_blank check (length(btrim(storage_path)) > 0),
  constraint work_order_attachments_storage_path_length check (length(storage_path) <= 500),
  constraint work_order_attachments_storage_path_org_prefix check (
    storage_path like (organization_id::text || '/%')
  ),
  constraint work_order_attachments_storage_path_unique unique (storage_path),
  constraint work_order_attachments_file_name_not_blank check (length(btrim(file_name)) > 0),
  constraint work_order_attachments_file_name_length check (length(file_name) <= 255),
  constraint work_order_attachments_mime_type_valid check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  constraint work_order_attachments_size_bytes_valid check (
    size_bytes > 0 and size_bytes <= 10485760
  ),
  constraint work_order_attachments_attachment_type_valid check (
    attachment_type in ('photo', 'document', 'signature', 'other')
  ),
  constraint work_order_attachments_organization_id_id_unique unique (organization_id, id),
  constraint work_order_attachments_work_order_org_fkey foreign key (organization_id, work_order_id)
    references public.work_orders (organization_id, id)
    on delete restrict
);

create index work_order_attachments_organization_work_order_idx
  on public.work_order_attachments (organization_id, work_order_id, created_at desc);

create trigger work_orders_set_updated_at
before update on public.work_orders
for each row execute function public.set_updated_at();

create or replace function public.prevent_work_orders_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'work_orders.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'work_orders.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.work_order_number <> old.work_order_number then
    raise exception 'work_orders.work_order_number cannot be changed' using errcode = '23514';
  end if;

  if new.created_by <> old.created_by then
    raise exception 'work_orders.created_by cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'work_orders.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger work_orders_prevent_immutable_update
before update on public.work_orders
for each row execute function public.prevent_work_orders_immutable_update();

create or replace function public.prevent_work_order_items_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'work_order_items are append-only and cannot be updated' using errcode = '23514';
end;
$$;

create trigger work_order_items_prevent_immutable_update
before update on public.work_order_items
for each row execute function public.prevent_work_order_items_immutable_update();

-- 3. Authorization Helpers

create or replace function public.current_user_can_read_work_orders(
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

create or replace function public.current_user_can_manage_work_orders(
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

create or replace function public.current_user_is_work_order_technician(
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
      and memberships.role = 'technician'
  );
$$;

create or replace function public.current_user_can_reopen_work_orders(
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

create or replace function public.current_user_has_assigned_work_order_for_customer(
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
    from public.organization_memberships memberships
    join public.work_orders work_orders
      on work_orders.organization_id = memberships.organization_id
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and memberships.role = 'technician'
      and work_orders.customer_id = checked_customer_id
      and work_orders.assigned_to = auth.uid()
  );
$$;

create or replace function public.current_user_can_read_work_order(
  checked_organization_id uuid,
  checked_work_order_id uuid
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
    join public.work_orders work_orders
      on work_orders.organization_id = memberships.organization_id
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and work_orders.id = checked_work_order_id
      and (
        memberships.role in ('owner', 'admin', 'staff', 'viewer')
        or (
          memberships.role = 'technician'
          and work_orders.assigned_to = auth.uid()
        )
      )
  );
$$;

create or replace function public.current_user_can_upload_work_order_attachment(
  checked_organization_id uuid,
  checked_work_order_id uuid
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
    join public.work_orders work_orders
      on work_orders.organization_id = memberships.organization_id
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and work_orders.id = checked_work_order_id
      and work_orders.status in ('draft', 'scheduled', 'in_progress')
      and (
        memberships.role in ('owner', 'admin', 'staff')
        or (
          memberships.role = 'technician'
          and work_orders.assigned_to = auth.uid()
        )
      )
  );
$$;

-- 4. RLS Policies and Storage Configuration

alter table public.work_orders enable row level security;
alter table public.work_order_items enable row level security;
alter table public.work_order_attachments enable row level security;

create policy work_orders_select_authorized
on public.work_orders
for select
to authenticated
using (
  public.current_user_can_read_work_orders(organization_id)
  or (
    public.current_user_is_work_order_technician(organization_id)
    and assigned_to = auth.uid()
  )
);

create policy work_order_items_select_authorized
on public.work_order_items
for select
to authenticated
using (
  public.current_user_can_read_work_order(organization_id, work_order_id)
);

create policy work_order_attachments_select_authorized
on public.work_order_attachments
for select
to authenticated
using (
  public.current_user_can_read_work_order(organization_id, work_order_id)
);

create policy work_order_attachments_insert_authorized
on public.work_order_attachments
for insert
to authenticated
with check (
  public.current_user_can_upload_work_order_attachment(organization_id, work_order_id)
  and uploaded_by = auth.uid()
  and storage_path like (organization_id::text || '/' || work_order_id::text || '/%')
);

-- Additive technician read policies on customers and customer_addresses
create policy customers_select_assigned_technicians
on public.customers
for select
to authenticated
using (
  public.current_user_has_assigned_work_order_for_customer(organization_id, id)
);

create policy customer_addresses_select_assigned_technicians
on public.customer_addresses
for select
to authenticated
using (
  public.current_user_has_assigned_work_order_for_customer(organization_id, customer_id)
);

-- Private storage bucket and storage.objects policies
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'work-order-attachments',
  'work-order-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy work_order_attachments_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'work-order-attachments'
  and case
    when bucket_id = 'work-order-attachments'
      and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      and name !~ '(^|/)\.\.(/|$)'
    then public.current_user_can_read_work_order(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
    else false
  end
);

create policy work_order_attachments_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'work-order-attachments'
  and (owner is null or owner = auth.uid())
  and case
    when bucket_id = 'work-order-attachments'
      and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      and name !~ '(^|/)\.\.(/|$)'
    then public.current_user_can_upload_work_order_attachment(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
    else false
  end
);

-- 5. Private Number Generator and SECURITY DEFINER RPCs

create or replace function public.generate_work_order_number(
  p_organization_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year text := to_char(timezone('UTC', now()), 'YYYY');
  v_prefix text := 'WO-' || v_year || '-';
  v_max_seq bigint := 0;
  v_next_seq bigint;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('work_order_number:' || p_organization_id::text || ':' || v_year, 0)
  );

  select coalesce(
    max(
      (regexp_match(wo.work_order_number, '^WO-' || v_year || '-([0-9]+)$'))[1]::bigint
    ),
    0
  )
    into v_max_seq
  from public.work_orders wo
  where wo.organization_id = p_organization_id
    and wo.work_order_number ~ ('^WO-' || v_year || '-[0-9]+$');

  v_next_seq := v_max_seq + 1;

  return v_prefix || lpad(v_next_seq::text, 4, '0');
end;
$$;

create or replace function public.get_work_order_assignees(
  target_organization_id uuid
)
returns table (
  user_id uuid,
  email text,
  role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    memberships.user_id,
    users.email::text as email,
    memberships.role
  from public.organization_memberships memberships
  join auth.users users
    on users.id = memberships.user_id
  where memberships.organization_id = target_organization_id
    and memberships.status = 'active'
    and memberships.role in ('owner', 'admin', 'staff', 'technician')
    and public.current_user_can_read_work_orders(target_organization_id)
  order by
    case memberships.role
      when 'technician' then 0
      when 'staff' then 1
      when 'admin' then 2
      when 'owner' then 3
      else 4
    end,
    users.email asc;
$$;

create or replace function public.create_work_order(
  p_organization_id uuid,
  p_customer_id uuid,
  p_work_type text,
  p_description text,
  p_priority text default 'normal',
  p_status text default 'draft',
  p_customer_address_id uuid default null,
  p_assigned_to uuid default null,
  p_scheduled_start timestamptz default null,
  p_scheduled_end timestamptz default null
)
returns table (
  work_order_id uuid,
  organization_id uuid,
  work_order_number text,
  customer_id uuid,
  status text,
  assigned_to uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_priority text := coalesce(nullif(btrim(p_priority), ''), 'normal');
  v_status text := coalesce(nullif(btrim(p_status), ''), 'draft');
  v_description text := nullif(btrim(p_description), '');
  v_customer public.customers;
  v_address public.customer_addresses;
  v_assignee public.organization_memberships;
  v_work_order_number text;
  v_saved_wo public.work_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'work order authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
  ) then
    raise exception 'work order organization unavailable' using errcode = '42501';
  end if;

  if not public.current_user_can_manage_work_orders(p_organization_id) then
    raise exception 'work order permission denied' using errcode = '42501';
  end if;

  if p_work_type is null or p_work_type not in (
    'installation',
    'repair',
    'service',
    'maintenance',
    'inspection',
    'delivery_support',
    'general'
  ) then
    raise exception 'invalid work order type' using errcode = '22023';
  end if;

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid work order priority' using errcode = '22023';
  end if;

  if v_status not in ('draft', 'scheduled') then
    raise exception 'invalid initial work order status' using errcode = '22023';
  end if;

  if v_description is null then
    raise exception 'work order description is required' using errcode = '22023';
  end if;

  if length(v_description) > 5000 then
    raise exception 'work order description exceeds maximum length' using errcode = '22023';
  end if;

  if p_scheduled_start is not null
    and p_scheduled_end is not null
    and p_scheduled_end < p_scheduled_start then
    raise exception 'scheduled end cannot be before scheduled start' using errcode = '22023';
  end if;

  select c.*
    into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.organization_id = p_organization_id;

  if not found then
    raise exception 'customer not found in organization' using errcode = 'P0001';
  end if;

  if v_customer.status <> 'active' or v_customer.archived_at is not null then
    raise exception 'cannot create work order for archived customer' using errcode = 'P0001';
  end if;

  if p_customer_address_id is not null then
    select ca.*
      into v_address
    from public.customer_addresses ca
    where ca.id = p_customer_address_id
      and ca.organization_id = p_organization_id
      and ca.customer_id = p_customer_id;

    if not found then
      raise exception 'customer address not found for customer' using errcode = 'P0001';
    end if;
  end if;

  if p_assigned_to is not null then
    select om.*
      into v_assignee
    from public.organization_memberships om
    where om.organization_id = p_organization_id
      and om.user_id = p_assigned_to
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'staff', 'technician');

    if not found then
      raise exception 'assignee must be an active member of organization' using errcode = 'P0001';
    end if;
  end if;

  v_work_order_number := public.generate_work_order_number(p_organization_id);

  insert into public.work_orders (
    organization_id,
    work_order_number,
    customer_id,
    customer_address_id,
    work_type,
    priority,
    status,
    assigned_to,
    scheduled_start,
    scheduled_end,
    description,
    created_by
  ) values (
    p_organization_id,
    v_work_order_number,
    p_customer_id,
    p_customer_address_id,
    p_work_type,
    v_priority,
    v_status,
    p_assigned_to,
    p_scheduled_start,
    p_scheduled_end,
    v_description,
    v_authenticated_user_id
  )
  returning * into v_saved_wo;

  perform public.record_organization_audit_event(
    v_saved_wo.organization_id,
    v_authenticated_user_id,
    'work_order.created',
    'work_order',
    v_saved_wo.id,
    null,
    jsonb_build_object(
      'work_order_number', v_saved_wo.work_order_number,
      'customer_id', v_saved_wo.customer_id,
      'work_type', v_saved_wo.work_type,
      'priority', v_saved_wo.priority,
      'status', v_saved_wo.status,
      'assigned_to', v_saved_wo.assigned_to
    ),
    '{}'::jsonb
  );

  return query select
    v_saved_wo.id,
    v_saved_wo.organization_id,
    v_saved_wo.work_order_number,
    v_saved_wo.customer_id,
    v_saved_wo.status,
    v_saved_wo.assigned_to,
    v_saved_wo.created_at;
end;
$$;

create or replace function public.update_work_order(
  p_work_order_id uuid,
  p_customer_id uuid,
  p_work_type text,
  p_priority text,
  p_description text,
  p_customer_address_id uuid default null,
  p_assigned_to uuid default null,
  p_scheduled_start timestamptz default null,
  p_scheduled_end timestamptz default null
)
returns table (
  work_order_id uuid,
  organization_id uuid,
  work_order_number text,
  customer_id uuid,
  status text,
  assigned_to uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_wo public.work_orders;
  v_saved_wo public.work_orders;
  v_description text := nullif(btrim(p_description), '');
  v_customer public.customers;
  v_address public.customer_addresses;
  v_assignee public.organization_memberships;
begin
  if v_authenticated_user_id is null then
    raise exception 'work order authentication required' using errcode = '42501';
  end if;

  select wo.*
    into v_wo
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'work order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_manage_work_orders(v_wo.organization_id) then
    raise exception 'work order permission denied' using errcode = '42501';
  end if;

  if v_wo.status in ('completed', 'cancelled') then
    raise exception 'cannot update completed or cancelled work order' using errcode = 'P0001';
  end if;

  if p_work_type is null or p_work_type not in (
    'installation',
    'repair',
    'service',
    'maintenance',
    'inspection',
    'delivery_support',
    'general'
  ) then
    raise exception 'invalid work order type' using errcode = '22023';
  end if;

  if p_priority is null or p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid work order priority' using errcode = '22023';
  end if;

  if v_description is null then
    raise exception 'work order description is required' using errcode = '22023';
  end if;

  if length(v_description) > 5000 then
    raise exception 'work order description exceeds maximum length' using errcode = '22023';
  end if;

  if p_scheduled_start is not null
    and p_scheduled_end is not null
    and p_scheduled_end < p_scheduled_start then
    raise exception 'scheduled end cannot be before scheduled start' using errcode = '22023';
  end if;

  select c.*
    into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_wo.organization_id;

  if not found then
    raise exception 'customer not found in organization' using errcode = 'P0001';
  end if;

  if p_customer_id <> v_wo.customer_id
    and (v_customer.status <> 'active' or v_customer.archived_at is not null) then
    raise exception 'cannot assign work order to archived customer' using errcode = 'P0001';
  end if;

  if p_customer_address_id is not null then
    select ca.*
      into v_address
    from public.customer_addresses ca
    where ca.id = p_customer_address_id
      and ca.organization_id = v_wo.organization_id
      and ca.customer_id = p_customer_id;

    if not found then
      raise exception 'customer address not found for customer' using errcode = 'P0001';
    end if;
  end if;

  if p_assigned_to is not null then
    select om.*
      into v_assignee
    from public.organization_memberships om
    where om.organization_id = v_wo.organization_id
      and om.user_id = p_assigned_to
      and om.status = 'active'
      and om.role in ('owner', 'admin', 'staff', 'technician');

    if not found then
      raise exception 'assignee must be an active member of organization' using errcode = 'P0001';
    end if;
  end if;

  update public.work_orders wo
  set customer_id = p_customer_id,
    customer_address_id = p_customer_address_id,
    work_type = p_work_type,
    priority = p_priority,
    assigned_to = p_assigned_to,
    scheduled_start = p_scheduled_start,
    scheduled_end = p_scheduled_end,
    description = v_description
  where wo.id = v_wo.id
  returning * into v_saved_wo;

  perform public.record_organization_audit_event(
    v_saved_wo.organization_id,
    v_authenticated_user_id,
    'work_order.updated',
    'work_order',
    v_saved_wo.id,
    jsonb_build_object(
      'customer_id', v_wo.customer_id,
      'customer_address_id', v_wo.customer_address_id,
      'work_type', v_wo.work_type,
      'priority', v_wo.priority,
      'assigned_to', v_wo.assigned_to,
      'scheduled_start', v_wo.scheduled_start,
      'scheduled_end', v_wo.scheduled_end
    ),
    jsonb_build_object(
      'customer_id', v_saved_wo.customer_id,
      'customer_address_id', v_saved_wo.customer_address_id,
      'work_type', v_saved_wo.work_type,
      'priority', v_saved_wo.priority,
      'assigned_to', v_saved_wo.assigned_to,
      'scheduled_start', v_saved_wo.scheduled_start,
      'scheduled_end', v_saved_wo.scheduled_end
    ),
    '{}'::jsonb
  );

  return query select
    v_saved_wo.id,
    v_saved_wo.organization_id,
    v_saved_wo.work_order_number,
    v_saved_wo.customer_id,
    v_saved_wo.status,
    v_saved_wo.assigned_to,
    v_saved_wo.updated_at;
end;
$$;

create or replace function public.transition_work_order_status(
  p_work_order_id uuid,
  p_target_status text,
  p_completion_notes text default null,
  p_cancellation_reason text default null
)
returns table (
  work_order_id uuid,
  organization_id uuid,
  work_order_number text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_wo public.work_orders;
  v_saved_wo public.work_orders;
  v_actor_role text;
  v_completion_notes text;
  v_cancellation_reason text;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_cancelled_at timestamptz;
  v_audit_action text;
begin
  if v_authenticated_user_id is null then
    raise exception 'work order authentication required' using errcode = '42501';
  end if;

  if p_target_status is null or p_target_status not in (
    'draft',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  ) then
    raise exception 'invalid work order target status' using errcode = '22023';
  end if;

  select wo.*
    into v_wo
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'work order not found' using errcode = 'P0001';
  end if;

  select om.role
    into v_actor_role
  from public.organization_memberships om
  where om.organization_id = v_wo.organization_id
    and om.user_id = v_authenticated_user_id
    and om.status = 'active';

  if not found then
    raise exception 'work order permission denied' using errcode = '42501';
  end if;

  if v_actor_role in ('owner', 'admin', 'staff') then
    null;
  elsif v_actor_role = 'technician' then
    if v_wo.assigned_to is distinct from v_authenticated_user_id
      or p_target_status not in ('in_progress', 'completed') then
      raise exception 'work order permission denied' using errcode = '42501';
    end if;
  else
    raise exception 'work order permission denied' using errcode = '42501';
  end if;

  if not (
    (v_wo.status = 'draft' and p_target_status in ('scheduled', 'in_progress', 'cancelled'))
    or (v_wo.status = 'scheduled' and p_target_status in ('draft', 'in_progress', 'cancelled'))
    or (v_wo.status = 'in_progress' and p_target_status in ('completed', 'cancelled'))
  ) then
    raise exception 'work order status transition not allowed' using errcode = 'P0001';
  end if;

  v_started_at := v_wo.started_at;
  v_completed_at := v_wo.completed_at;
  v_cancelled_at := v_wo.cancelled_at;
  v_completion_notes := v_wo.completion_notes;
  v_cancellation_reason := v_wo.cancellation_reason;

  if p_target_status = 'in_progress' then
    v_started_at := coalesce(v_wo.started_at, now());
    v_audit_action := 'work_order.started';
  elsif p_target_status = 'completed' then
    v_completion_notes := nullif(btrim(p_completion_notes), '');
    if v_completion_notes is null then
      raise exception 'completion notes are required to complete a work order' using errcode = '22023';
    end if;
    if length(v_completion_notes) > 5000 then
      raise exception 'completion notes exceed maximum length' using errcode = '22023';
    end if;
    v_completed_at := now();
    v_audit_action := 'work_order.completed';
  elsif p_target_status = 'cancelled' then
    v_cancellation_reason := nullif(btrim(p_cancellation_reason), '');
    if v_cancellation_reason is null then
      raise exception 'cancellation reason is required to cancel a work order' using errcode = '22023';
    end if;
    if length(v_cancellation_reason) > 2000 then
      raise exception 'cancellation reason exceeds maximum length' using errcode = '22023';
    end if;
    v_cancelled_at := now();
    v_audit_action := 'work_order.cancelled';
  elsif p_target_status = 'scheduled' then
    v_audit_action := 'work_order.scheduled';
  else
    v_audit_action := 'work_order.status_changed';
  end if;

  update public.work_orders wo
  set status = p_target_status,
    started_at = v_started_at,
    completed_at = v_completed_at,
    cancelled_at = v_cancelled_at,
    completion_notes = v_completion_notes,
    cancellation_reason = v_cancellation_reason
  where wo.id = v_wo.id
  returning * into v_saved_wo;

  perform public.record_organization_audit_event(
    v_saved_wo.organization_id,
    v_authenticated_user_id,
    v_audit_action,
    'work_order',
    v_saved_wo.id,
    jsonb_build_object(
      'status', v_wo.status,
      'started_at', v_wo.started_at,
      'completed_at', v_wo.completed_at,
      'cancelled_at', v_wo.cancelled_at
    ),
    jsonb_build_object(
      'status', v_saved_wo.status,
      'started_at', v_saved_wo.started_at,
      'completed_at', v_saved_wo.completed_at,
      'cancelled_at', v_saved_wo.cancelled_at
    ),
    case
      when p_target_status = 'cancelled' then jsonb_build_object('reason', v_cancellation_reason)
      else '{}'::jsonb
    end
  );

  return query select
    v_saved_wo.id,
    v_saved_wo.organization_id,
    v_saved_wo.work_order_number,
    v_saved_wo.status,
    v_saved_wo.started_at,
    v_saved_wo.completed_at,
    v_saved_wo.cancelled_at;
end;
$$;

create or replace function public.reopen_work_order(
  p_work_order_id uuid,
  p_reason text
)
returns table (
  work_order_id uuid,
  organization_id uuid,
  work_order_number text,
  status text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_wo public.work_orders;
  v_saved_wo public.work_orders;
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_authenticated_user_id is null then
    raise exception 'work order authentication required' using errcode = '42501';
  end if;

  select wo.*
    into v_wo
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'work order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_reopen_work_orders(v_wo.organization_id) then
    raise exception 'work order reopen permission denied' using errcode = '42501';
  end if;

  if v_wo.status <> 'completed' then
    raise exception 'only completed work orders can be reopened' using errcode = 'P0001';
  end if;

  if v_reason is null then
    raise exception 'reopen reason is required' using errcode = '22023';
  end if;

  if length(v_reason) > 2000 then
    raise exception 'reopen reason exceeds maximum length' using errcode = '22023';
  end if;

  update public.work_orders wo
  set status = 'in_progress',
    completed_at = null
  where wo.id = v_wo.id
  returning * into v_saved_wo;

  perform public.record_organization_audit_event(
    v_saved_wo.organization_id,
    v_authenticated_user_id,
    'work_order.reopened',
    'work_order',
    v_saved_wo.id,
    jsonb_build_object(
      'status', v_wo.status,
      'completed_at', v_wo.completed_at
    ),
    jsonb_build_object(
      'status', v_saved_wo.status,
      'completed_at', v_saved_wo.completed_at
    ),
    jsonb_build_object('reason', v_reason)
  );

  return query select
    v_saved_wo.id,
    v_saved_wo.organization_id,
    v_saved_wo.work_order_number,
    v_saved_wo.status,
    v_saved_wo.updated_at;
end;
$$;

create or replace function public.record_work_order_item_usage(
  p_work_order_id uuid,
  p_warehouse_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_idempotency_key text default null
)
returns table (
  work_order_item_id uuid,
  inventory_transaction_id uuid,
  organization_id uuid,
  work_order_id uuid,
  warehouse_id uuid,
  product_id uuid,
  quantity numeric(18,3),
  quantity_before numeric(18,3),
  quantity_after numeric(18,3),
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_wo public.work_orders;
  v_actor_role text;
  v_warehouse public.warehouses;
  v_product public.products;
  v_idempotency_key text := nullif(btrim(p_idempotency_key), '');
  v_quantity numeric(18,3);
  v_existing_tx public.inventory_transactions;
  v_existing_item public.work_order_items;
  v_current_balance public.inventory_balances;
  v_quantity_before numeric(18,3) := 0.000;
  v_quantity_delta numeric(18,3);
  v_quantity_after numeric(18,3);
  v_saved_tx public.inventory_transactions;
  v_saved_item public.work_order_items;
begin
  if v_authenticated_user_id is null then
    raise exception 'work order authentication required' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'usage quantity must be positive' using errcode = '22003';
  end if;

  v_quantity := p_quantity;
  if v_quantity <= 0 then
    raise exception 'usage quantity must be positive' using errcode = '22003';
  end if;

  if v_idempotency_key is not null and length(v_idempotency_key) > 128 then
    raise exception 'idempotency key exceeds maximum length' using errcode = '22023';
  end if;

  select wo.*
    into v_wo
  from public.work_orders wo
  where wo.id = p_work_order_id
  for update;

  if not found then
    raise exception 'work order not found' using errcode = 'P0001';
  end if;

  select om.role
    into v_actor_role
  from public.organization_memberships om
  where om.organization_id = v_wo.organization_id
    and om.user_id = v_authenticated_user_id
    and om.status = 'active';

  if not found then
    raise exception 'work order item permission denied' using errcode = '42501';
  end if;

  if v_actor_role in ('owner', 'admin', 'staff') then
    null;
  elsif v_actor_role = 'technician' and v_wo.assigned_to = v_authenticated_user_id then
    null;
  else
    raise exception 'work order item permission denied' using errcode = '42501';
  end if;

  if v_wo.status in ('completed', 'cancelled') then
    raise exception 'cannot record item usage on completed or cancelled work order' using errcode = 'P0001';
  end if;

  if v_wo.status <> 'in_progress' then
    raise exception 'work order must be in progress to record item usage' using errcode = 'P0001';
  end if;

  select w.*
    into v_warehouse
  from public.warehouses w
  where w.id = p_warehouse_id
    and w.organization_id = v_wo.organization_id;

  if not found then
    raise exception 'warehouse not found in work order organization' using errcode = 'P0001';
  end if;

  if not v_warehouse.is_active then
    raise exception 'cannot use stock from inactive warehouse' using errcode = 'P0001';
  end if;

  select p.*
    into v_product
  from public.products p
  where p.id = p_product_id
    and p.organization_id = v_wo.organization_id;

  if not found then
    raise exception 'product not found in work order organization' using errcode = 'P0001';
  end if;

  if not v_product.is_active or v_product.archived_at is not null then
    raise exception 'cannot record inactive or archived product on work order' using errcode = 'P0001';
  end if;

  if v_product.product_type <> 'goods' or not v_product.track_inventory then
    raise exception 'only tracked goods products can be consumed from inventory' using errcode = 'P0001';
  end if;

  if v_idempotency_key is not null then
    select it.*
      into v_existing_tx
    from public.inventory_transactions it
    where it.organization_id = v_wo.organization_id
      and it.idempotency_key = v_idempotency_key;

    if found then
      select woi.*
        into v_existing_item
      from public.work_order_items woi
      where woi.organization_id = v_wo.organization_id
        and woi.inventory_transaction_id = v_existing_tx.id;

      if found
        and v_existing_tx.reference_type = 'work_order'
        and v_existing_tx.reference_id = v_wo.id
        and v_existing_item.work_order_id = v_wo.id
        and v_existing_item.warehouse_id = p_warehouse_id
        and v_existing_item.product_id = p_product_id
        and v_existing_item.quantity = v_quantity then
        return query select
          v_existing_item.id,
          v_existing_tx.id,
          v_existing_item.organization_id,
          v_existing_item.work_order_id,
          v_existing_item.warehouse_id,
          v_existing_item.product_id,
          v_existing_item.quantity,
          v_existing_tx.quantity_before,
          v_existing_tx.quantity_after,
          v_existing_item.created_at;
        return;
      end if;

      raise exception 'idempotency key already used for a different operation' using errcode = '23505';
    end if;
  end if;

  select ib.*
    into v_current_balance
  from public.inventory_balances ib
  where ib.warehouse_id = p_warehouse_id
    and ib.product_id = p_product_id
  for update;

  if found then
    v_quantity_before := v_current_balance.quantity;
  end if;

  v_quantity_delta := -abs(v_quantity);
  v_quantity_after := v_quantity_before + v_quantity_delta;

  if v_quantity_after < 0 then
    raise exception 'insufficient stock balance' using errcode = '22003';
  end if;

  update public.inventory_balances ib
  set quantity = v_quantity_after,
    version = v_current_balance.version + 1,
    updated_at = now()
  where ib.warehouse_id = p_warehouse_id
    and ib.product_id = p_product_id;

  insert into public.inventory_transactions (
    organization_id,
    warehouse_id,
    product_id,
    transaction_type,
    quantity_delta,
    quantity_before,
    quantity_after,
    reference_type,
    reference_id,
    reason,
    created_by,
    idempotency_key
  ) values (
    v_wo.organization_id,
    p_warehouse_id,
    p_product_id,
    'work_order_out',
    v_quantity_delta,
    v_quantity_before,
    v_quantity_after,
    'work_order',
    v_wo.id,
    'Work order ' || v_wo.work_order_number,
    v_authenticated_user_id,
    v_idempotency_key
  )
  returning * into v_saved_tx;

  insert into public.work_order_items (
    organization_id,
    work_order_id,
    product_id,
    warehouse_id,
    name_snapshot,
    unit_snapshot,
    quantity,
    inventory_transaction_id,
    created_by
  ) values (
    v_wo.organization_id,
    v_wo.id,
    v_product.id,
    v_warehouse.id,
    v_product.name,
    v_product.unit,
    v_quantity,
    v_saved_tx.id,
    v_authenticated_user_id
  )
  returning * into v_saved_item;

  perform public.record_organization_audit_event(
    v_wo.organization_id,
    v_authenticated_user_id,
    'work_order.item_used',
    'work_order_item',
    v_saved_item.id,
    jsonb_build_object(
      'quantity_before', v_quantity_before
    ),
    jsonb_build_object(
      'work_order_id', v_wo.id,
      'work_order_number', v_wo.work_order_number,
      'product_id', v_product.id,
      'warehouse_id', v_warehouse.id,
      'quantity', v_saved_item.quantity,
      'quantity_after', v_quantity_after,
      'inventory_transaction_id', v_saved_tx.id
    ),
    '{}'::jsonb
  );

  return query select
    v_saved_item.id,
    v_saved_tx.id,
    v_saved_item.organization_id,
    v_saved_item.work_order_id,
    v_saved_item.warehouse_id,
    v_saved_item.product_id,
    v_saved_item.quantity,
    v_saved_tx.quantity_before,
    v_saved_tx.quantity_after,
    v_saved_item.created_at;
end;
$$;

-- 6. Table and Function Privileges

revoke all on table public.work_orders from anon, authenticated;
revoke all on table public.work_order_items from anon, authenticated;
revoke all on table public.work_order_attachments from anon, authenticated;

grant select on table public.work_orders to authenticated;
grant select on table public.work_order_items to authenticated;
grant select, insert on table public.work_order_attachments to authenticated;

revoke execute on function public.current_user_can_read_work_orders(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_manage_work_orders(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_is_work_order_technician(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_reopen_work_orders(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_has_assigned_work_order_for_customer(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_read_work_order(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_upload_work_order_attachment(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prevent_work_orders_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_work_order_items_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.generate_work_order_number(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.get_work_order_assignees(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.create_work_order(uuid, uuid, text, text, text, text, uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated, service_role;
revoke execute on function public.update_work_order(uuid, uuid, text, text, text, uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated, service_role;
revoke execute on function public.transition_work_order_status(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.reopen_work_order(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.record_work_order_item_usage(uuid, uuid, uuid, numeric, text) from public, anon, authenticated, service_role;

grant execute on function public.current_user_can_read_work_orders(uuid) to authenticated;
grant execute on function public.current_user_can_manage_work_orders(uuid) to authenticated;
grant execute on function public.current_user_is_work_order_technician(uuid) to authenticated;
grant execute on function public.current_user_can_reopen_work_orders(uuid) to authenticated;
grant execute on function public.current_user_has_assigned_work_order_for_customer(uuid, uuid) to authenticated;
grant execute on function public.current_user_can_read_work_order(uuid, uuid) to authenticated;
grant execute on function public.current_user_can_upload_work_order_attachment(uuid, uuid) to authenticated;
grant execute on function public.get_work_order_assignees(uuid) to authenticated;
grant execute on function public.create_work_order(uuid, uuid, text, text, text, text, uuid, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.update_work_order(uuid, uuid, text, text, text, uuid, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.transition_work_order_status(uuid, text, text, text) to authenticated;
grant execute on function public.reopen_work_order(uuid, text) to authenticated;
grant execute on function public.record_work_order_item_usage(uuid, uuid, uuid, numeric, text) to authenticated;
