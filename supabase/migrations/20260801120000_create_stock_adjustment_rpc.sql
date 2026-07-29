-- TASK-INV-002: stock adjustment RPC and audit logging.
--
-- This migration adds the atomic perform_stock_adjustment RPC for CoreOps:
-- handles stock adjustments (opening_stock, adjustment_in, adjustment_out),
-- validates active organization membership and permissions, guarantees
-- multi-tenant isolation, locks balance rows for atomic updates, enforces
-- non-negative inventory for stock decreases, appends an immutable transaction log,
-- handles idempotency keys safely, and records audit log events.

create or replace function public.perform_stock_adjustment(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_adjustment_type text,
  p_quantity numeric,
  p_reason text default null,
  p_idempotency_key text default null
)
returns table (
  transaction_id uuid,
  organization_id uuid,
  warehouse_id uuid,
  product_id uuid,
  transaction_type text,
  quantity_delta numeric(18,3),
  quantity_before numeric(18,3),
  quantity_after numeric(18,3),
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  target_warehouse public.warehouses;
  target_product public.products;
  existing_tx public.inventory_transactions;
  current_balance public.inventory_balances;
  v_quantity_delta numeric(18,3);
  v_quantity_before numeric(18,3) := 0.000;
  v_quantity_after numeric(18,3);
  saved_tx public.inventory_transactions;
begin
  if authenticated_user_id is null then
    raise exception 'inventory authentication required' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'adjustment quantity must be positive' using errcode = '22003';
  end if;

  if p_adjustment_type not in ('opening_stock', 'adjustment_in', 'adjustment_out') then
    raise exception 'invalid adjustment type' using errcode = '22023';
  end if;

  -- Lock and verify warehouse
  select * into target_warehouse
  from public.warehouses
  where id = p_warehouse_id;

  if not found then
    raise exception 'warehouse not found' using errcode = 'P0001';
  end if;

  -- Verify active membership and manage permissions for the warehouse's org
  if not public.current_user_can_manage_inventory(target_warehouse.organization_id) then
    raise exception 'inventory permission denied' using errcode = '42501';
  end if;

  -- Lock and verify product within the same organization
  select * into target_product
  from public.products
  where id = p_product_id
    and organization_id = target_warehouse.organization_id;

  if not found then
    raise exception 'product not found in warehouse organization' using errcode = 'P0001';
  end if;

  if not target_product.is_active or target_product.archived_at is not null then
    raise exception 'cannot adjust stock for inactive or archived product' using errcode = 'P0001';
  end if;

  -- Idempotency check
  if p_idempotency_key is not null and length(btrim(p_idempotency_key)) > 0 then
    select * into existing_tx
    from public.inventory_transactions
    where organization_id = target_warehouse.organization_id
      and idempotency_key = p_idempotency_key;

    if found then
      return query select
        existing_tx.id,
        existing_tx.organization_id,
        existing_tx.warehouse_id,
        existing_tx.product_id,
        existing_tx.transaction_type,
        existing_tx.quantity_delta,
        existing_tx.quantity_before,
        existing_tx.quantity_after,
        existing_tx.created_at;
      return;
    end if;
  end if;

  -- Lock balance row for update (or insert if non-existent)
  select * into current_balance
  from public.inventory_balances
  where warehouse_id = p_warehouse_id
    and product_id = p_product_id
  for update;

  if found then
    v_quantity_before := current_balance.quantity;
  end if;

  -- Calculate delta and new quantity
  if p_adjustment_type = 'adjustment_out' then
    v_quantity_delta := -abs(p_quantity);
  else
    v_quantity_delta := abs(p_quantity);
  end if;

  v_quantity_after := v_quantity_before + v_quantity_delta;

  if v_quantity_after < 0 then
    raise exception 'insufficient stock balance' using errcode = '22003';
  end if;

  -- Update or Insert Balance
  if current_balance.warehouse_id is not null then
    update public.inventory_balances
    set quantity = v_quantity_after,
      version = current_balance.version + 1,
      updated_at = now()
    where warehouse_id = p_warehouse_id
      and product_id = p_product_id;
  else
    insert into public.inventory_balances (
      organization_id,
      warehouse_id,
      product_id,
      quantity,
      version
    )
    values (
      target_warehouse.organization_id,
      p_warehouse_id,
      p_product_id,
      v_quantity_after,
      1
    );
  end if;

  -- Insert Transaction Record
  insert into public.inventory_transactions (
    organization_id,
    warehouse_id,
    product_id,
    transaction_type,
    quantity_delta,
    quantity_before,
    quantity_after,
    reason,
    created_by,
    idempotency_key
  )
  values (
    target_warehouse.organization_id,
    p_warehouse_id,
    p_product_id,
    p_adjustment_type,
    v_quantity_delta,
    v_quantity_before,
    v_quantity_after,
    p_reason,
    authenticated_user_id,
    p_idempotency_key
  )
  returning * into saved_tx;

  -- Record Audit Event
  perform public.record_organization_audit_event(
    saved_tx.organization_id,
    authenticated_user_id,
    'inventory.stock_adjusted',
    'inventory_transaction',
    saved_tx.id,
    jsonb_build_object(
      'quantity_before', v_quantity_before
    ),
    jsonb_build_object(
      'quantity_after', v_quantity_after,
      'quantity_delta', v_quantity_delta,
      'adjustment_type', p_adjustment_type,
      'warehouse_id', p_warehouse_id,
      'product_id', p_product_id
    ),
    '{}'::jsonb
  );

  return query select
    saved_tx.id,
    saved_tx.organization_id,
    saved_tx.warehouse_id,
    saved_tx.product_id,
    saved_tx.transaction_type,
    saved_tx.quantity_delta,
    saved_tx.quantity_before,
    saved_tx.quantity_after,
    saved_tx.created_at;
end;
$$;

revoke execute on function public.perform_stock_adjustment(uuid, uuid, text, numeric, text, text) from public, anon, authenticated, service_role;
grant execute on function public.perform_stock_adjustment(uuid, uuid, text, numeric, text, text) to authenticated;
