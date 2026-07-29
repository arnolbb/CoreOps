-- TASK-INV-001: warehouse and inventory ledger schema and RLS tests.

set client_min_messages = warning;

create or replace function public.test_assert(
  condition boolean,
  message text
)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create or replace function public.test_assert_eq(
  actual anyelement,
  expected anyelement,
  message text
)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'Assertion failed: % (expected %, got %)', message, expected, actual;
  end if;
end;
$$;

reset role;

delete from public.inventory_transactions;
delete from public.inventory_balances;
delete from public.warehouses;
delete from public.products;
delete from public.product_categories;
delete from public.organization_memberships;
delete from public.organizations;
delete from auth.users where email in ('owner-inv@example.test', 'admin-inv@example.test', 'staff-inv@example.test', 'viewer-inv@example.test', 'technician-inv@example.test', 'other-inv@example.test');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner-inv@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'admin-inv@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'staff-inv@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'viewer-inv@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'technician-inv@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'other-inv@example.test');

select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
select public.create_organization('INV Org Alpha', 'inv-org-alpha', 'general', 'UTC', 'USD');
reset role;

select public.set_authenticated_claims('66666666-6666-4666-8666-666666666666');
select public.create_organization('INV Org Beta', 'inv-org-beta', 'general', 'UTC', 'USD');
reset role;

do $$
declare
  org_alpha_id uuid;
  org_beta_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'inv-org-alpha';
  select id into org_beta_id from public.organizations where slug = 'inv-org-beta';

  insert into public.organization_memberships (organization_id, user_id, role, status)
  values
    (org_alpha_id, '22222222-2222-4222-8222-222222222222', 'admin', 'active'),
    (org_alpha_id, '33333333-3333-4333-8333-333333333333', 'staff', 'active'),
    (org_alpha_id, '44444444-4444-4444-8444-444444444444', 'viewer', 'active'),
    (org_alpha_id, '55555555-5555-4555-8555-555555555555', 'technician', 'active');
end;
$$;

set role authenticated;

-- Test 1: Owner can insert warehouse, product, balance, and transaction in Alpha
select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
do $$
declare
  org_alpha_id uuid;
  wh_id uuid;
  prod_id uuid;
  tx_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'inv-org-alpha';

  insert into public.warehouses (organization_id, name, code)
  values (org_alpha_id, 'Main Warehouse', 'WH-MAIN')
  returning id into wh_id;

  insert into public.products (
    organization_id, product_type, name, sku, unit, cost_price, selling_price, created_by
  )
  values (
    org_alpha_id, 'goods', 'Filter Replacement', 'FLT-002', 'pcs', 15.00, 30.00, '11111111-1111-4111-8111-111111111111'
  )
  returning id into prod_id;

  insert into public.inventory_balances (organization_id, warehouse_id, product_id, quantity)
  values (org_alpha_id, wh_id, prod_id, 100.000);

  insert into public.inventory_transactions (
    organization_id, warehouse_id, product_id, transaction_type, quantity_delta, quantity_before, quantity_after, created_by, idempotency_key
  )
  values (
    org_alpha_id, wh_id, prod_id, 'opening_stock', 100.000, 0.000, 100.000, '11111111-1111-4111-8111-111111111111', 'IDEM-001'
  )
  returning id into tx_id;

  perform public.test_assert(tx_id is not null, 'Transaction should be inserted');
end;
$$;
reset role;

-- Test 2: Technician can read warehouse and balance
set role authenticated;
select public.set_authenticated_claims('55555555-5555-4555-8555-555555555555');
do $$
declare
  wh_count integer;
  bal_count integer;
begin
  select count(*) into wh_count from public.warehouses;
  select count(*) into bal_count from public.inventory_balances;
  perform public.test_assert_eq(wh_count, 1, 'Technician should read 1 warehouse');
  perform public.test_assert_eq(bal_count, 1, 'Technician should read 1 inventory balance');
end;
$$;
reset role;

-- Test 3: Inventory transaction is append-only (update fails)
set role authenticated;
select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
do $$
declare
  tx_id uuid;
  update_failed boolean := false;
begin
  select id into tx_id from public.inventory_transactions limit 1;

  begin
    update public.inventory_transactions
    set reason = 'Attempted update'
    where id = tx_id;
  exception
    when others then
      update_failed := true;
  end;

  perform public.test_assert(update_failed, 'Updating inventory transaction should fail');
end;
$$;
reset role;

drop function public.test_assert(boolean, text);
drop function public.test_assert_eq(anyelement, anyelement, text);
