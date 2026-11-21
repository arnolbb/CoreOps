\echo 'Running TASK-SAL-002 sales lifecycle RPCs, triggers, stock movement, and audit tests'

set client_min_messages = warning;

create or replace function pg_temp.set_authenticated_claims(test_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', test_user_id::text, false);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', test_user_id::text, 'role', 'authenticated')::text,
    false
  );
end;
$$;

create or replace function pg_temp.clear_authenticated_claims()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claims', '{}', false);
end;
$$;

create or replace function pg_temp.assert_eq(test_name text, actual bigint, expected bigint)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: %, expected %, got %', test_name, expected, actual;
  end if;

  raise notice 'PASS: %', test_name;
end;
$$;

create or replace function pg_temp.assert_numeric_eq(test_name text, actual numeric, expected numeric)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: %, expected %, got %', test_name, expected, actual;
  end if;

  raise notice 'PASS: %', test_name;
end;
$$;

create or replace function pg_temp.assert_text_eq(test_name text, actual text, expected text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: %, expected %, got %', test_name, expected, actual;
  end if;

  raise notice 'PASS: %', test_name;
end;
$$;

create or replace function pg_temp.assert_true(test_name text, actual boolean)
returns void
language plpgsql
as $$
begin
  if actual is not true then
    raise exception 'FAIL: %, expected true, got %', test_name, actual;
  end if;

  raise notice 'PASS: %', test_name;
end;
$$;

create or replace function pg_temp.assert_false(test_name text, actual boolean)
returns void
language plpgsql
as $$
begin
  if actual is not false then
    raise exception 'FAIL: %, expected false, got %', test_name, actual;
  end if;

  raise notice 'PASS: %', test_name;
end;
$$;

create or replace function pg_temp.assert_raises(
  test_name text,
  statement text,
  expected_sqlstate text default null
)
returns void
language plpgsql
as $$
declare
  caught_sqlstate text;
begin
  begin
    execute statement;
  exception when others then
    caught_sqlstate := sqlstate;
  end;

  if caught_sqlstate is null then
    raise exception 'FAIL: %, expected exception but statement succeeded', test_name;
  end if;

  if expected_sqlstate is not null and caught_sqlstate <> expected_sqlstate then
    raise exception 'FAIL: %, expected SQLSTATE %, got %', test_name, expected_sqlstate, caught_sqlstate;
  end if;

  raise notice 'PASS: %', test_name;
end;
$$;

reset role;

alter table public.organization_memberships
  disable trigger organization_memberships_prevent_last_active_owner_loss;

alter table public.sales_order_items
  disable trigger sales_order_items_prevent_non_draft_mutation;

delete from public.payments
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.sales_order_items
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.sales_orders
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.inventory_transactions
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.inventory_balances
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.warehouses
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.products
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.customers
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.audit_logs
where organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000601'::uuid,
  '00000000-0000-4000-8000-000000000602'::uuid,
  '00000000-0000-4000-8000-000000000603'::uuid,
  '00000000-0000-4000-8000-000000000604'::uuid,
  '00000000-0000-4000-8000-000000000605'::uuid,
  '00000000-0000-4000-8000-000000000606'::uuid,
  '00000000-0000-4000-8000-000000000607'::uuid,
  '00000000-0000-4000-8000-000000000608'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'sal-002-test-%'
);

delete from public.organizations where slug like 'sal-002-test-%';

alter table public.sales_order_items
  enable trigger sales_order_items_prevent_non_draft_mutation;

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000601'::uuid,
  '00000000-0000-4000-8000-000000000602'::uuid,
  '00000000-0000-4000-8000-000000000603'::uuid,
  '00000000-0000-4000-8000-000000000604'::uuid,
  '00000000-0000-4000-8000-000000000605'::uuid,
  '00000000-0000-4000-8000-000000000606'::uuid,
  '00000000-0000-4000-8000-000000000607'::uuid,
  '00000000-0000-4000-8000-000000000608'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000601'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000602'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-admin-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000603'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-staff-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000604'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000605'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-tech-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000606'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000607'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000608'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-002-non-member@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

-- Schema and execute privilege checks
select pg_temp.assert_eq(
  'sales_orders has warehouse_id and cancellation_reason columns',
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sales_orders'
      and column_name in ('warehouse_id', 'cancellation_reason')
  ),
  2
);

select pg_temp.assert_true(
  'authenticated can execute all 7 sales RPCs and admin helper',
  has_function_privilege('authenticated', 'public.current_user_can_admin_sales(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.create_sales_order_draft(uuid, jsonb, text, uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.update_sales_order_draft(uuid, uuid, jsonb, uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.confirm_sales_order(uuid, uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.record_sales_payment(uuid, numeric, text, timestamptz, text, text)', 'execute')
  and has_function_privilege('authenticated', 'public.void_sales_payment(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.complete_sales_order(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.cancel_sales_order(uuid, text)', 'execute')
);

select pg_temp.assert_false(
  'anon cannot execute any sales RPC',
  has_function_privilege('anon', 'public.create_sales_order_draft(uuid, jsonb, text, uuid, text)', 'execute')
  or has_function_privilege('anon', 'public.update_sales_order_draft(uuid, uuid, jsonb, uuid, text)', 'execute')
  or has_function_privilege('anon', 'public.confirm_sales_order(uuid, uuid)', 'execute')
  or has_function_privilege('anon', 'public.record_sales_payment(uuid, numeric, text, timestamptz, text, text)', 'execute')
  or has_function_privilege('anon', 'public.void_sales_payment(uuid, text)', 'execute')
  or has_function_privilege('anon', 'public.complete_sales_order(uuid)', 'execute')
  or has_function_privilege('anon', 'public.cancel_sales_order(uuid, text)', 'execute')
);

select pg_temp.assert_false(
  'authenticated cannot execute private helper functions',
  has_function_privilege('authenticated', 'public.generate_sales_order_number(uuid)', 'execute')
  or has_function_privilege('authenticated', 'public.prepare_sales_order_items(uuid, jsonb)', 'execute')
  or has_function_privilege('authenticated', 'public.derive_sales_payment_status(numeric, numeric)', 'execute')
  or has_function_privilege('authenticated', 'public.apply_sales_order_inventory_movement(uuid, uuid, uuid, text, numeric, uuid, text, uuid, text)', 'execute')
  or has_function_privilege('authenticated', 'public.prevent_non_draft_sales_order_item_mutation()', 'execute')
  or has_function_privilege('authenticated', 'public.prevent_payments_immutable_update()', 'execute')
);

-- Seed Alpha and Beta organizations
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000601'::uuid);
select public.create_organization('SAL 002 Test Alpha', 'sal-002-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000607'::uuid);
select public.create_organization('SAL 002 Test Beta', 'sal-002-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table sal_002_org_ids as
select slug, id from public.organizations where slug like 'sal-002-test-%';
grant select on sal_002_org_ids to authenticated;

-- Seed memberships, warehouses, customers, products, and initial stock in Alpha
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000601'::uuid);

insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), '00000000-0000-4000-8000-000000000602'::uuid, 'admin', 'active'),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), '00000000-0000-4000-8000-000000000603'::uuid, 'staff', 'active'),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), '00000000-0000-4000-8000-000000000604'::uuid, 'viewer', 'active'),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), '00000000-0000-4000-8000-000000000605'::uuid, 'technician', 'active'),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), '00000000-0000-4000-8000-000000000606'::uuid, 'staff', 'disabled');

insert into public.warehouses (organization_id, name, code, is_active) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'Alpha Active Warehouse', 'WH-SAL-1', true),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'Alpha Inactive Warehouse', 'WH-SAL-OFF', false);

insert into public.customers (organization_id, customer_type, display_name, created_by) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'individual', 'SAL 002 Alpha Customer', '00000000-0000-4000-8000-000000000601'::uuid),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'business', 'SAL 002 Alpha Customer Two', '00000000-0000-4000-8000-000000000601'::uuid),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'individual', 'SAL 002 Alpha Archived Customer', '00000000-0000-4000-8000-000000000601'::uuid);

select public.archive_customer(
  (select id from public.customers where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha') and display_name = 'SAL 002 Alpha Archived Customer')
);

insert into public.products (organization_id, product_type, name, sku, unit, cost_price, selling_price, track_inventory, created_by) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'goods', 'Tracked Goods One', 'SAL-GOODS-TRK', 'pcs', 40.00, 100.00, true, '00000000-0000-4000-8000-000000000601'::uuid),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'goods', 'Tracked Goods Two', 'SAL-GOODS-2', 'pcs', 10.00, 25.00, true, '00000000-0000-4000-8000-000000000601'::uuid),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'goods', 'Non-Tracked Goods', 'SAL-GOODS-NOTRK', 'box', 20.00, 50.00, false, '00000000-0000-4000-8000-000000000601'::uuid),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'service', 'Standard Service', 'SAL-SVC-1', 'job', 0.00, 40.00, false, '00000000-0000-4000-8000-000000000601'::uuid),
  ((select id from sal_002_org_ids where slug = 'sal-002-test-alpha'), 'goods', 'Archived Goods', 'SAL-ARCHIVED', 'pcs', 5.00, 15.00, true, '00000000-0000-4000-8000-000000000601'::uuid);

select public.archive_product(
  (select id from public.products where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha') and sku = 'SAL-ARCHIVED')
);

select public.perform_stock_adjustment(
  (select id from public.warehouses where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha') and code = 'WH-SAL-1'),
  (select id from public.products where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha') and sku = 'SAL-GOODS-TRK'),
  'opening_stock',
  10.000,
  'Initial tracked stock',
  'SAL-002-INIT-1'
);

select public.perform_stock_adjustment(
  (select id from public.warehouses where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha') and code = 'WH-SAL-1'),
  (select id from public.products where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha') and sku = 'SAL-GOODS-2'),
  'opening_stock',
  50.000,
  'Initial secondary tracked stock',
  'SAL-002-INIT-2'
);
reset role;

-- Seed Beta resources
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000607'::uuid);
insert into public.warehouses (organization_id, name, code, is_active) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-beta'), 'Beta Active Warehouse', 'WH-SAL-BETA', true);
insert into public.customers (organization_id, customer_type, display_name, created_by) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-beta'), 'individual', 'SAL 002 Beta Customer', '00000000-0000-4000-8000-000000000607'::uuid);
insert into public.products (organization_id, product_type, name, sku, unit, cost_price, selling_price, track_inventory, created_by) values
  ((select id from sal_002_org_ids where slug = 'sal-002-test-beta'), 'goods', 'Beta Goods', 'SAL-BETA-1', 'pcs', 30.00, 75.00, true, '00000000-0000-4000-8000-000000000607'::uuid);
reset role;

create temp table sal_002_warehouses as
select organization_id, code, id from public.warehouses
where organization_id in (select id from sal_002_org_ids);
grant select on sal_002_warehouses to authenticated;

create temp table sal_002_customers as
select organization_id, display_name, id from public.customers
where organization_id in (select id from sal_002_org_ids);
grant select on sal_002_customers to authenticated;

create temp table sal_002_products as
select organization_id, sku, id from public.products
where organization_id in (select id from sal_002_org_ids);
grant select on sal_002_products to authenticated;

create temp table sal_002_draft_results (
  tag text primary key,
  sales_order_id uuid not null,
  order_number text not null,
  status text not null,
  payment_status text not null,
  currency_code char(3) not null,
  subtotal numeric(18,2) not null,
  discount_total numeric(18,2) not null,
  tax_total numeric(18,2) not null,
  grand_total numeric(18,2) not null,
  paid_total numeric(18,2) not null
);
grant select, insert on sal_002_draft_results to authenticated;

create temp table sal_002_confirm_results (
  tag text primary key,
  sales_order_id uuid not null,
  status text not null,
  warehouse_id uuid null,
  confirmed_at timestamptz not null
);
grant select, insert on sal_002_confirm_results to authenticated;

create temp table sal_002_payment_results (
  tag text primary key,
  payment_id uuid not null,
  sales_order_id uuid not null,
  amount numeric(18,2) not null,
  paid_total numeric(18,2) not null,
  payment_status text not null
);
grant select, insert on sal_002_payment_results to authenticated;

create temp table sal_002_void_results (
  tag text primary key,
  payment_id uuid not null,
  sales_order_id uuid not null,
  paid_total numeric(18,2) not null,
  payment_status text not null
);
grant select, insert on sal_002_void_results to authenticated;

-- Test 1: create_sales_order_draft, auto order number, server-side calculations, input guards
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000603'::uuid);

insert into sal_002_draft_results
select 'draft1', r.*
from public.create_sales_order_draft(
  (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'),
      'quantity', 2,
      'discount_amount', 10.00,
      'tax_amount', 19.00,
      'line_total', 1.00
    ),
    jsonb_build_object(
      'product_id', (select id from sal_002_products where sku = 'SAL-GOODS-NOTRK'),
      'quantity', 1
    ),
    jsonb_build_object(
      'product_id', (select id from sal_002_products where sku = 'SAL-SVC-1'),
      'quantity', 1
    ),
    jsonb_build_object(
      'item_type', 'custom',
      'name_snapshot', 'Delivery Fee',
      'unit_snapshot', 'trip',
      'quantity', 1,
      'unit_price', 25.00,
      'discount_amount', 5.00,
      'tax_amount', 2.00
    )
  ),
  null,
  null,
  'First draft order'
) as r;

select pg_temp.assert_text_eq(
  'auto-generated first order number matches SO-YYYY-0001',
  (select order_number from sal_002_draft_results where tag = 'draft1'),
  'SO-' || to_char(now() at time zone 'UTC', 'YYYY') || '-0001'
);

select pg_temp.assert_text_eq(
  'draft 1 initial status is draft and currency is USD',
  (select status || ':' || payment_status || ':' || currency_code from sal_002_draft_results where tag = 'draft1'),
  'draft:unpaid:USD'
);

select pg_temp.assert_numeric_eq('draft 1 subtotal calculated server-side', (select subtotal from sal_002_draft_results where tag = 'draft1'), 315.00);
select pg_temp.assert_numeric_eq('draft 1 discount_total calculated server-side', (select discount_total from sal_002_draft_results where tag = 'draft1'), 15.00);
select pg_temp.assert_numeric_eq('draft 1 tax_total calculated server-side', (select tax_total from sal_002_draft_results where tag = 'draft1'), 21.00);
select pg_temp.assert_numeric_eq('draft 1 grand_total ignores tampered line_total', (select grand_total from sal_002_draft_results where tag = 'draft1'), 321.00);
select pg_temp.assert_numeric_eq('draft 1 paid_total starts at 0.00', (select paid_total from sal_002_draft_results where tag = 'draft1'), 0.00);

select pg_temp.assert_eq(
  'draft 1 persisted 4 sales_order_items',
  (select count(*) from public.sales_order_items where sales_order_id = (select sales_order_id from sal_002_draft_results where tag = 'draft1')),
  4
);

-- Create Draft 2 and verify sequential auto order number SO-YYYY-0002
insert into sal_002_draft_results
select 'draft2', r.*
from public.create_sales_order_draft(
  (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'),
      'quantity', 1
    )
  ),
  '   ',
  (select id from sal_002_warehouses where code = 'WH-SAL-1'),
  'Second draft'
) as r;

select pg_temp.assert_text_eq(
  'auto-generated second order number increments to SO-YYYY-0002',
  (select order_number from sal_002_draft_results where tag = 'draft2'),
  'SO-' || to_char(now() at time zone 'UTC', 'YYYY') || '-0002'
);

-- Validation rejections on create_sales_order_draft
select pg_temp.assert_raises(
  'empty items array rejected',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      '[]'::jsonb
    )
  $$,
  '22023'
);

select pg_temp.assert_raises(
  'non-positive quantity rejected',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'), 'quantity', 0))
    )
  $$,
  '22003'
);

select pg_temp.assert_raises(
  'discount exceeding line subtotal rejected',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'), 'quantity', 1, 'discount_amount', 150.00))
    )
  $$,
  '22003'
);

select pg_temp.assert_raises(
  'archived customer rejected on draft creation',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Archived Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'), 'quantity', 1))
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'archived product rejected on draft creation',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-ARCHIVED'), 'quantity', 1))
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'cross-tenant warehouse rejected in create_sales_order_draft',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'), 'quantity', 1)),
      null,
      (select id from sal_002_warehouses where code = 'WH-SAL-BETA')
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'cross-tenant product rejected in create_sales_order_draft',
  $$
    select * from public.create_sales_order_draft(
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-BETA-1'), 'quantity', 1))
    )
  $$,
  'P0001'
);

-- Test 2: update_sales_order_draft replaces items and recalculates totals
insert into sal_002_draft_results
select 'draft2_updated', r.*
from public.update_sales_order_draft(
  (select sales_order_id from sal_002_draft_results where tag = 'draft2'),
  (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer Two'),
  jsonb_build_array(
    jsonb_build_object(
      'product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'),
      'quantity', 2,
      'tax_amount', 10.00
    ),
    jsonb_build_object(
      'item_type', 'custom',
      'name_snapshot', 'Setup',
      'unit_snapshot', 'job',
      'quantity', 1,
      'unit_price', 90.00
    )
  ),
  (select id from sal_002_warehouses where code = 'WH-SAL-1'),
  'Updated draft two'
) as r;

select pg_temp.assert_numeric_eq('updated draft 2 subtotal is 290.00', (select subtotal from sal_002_draft_results where tag = 'draft2_updated'), 290.00);
select pg_temp.assert_numeric_eq('updated draft 2 tax_total is 10.00', (select tax_total from sal_002_draft_results where tag = 'draft2_updated'), 10.00);
select pg_temp.assert_numeric_eq('updated draft 2 grand_total is 300.00', (select grand_total from sal_002_draft_results where tag = 'draft2_updated'), 300.00);
select pg_temp.assert_eq(
  'updated draft 2 has 2 items after replacing previous items',
  (select count(*) from public.sales_order_items where sales_order_id = (select sales_order_id from sal_002_draft_results where tag = 'draft2')),
  2
);

-- Test 3: Insufficient stock rollback + confirm_sales_order + non-draft item mutation guard
insert into sal_002_draft_results
select 'draft3_insuff', r.*
from public.create_sales_order_draft(
  (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
  jsonb_build_array(
    jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-GOODS-2'), 'quantity', 5.000),
    jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-GOODS-TRK'), 'quantity', 99.000)
  ),
  'SO-INSUFF-01',
  (select id from sal_002_warehouses where code = 'WH-SAL-1')
) as r;

select pg_temp.assert_raises(
  'confirming order with insufficient tracked stock fails with 22003',
  $$
    select * from public.confirm_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft3_insuff'))
  $$,
  '22003'
);

select pg_temp.assert_numeric_eq(
  'insufficient stock failure rolled back first tracked product balance',
  (
    select quantity
    from public.inventory_balances
    where warehouse_id = (select id from sal_002_warehouses where code = 'WH-SAL-1')
      and product_id = (select id from sal_002_products where sku = 'SAL-GOODS-2')
  ),
  50.000
);

select pg_temp.assert_text_eq(
  'insufficient stock failure kept order in draft status',
  (select status from public.sales_orders where id = (select sales_order_id from sal_002_draft_results where tag = 'draft3_insuff')),
  'draft'
);

-- Confirming draft 1 without warehouse or with inactive warehouse fails
select pg_temp.assert_raises(
  'confirming tracked goods draft without warehouse fails',
  $$
    select * from public.confirm_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft1'), null)
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'confirming draft with inactive warehouse fails',
  $$
    select * from public.confirm_sales_order(
      (select sales_order_id from sal_002_draft_results where tag = 'draft1'),
      (select id from sal_002_warehouses where code = 'WH-SAL-OFF')
    )
  $$,
  'P0001'
);

-- Service/custom-only draft confirms cleanly with null warehouse_id and zero inventory transactions
insert into sal_002_draft_results
select 'draft4_svc', r.*
from public.create_sales_order_draft(
  (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
  jsonb_build_array(
    jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-SVC-1'), 'quantity', 2)
  ),
  'SO-SVC-ONLY-01'
) as r;

select pg_temp.assert_text_eq(
  'service-only order confirms without warehouse_id',
  (
    select status
    from public.confirm_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft4_svc'), null)
  ),
  'confirmed'
);

select pg_temp.assert_eq(
  'service-only confirmation writes zero inventory_transactions',
  (
    select count(*)
    from public.inventory_transactions
    where reference_type = 'sales_order'
      and reference_id = (select sales_order_id from sal_002_draft_results where tag = 'draft4_svc')
  ),
  0
);

-- Confirm Draft 1 with active warehouse WH-SAL-1
insert into sal_002_confirm_results
select 'draft1_confirmed', r.*
from public.confirm_sales_order(
  (select sales_order_id from sal_002_draft_results where tag = 'draft1'),
  (select id from sal_002_warehouses where code = 'WH-SAL-1')
) as r;

select pg_temp.assert_text_eq(
  'draft 1 transitions to confirmed',
  (select status from sal_002_confirm_results where tag = 'draft1_confirmed'),
  'confirmed'
);

select pg_temp.assert_numeric_eq(
  'draft 1 confirmation deducted tracked goods from 10.000 to 8.000',
  (
    select quantity
    from public.inventory_balances
    where warehouse_id = (select id from sal_002_warehouses where code = 'WH-SAL-1')
      and product_id = (select id from sal_002_products where sku = 'SAL-GOODS-TRK')
  ),
  8.000
);

select pg_temp.assert_eq(
  'draft 1 confirmation created exactly 1 sale_out inventory transaction',
  (
    select count(*)
    from public.inventory_transactions
    where reference_type = 'sales_order'
      and reference_id = (select sales_order_id from sal_002_draft_results where tag = 'draft1')
      and transaction_type = 'sale_out'
      and quantity_delta = -2.000
      and quantity_before = 10.000
      and quantity_after = 8.000
  ),
  1
);

-- Non-draft edit blocks (RPC + direct table trigger)
select pg_temp.assert_raises(
  'update_sales_order_draft blocks confirmed order',
  $$
    select * from public.update_sales_order_draft(
      (select sales_order_id from sal_002_draft_results where tag = 'draft1'),
      (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer'),
      jsonb_build_array(jsonb_build_object('product_id', (select id from sal_002_products where sku = 'SAL-SVC-1'), 'quantity', 1))
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  're-confirming confirmed order rejected',
  $$
    select * from public.confirm_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft1'))
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'direct insert into sales_order_items blocked for non-draft order (23514)',
  $$
    insert into public.sales_order_items (
      organization_id, sales_order_id, item_type, name_snapshot, unit_snapshot, quantity, unit_price, line_total
    ) values (
      (select id from sal_002_org_ids where slug = 'sal-002-test-alpha'),
      (select sales_order_id from sal_002_draft_results where tag = 'draft1'),
      'custom', 'Tamper Item', 'unit', 1.000, 10.00, 10.00
    )
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'direct update on sales_order_items blocked for non-draft order (23514)',
  $$
    update public.sales_order_items
    set quantity = 99.000
    where sales_order_id = (select sales_order_id from sal_002_draft_results where tag = 'draft1')
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'direct delete on sales_order_items blocked for non-draft order (23514)',
  $$
    delete from public.sales_order_items
    where sales_order_id = (select sales_order_id from sal_002_draft_results where tag = 'draft1')
  $$,
  '23514'
);

-- Test 4: record_sales_payment, overpayment block, immutability trigger, void_sales_payment
select pg_temp.assert_raises(
  'recording payment on draft order rejected',
  $$
    select * from public.record_sales_payment((select sales_order_id from sal_002_draft_results where tag = 'draft2'), 10.00, 'cash')
  $$,
  'P0001'
);

insert into sal_002_payment_results
select 'pay1', r.*
from public.record_sales_payment(
  (select sales_order_id from sal_002_draft_results where tag = 'draft1'),
  100.00,
  'cash',
  now(),
  'RCPT-001',
  'Partial deposit'
) as r;

select pg_temp.assert_numeric_eq('payment 1 updates paid_total to 100.00', (select paid_total from sal_002_payment_results where tag = 'pay1'), 100.00);
select pg_temp.assert_text_eq('payment 1 sets payment_status to partially_paid', (select payment_status from sal_002_payment_results where tag = 'pay1'), 'partially_paid');

select pg_temp.assert_raises(
  'overpayment exceeding grand_total rejected (22003)',
  $$
    select * from public.record_sales_payment(
      (select sales_order_id from sal_002_draft_results where tag = 'draft1'),
      222.00,
      'cash'
    )
  $$,
  '22003'
);

select pg_temp.assert_raises(
  'payments immutability trigger blocks direct amount update (23514)',
  $$
    update public.payments
    set amount = 1.00
    where id = (select payment_id from sal_002_payment_results where tag = 'pay1')
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'payments immutability trigger blocks direct payment_method update (23514)',
  $$
    update public.payments
    set payment_method = 'other'
    where id = (select payment_id from sal_002_payment_results where tag = 'pay1')
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'staff cannot void payment (42501)',
  $$
    select * from public.void_sales_payment((select payment_id from sal_002_payment_results where tag = 'pay1'), 'Staff attempt')
  $$,
  '42501'
);
reset role;

-- Admin voids payment 1
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000602'::uuid);

select pg_temp.assert_raises(
  'void_sales_payment rejects blank void reason',
  $$
    select * from public.void_sales_payment((select payment_id from sal_002_payment_results where tag = 'pay1'), '   ')
  $$,
  '22023'
);

insert into sal_002_void_results
select 'pay1_voided', r.*
from public.void_sales_payment((select payment_id from sal_002_payment_results where tag = 'pay1'), 'Customer bounced check') as r;

select pg_temp.assert_numeric_eq('voiding payment recalculates paid_total to 0.00', (select paid_total from sal_002_void_results where tag = 'pay1_voided'), 0.00);
select pg_temp.assert_text_eq('voiding payment recalculates payment_status to unpaid', (select payment_status from sal_002_void_results where tag = 'pay1_voided'), 'unpaid');

select pg_temp.assert_raises(
  'voiding already voided payment rejected',
  $$
    select * from public.void_sales_payment((select payment_id from sal_002_payment_results where tag = 'pay1'), 'Second void')
  $$,
  'P0001'
);
reset role;

-- Staff records full payment in two installments and completes Draft 1
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000603'::uuid);

select pg_temp.assert_text_eq(
  'first new payment after void sets partially_paid',
  (select payment_status from public.record_sales_payment((select sales_order_id from sal_002_draft_results where tag = 'draft1'), 200.00, 'bank_transfer')),
  'partially_paid'
);

select pg_temp.assert_text_eq(
  'second payment covering remaining balance sets paid',
  (select payment_status from public.record_sales_payment((select sales_order_id from sal_002_draft_results where tag = 'draft1'), 121.00, 'credit_card')),
  'paid'
);

-- Test 5: complete_sales_order
select pg_temp.assert_raises(
  'completing draft order rejected',
  $$
    select * from public.complete_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft2'))
  $$,
  'P0001'
);

select pg_temp.assert_text_eq(
  'staff completes confirmed order',
  (select status from public.complete_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft1'))),
  'completed'
);

-- Test 6: Confirm Draft 2, record payment, block cancel with active payment, void, cancel + return_in
select public.confirm_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft2'));

select pg_temp.assert_numeric_eq(
  'confirming draft 2 deducted tracked goods from 8.000 to 6.000',
  (
    select quantity
    from public.inventory_balances
    where warehouse_id = (select id from sal_002_warehouses where code = 'WH-SAL-1')
      and product_id = (select id from sal_002_products where sku = 'SAL-GOODS-TRK')
  ),
  6.000
);

insert into sal_002_payment_results
select 'pay_d2', r.*
from public.record_sales_payment(
  (select sales_order_id from sal_002_draft_results where tag = 'draft2'),
  50.00,
  'cash'
) as r;

select pg_temp.assert_raises(
  'staff cannot cancel sales order (42501)',
  $$
    select * from public.cancel_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft2'), 'Staff attempt')
  $$,
  '42501'
);
reset role;

-- Owner tests cancel guards, voids payment, then cancels Draft 2
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000601'::uuid);

select pg_temp.assert_raises(
  'completed order cannot be cancelled',
  $$
    select * from public.cancel_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft1'), 'Cannot cancel completed')
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'cancel_sales_order rejects blank reason',
  $$
    select * from public.cancel_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft2'), '   ')
  $$,
  '22023'
);

select pg_temp.assert_raises(
  'cancel_sales_order rejects order with active completed payments',
  $$
    select * from public.cancel_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft2'), 'Unvoided payment present')
  $$,
  'P0001'
);

select public.void_sales_payment((select payment_id from sal_002_payment_results where tag = 'pay_d2'), 'Voided before order cancellation');

select pg_temp.assert_text_eq(
  'owner cancels confirmed order after voiding payment',
  (select status from public.cancel_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft2'), 'Customer cancelled order')),
  'cancelled'
);

select pg_temp.assert_text_eq(
  'cancellation_reason saved on cancelled order',
  (select cancellation_reason from public.sales_orders where id = (select sales_order_id from sal_002_draft_results where tag = 'draft2')),
  'Customer cancelled order'
);

select pg_temp.assert_numeric_eq(
  'cancelling confirmed order restored tracked goods from 6.000 back to 8.000',
  (
    select quantity
    from public.inventory_balances
    where warehouse_id = (select id from sal_002_warehouses where code = 'WH-SAL-1')
      and product_id = (select id from sal_002_products where sku = 'SAL-GOODS-TRK')
  ),
  8.000
);

select pg_temp.assert_eq(
  'cancelling confirmed order created return_in inventory transaction',
  (
    select count(*)
    from public.inventory_transactions
    where reference_type = 'sales_order'
      and reference_id = (select sales_order_id from sal_002_draft_results where tag = 'draft2')
      and transaction_type = 'return_in'
      and quantity_delta = 2.000
      and quantity_before = 6.000
      and quantity_after = 8.000
  ),
  1
);

-- Admin can also cancel a draft order without creating inventory return_in transactions
reset role;
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000602'::uuid);

select pg_temp.assert_text_eq(
  'admin cancels draft order cleanly',
  (select status from public.cancel_sales_order((select sales_order_id from sal_002_draft_results where tag = 'draft3_insuff'), 'Draft abandoned')),
  'cancelled'
);

select pg_temp.assert_eq(
  'cancelling draft order creates zero return_in inventory transactions',
  (
    select count(*)
    from public.inventory_transactions
    where reference_type = 'sales_order'
      and reference_id = (select sales_order_id from sal_002_draft_results where tag = 'draft3_insuff')
      and transaction_type = 'return_in'
  ),
  0
);
reset role;

-- Capture Alpha IDs in shared temp table so cross-tenant and denied roles can target them
create temp table sal_002_target_ids as
select
  (select id from sal_002_customers where display_name = 'SAL 002 Alpha Customer') as alpha_customer_id,
  (select id from sal_002_products where sku = 'SAL-SVC-1') as alpha_service_id,
  (select sales_order_id from sal_002_draft_results where tag = 'draft4_svc') as alpha_confirmed_order_id,
  (select payment_id from sal_002_payment_results where tag = 'pay1') as alpha_payment_id;
grant select on sal_002_target_ids to authenticated;

-- Test 7: Unauthenticated, Viewer, Technician, Disabled, Non-Member, and Cross-Tenant 42501 denials
set role authenticated;
select pg_temp.clear_authenticated_claims();
select pg_temp.assert_raises(
  'unauthenticated user denied create_sales_order_draft (42501)',
  $$
    select * from public.create_sales_order_draft(
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'unauthenticated user denied cancel_sales_order (42501)',
  $$
    select * from public.cancel_sales_order((select alpha_confirmed_order_id from sal_002_target_ids), 'No auth')
  $$,
  '42501'
);
reset role;

-- Viewer (604) denied
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000604'::uuid);
select pg_temp.assert_raises(
  'viewer denied create_sales_order_draft (42501)',
  $$
    select * from public.create_sales_order_draft(
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'viewer denied record_sales_payment (42501)',
  $$
    select * from public.record_sales_payment((select alpha_confirmed_order_id from sal_002_target_ids), 10.00, 'cash')
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'viewer denied complete_sales_order (42501)',
  $$
    select * from public.complete_sales_order((select alpha_confirmed_order_id from sal_002_target_ids))
  $$,
  '42501'
);
reset role;

-- Technician (605) denied
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000605'::uuid);
select pg_temp.assert_raises(
  'technician denied create_sales_order_draft (42501)',
  $$
    select * from public.create_sales_order_draft(
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'technician denied confirm_sales_order (42501)',
  $$
    select * from public.confirm_sales_order((select alpha_confirmed_order_id from sal_002_target_ids))
  $$,
  '42501'
);
reset role;

-- Disabled member (606) denied
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000606'::uuid);
select pg_temp.assert_raises(
  'disabled member denied create_sales_order_draft (42501)',
  $$
    select * from public.create_sales_order_draft(
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'disabled member denied record_sales_payment (42501)',
  $$
    select * from public.record_sales_payment((select alpha_confirmed_order_id from sal_002_target_ids), 10.00, 'cash')
  $$,
  '42501'
);
reset role;

-- Non-member (608) denied
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000608'::uuid);
select pg_temp.assert_raises(
  'non-member denied create_sales_order_draft (42501)',
  $$
    select * from public.create_sales_order_draft(
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
reset role;

-- Cross-tenant Beta owner (607) denied on ALL 7 RPCs targeting Alpha resources
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000607'::uuid);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied create_sales_order_draft on Alpha customer (42501)',
  $$
    select * from public.create_sales_order_draft(
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied update_sales_order_draft on Alpha order (42501)',
  $$
    select * from public.update_sales_order_draft(
      (select alpha_confirmed_order_id from sal_002_target_ids),
      (select alpha_customer_id from sal_002_target_ids),
      jsonb_build_array(jsonb_build_object('product_id', (select alpha_service_id from sal_002_target_ids), 'quantity', 1))
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied confirm_sales_order on Alpha order (42501)',
  $$
    select * from public.confirm_sales_order((select alpha_confirmed_order_id from sal_002_target_ids))
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied record_sales_payment on Alpha order (42501)',
  $$
    select * from public.record_sales_payment((select alpha_confirmed_order_id from sal_002_target_ids), 10.00, 'cash')
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied void_sales_payment on Alpha payment (42501)',
  $$
    select * from public.void_sales_payment((select alpha_payment_id from sal_002_target_ids), 'Cross-tenant attempt')
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied complete_sales_order on Alpha order (42501)',
  $$
    select * from public.complete_sales_order((select alpha_confirmed_order_id from sal_002_target_ids))
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cross-tenant beta owner denied cancel_sales_order on Alpha order (42501)',
  $$
    select * from public.cancel_sales_order((select alpha_confirmed_order_id from sal_002_target_ids), 'Cross-tenant attempt')
  $$,
  '42501'
);
reset role;

-- Verify audit_logs recorded for all lifecycle transitions
select pg_temp.assert_eq(
  'sales_order.confirmed audit events recorded for 3 confirmed orders',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha')
      and action = 'sales_order.confirmed'
  ),
  3
);

select pg_temp.assert_eq(
  'payment.recorded audit events recorded for 4 payments',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha')
      and action = 'payment.recorded'
  ),
  4
);

select pg_temp.assert_eq(
  'payment.voided audit events recorded for 2 voided payments',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha')
      and action = 'payment.voided'
  ),
  2
);

select pg_temp.assert_eq(
  'sales_order.completed audit event recorded',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha')
      and action = 'sales_order.completed'
  ),
  1
);

select pg_temp.assert_eq(
  'sales_order.cancelled audit events recorded for 2 cancelled orders',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from sal_002_org_ids where slug = 'sal-002-test-alpha')
      and action = 'sales_order.cancelled'
  ),
  2
);

\echo 'TASK-SAL-002 sales lifecycle RPCs, triggers, stock movement, and audit tests passed'
