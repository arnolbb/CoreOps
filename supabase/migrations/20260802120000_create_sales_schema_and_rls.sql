-- TASK-SAL-001: sales order, sales order items, and payments schema and RLS.
--
-- This migration adds the sales foundation for CoreOps: sales_orders,
-- sales_order_items, payments, tenant-scoped RLS, cross-tenant integrity constraints,
-- immutability triggers, and lookup indexes.

create or replace function public.current_user_can_read_sales(
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

create or replace function public.current_user_can_manage_sales(
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

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_number text not null,
  customer_id uuid not null,
  status text not null default 'draft',
  payment_status text not null default 'unpaid',
  currency_code char(3) not null default 'USD',
  subtotal numeric(18,2) not null default 0.00,
  discount_total numeric(18,2) not null default 0.00,
  tax_total numeric(18,2) not null default 0.00,
  grand_total numeric(18,2) not null default 0.00,
  paid_total numeric(18,2) not null default 0.00,
  notes text null,
  confirmed_at timestamptz null,
  completed_at timestamptz null,
  cancelled_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sales_orders_order_number_not_blank check (length(btrim(order_number)) > 0),
  constraint sales_orders_order_number_length check (length(order_number) <= 50),
  constraint sales_orders_status_valid check (
    status in ('draft', 'confirmed', 'completed', 'cancelled')
  ),
  constraint sales_orders_payment_status_valid check (
    payment_status in ('unpaid', 'partially_paid', 'paid', 'refunded')
  ),
  constraint sales_orders_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint sales_orders_subtotal_non_negative check (subtotal >= 0),
  constraint sales_orders_discount_total_non_negative check (discount_total >= 0),
  constraint sales_orders_tax_total_non_negative check (tax_total >= 0),
  constraint sales_orders_grand_total_non_negative check (grand_total >= 0),
  constraint sales_orders_paid_total_non_negative check (paid_total >= 0),
  constraint sales_orders_notes_length check (notes is null or length(notes) <= 5000),
  constraint sales_orders_organization_id_id_unique unique (organization_id, id),
  constraint sales_orders_customer_org_fkey foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete restrict
);

create unique index sales_orders_organization_lower_order_number_unique_idx
  on public.sales_orders (organization_id, lower(order_number));

create index sales_orders_organization_status_created_at_idx
  on public.sales_orders (organization_id, status, created_at desc);

create index sales_orders_organization_customer_idx
  on public.sales_orders (organization_id, customer_id);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sales_order_id uuid not null,
  product_id uuid null,
  item_type text not null,
  name_snapshot text not null,
  sku_snapshot text null,
  unit_snapshot text not null,
  quantity numeric(18,3) not null,
  unit_price numeric(18,2) not null default 0.00,
  discount_amount numeric(18,2) not null default 0.00,
  tax_amount numeric(18,2) not null default 0.00,
  line_total numeric(18,2) not null default 0.00,
  created_at timestamptz not null default now(),

  constraint sales_order_items_item_type_valid check (
    item_type in ('goods', 'service', 'custom')
  ),
  constraint sales_order_items_name_snapshot_not_blank check (length(btrim(name_snapshot)) > 0),
  constraint sales_order_items_name_snapshot_length check (length(name_snapshot) <= 200),
  constraint sales_order_items_unit_snapshot_not_blank check (length(btrim(unit_snapshot)) > 0),
  constraint sales_order_items_unit_snapshot_length check (length(unit_snapshot) <= 30),
  constraint sales_order_items_quantity_positive check (quantity > 0),
  constraint sales_order_items_unit_price_non_negative check (unit_price >= 0),
  constraint sales_order_items_discount_amount_non_negative check (discount_amount >= 0),
  constraint sales_order_items_tax_amount_non_negative check (tax_amount >= 0),
  constraint sales_order_items_line_total_non_negative check (line_total >= 0),
  constraint sales_order_items_organization_id_id_unique unique (organization_id, id),
  constraint sales_order_items_sales_order_org_fkey foreign key (organization_id, sales_order_id)
    references public.sales_orders (organization_id, id)
    on delete cascade,
  constraint sales_order_items_product_org_fkey foreign key (organization_id, product_id)
    references public.products (organization_id, id)
    on delete restrict
);

create index sales_order_items_organization_sales_order_idx
  on public.sales_order_items (organization_id, sales_order_id);

create index sales_order_items_organization_product_idx
  on public.sales_order_items (organization_id, product_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sales_order_id uuid not null,
  amount numeric(18,2) not null,
  payment_method text not null,
  reference text null,
  status text not null default 'completed',
  paid_at timestamptz not null default now(),
  notes text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  voided_at timestamptz null,
  voided_by uuid null references auth.users(id) on delete restrict,
  void_reason text null,

  constraint payments_payment_method_valid check (
    payment_method in ('cash', 'bank_transfer', 'credit_card', 'other')
  ),
  constraint payments_status_valid check (status in ('completed', 'voided')),
  constraint payments_amount_positive check (amount > 0),
  constraint payments_reference_length check (reference is null or length(reference) <= 100),
  constraint payments_notes_length check (notes is null or length(notes) <= 2000),
  constraint payments_void_reason_length check (void_reason is null or length(void_reason) <= 1000),
  constraint payments_organization_id_id_unique unique (organization_id, id),
  constraint payments_sales_order_org_fkey foreign key (organization_id, sales_order_id)
    references public.sales_orders (organization_id, id)
    on delete restrict
);

create index payments_organization_sales_order_idx
  on public.payments (organization_id, sales_order_id);

create index payments_organization_paid_at_idx
  on public.payments (organization_id, paid_at desc);

create trigger sales_orders_set_updated_at
before update on public.sales_orders
for each row execute function public.set_updated_at();

create or replace function public.prevent_sales_orders_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'sales_orders.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id <> old.organization_id then
    raise exception 'sales_orders.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.created_by <> old.created_by then
    raise exception 'sales_orders.created_by cannot be changed' using errcode = '23514';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'sales_orders.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger sales_orders_prevent_immutable_update
before update on public.sales_orders
for each row execute function public.prevent_sales_orders_immutable_update();

alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.payments enable row level security;

create policy sales_orders_select_readers
on public.sales_orders
for select
to authenticated
using (public.current_user_can_read_sales(organization_id));

create policy sales_orders_insert_managers
on public.sales_orders
for insert
to authenticated
with check (
  public.current_user_can_manage_sales(organization_id)
  and created_by = auth.uid()
);

create policy sales_orders_update_managers
on public.sales_orders
for update
to authenticated
using (public.current_user_can_manage_sales(organization_id))
with check (public.current_user_can_manage_sales(organization_id));

create policy sales_order_items_select_readers
on public.sales_order_items
for select
to authenticated
using (public.current_user_can_read_sales(organization_id));

create policy sales_order_items_insert_managers
on public.sales_order_items
for insert
to authenticated
with check (public.current_user_can_manage_sales(organization_id));

create policy sales_order_items_update_managers
on public.sales_order_items
for update
to authenticated
using (public.current_user_can_manage_sales(organization_id))
with check (public.current_user_can_manage_sales(organization_id));

create policy sales_order_items_delete_managers
on public.sales_order_items
for delete
to authenticated
using (public.current_user_can_manage_sales(organization_id));

create policy payments_select_readers
on public.payments
for select
to authenticated
using (public.current_user_can_read_sales(organization_id));

create policy payments_insert_managers
on public.payments
for insert
to authenticated
with check (
  public.current_user_can_manage_sales(organization_id)
  and created_by = auth.uid()
);

create policy payments_update_managers
on public.payments
for update
to authenticated
using (public.current_user_can_manage_sales(organization_id))
with check (public.current_user_can_manage_sales(organization_id));

revoke all on table public.sales_orders from anon, authenticated;
revoke all on table public.sales_order_items from anon, authenticated;
revoke all on table public.payments from anon, authenticated;

grant select, insert, update on table public.sales_orders to authenticated;
grant select, insert, update, delete on table public.sales_order_items to authenticated;
grant select, insert, update on table public.payments to authenticated;

revoke execute on function public.current_user_can_read_sales(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_manage_sales(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.prevent_sales_orders_immutable_update() from public, anon, authenticated, service_role;

grant execute on function public.current_user_can_read_sales(uuid) to authenticated;
grant execute on function public.current_user_can_manage_sales(uuid) to authenticated;
