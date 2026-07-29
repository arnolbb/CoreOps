-- TASK-INV-002: stock adjustment RPC tests.

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
delete from auth.users where email in ('owner-adj@example.test', 'viewer-adj@example.test');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner-adj@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'viewer-adj@example.test');

select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
select public.create_organization('ADJ Org Alpha', 'adj-org-alpha', 'general', 'UTC', 'USD');
reset role;

do $$
declare
  org_alpha_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'adj-org-alpha';
  insert into public.organization_memberships (organization_id, user_id, role, status)
  values (org_alpha_id, '44444444-4444-4444-8444-444444444444', 'viewer', 'active');
end;
$$;

-- Test 1: Owner performs opening stock and adjustment_out
set role authenticated;
select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
do $$
declare
  org_alpha_id uuid;
  wh_id uuid;
  prod_id uuid;
  res record;
begin
  select id into org_alpha_id from public.organizations where slug = 'adj-org-alpha';

  insert into public.warehouses (organization_id, name, code)
  values (org_alpha_id, 'Main Warehouse', 'WH-ADJ')
  returning id into wh_id;

  insert into public.products (
    organization_id, product_type, name, sku, unit, cost_price, selling_price, created_by
  )
  values (
    org_alpha_id, 'goods', 'Filter Element', 'FLT-ADJ', 'pcs', 10.00, 20.00, '11111111-1111-4111-8111-111111111111'
  )
  returning id into prod_id;

  -- Perform opening_stock 50
  select * into res from public.perform_stock_adjustment(wh_id, prod_id, 'opening_stock', 50.000, 'Initial Stock', 'IDEM-ADJ-1');
  perform public.test_assert_eq(res.quantity_before, 0.000, 'Before opening stock should be 0');
  perform public.test_assert_eq(res.quantity_after, 50.000, 'After opening stock should be 50');

  -- Perform adjustment_out 20
  select * into res from public.perform_stock_adjustment(wh_id, prod_id, 'adjustment_out', 20.000, 'Stock Out', 'IDEM-ADJ-2');
  perform public.test_assert_eq(res.quantity_before, 50.000, 'Before adjustment out should be 50');
  perform public.test_assert_eq(res.quantity_after, 30.000, 'After adjustment out should be 30');
end;
$$;
reset role;

-- Test 2: Idempotency check returns existing transaction
set role authenticated;
select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
do $$
declare
  wh_id uuid;
  prod_id uuid;
  res record;
begin
  select id into wh_id from public.warehouses limit 1;
  select id into prod_id from public.products limit 1;

  -- Re-send IDEM-ADJ-2
  select * into res from public.perform_stock_adjustment(wh_id, prod_id, 'adjustment_out', 20.000, 'Stock Out', 'IDEM-ADJ-2');
  perform public.test_assert_eq(res.quantity_after, 30.000, 'Idempotent call should return 30 without re-deducting');
end;
$$;
reset role;

-- Test 3: Viewer role is denied stock adjustment
set role authenticated;
select public.set_authenticated_claims('44444444-4444-4444-8444-444444444444');
do $$
declare
  wh_id uuid;
  prod_id uuid;
  denied boolean := false;
begin
  select id into wh_id from public.warehouses limit 1;
  select id into prod_id from public.products limit 1;

  begin
    perform public.perform_stock_adjustment(wh_id, prod_id, 'adjustment_in', 10.000, 'Viewer Attempt');
  exception
    when others then
      denied := true;
  end;

  perform public.test_assert(denied, 'Viewer should be denied stock adjustment');
end;
$$;
reset role;

drop function public.test_assert(boolean, text);
drop function public.test_assert_eq(anyelement, anyelement, text);
