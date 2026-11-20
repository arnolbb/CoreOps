\echo 'Running TASK-INV-001 warehouse and inventory ledger schema and RLS tests'

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
  select id from public.organizations where slug like 'inv-001-test-%'
);

delete from public.inventory_balances
where organization_id in (
  select id from public.organizations where slug like 'inv-001-test-%'
);

delete from public.warehouses
where organization_id in (
  select id from public.organizations where slug like 'inv-001-test-%'
);

delete from public.products
where organization_id in (
  select id from public.organizations where slug like 'inv-001-test-%'
);

delete from public.audit_logs
where organization_id in (
  select id from public.organizations where slug like 'inv-001-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000301'::uuid,
  '00000000-0000-4000-8000-000000000302'::uuid,
  '00000000-0000-4000-8000-000000000303'::uuid,
  '00000000-0000-4000-8000-000000000304'::uuid,
  '00000000-0000-4000-8000-000000000305'::uuid,
  '00000000-0000-4000-8000-000000000306'::uuid,
  '00000000-0000-4000-8000-000000000307'::uuid,
  '00000000-0000-4000-8000-000000000308'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'inv-001-test-%'
);

delete from public.organizations where slug like 'inv-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000301'::uuid,
  '00000000-0000-4000-8000-000000000302'::uuid,
  '00000000-0000-4000-8000-000000000303'::uuid,
  '00000000-0000-4000-8000-000000000304'::uuid,
  '00000000-0000-4000-8000-000000000305'::uuid,
  '00000000-0000-4000-8000-000000000306'::uuid,
  '00000000-0000-4000-8000-000000000307'::uuid,
  '00000000-0000-4000-8000-000000000308'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000301'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000302'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-admin-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000303'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-staff-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000304'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000305'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-technician-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000306'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000307'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000308'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inv-001-non-member@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

select pg_temp.assert_eq(
  'inventory tables have RLS enabled',
  (
    select count(*)
    from pg_class
    where oid in (
      'public.warehouses'::regclass,
      'public.inventory_balances'::regclass,
      'public.inventory_transactions'::regclass
    )
      and relrowsecurity
  ),
  3
);

select pg_temp.assert_false(
  'anon cannot select warehouses',
  has_table_privilege('anon', 'public.warehouses', 'select')
);
select pg_temp.assert_false(
  'authenticated cannot update inventory transactions',
  has_table_privilege('authenticated', 'public.inventory_transactions', 'update')
);
select pg_temp.assert_false(
  'authenticated cannot delete inventory transactions',
  has_table_privilege('authenticated', 'public.inventory_transactions', 'delete')
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000301'::uuid);
select public.create_organization('INV 001 Test Alpha', 'inv-001-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000307'::uuid);
select public.create_organization('INV 001 Test Beta', 'inv-001-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table inv_001_org_ids as
select slug, id from public.organizations where slug like 'inv-001-test-%';
grant select on inv_001_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000301'::uuid);
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), '00000000-0000-4000-8000-000000000302'::uuid, 'admin', 'active'),
  ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), '00000000-0000-4000-8000-000000000303'::uuid, 'staff', 'active'),
  ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), '00000000-0000-4000-8000-000000000304'::uuid, 'viewer', 'active'),
  ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), '00000000-0000-4000-8000-000000000305'::uuid, 'technician', 'active'),
  ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), '00000000-0000-4000-8000-000000000306'::uuid, 'staff', 'disabled');
reset role;

-- Owner creates Alpha warehouse, product, balance, and ledger transaction
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000301'::uuid);
insert into public.warehouses (organization_id, name, code)
values ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), 'Main Warehouse', 'WH-MAIN');

insert into public.products (organization_id, product_type, name, sku, unit, cost_price, selling_price, created_by)
values ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), 'goods', 'Inventory Item A', 'INV-001', 'pcs', 15.00, 30.00, '00000000-0000-4000-8000-000000000301'::uuid);

insert into public.inventory_balances (organization_id, warehouse_id, product_id, quantity)
values (
  (select id from inv_001_org_ids where slug = 'inv-001-test-alpha'),
  (select id from public.warehouses where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha') and code = 'WH-MAIN'),
  (select id from public.products where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha') and sku = 'INV-001'),
  100.000
);

insert into public.inventory_transactions (
  organization_id, warehouse_id, product_id, transaction_type,
  quantity_delta, quantity_before, quantity_after, created_by, idempotency_key
) values (
  (select id from inv_001_org_ids where slug = 'inv-001-test-alpha'),
  (select id from public.warehouses where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha') and code = 'WH-MAIN'),
  (select id from public.products where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha') and sku = 'INV-001'),
  'opening_stock', 100.000, 0.000, 100.000,
  '00000000-0000-4000-8000-000000000301'::uuid,
  'INV-001-IDEM-1'
);

select pg_temp.assert_raises(
  'duplicate warehouse code case-insensitively in same org rejected',
  $$
    insert into public.warehouses (organization_id, name, code)
    values ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), 'Duplicate Warehouse', 'wh-main')
  $$,
  '23505'
);

select pg_temp.assert_raises(
  'duplicate idempotency key in same org rejected',
  $$
    insert into public.inventory_transactions (
      organization_id, warehouse_id, product_id, transaction_type,
      quantity_delta, quantity_before, quantity_after, created_by, idempotency_key
    ) values (
      (select id from inv_001_org_ids where slug = 'inv-001-test-alpha'),
      (select id from public.warehouses where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha') and code = 'WH-MAIN'),
      (select id from public.products where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha') and sku = 'INV-001'),
      'adjustment_in', 5.000, 100.000, 105.000,
      '00000000-0000-4000-8000-000000000301'::uuid,
      'INV-001-IDEM-1'
    )
  $$,
  '23505'
);
reset role;

-- Beta creates its own warehouse and product
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000307'::uuid);
insert into public.warehouses (organization_id, name, code)
values ((select id from inv_001_org_ids where slug = 'inv-001-test-beta'), 'Beta Warehouse', 'WH-MAIN');

insert into public.products (organization_id, product_type, name, sku, unit, created_by)
values ((select id from inv_001_org_ids where slug = 'inv-001-test-beta'), 'goods', 'Beta Item', 'INV-001', 'pcs', '00000000-0000-4000-8000-000000000307'::uuid);
reset role;

create temp table inv_001_warehouses as
select organization_id, name, id from public.warehouses
where organization_id in (select id from inv_001_org_ids);
grant select on inv_001_warehouses to authenticated;

create temp table inv_001_products as
select organization_id, name, id from public.products
where organization_id in (select id from inv_001_org_ids);
grant select on inv_001_products to authenticated;

-- Cross-tenant composite FK rejected
select pg_temp.assert_raises(
  'cross-tenant product reference in inventory_balances rejected',
  $$
    insert into public.inventory_balances (organization_id, warehouse_id, product_id, quantity)
    values (
      (select id from inv_001_org_ids where slug = 'inv-001-test-alpha'),
      (select id from inv_001_warehouses where name = 'Main Warehouse'),
      (select id from inv_001_products where name = 'Beta Item'),
      10.000
    )
  $$,
  '23503'
);

-- Append-only trigger blocks update on inventory_transactions
select pg_temp.assert_raises(
  'inventory_transactions append-only trigger blocks updates',
  $$
    update public.inventory_transactions
    set reason = 'tampered'
    where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')
  $$,
  '23514'
);

-- Technician can read Alpha inventory, cannot write
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000305'::uuid);
select pg_temp.assert_eq(
  'technician reads Alpha warehouses',
  (select count(*) from public.warehouses where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  1
);
select pg_temp.assert_eq(
  'technician reads Alpha inventory balances',
  (select count(*) from public.inventory_balances where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  1
);
select pg_temp.assert_raises(
  'technician cannot create warehouse',
  $$
    insert into public.warehouses (organization_id, name, code)
    values ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), 'Tech WH', 'WH-TECH')
  $$,
  '42501'
);
reset role;

-- Cross-tenant, disabled member, and non-member isolation
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000307'::uuid);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha warehouses',
  (select count(*) from public.warehouses where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha balances',
  (select count(*) from public.inventory_balances where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha transactions',
  (select count(*) from public.inventory_transactions where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  0
);
select pg_temp.assert_raises(
  'beta owner cannot insert warehouse into Alpha',
  $$
    insert into public.warehouses (organization_id, name, code)
    values ((select id from inv_001_org_ids where slug = 'inv-001-test-alpha'), 'Cross WH', 'WH-CROSS')
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000306'::uuid);
select pg_temp.assert_eq(
  'disabled member cannot read Alpha inventory balances',
  (select count(*) from public.inventory_balances where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000308'::uuid);
select pg_temp.assert_eq(
  'non-member cannot read Alpha inventory balances',
  (select count(*) from public.inventory_balances where organization_id = (select id from inv_001_org_ids where slug = 'inv-001-test-alpha')),
  0
);
reset role;

\echo 'TASK-INV-001 warehouse and inventory ledger schema and RLS tests passed'
