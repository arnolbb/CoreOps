\echo 'Running TASK-INV-002 stock adjustment RPC tests'

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

delete from public.inventory_transactions
where organization_id in (
  select id from public.organizations where slug like 'inv-002-test-%'
);

delete from public.inventory_balances
where organization_id in (
  select id from public.organizations where slug like 'inv-002-test-%'
);

delete from public.warehouses
where organization_id in (
  select id from public.organizations where slug like 'inv-002-test-%'
);

delete from public.products
where organization_id in (
  select id from public.organizations where slug like 'inv-002-test-%'
);

delete from public.audit_logs
where organization_id in (
  select id from public.organizations where slug like 'inv-002-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000401'::uuid,
  '00000000-0000-4000-8000-000000000404'::uuid,
  '00000000-0000-4000-8000-000000000405'::uuid,
  '00000000-0000-4000-8000-000000000406'::uuid,
  '00000000-0000-4000-8000-000000000407'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'inv-002-test-%'
);

delete from public.organizations where slug like 'inv-002-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000401'::uuid,
  '00000000-0000-4000-8000-000000000404'::uuid,
  '00000000-0000-4000-8000-000000000405'::uuid,
  '00000000-0000-4000-8000-000000000406'::uuid,
  '00000000-0000-4000-8000-000000000407'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000401'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-002-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000404'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-002-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000405'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-002-tech-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000406'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-002-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000407'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-002-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

select pg_temp.assert_true(
  'authenticated can execute perform_stock_adjustment RPC',
  has_function_privilege('authenticated', 'public.perform_stock_adjustment(uuid, uuid, text, numeric, text, text)', 'execute')
);
select pg_temp.assert_false(
  'anon cannot execute perform_stock_adjustment RPC',
  has_function_privilege('anon', 'public.perform_stock_adjustment(uuid, uuid, text, numeric, text, text)', 'execute')
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000401'::uuid);
select public.create_organization('INV 002 Test Alpha', 'inv-002-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000407'::uuid);
select public.create_organization('INV 002 Test Beta', 'inv-002-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table inv_002_org_ids as
select slug, id from public.organizations where slug like 'inv-002-test-%';
grant select on inv_002_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000401'::uuid);
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from inv_002_org_ids where slug = 'inv-002-test-alpha'), '00000000-0000-4000-8000-000000000404'::uuid, 'viewer', 'active'),
  ((select id from inv_002_org_ids where slug = 'inv-002-test-alpha'), '00000000-0000-4000-8000-000000000405'::uuid, 'technician', 'active'),
  ((select id from inv_002_org_ids where slug = 'inv-002-test-alpha'), '00000000-0000-4000-8000-000000000406'::uuid, 'staff', 'disabled');

insert into public.warehouses (organization_id, name, code, is_active) values
  ((select id from inv_002_org_ids where slug = 'inv-002-test-alpha'), 'Alpha Active WH', 'WH-ADJ-1', true),
  ((select id from inv_002_org_ids where slug = 'inv-002-test-alpha'), 'Alpha Inactive WH', 'WH-ADJ-OFF', false);

insert into public.products (organization_id, product_type, name, sku, unit, cost_price, selling_price, created_by)
values ((select id from inv_002_org_ids where slug = 'inv-002-test-alpha'), 'goods', 'Adjustable Item', 'ADJ-001', 'pcs', 10.00, 20.00, '00000000-0000-4000-8000-000000000401'::uuid);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000407'::uuid);
insert into public.products (organization_id, product_type, name, sku, unit, created_by)
values ((select id from inv_002_org_ids where slug = 'inv-002-test-beta'), 'goods', 'Beta Item', 'ADJ-BETA', 'pcs', '00000000-0000-4000-8000-000000000407'::uuid);
reset role;

create temp table inv_002_warehouses as
select code, id from public.warehouses
where organization_id in (select id from inv_002_org_ids);
grant select on inv_002_warehouses to authenticated;

create temp table inv_002_products as
select sku, id from public.products
where organization_id in (select id from inv_002_org_ids);
grant select on inv_002_products to authenticated;

-- Test 1: Opening stock, adjustment_out, idempotency, blank idempotency keys, insufficient stock
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000401'::uuid);

select pg_temp.assert_numeric_eq(
  'opening_stock updates balance from 0 to 50',
  (
    select quantity_after
    from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'opening_stock',
      50.000,
      'Initial Stock',
      'IDEM-ADJ-1'
    )
  ),
  50.000
);

select pg_temp.assert_numeric_eq(
  'adjustment_out updates balance from 50 to 30',
  (
    select quantity_after
    from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_out',
      20.000,
      'Stock Out',
      'IDEM-ADJ-2'
    )
  ),
  30.000
);

select pg_temp.assert_numeric_eq(
  'replaying idempotency key does not re-deduct stock',
  (
    select quantity_after
    from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_out',
      20.000,
      'Stock Out',
      'IDEM-ADJ-2'
    )
  ),
  30.000
);

select pg_temp.assert_numeric_eq(
  'blank idempotency key normalized to NULL allows repeated adjustments',
  (
    select quantity_after
    from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Blank key 1',
      '   '
    )
  ),
  35.000
);

select pg_temp.assert_numeric_eq(
  'second blank idempotency key does not collide',
  (
    select quantity_after
    from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Blank key 2',
      ''
    )
  ),
  40.000
);

select pg_temp.assert_raises(
  'insufficient stock balance rejected with SQLSTATE 22003',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_out',
      999.000,
      'Overdraw'
    )
  $$,
  '22003'
);

select pg_temp.assert_raises(
  'inactive warehouse rejected',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-OFF'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Inactive WH'
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'cross-tenant product rejected for Alpha warehouse',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-BETA'),
      'adjustment_in',
      5.000,
      'Cross-org product'
    )
  $$,
  'P0001'
);
reset role;

-- Authorization and cross-tenant denials
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000404'::uuid);
select pg_temp.assert_raises(
  'viewer denied stock adjustment',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Viewer attempt'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000405'::uuid);
select pg_temp.assert_raises(
  'technician denied stock adjustment',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Tech attempt'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000406'::uuid);
select pg_temp.assert_raises(
  'disabled member denied stock adjustment',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Disabled attempt'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000407'::uuid);
select pg_temp.assert_raises(
  'beta owner denied stock adjustment on Alpha warehouse',
  $$
    select * from public.perform_stock_adjustment(
      (select id from inv_002_warehouses where code = 'WH-ADJ-1'),
      (select id from inv_002_products where sku = 'ADJ-001'),
      'adjustment_in',
      5.000,
      'Cross-tenant attempt'
    )
  $$,
  '42501'
);
reset role;

select pg_temp.assert_eq(
  'stock adjustments recorded 4 transactions and 4 audit logs',
  (
    select count(*)
    from public.inventory_transactions
    where organization_id = (select id from inv_002_org_ids where slug = 'inv-002-test-alpha')
  ),
  4
);

select pg_temp.assert_eq(
  'stock adjustments recorded 4 audit events',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from inv_002_org_ids where slug = 'inv-002-test-alpha')
      and action = 'inventory.stock_adjusted'
  ),
  4
);

\echo 'TASK-INV-002 stock adjustment RPC tests passed'
