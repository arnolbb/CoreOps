-- TASK-SAL-002: sales order lifecycle RPCs, draft item guard, payment immutability, and audit logging.
--
-- This migration adds warehouse_id and cancellation_reason to public.sales_orders,
-- guards non-draft sales_order_items and immutable payment columns with triggers,
-- adds admin permission and order-number helpers, and exposes seven atomic
-- SECURITY DEFINER RPCs for the full sales order and payment lifecycle.

alter table public.sales_orders add column warehouse_id uuid null;
alter table public.sales_orders add column cancellation_reason text null;

alter table public.sales_orders
  add constraint sales_orders_cancellation_reason_length
  check (cancellation_reason is null or length(cancellation_reason) <= 1000);

alter table public.sales_orders
  add constraint sales_orders_warehouse_org_fkey
  foreign key (organization_id, warehouse_id)
  references public.warehouses (organization_id, id)
  on delete restrict;

create index sales_orders_organization_warehouse_idx
  on public.sales_orders (organization_id, warehouse_id);

create or replace function public.prevent_non_draft_sales_order_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select so.status
      into v_order_status
    from public.sales_orders so
    where so.id = old.sales_order_id
      and so.organization_id = old.organization_id;

    if found and v_order_status <> 'draft' then
      raise exception 'sales_order_items cannot be modified unless parent sales order is in draft status'
        using errcode = '23514';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select so.status
      into v_order_status
    from public.sales_orders so
    where so.id = new.sales_order_id
      and so.organization_id = new.organization_id;

    if found and v_order_status <> 'draft' then
      raise exception 'sales_order_items cannot be modified unless parent sales order is in draft status'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger sales_order_items_prevent_non_draft_mutation
before insert or update or delete on public.sales_order_items
for each row execute function public.prevent_non_draft_sales_order_item_mutation();

create or replace function public.prevent_payments_immutable_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'payments.id cannot be changed' using errcode = '23514';
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'payments.organization_id cannot be changed' using errcode = '23514';
  end if;

  if new.sales_order_id is distinct from old.sales_order_id then
    raise exception 'payments.sales_order_id cannot be changed' using errcode = '23514';
  end if;

  if new.amount is distinct from old.amount then
    raise exception 'payments.amount cannot be changed' using errcode = '23514';
  end if;

  if new.payment_method is distinct from old.payment_method then
    raise exception 'payments.payment_method cannot be changed' using errcode = '23514';
  end if;

  if new.paid_at is distinct from old.paid_at then
    raise exception 'payments.paid_at cannot be changed' using errcode = '23514';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'payments.created_by cannot be changed' using errcode = '23514';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'payments.created_at cannot be changed' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger payments_prevent_immutable_update
before update on public.payments
for each row execute function public.prevent_payments_immutable_update();

create or replace function public.current_user_can_admin_sales(
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

create or replace function public.generate_sales_order_number(
  target_organization_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year text := pg_catalog.to_char(pg_catalog.now() at time zone 'UTC', 'YYYY');
  v_pattern text := '^SO-' || v_year || '-[0-9]{1,9}$';
  v_capture_pattern text := '^SO-' || v_year || '-([0-9]{1,9})$';
  v_next_sequence bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('sales_order_number:' || target_organization_id::text || ':' || v_year, 0)
  );

  select coalesce(
    max(pg_catalog.substring(pg_catalog.upper(so.order_number), v_capture_pattern)::bigint),
    0
  ) + 1
    into v_next_sequence
  from public.sales_orders so
  where so.organization_id = target_organization_id
    and pg_catalog.upper(so.order_number) ~ v_pattern;

  return 'SO-' || v_year || '-' || pg_catalog.lpad(v_next_sequence::text, 4, '0');
end;
$$;

create or replace function public.derive_sales_payment_status(
  p_paid_total numeric,
  p_grand_total numeric
)
returns text
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  if coalesce(p_paid_total, 0) <= 0 then
    return 'unpaid';
  end if;

  if p_paid_total >= coalesce(p_grand_total, 0) then
    return 'paid';
  end if;

  return 'partially_paid';
end;
$$;

create or replace function public.prepare_sales_order_items(
  target_organization_id uuid,
  raw_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products;
  v_product_id uuid;
  v_item_type_input text;
  v_item_type text;
  v_name_snapshot text;
  v_sku_snapshot text;
  v_unit_snapshot text;
  v_quantity_text text;
  v_unit_price_text text;
  v_quantity numeric(18,3);
  v_unit_price numeric(18,2);
  v_discount_amount numeric(18,2);
  v_tax_amount numeric(18,2);
  v_line_subtotal numeric(18,2);
  v_line_total numeric(18,2);
  v_subtotal numeric(18,2) := 0.00;
  v_discount_total numeric(18,2) := 0.00;
  v_tax_total numeric(18,2) := 0.00;
  v_grand_total numeric(18,2) := 0.00;
  v_prepared_items jsonb := '[]'::jsonb;
begin
  if raw_items is null
     or pg_catalog.jsonb_typeof(raw_items) <> 'array'
     or pg_catalog.jsonb_array_length(raw_items) = 0 then
    raise exception 'sales order must include at least one item' using errcode = '22023';
  end if;

  for v_item in
    select elem.value
    from pg_catalog.jsonb_array_elements(raw_items) as elem(value)
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object' then
      raise exception 'each sales order item must be a JSON object' using errcode = '22023';
    end if;

    v_product_id := nullif(pg_catalog.btrim(v_item->>'product_id'), '')::uuid;
    v_item_type_input := nullif(pg_catalog.btrim(v_item->>'item_type'), '');
    v_quantity_text := nullif(pg_catalog.btrim(v_item->>'quantity'), '');
    v_unit_price_text := nullif(pg_catalog.btrim(v_item->>'unit_price'), '');

    if v_quantity_text is null then
      raise exception 'sales order item quantity is required' using errcode = '22023';
    end if;

    v_quantity := pg_catalog.round(v_quantity_text::numeric, 3);
    if v_quantity <= 0 then
      raise exception 'sales order item quantity must be positive' using errcode = '22003';
    end if;

    v_discount_amount := coalesce(
      pg_catalog.round(nullif(pg_catalog.btrim(v_item->>'discount_amount'), '')::numeric, 2),
      0.00::numeric(18,2)
    );
    if v_discount_amount < 0 then
      raise exception 'sales order item discount_amount cannot be negative' using errcode = '22003';
    end if;

    v_tax_amount := coalesce(
      pg_catalog.round(nullif(pg_catalog.btrim(v_item->>'tax_amount'), '')::numeric, 2),
      0.00::numeric(18,2)
    );
    if v_tax_amount < 0 then
      raise exception 'sales order item tax_amount cannot be negative' using errcode = '22003';
    end if;

    if v_product_id is not null then
      select p.*
        into v_product
      from public.products p
      where p.id = v_product_id
        and p.organization_id = target_organization_id;

      if not found then
        raise exception 'product not found in organization' using errcode = 'P0001';
      end if;

      if not v_product.is_active or v_product.archived_at is not null then
        raise exception 'cannot add inactive or archived product to sales order' using errcode = 'P0001';
      end if;

      if v_item_type_input is not null and v_item_type_input <> v_product.product_type then
        raise exception 'sales order item item_type does not match product_type' using errcode = '22023';
      end if;

      v_item_type := v_product.product_type;
      v_name_snapshot := v_product.name;
      v_sku_snapshot := v_product.sku;
      v_unit_snapshot := v_product.unit;

      if v_unit_price_text is not null then
        v_unit_price := pg_catalog.round(v_unit_price_text::numeric, 2);
      else
        v_unit_price := pg_catalog.round(v_product.selling_price, 2);
      end if;
    else
      v_item_type := coalesce(v_item_type_input, 'custom');
      if v_item_type <> 'custom' then
        raise exception 'non-catalog sales order items must use item_type custom' using errcode = '22023';
      end if;

      v_name_snapshot := coalesce(
        nullif(pg_catalog.btrim(v_item->>'name_snapshot'), ''),
        nullif(pg_catalog.btrim(v_item->>'name'), '')
      );
      if v_name_snapshot is null then
        raise exception 'custom sales order item name_snapshot is required' using errcode = '22023';
      end if;
      if pg_catalog.length(v_name_snapshot) > 200 then
        raise exception 'sales order item name_snapshot exceeds maximum length' using errcode = '22023';
      end if;

      v_sku_snapshot := coalesce(
        nullif(pg_catalog.btrim(v_item->>'sku_snapshot'), ''),
        nullif(pg_catalog.btrim(v_item->>'sku'), '')
      );

      if (v_item ? 'unit_snapshot' and nullif(pg_catalog.btrim(v_item->>'unit_snapshot'), '') is null)
         or (not (v_item ? 'unit_snapshot') and v_item ? 'unit' and nullif(pg_catalog.btrim(v_item->>'unit'), '') is null) then
        raise exception 'custom sales order item unit_snapshot cannot be blank' using errcode = '22023';
      end if;

      v_unit_snapshot := coalesce(
        nullif(pg_catalog.btrim(v_item->>'unit_snapshot'), ''),
        nullif(pg_catalog.btrim(v_item->>'unit'), ''),
        'unit'
      );
      if pg_catalog.length(v_unit_snapshot) > 30 then
        raise exception 'sales order item unit_snapshot exceeds maximum length' using errcode = '22023';
      end if;

      if v_unit_price_text is null then
        raise exception 'custom sales order item unit_price is required' using errcode = '22023';
      end if;

      v_unit_price := pg_catalog.round(v_unit_price_text::numeric, 2);
    end if;

    if v_unit_price < 0 then
      raise exception 'sales order item unit_price cannot be negative' using errcode = '22003';
    end if;

    v_line_subtotal := pg_catalog.round(v_quantity * v_unit_price, 2);
    if v_discount_amount > v_line_subtotal then
      raise exception 'sales order item discount_amount cannot exceed line subtotal' using errcode = '22003';
    end if;

    v_line_total := pg_catalog.round(v_line_subtotal - v_discount_amount + v_tax_amount, 2);

    v_subtotal := pg_catalog.round(v_subtotal + v_line_subtotal, 2);
    v_discount_total := pg_catalog.round(v_discount_total + v_discount_amount, 2);
    v_tax_total := pg_catalog.round(v_tax_total + v_tax_amount, 2);
    v_grand_total := pg_catalog.round(v_grand_total + v_line_total, 2);

    v_prepared_items := v_prepared_items || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'product_id', v_product_id,
        'item_type', v_item_type,
        'name_snapshot', v_name_snapshot,
        'sku_snapshot', v_sku_snapshot,
        'unit_snapshot', v_unit_snapshot,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'discount_amount', v_discount_amount,
        'tax_amount', v_tax_amount,
        'line_total', v_line_total
      )
    );
  end loop;

  return pg_catalog.jsonb_build_object(
    'subtotal', v_subtotal,
    'discount_total', v_discount_total,
    'tax_total', v_tax_total,
    'grand_total', v_grand_total,
    'items', v_prepared_items
  );
end;
$$;

create or replace function public.apply_sales_order_inventory_movement(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_product_id uuid,
  p_transaction_type text,
  p_quantity_delta numeric,
  p_reference_id uuid,
  p_reason text,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_balance public.inventory_balances;
  v_balance_found boolean := false;
  v_quantity_delta numeric(18,3) := pg_catalog.round(p_quantity_delta, 3);
  v_quantity_before numeric(18,3) := 0.000;
  v_quantity_after numeric(18,3);
begin
  if p_transaction_type not in ('sale_out', 'return_in') then
    raise exception 'invalid sales inventory transaction type' using errcode = '22023';
  end if;

  if v_quantity_delta = 0 then
    return;
  end if;

  if p_idempotency_key is not null and exists (
    select 1
    from public.inventory_transactions it
    where it.organization_id = p_organization_id
      and it.idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  select ib.*
    into v_current_balance
  from public.inventory_balances ib
  where ib.warehouse_id = p_warehouse_id
    and ib.product_id = p_product_id
  for update;

  v_balance_found := found;
  if v_balance_found then
    v_quantity_before := v_current_balance.quantity;
  end if;

  v_quantity_after := pg_catalog.round(v_quantity_before + v_quantity_delta, 3);
  if v_quantity_after < 0 then
    raise exception 'insufficient stock balance' using errcode = '22003';
  end if;

  if v_balance_found then
    update public.inventory_balances ib
    set quantity = v_quantity_after,
      version = v_current_balance.version + 1,
      updated_at = pg_catalog.now()
    where ib.warehouse_id = p_warehouse_id
      and ib.product_id = p_product_id;
  else
    insert into public.inventory_balances (
      organization_id,
      warehouse_id,
      product_id,
      quantity,
      version
    ) values (
      p_organization_id,
      p_warehouse_id,
      p_product_id,
      v_quantity_after,
      1
    );
  end if;

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
    p_organization_id,
    p_warehouse_id,
    p_product_id,
    p_transaction_type,
    v_quantity_delta,
    v_quantity_before,
    v_quantity_after,
    'sales_order',
    p_reference_id,
    p_reason,
    p_actor_user_id,
    p_idempotency_key
  );
end;
$$;

create or replace function public.create_sales_order_draft(
  p_customer_id uuid,
  p_items jsonb,
  p_order_number text default null,
  p_warehouse_id uuid default null,
  p_notes text default null
)
returns table (
  sales_order_id uuid,
  order_number text,
  status text,
  payment_status text,
  currency_code char(3),
  subtotal numeric(18,2),
  discount_total numeric(18,2),
  tax_total numeric(18,2),
  grand_total numeric(18,2),
  paid_total numeric(18,2)
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_customer public.customers;
  v_warehouse public.warehouses;
  v_currency_code char(3);
  v_order_number text := nullif(pg_catalog.btrim(p_order_number), '');
  v_notes text := nullif(pg_catalog.btrim(p_notes), '');
  v_prepared jsonb;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_customer_id is null then
    raise exception 'customer_id is required' using errcode = '22023';
  end if;

  select c.*
    into v_customer
  from public.customers c
  where c.id = p_customer_id;

  if not found then
    raise exception 'customer not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_manage_sales(v_customer.organization_id) then
    raise exception 'sales permission denied' using errcode = '42501';
  end if;

  if v_customer.status <> 'active' or v_customer.archived_at is not null then
    raise exception 'cannot create sales order for archived customer' using errcode = 'P0001';
  end if;

  if p_warehouse_id is not null then
    select w.*
      into v_warehouse
    from public.warehouses w
    where w.id = p_warehouse_id
      and w.organization_id = v_customer.organization_id;

    if not found then
      raise exception 'warehouse not found in organization' using errcode = 'P0001';
    end if;

    if not v_warehouse.is_active then
      raise exception 'cannot assign inactive warehouse to sales order' using errcode = 'P0001';
    end if;
  end if;

  if v_notes is not null and pg_catalog.length(v_notes) > 5000 then
    raise exception 'sales order notes exceed maximum length' using errcode = '22023';
  end if;

  if v_order_number is null then
    v_order_number := public.generate_sales_order_number(v_customer.organization_id);
  elsif pg_catalog.length(v_order_number) > 50 then
    raise exception 'sales order number exceeds maximum length' using errcode = '22023';
  end if;

  select o.currency_code
    into v_currency_code
  from public.organizations o
  where o.id = v_customer.organization_id;

  v_prepared := public.prepare_sales_order_items(v_customer.organization_id, p_items);

  insert into public.sales_orders (
    organization_id,
    order_number,
    customer_id,
    warehouse_id,
    status,
    payment_status,
    currency_code,
    subtotal,
    discount_total,
    tax_total,
    grand_total,
    paid_total,
    notes,
    created_by
  ) values (
    v_customer.organization_id,
    v_order_number,
    v_customer.id,
    p_warehouse_id,
    'draft',
    'unpaid',
    coalesce(v_currency_code, 'USD'::char(3)),
    pg_catalog.round((v_prepared->>'subtotal')::numeric, 2),
    pg_catalog.round((v_prepared->>'discount_total')::numeric, 2),
    pg_catalog.round((v_prepared->>'tax_total')::numeric, 2),
    pg_catalog.round((v_prepared->>'grand_total')::numeric, 2),
    0.00::numeric(18,2),
    v_notes,
    v_authenticated_user_id
  )
  returning * into v_saved_order;

  insert into public.sales_order_items (
    organization_id,
    sales_order_id,
    product_id,
    item_type,
    name_snapshot,
    sku_snapshot,
    unit_snapshot,
    quantity,
    unit_price,
    discount_amount,
    tax_amount,
    line_total
  )
  select
    v_saved_order.organization_id,
    v_saved_order.id,
    nullif(item_elem.value->>'product_id', '')::uuid,
    item_elem.value->>'item_type',
    item_elem.value->>'name_snapshot',
    nullif(item_elem.value->>'sku_snapshot', ''),
    item_elem.value->>'unit_snapshot',
    pg_catalog.round((item_elem.value->>'quantity')::numeric, 3),
    pg_catalog.round((item_elem.value->>'unit_price')::numeric, 2),
    pg_catalog.round((item_elem.value->>'discount_amount')::numeric, 2),
    pg_catalog.round((item_elem.value->>'tax_amount')::numeric, 2),
    pg_catalog.round((item_elem.value->>'line_total')::numeric, 2)
  from pg_catalog.jsonb_array_elements(v_prepared->'items') as item_elem(value);

  return query select
    v_saved_order.id,
    v_saved_order.order_number,
    v_saved_order.status,
    v_saved_order.payment_status,
    v_saved_order.currency_code,
    v_saved_order.subtotal,
    v_saved_order.discount_total,
    v_saved_order.tax_total,
    v_saved_order.grand_total,
    v_saved_order.paid_total;
end;
$$;

create or replace function public.update_sales_order_draft(
  p_sales_order_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_warehouse_id uuid default null,
  p_notes text default null
)
returns table (
  sales_order_id uuid,
  order_number text,
  status text,
  payment_status text,
  currency_code char(3),
  subtotal numeric(18,2),
  discount_total numeric(18,2),
  tax_total numeric(18,2),
  grand_total numeric(18,2),
  paid_total numeric(18,2)
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_order public.sales_orders;
  v_customer public.customers;
  v_warehouse public.warehouses;
  v_notes text := nullif(pg_catalog.btrim(p_notes), '');
  v_prepared jsonb;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_sales_order_id is null then
    raise exception 'sales_order_id is required' using errcode = '22023';
  end if;

  if p_customer_id is null then
    raise exception 'customer_id is required' using errcode = '22023';
  end if;

  select so.*
    into v_order
  from public.sales_orders so
  where so.id = p_sales_order_id
  for update;

  if not found then
    raise exception 'sales order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_manage_sales(v_order.organization_id) then
    raise exception 'sales permission denied' using errcode = '42501';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'only draft sales orders can be edited' using errcode = 'P0001';
  end if;

  select c.*
    into v_customer
  from public.customers c
  where c.id = p_customer_id
    and c.organization_id = v_order.organization_id;

  if not found then
    raise exception 'customer not found in organization' using errcode = 'P0001';
  end if;

  if v_customer.status <> 'active' or v_customer.archived_at is not null then
    raise exception 'cannot assign archived customer to sales order' using errcode = 'P0001';
  end if;

  if p_warehouse_id is not null then
    select w.*
      into v_warehouse
    from public.warehouses w
    where w.id = p_warehouse_id
      and w.organization_id = v_order.organization_id;

    if not found then
      raise exception 'warehouse not found in organization' using errcode = 'P0001';
    end if;

    if not v_warehouse.is_active then
      raise exception 'cannot assign inactive warehouse to sales order' using errcode = 'P0001';
    end if;
  end if;

  if v_notes is not null and pg_catalog.length(v_notes) > 5000 then
    raise exception 'sales order notes exceed maximum length' using errcode = '22023';
  end if;

  v_prepared := public.prepare_sales_order_items(v_order.organization_id, p_items);

  delete from public.sales_order_items soi
  where soi.organization_id = v_order.organization_id
    and soi.sales_order_id = v_order.id;

  insert into public.sales_order_items (
    organization_id,
    sales_order_id,
    product_id,
    item_type,
    name_snapshot,
    sku_snapshot,
    unit_snapshot,
    quantity,
    unit_price,
    discount_amount,
    tax_amount,
    line_total
  )
  select
    v_order.organization_id,
    v_order.id,
    nullif(item_elem.value->>'product_id', '')::uuid,
    item_elem.value->>'item_type',
    item_elem.value->>'name_snapshot',
    nullif(item_elem.value->>'sku_snapshot', ''),
    item_elem.value->>'unit_snapshot',
    pg_catalog.round((item_elem.value->>'quantity')::numeric, 3),
    pg_catalog.round((item_elem.value->>'unit_price')::numeric, 2),
    pg_catalog.round((item_elem.value->>'discount_amount')::numeric, 2),
    pg_catalog.round((item_elem.value->>'tax_amount')::numeric, 2),
    pg_catalog.round((item_elem.value->>'line_total')::numeric, 2)
  from pg_catalog.jsonb_array_elements(v_prepared->'items') as item_elem(value);

  update public.sales_orders so
  set customer_id = v_customer.id,
    warehouse_id = p_warehouse_id,
    notes = v_notes,
    subtotal = pg_catalog.round((v_prepared->>'subtotal')::numeric, 2),
    discount_total = pg_catalog.round((v_prepared->>'discount_total')::numeric, 2),
    tax_total = pg_catalog.round((v_prepared->>'tax_total')::numeric, 2),
    grand_total = pg_catalog.round((v_prepared->>'grand_total')::numeric, 2)
  where so.id = v_order.id
  returning * into v_saved_order;

  return query select
    v_saved_order.id,
    v_saved_order.order_number,
    v_saved_order.status,
    v_saved_order.payment_status,
    v_saved_order.currency_code,
    v_saved_order.subtotal,
    v_saved_order.discount_total,
    v_saved_order.tax_total,
    v_saved_order.grand_total,
    v_saved_order.paid_total;
end;
$$;

create or replace function public.confirm_sales_order(
  p_sales_order_id uuid,
  p_warehouse_id uuid default null
)
returns table (
  sales_order_id uuid,
  status text,
  warehouse_id uuid,
  confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_order public.sales_orders;
  v_warehouse public.warehouses;
  v_effective_warehouse_id uuid;
  v_tracked_item record;
  v_confirmed_at timestamptz;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_sales_order_id is null then
    raise exception 'sales_order_id is required' using errcode = '22023';
  end if;

  select so.*
    into v_order
  from public.sales_orders so
  where so.id = p_sales_order_id
  for update;

  if not found then
    raise exception 'sales order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_manage_sales(v_order.organization_id) then
    raise exception 'sales permission denied' using errcode = '42501';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'only draft sales orders can be confirmed' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.sales_order_items soi
    where soi.organization_id = v_order.organization_id
      and soi.sales_order_id = v_order.id
  ) then
    raise exception 'sales order must include at least one item before confirmation' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.sales_order_items soi
    join public.products p
      on p.organization_id = soi.organization_id
     and p.id = soi.product_id
    where soi.organization_id = v_order.organization_id
      and soi.sales_order_id = v_order.id
      and (not p.is_active or p.archived_at is not null)
  ) then
    raise exception 'cannot confirm sales order with inactive or archived product' using errcode = 'P0001';
  end if;

  v_effective_warehouse_id := coalesce(p_warehouse_id, v_order.warehouse_id);

  if v_effective_warehouse_id is not null then
    select w.*
      into v_warehouse
    from public.warehouses w
    where w.id = v_effective_warehouse_id
      and w.organization_id = v_order.organization_id;

    if not found then
      raise exception 'warehouse not found in organization' using errcode = 'P0001';
    end if;

    if not v_warehouse.is_active then
      raise exception 'cannot confirm sales order with inactive warehouse' using errcode = 'P0001';
    end if;
  end if;

  for v_tracked_item in
    select
      soi.product_id as item_product_id,
      pg_catalog.round(sum(soi.quantity), 3) as total_quantity
    from public.sales_order_items soi
    join public.products p
      on p.organization_id = soi.organization_id
     and p.id = soi.product_id
    where soi.organization_id = v_order.organization_id
      and soi.sales_order_id = v_order.id
      and soi.item_type = 'goods'
      and p.product_type = 'goods'
      and p.track_inventory = true
    group by soi.product_id
    order by soi.product_id
  loop
    if v_effective_warehouse_id is null then
      raise exception 'warehouse_id is required to confirm a sales order with tracked goods'
        using errcode = 'P0001';
    end if;

    perform public.apply_sales_order_inventory_movement(
      v_order.organization_id,
      v_effective_warehouse_id,
      v_tracked_item.item_product_id,
      'sale_out',
      -v_tracked_item.total_quantity,
      v_order.id,
      'Sales order ' || v_order.order_number || ' confirmed',
      v_authenticated_user_id,
      'sales_order:' || v_order.id::text || ':confirm:' || v_tracked_item.item_product_id::text
    );
  end loop;

  v_confirmed_at := pg_catalog.now();

  update public.sales_orders so
  set status = 'confirmed',
    warehouse_id = v_effective_warehouse_id,
    confirmed_at = v_confirmed_at
  where so.id = v_order.id
  returning * into v_saved_order;

  perform public.record_organization_audit_event(
    v_saved_order.organization_id,
    v_authenticated_user_id,
    'sales_order.confirmed',
    'sales_order',
    v_saved_order.id,
    pg_catalog.jsonb_build_object(
      'status', v_order.status,
      'warehouse_id', v_order.warehouse_id
    ),
    pg_catalog.jsonb_build_object(
      'status', v_saved_order.status,
      'warehouse_id', v_saved_order.warehouse_id,
      'confirmed_at', v_saved_order.confirmed_at,
      'order_number', v_saved_order.order_number,
      'grand_total', v_saved_order.grand_total
    ),
    '{}'::jsonb
  );

  return query select
    v_saved_order.id,
    v_saved_order.status,
    v_saved_order.warehouse_id,
    v_saved_order.confirmed_at;
end;
$$;

create or replace function public.record_sales_payment(
  p_sales_order_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_paid_at timestamptz default now(),
  p_reference text default null,
  p_notes text default null
)
returns table (
  payment_id uuid,
  sales_order_id uuid,
  amount numeric(18,2),
  paid_total numeric(18,2),
  payment_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_order public.sales_orders;
  v_amount numeric(18,2);
  v_paid_at timestamptz := coalesce(p_paid_at, pg_catalog.now());
  v_reference text := nullif(pg_catalog.btrim(p_reference), '');
  v_notes text := nullif(pg_catalog.btrim(p_notes), '');
  v_existing_paid_total numeric(18,2);
  v_new_paid_total numeric(18,2);
  v_new_payment_status text;
  v_payment public.payments;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_sales_order_id is null then
    raise exception 'sales_order_id is required' using errcode = '22023';
  end if;

  select so.*
    into v_order
  from public.sales_orders so
  where so.id = p_sales_order_id
  for update;

  if not found then
    raise exception 'sales order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_manage_sales(v_order.organization_id) then
    raise exception 'sales permission denied' using errcode = '42501';
  end if;

  if v_order.status not in ('confirmed', 'completed') then
    raise exception 'payments can only be recorded for confirmed or completed sales orders'
      using errcode = 'P0001';
  end if;

  if p_amount is null then
    raise exception 'payment amount is required' using errcode = '22003';
  end if;

  v_amount := pg_catalog.round(p_amount, 2);
  if v_amount <= 0 then
    raise exception 'payment amount must be positive' using errcode = '22003';
  end if;

  if p_payment_method is null
     or p_payment_method not in ('cash', 'bank_transfer', 'credit_card', 'other') then
    raise exception 'invalid payment method' using errcode = '22023';
  end if;

  if v_reference is not null and pg_catalog.length(v_reference) > 100 then
    raise exception 'payment reference exceeds maximum length' using errcode = '22023';
  end if;

  if v_notes is not null and pg_catalog.length(v_notes) > 2000 then
    raise exception 'payment notes exceed maximum length' using errcode = '22023';
  end if;

  select coalesce(pg_catalog.round(sum(pay.amount), 2), 0.00::numeric(18,2))
    into v_existing_paid_total
  from public.payments pay
  where pay.organization_id = v_order.organization_id
    and pay.sales_order_id = v_order.id
    and pay.status = 'completed';

  v_new_paid_total := pg_catalog.round(v_existing_paid_total + v_amount, 2);
  if v_new_paid_total > v_order.grand_total then
    raise exception 'payment exceeds outstanding order balance' using errcode = '22003';
  end if;

  v_new_payment_status := public.derive_sales_payment_status(v_new_paid_total, v_order.grand_total);

  insert into public.payments (
    organization_id,
    sales_order_id,
    amount,
    payment_method,
    reference,
    status,
    paid_at,
    notes,
    created_by
  ) values (
    v_order.organization_id,
    v_order.id,
    v_amount,
    p_payment_method,
    v_reference,
    'completed',
    v_paid_at,
    v_notes,
    v_authenticated_user_id
  )
  returning * into v_payment;

  update public.sales_orders so
  set paid_total = v_new_paid_total,
    payment_status = v_new_payment_status
  where so.id = v_order.id
  returning * into v_saved_order;

  perform public.record_organization_audit_event(
    v_saved_order.organization_id,
    v_authenticated_user_id,
    'payment.recorded',
    'payment',
    v_payment.id,
    pg_catalog.jsonb_build_object(
      'paid_total', v_order.paid_total,
      'payment_status', v_order.payment_status
    ),
    pg_catalog.jsonb_build_object(
      'sales_order_id', v_saved_order.id,
      'amount', v_payment.amount,
      'payment_method', v_payment.payment_method,
      'paid_total', v_saved_order.paid_total,
      'payment_status', v_saved_order.payment_status
    ),
    '{}'::jsonb
  );

  return query select
    v_payment.id,
    v_saved_order.id,
    v_payment.amount,
    v_saved_order.paid_total,
    v_saved_order.payment_status;
end;
$$;

create or replace function public.void_sales_payment(
  p_payment_id uuid,
  p_void_reason text
)
returns table (
  payment_id uuid,
  sales_order_id uuid,
  paid_total numeric(18,2),
  payment_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_payment public.payments;
  v_order public.sales_orders;
  v_void_reason text := nullif(pg_catalog.btrim(p_void_reason), '');
  v_voided_at timestamptz;
  v_new_paid_total numeric(18,2);
  v_new_payment_status text;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_payment_id is null then
    raise exception 'payment_id is required' using errcode = '22023';
  end if;

  select pay.*
    into v_payment
  from public.payments pay
  where pay.id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_admin_sales(v_payment.organization_id) then
    raise exception 'sales admin permission denied' using errcode = '42501';
  end if;

  select so.*
    into v_order
  from public.sales_orders so
  where so.id = v_payment.sales_order_id
    and so.organization_id = v_payment.organization_id
  for update;

  if not found then
    raise exception 'sales order not found' using errcode = 'P0001';
  end if;

  if v_payment.status = 'voided' then
    raise exception 'payment is already voided' using errcode = 'P0001';
  end if;

  if v_void_reason is null then
    raise exception 'void reason is required' using errcode = '22023';
  end if;

  if pg_catalog.length(v_void_reason) > 1000 then
    raise exception 'void reason exceeds maximum length' using errcode = '22023';
  end if;

  v_voided_at := pg_catalog.now();

  update public.payments pay
  set status = 'voided',
    voided_at = v_voided_at,
    voided_by = v_authenticated_user_id,
    void_reason = v_void_reason
  where pay.id = v_payment.id;

  select coalesce(pg_catalog.round(sum(pay.amount), 2), 0.00::numeric(18,2))
    into v_new_paid_total
  from public.payments pay
  where pay.organization_id = v_order.organization_id
    and pay.sales_order_id = v_order.id
    and pay.status = 'completed';

  v_new_payment_status := public.derive_sales_payment_status(v_new_paid_total, v_order.grand_total);

  update public.sales_orders so
  set paid_total = v_new_paid_total,
    payment_status = v_new_payment_status
  where so.id = v_order.id
  returning * into v_saved_order;

  perform public.record_organization_audit_event(
    v_saved_order.organization_id,
    v_authenticated_user_id,
    'payment.voided',
    'payment',
    v_payment.id,
    pg_catalog.jsonb_build_object(
      'status', v_payment.status,
      'paid_total', v_order.paid_total,
      'payment_status', v_order.payment_status
    ),
    pg_catalog.jsonb_build_object(
      'sales_order_id', v_saved_order.id,
      'status', 'voided',
      'amount', v_payment.amount,
      'voided_at', v_voided_at,
      'void_reason', v_void_reason,
      'paid_total', v_saved_order.paid_total,
      'payment_status', v_saved_order.payment_status
    ),
    '{}'::jsonb
  );

  return query select
    v_payment.id,
    v_saved_order.id,
    v_saved_order.paid_total,
    v_saved_order.payment_status;
end;
$$;

create or replace function public.complete_sales_order(
  p_sales_order_id uuid
)
returns table (
  sales_order_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_order public.sales_orders;
  v_completed_at timestamptz;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_sales_order_id is null then
    raise exception 'sales_order_id is required' using errcode = '22023';
  end if;

  select so.*
    into v_order
  from public.sales_orders so
  where so.id = p_sales_order_id
  for update;

  if not found then
    raise exception 'sales order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_manage_sales(v_order.organization_id) then
    raise exception 'sales permission denied' using errcode = '42501';
  end if;

  if v_order.status <> 'confirmed' then
    raise exception 'only confirmed sales orders can be completed' using errcode = 'P0001';
  end if;

  v_completed_at := pg_catalog.now();

  update public.sales_orders so
  set status = 'completed',
    completed_at = v_completed_at
  where so.id = v_order.id
  returning * into v_saved_order;

  perform public.record_organization_audit_event(
    v_saved_order.organization_id,
    v_authenticated_user_id,
    'sales_order.completed',
    'sales_order',
    v_saved_order.id,
    pg_catalog.jsonb_build_object('status', v_order.status),
    pg_catalog.jsonb_build_object(
      'status', v_saved_order.status,
      'completed_at', v_saved_order.completed_at,
      'order_number', v_saved_order.order_number
    ),
    '{}'::jsonb
  );

  return query select
    v_saved_order.id,
    v_saved_order.status,
    v_saved_order.completed_at;
end;
$$;

create or replace function public.cancel_sales_order(
  p_sales_order_id uuid,
  p_reason text
)
returns table (
  sales_order_id uuid,
  status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := auth.uid();
  v_order public.sales_orders;
  v_reason text := nullif(pg_catalog.btrim(p_reason), '');
  v_active_payment_count bigint;
  v_active_payment_total numeric(18,2);
  v_sale_tx record;
  v_cancelled_at timestamptz;
  v_saved_order public.sales_orders;
begin
  if v_authenticated_user_id is null then
    raise exception 'sales authentication required' using errcode = '42501';
  end if;

  if p_sales_order_id is null then
    raise exception 'sales_order_id is required' using errcode = '22023';
  end if;

  select so.*
    into v_order
  from public.sales_orders so
  where so.id = p_sales_order_id
  for update;

  if not found then
    raise exception 'sales order not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_admin_sales(v_order.organization_id) then
    raise exception 'sales admin permission denied' using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'cancellation reason is required' using errcode = '22023';
  end if;

  if pg_catalog.length(v_reason) > 1000 then
    raise exception 'cancellation reason exceeds maximum length' using errcode = '22023';
  end if;

  if v_order.status not in ('draft', 'confirmed') then
    raise exception 'only draft or confirmed sales orders can be cancelled' using errcode = 'P0001';
  end if;

  select
    count(*),
    coalesce(pg_catalog.round(sum(pay.amount), 2), 0.00::numeric(18,2))
    into v_active_payment_count, v_active_payment_total
  from public.payments pay
  where pay.organization_id = v_order.organization_id
    and pay.sales_order_id = v_order.id
    and pay.status = 'completed';

  if v_active_payment_count > 0 or v_active_payment_total > 0 or v_order.paid_total > 0 then
    raise exception 'cannot cancel sales order with active completed payments' using errcode = 'P0001';
  end if;

  if v_order.status = 'confirmed' then
    for v_sale_tx in
      select
        it.warehouse_id as tx_warehouse_id,
        it.product_id as tx_product_id,
        pg_catalog.round(sum(-it.quantity_delta), 3) as restore_quantity
      from public.inventory_transactions it
      where it.organization_id = v_order.organization_id
        and it.reference_type = 'sales_order'
        and it.reference_id = v_order.id
        and it.transaction_type = 'sale_out'
      group by it.warehouse_id, it.product_id
      having sum(-it.quantity_delta) > 0
      order by it.warehouse_id, it.product_id
    loop
      perform public.apply_sales_order_inventory_movement(
        v_order.organization_id,
        v_sale_tx.tx_warehouse_id,
        v_sale_tx.tx_product_id,
        'return_in',
        v_sale_tx.restore_quantity,
        v_order.id,
        'Sales order ' || v_order.order_number || ' cancelled: ' || v_reason,
        v_authenticated_user_id,
        'sales_order:' || v_order.id::text || ':cancel:' || v_sale_tx.tx_product_id::text
      );
    end loop;
  end if;

  v_cancelled_at := pg_catalog.now();

  update public.sales_orders so
  set status = 'cancelled',
    cancelled_at = v_cancelled_at,
    cancellation_reason = v_reason
  where so.id = v_order.id
  returning * into v_saved_order;

  perform public.record_organization_audit_event(
    v_saved_order.organization_id,
    v_authenticated_user_id,
    'sales_order.cancelled',
    'sales_order',
    v_saved_order.id,
    pg_catalog.jsonb_build_object(
      'status', v_order.status,
      'warehouse_id', v_order.warehouse_id
    ),
    pg_catalog.jsonb_build_object(
      'status', v_saved_order.status,
      'cancelled_at', v_saved_order.cancelled_at,
      'cancellation_reason', v_saved_order.cancellation_reason,
      'order_number', v_saved_order.order_number
    ),
    '{}'::jsonb
  );

  return query select
    v_saved_order.id,
    v_saved_order.status,
    v_saved_order.cancelled_at;
end;
$$;

revoke execute on function public.prevent_non_draft_sales_order_item_mutation() from public, anon, authenticated, service_role;
revoke execute on function public.prevent_payments_immutable_update() from public, anon, authenticated, service_role;
revoke execute on function public.current_user_can_admin_sales(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.generate_sales_order_number(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.derive_sales_payment_status(numeric, numeric) from public, anon, authenticated, service_role;
revoke execute on function public.prepare_sales_order_items(uuid, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.apply_sales_order_inventory_movement(uuid, uuid, uuid, text, numeric, uuid, text, uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.create_sales_order_draft(uuid, jsonb, text, uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.update_sales_order_draft(uuid, uuid, jsonb, uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.confirm_sales_order(uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function public.record_sales_payment(uuid, numeric, text, timestamptz, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.void_sales_payment(uuid, text) from public, anon, authenticated, service_role;
revoke execute on function public.complete_sales_order(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.cancel_sales_order(uuid, text) from public, anon, authenticated, service_role;

grant execute on function public.current_user_can_admin_sales(uuid) to authenticated;
grant execute on function public.create_sales_order_draft(uuid, jsonb, text, uuid, text) to authenticated;
grant execute on function public.update_sales_order_draft(uuid, uuid, jsonb, uuid, text) to authenticated;
grant execute on function public.confirm_sales_order(uuid, uuid) to authenticated;
grant execute on function public.record_sales_payment(uuid, numeric, text, timestamptz, text, text) to authenticated;
grant execute on function public.void_sales_payment(uuid, text) to authenticated;
grant execute on function public.complete_sales_order(uuid) to authenticated;
grant execute on function public.cancel_sales_order(uuid, text) to authenticated;
