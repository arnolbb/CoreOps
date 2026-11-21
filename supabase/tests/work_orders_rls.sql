\echo 'Running TASK-WOR-001 work orders schema, RLS, storage, and RPC tests'

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

delete from storage.objects
where bucket_id = 'work-order-attachments'
  and (
    name = 'not-a-uuid/also-not-a-uuid/malformed-existing.jpg'
    or exists (
      select 1
      from public.organizations o
      where o.slug like 'wor-001-test-%'
        and storage.objects.name like (o.id::text || '/%')
    )
  );

delete from public.work_order_attachments
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.work_order_items
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.work_orders
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.inventory_transactions
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.inventory_balances
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.warehouses
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.products
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.customer_addresses
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.customers
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.audit_logs
where organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000701'::uuid,
  '00000000-0000-4000-8000-000000000702'::uuid,
  '00000000-0000-4000-8000-000000000703'::uuid,
  '00000000-0000-4000-8000-000000000704'::uuid,
  '00000000-0000-4000-8000-000000000705'::uuid,
  '00000000-0000-4000-8000-000000000706'::uuid,
  '00000000-0000-4000-8000-000000000707'::uuid,
  '00000000-0000-4000-8000-000000000708'::uuid,
  '00000000-0000-4000-8000-000000000709'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'wor-001-test-%'
);

delete from public.organizations where slug like 'wor-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000701'::uuid,
  '00000000-0000-4000-8000-000000000702'::uuid,
  '00000000-0000-4000-8000-000000000703'::uuid,
  '00000000-0000-4000-8000-000000000704'::uuid,
  '00000000-0000-4000-8000-000000000705'::uuid,
  '00000000-0000-4000-8000-000000000706'::uuid,
  '00000000-0000-4000-8000-000000000707'::uuid,
  '00000000-0000-4000-8000-000000000708'::uuid,
  '00000000-0000-4000-8000-000000000709'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000701'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000702'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-admin-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000703'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-staff-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000704'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000705'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-tech1-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000706'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-tech2-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000707'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000708'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000709'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'wor-001-non-member@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

-- Schema, RLS, bucket, and privilege assertions
select pg_temp.assert_eq(
  'work order tables have RLS enabled',
  (
    select count(*)
    from pg_class
    where oid in (
      'public.work_orders'::regclass,
      'public.work_order_items'::regclass,
      'public.work_order_attachments'::regclass
    )
      and relrowsecurity
  ),
  3
);

select pg_temp.assert_eq(
  'private work-order-attachments bucket exists',
  (
    select count(*)
    from storage.buckets
    where id = 'work-order-attachments'
      and public = false
      and file_size_limit = 10485760
  ),
  1
);

select pg_temp.assert_false(
  'anon cannot select work_orders',
  has_table_privilege('anon', 'public.work_orders', 'select')
);
select pg_temp.assert_false(
  'anon cannot select work_order_items',
  has_table_privilege('anon', 'public.work_order_items', 'select')
);
select pg_temp.assert_false(
  'anon cannot select work_order_attachments',
  has_table_privilege('anon', 'public.work_order_attachments', 'select')
);

select pg_temp.assert_false(
  'authenticated cannot delete work_orders',
  has_table_privilege('authenticated', 'public.work_orders', 'delete')
);
select pg_temp.assert_false(
  'authenticated cannot delete work_order_items',
  has_table_privilege('authenticated', 'public.work_order_items', 'delete')
);
select pg_temp.assert_false(
  'authenticated cannot delete work_order_attachments',
  has_table_privilege('authenticated', 'public.work_order_attachments', 'delete')
);
select pg_temp.assert_false(
  'authenticated cannot update work_order_items',
  has_table_privilege('authenticated', 'public.work_order_items', 'update')
);
select pg_temp.assert_false(
  'authenticated cannot execute private generate_work_order_number',
  has_function_privilege('authenticated', 'public.generate_work_order_number(uuid)', 'execute')
);
select pg_temp.assert_false(
  'anon cannot execute create_work_order RPC',
  has_function_privilege('anon', 'public.create_work_order(uuid, uuid, text, text, text, text, uuid, uuid, timestamptz, timestamptz)', 'execute')
);
select pg_temp.assert_true(
  'authenticated can execute all 6 work order RPCs',
  has_function_privilege('authenticated', 'public.get_work_order_assignees(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.create_work_order(uuid, uuid, text, text, text, text, uuid, uuid, timestamptz, timestamptz)', 'execute')
  and has_function_privilege('authenticated', 'public.update_work_order(uuid, uuid, text, text, text, uuid, uuid, timestamptz, timestamptz)', 'execute')
  and has_function_privilege('authenticated', 'public.transition_work_order_status(uuid, text, text, text)', 'execute')
  and has_function_privilege('authenticated', 'public.reopen_work_order(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.record_work_order_item_usage(uuid, uuid, uuid, numeric, text)', 'execute')
);

-- Create Alpha and Beta organizations and seed fixture data
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000701'::uuid);
select public.create_organization('WOR 001 Test Alpha', 'wor-001-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000708'::uuid);
select public.create_organization('WOR 001 Test Beta', 'wor-001-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table wor_001_org_ids as
select slug, id from public.organizations where slug like 'wor-001-test-%';
grant select on wor_001_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000701'::uuid);
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), '00000000-0000-4000-8000-000000000702'::uuid, 'admin', 'active'),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), '00000000-0000-4000-8000-000000000703'::uuid, 'staff', 'active'),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), '00000000-0000-4000-8000-000000000704'::uuid, 'viewer', 'active'),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), '00000000-0000-4000-8000-000000000705'::uuid, 'technician', 'active'),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), '00000000-0000-4000-8000-000000000706'::uuid, 'technician', 'active'),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), '00000000-0000-4000-8000-000000000707'::uuid, 'staff', 'disabled');

insert into public.customers (organization_id, customer_type, display_name, status, archived_at, created_by) values
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'individual', 'WOR Customer A1', 'active', null, '00000000-0000-4000-8000-000000000701'::uuid),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'individual', 'WOR Customer A2', 'active', null, '00000000-0000-4000-8000-000000000701'::uuid),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'business', 'WOR Customer A3', 'active', null, '00000000-0000-4000-8000-000000000701'::uuid);

insert into public.warehouses (organization_id, name, code, is_active) values
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'Alpha Main WH', 'WOR-WH-MAIN', true),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'Alpha Inactive WH', 'WOR-WH-OFF', false);

insert into public.products (organization_id, product_type, name, sku, unit, track_inventory, cost_price, selling_price, created_by) values
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'goods', 'Tracked Filter', 'WOR-FLT-1', 'pcs', true, 25.00, 60.00, '00000000-0000-4000-8000-000000000701'::uuid),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'service', 'Labor Service', 'WOR-SRV-1', 'hrs', false, 0.00, 50.00, '00000000-0000-4000-8000-000000000701'::uuid);
reset role;

-- Archived customer in Alpha (inserted as postgres)
insert into public.customers (organization_id, customer_type, display_name, status, archived_at, created_by)
values ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), 'individual', 'WOR Customer A4 Archived', 'archived', now(), '00000000-0000-4000-8000-000000000701'::uuid);

-- Beta fixture data
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000708'::uuid);
insert into public.customers (organization_id, customer_type, display_name, created_by)
values ((select id from wor_001_org_ids where slug = 'wor-001-test-beta'), 'individual', 'WOR Customer B1', '00000000-0000-4000-8000-000000000708'::uuid);

insert into public.warehouses (organization_id, name, code, is_active)
values ((select id from wor_001_org_ids where slug = 'wor-001-test-beta'), 'Beta WH', 'WOR-WH-BETA', true);

insert into public.products (organization_id, product_type, name, sku, unit, track_inventory, created_by)
values ((select id from wor_001_org_ids where slug = 'wor-001-test-beta'), 'goods', 'Beta Filter', 'WOR-BETA-1', 'pcs', true, '00000000-0000-4000-8000-000000000708'::uuid);
reset role;

create temp table wor_001_customers as
select organization_id, display_name, id from public.customers
where organization_id in (select id from wor_001_org_ids);
grant select on wor_001_customers to authenticated;

insert into public.customer_addresses (organization_id, customer_id, label, address_line_1, city, country_code, is_primary) values
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), (select id from wor_001_customers where display_name = 'WOR Customer A1'), 'Main', 'Street A1', 'Jakarta', 'ID', true),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), (select id from wor_001_customers where display_name = 'WOR Customer A2'), 'Main', 'Street A2', 'Bandung', 'ID', true),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'), (select id from wor_001_customers where display_name = 'WOR Customer A3'), 'Main', 'Street A3', 'Surabaya', 'ID', true),
  ((select id from wor_001_org_ids where slug = 'wor-001-test-beta'), (select id from wor_001_customers where display_name = 'WOR Customer B1'), 'Main', 'Street B1', 'Medan', 'ID', true);

create temp table wor_001_addresses as
select organization_id, customer_id, address_line_1, id from public.customer_addresses
where organization_id in (select id from wor_001_org_ids);
grant select on wor_001_addresses to authenticated;

create temp table wor_001_warehouses as
select organization_id, code, id from public.warehouses
where organization_id in (select id from wor_001_org_ids);
grant select on wor_001_warehouses to authenticated;

create temp table wor_001_products as
select organization_id, sku, id from public.products
where organization_id in (select id from wor_001_org_ids);
grant select on wor_001_products to authenticated;

-- Opening stock: 10.000 Tracked Filter in Alpha WH-MAIN, 50.000 Beta Filter in Beta WH
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000701'::uuid);
select * from public.perform_stock_adjustment(
  (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
  (select id from wor_001_products where sku = 'WOR-FLT-1'),
  'opening_stock',
  10.000,
  'Initial work order parts',
  'WOR-OPEN-ALPHA-1'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000708'::uuid);
select * from public.perform_stock_adjustment(
  (select id from wor_001_warehouses where code = 'WOR-WH-BETA'),
  (select id from wor_001_products where sku = 'WOR-BETA-1'),
  'opening_stock',
  50.000,
  'Beta stock',
  'WOR-OPEN-BETA-1'
);
reset role;

-- Test inventory_transactions check constraint extension (work_order_out & work_order_return)
insert into public.inventory_transactions (
  organization_id, warehouse_id, product_id, transaction_type,
  quantity_delta, quantity_before, quantity_after, created_by
) values (
  (select id from wor_001_org_ids where slug = 'wor-001-test-beta'),
  (select id from wor_001_warehouses where code = 'WOR-WH-BETA'),
  (select id from wor_001_products where sku = 'WOR-BETA-1'),
  'work_order_return',
  1.000, 50.000, 51.000,
  '00000000-0000-4000-8000-000000000708'::uuid
);

-- Test get_work_order_assignees RPC
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000703'::uuid);
select pg_temp.assert_eq(
  'staff gets active assignable members (owner, admin, staff, tech1, tech2)',
  (
    select count(*)
    from public.get_work_order_assignees((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'))
  ),
  5
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000705'::uuid);
select pg_temp.assert_eq(
  'technician gets 0 rows from get_work_order_assignees',
  (
    select count(*)
    from public.get_work_order_assignees((select id from wor_001_org_ids where slug = 'wor-001-test-alpha'))
  ),
  0
);
reset role;

-- Create work orders via create_work_order RPC
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000703'::uuid);
select * from public.create_work_order(
  (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
  (select id from wor_001_customers where display_name = 'WOR Customer A1'),
  'installation',
  'Install water filter unit',
  'high',
  'scheduled',
  (select id from wor_001_addresses where address_line_1 = 'Street A1'),
  '00000000-0000-4000-8000-000000000705'::uuid,
  now() + interval '1 hour',
  now() + interval '3 hours'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000702'::uuid);
select * from public.create_work_order(
  (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
  (select id from wor_001_customers where display_name = 'WOR Customer A2'),
  'repair',
  'Repair valve pressure',
  'normal',
  'scheduled',
  (select id from wor_001_addresses where address_line_1 = 'Street A2'),
  '00000000-0000-4000-8000-000000000706'::uuid,
  now() + interval '2 hours',
  now() + interval '4 hours'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000701'::uuid);
select * from public.create_work_order(
  (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
  (select id from wor_001_customers where display_name = 'WOR Customer A3'),
  'inspection',
  'Site inspection unassigned',
  'low',
  'draft',
  (select id from wor_001_addresses where address_line_1 = 'Street A3'),
  null,
  null,
  null
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000708'::uuid);
select * from public.create_work_order(
  (select id from wor_001_org_ids where slug = 'wor-001-test-beta'),
  (select id from wor_001_customers where display_name = 'WOR Customer B1'),
  'service',
  'Beta service job',
  'normal',
  'scheduled',
  (select id from wor_001_addresses where address_line_1 = 'Street B1'),
  '00000000-0000-4000-8000-000000000708'::uuid,
  now(),
  now() + interval '2 hours'
);
reset role;

create temp table wor_001_orders as
select organization_id, work_order_number, customer_id, assigned_to, description, id
from public.work_orders
where organization_id in (select id from wor_001_org_ids);
grant select on wor_001_orders to authenticated;

select pg_temp.assert_text_eq(
  'generated sequential work order numbers WO-YYYY-0001..0003 in Alpha',
  (
    select string_agg(work_order_number, ',' order by work_order_number)
    from wor_001_orders
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
  ),
  'WO-' || to_char(timezone('UTC', now()), 'YYYY') || '-0001,' ||
  'WO-' || to_char(timezone('UTC', now()), 'YYYY') || '-0002,' ||
  'WO-' || to_char(timezone('UTC', now()), 'YYYY') || '-0003'
);

select pg_temp.assert_text_eq(
  'Beta starts its own WO-YYYY-0001 sequence',
  (
    select work_order_number
    from wor_001_orders
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-beta')
  ),
  'WO-' || to_char(timezone('UTC', now()), 'YYYY') || '-0001'
);

-- Creation & update validations
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000704'::uuid);
select pg_temp.assert_raises(
  'viewer denied create_work_order',
  $$
    select * from public.create_work_order(
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      'Viewer attempt'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000705'::uuid);
select pg_temp.assert_raises(
  'technician denied create_work_order',
  $$
    select * from public.create_work_order(
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      'Tech attempt'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000703'::uuid);
select pg_temp.assert_raises(
  'create_work_order rejects archived customer',
  $$
    select * from public.create_work_order(
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_customers where display_name = 'WOR Customer A4 Archived'),
      'general',
      'Archived customer job'
    )
  $$,
  'P0001'
);
select pg_temp.assert_raises(
  'create_work_order rejects blank description',
  $$
    select * from public.create_work_order(
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      '   '
    )
  $$,
  '22023'
);
select pg_temp.assert_raises(
  'create_work_order rejects scheduled_end before scheduled_start',
  $$
    select * from public.create_work_order(
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      'Invalid schedule window',
      'normal',
      'scheduled',
      null,
      null,
      now() + interval '3 hours',
      now() + interval '1 hour'
    )
  $$,
  '22023'
);
reset role;

-- Composite FKs (23503), unique index (23505), check constraints (23514), immutability triggers (23514)
select pg_temp.assert_raises(
  'cross-tenant customer reference in work_orders rejected (23503)',
  $$
    insert into public.work_orders (
      organization_id, work_order_number, customer_id, work_type, description, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      'WO-CROSS-1',
      (select id from wor_001_customers where display_name = 'WOR Customer B1'),
      'general',
      'Cross tenant customer',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'mismatched customer and address in work_orders rejected (23503)',
  $$
    insert into public.work_orders (
      organization_id, work_order_number, customer_id, customer_address_id, work_type, description, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      'WO-MISMATCH-ADDR',
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      (select id from wor_001_addresses where address_line_1 = 'Street A2'),
      'general',
      'Address belongs to A2 not A1',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'cross-tenant assigned_to in work_orders rejected (23503)',
  $$
    insert into public.work_orders (
      organization_id, work_order_number, customer_id, work_type, assigned_to, description, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      'WO-CROSS-ASSIGNEE',
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      '00000000-0000-4000-8000-000000000708'::uuid,
      'Beta owner assigned to Alpha WO',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'cross-tenant product in work_order_items rejected (23503)',
  $$
    insert into public.work_order_items (
      organization_id, work_order_id, product_id, warehouse_id,
      name_snapshot, unit_snapshot, quantity, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_products where sku = 'WOR-BETA-1'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      'Beta Filter',
      'pcs',
      1.000,
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'cross-tenant warehouse in work_order_items rejected (23503)',
  $$
    insert into public.work_order_items (
      organization_id, work_order_id, product_id, warehouse_id,
      name_snapshot, unit_snapshot, quantity, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      (select id from wor_001_warehouses where code = 'WOR-WH-BETA'),
      'Tracked Filter',
      'pcs',
      1.000,
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'cross-tenant work_order_id in work_order_attachments rejected (23503)',
  $$
    insert into public.work_order_attachments (
      organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Beta service job'),
      (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/cross.jpg',
      'cross.jpg',
      'image/jpeg',
      1024,
      'photo',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'duplicate work_order_number case-insensitively in same org rejected (23505)',
  $$
    insert into public.work_orders (
      organization_id, work_order_number, customer_id, work_type, description, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      lower((select work_order_number from wor_001_orders where description = 'Install water filter unit')),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      'Duplicate number',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23505'
);

select pg_temp.assert_raises(
  'work_orders.organization_id is immutable (23514)',
  $$
    update public.work_orders
    set organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-beta')
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'work_orders.work_order_number is immutable (23514)',
  $$
    update public.work_orders
    set work_order_number = 'WO-TAMPERED'
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'work_orders.created_by is immutable (23514)',
  $$
    update public.work_orders
    set created_by = '00000000-0000-4000-8000-000000000702'::uuid
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'invalid attachment mime_type rejected (23514)',
  $$
    insert into public.work_order_attachments (
      organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/bad.svg',
      'bad.svg',
      'image/svg+xml',
      1024,
      'photo',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'oversized attachment size_bytes rejected (23514)',
  $$
    insert into public.work_order_attachments (
      organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/huge.jpg',
      'huge.jpg',
      'image/jpeg',
      10485761,
      'photo',
      '00000000-0000-4000-8000-000000000701'::uuid
    )
  $$,
  '23514'
);

-- Manager read & update_work_order test
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000703'::uuid);
select * from public.update_work_order(
  (select id from wor_001_orders where description = 'Install water filter unit'),
  (select id from wor_001_customers where display_name = 'WOR Customer A1'),
  'installation',
  'urgent',
  'Install water filter unit (updated)',
  (select id from wor_001_addresses where address_line_1 = 'Street A1'),
  '00000000-0000-4000-8000-000000000705'::uuid,
  now() + interval '1 hour',
  now() + interval '3 hours'
);
select pg_temp.assert_eq(
  'staff reads all 3 Alpha work orders',
  (
    select count(*)
    from public.work_orders
    where organization_id in (select id from wor_001_org_ids)
  ),
  3
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000704'::uuid);
select pg_temp.assert_eq(
  'viewer reads all 3 Alpha work orders',
  (
    select count(*)
    from public.work_orders
    where organization_id in (select id from wor_001_org_ids)
  ),
  3
);
select pg_temp.assert_raises(
  'viewer denied update_work_order',
  $$
    select * from public.update_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'installation',
      'normal',
      'Viewer edit attempt'
    )
  $$,
  '42501'
);
reset role;

-- Technician scoping: Tech1 reads ONLY assigned work orders & assigned customer/address
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000705'::uuid);
select pg_temp.assert_eq(
  'Tech1 reads ONLY assigned work order (0 rows for Tech2/unassigned)',
  (
    select count(*)
    from public.work_orders
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
  ),
  1
);
select pg_temp.assert_eq(
  'Tech1 reads ONLY assigned WO1',
  (
    select count(*)
    from public.work_orders
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  1
);
select pg_temp.assert_eq(
  'Tech1 reads ONLY assigned customer (0 rows for Tech2/unassigned customers)',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
  ),
  1
);
select pg_temp.assert_text_eq(
  'Tech1 visible customer is WOR Customer A1',
  (
    select display_name
    from public.customers
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
  ),
  'WOR Customer A1'
);
select pg_temp.assert_eq(
  'Tech1 reads ONLY assigned customer addresses',
  (
    select count(*)
    from public.customer_addresses
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
  ),
  1
);

-- Tech1 denied edit, cancel, reopen, and operations on Tech2/unassigned orders
select pg_temp.assert_raises(
  'Tech1 denied direct insert on work_orders (42501)',
  $$
    insert into public.work_orders (
      organization_id, work_order_number, customer_id, work_type, description, created_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      'WO-TECH-DIRECT',
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      'Direct insert',
      '00000000-0000-4000-8000-000000000705'::uuid
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'Tech1 denied update_work_order on own order (42501)',
  $$
    select * from public.update_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'installation',
      'low',
      'Tech1 edit attempt'
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'Tech1 denied cancel on own order (42501)',
  $$
    select * from public.transition_work_order_status(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      'cancelled',
      null,
      'Tech1 cancel attempt'
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'Tech1 denied starting Tech2 order (42501)',
  $$
    select * from public.transition_work_order_status(
      (select id from wor_001_orders where description = 'Repair valve pressure'),
      'in_progress'
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'Tech1 denied starting unassigned order (42501)',
  $$
    select * from public.transition_work_order_status(
      (select id from wor_001_orders where description = 'Site inspection unassigned'),
      'in_progress'
    )
  $$,
  '42501'
);

-- Tech1 starts own order
select * from public.transition_work_order_status(
  (select id from wor_001_orders where description = 'Install water filter unit'),
  'in_progress'
);
select pg_temp.assert_text_eq(
  'Tech1 start sets status to in_progress',
  (
    select status
    from public.work_orders
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  'in_progress'
);

-- Tech1 uploads attachment + storage object for own order, denied on Tech2 order and bad paths
insert into storage.objects (bucket_id, name, owner)
values (
  'work-order-attachments',
  (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/' ||
  (select id::text from wor_001_orders where description = 'Install water filter unit') || '/before.jpg',
  '00000000-0000-4000-8000-000000000705'::uuid
);

insert into public.work_order_attachments (
  organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by
) values (
  (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
  (select id from wor_001_orders where description = 'Install water filter unit'),
  (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/' ||
  (select id::text from wor_001_orders where description = 'Install water filter unit') || '/before.jpg',
  'before.jpg',
  'image/jpeg',
  2048,
  'photo',
  '00000000-0000-4000-8000-000000000705'::uuid
);

reset role;

insert into storage.objects (bucket_id, name)
values ('work-order-attachments', 'not-a-uuid/also-not-a-uuid/malformed-existing.jpg');

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000705'::uuid);

select pg_temp.assert_eq(
  'Tech1 reads own storage object without 22P02 on malformed paths',
  (
    select count(*)
    from storage.objects
    where bucket_id = 'work-order-attachments'
  ),
  1
);

reset role;

delete from storage.objects
where bucket_id = 'work-order-attachments'
  and name = 'not-a-uuid/also-not-a-uuid/malformed-existing.jpg';

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000705'::uuid);

select pg_temp.assert_raises(
  'Tech1 denied storage object upload for Tech2 order (42501)',
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'work-order-attachments',
      (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/' ||
      (select id::text from wor_001_orders where description = 'Repair valve pressure') || '/sneak.jpg',
      '00000000-0000-4000-8000-000000000705'::uuid
    )
  $$,
  '42501'
);

select pg_temp.assert_raises(
  'Tech1 denied storage object upload with non-UUID path without 22P02',
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'work-order-attachments',
      'not-a-uuid/also-not-uuid/bad.jpg',
      '00000000-0000-4000-8000-000000000705'::uuid
    )
  $$,
  '42501'
);

select pg_temp.assert_raises(
  'Tech1 denied attachment row insert for Tech2 order (42501)',
  $$
    insert into public.work_order_attachments (
      organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Repair valve pressure'),
      (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/' ||
      (select id::text from wor_001_orders where description = 'Repair valve pressure') || '/sneak.jpg',
      'sneak.jpg',
      'image/jpeg',
      2048,
      'photo',
      '00000000-0000-4000-8000-000000000705'::uuid
    )
  $$,
  '42501'
);

-- Tech1 records item usage with idempotency and tests insufficient stock rollback
select pg_temp.assert_numeric_eq(
  'Tech1 uses 3.000 units of Tracked Filter (balance 10 -> 7)',
  (
    select quantity_after
    from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      3.000,
      'WOR-IDEM-1'
    )
  ),
  7.000
);

select pg_temp.assert_numeric_eq(
  'idempotency replay does not double-deduct stock',
  (
    select quantity_after
    from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      3.000,
      'WOR-IDEM-1'
    )
  ),
  7.000
);

select pg_temp.assert_raises(
  'insufficient stock raises SQLSTATE 22003 and rolls back',
  $$
    select * from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      99.000,
      'WOR-IDEM-OVER'
    )
  $$,
  '22003'
);

select pg_temp.assert_numeric_eq(
  'balance remains 7.000 after insufficient stock rollback',
  (
    select quantity
    from public.inventory_balances
    where warehouse_id = (select id from wor_001_warehouses where code = 'WOR-WH-MAIN')
      and product_id = (select id from wor_001_products where sku = 'WOR-FLT-1')
  ),
  7.000
);

select pg_temp.assert_eq(
  'work_order_items count remains 1 after rollback and idempotency replay',
  (
    select count(*)
    from public.work_order_items
    where work_order_id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  1
);

select pg_temp.assert_raises(
  'non-tracked service product rejected in record_work_order_item_usage',
  $$
    select * from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-SRV-1'),
      1.000
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'Tech1 denied using item on Tech2 order (42501)',
  $$
    select * from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Repair valve pressure'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      1.000
    )
  $$,
  '42501'
);

-- Tech1 completes own order (requires non-blank completion notes)
select pg_temp.assert_raises(
  'completing work order without completion notes rejected (22023)',
  $$
    select * from public.transition_work_order_status(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      'completed',
      '   '
    )
  $$,
  '22023'
);

select * from public.transition_work_order_status(
  (select id from wor_001_orders where description = 'Install water filter unit'),
  'completed',
  'Installed and tested pressure'
);

select pg_temp.assert_text_eq(
  'Tech1 completes own work order',
  (
    select status
    from public.work_orders
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  'completed'
);

-- Completed work order lock & controlled reopen tests
select pg_temp.assert_raises(
  'Tech1 denied item usage on completed work order',
  $$
    select * from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      1.000
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'Tech1 denied attachment upload on completed work order (42501)',
  $$
    insert into public.work_order_attachments (
      organization_id, work_order_id, storage_path, file_name, mime_type, size_bytes, attachment_type, uploaded_by
    ) values (
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/' ||
      (select id::text from wor_001_orders where description = 'Install water filter unit') || '/locked.jpg',
      'locked.jpg',
      'image/jpeg',
      1024,
      'photo',
      '00000000-0000-4000-8000-000000000705'::uuid
    )
  $$,
  '42501'
);

select pg_temp.assert_raises(
  'Tech1 denied reopen_work_order (42501)',
  $$
    select * from public.reopen_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      'Tech reopen attempt'
    )
  $$,
  '42501'
);
reset role;

-- Tech2 isolation check
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000706'::uuid);
select pg_temp.assert_eq(
  'Tech2 reads ONLY own assigned work order',
  (
    select count(*)
    from public.work_orders
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
  ),
  1
);
select pg_temp.assert_eq(
  'Tech2 reads 0 attachments from Tech1 order',
  (
    select count(*)
    from public.work_order_attachments
    where work_order_id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  0
);
select pg_temp.assert_eq(
  'Tech2 reads 0 storage objects from Tech1 order',
  (
    select count(*)
    from storage.objects
    where bucket_id = 'work-order-attachments'
      and name like ((select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/%')
  ),
  0
);
reset role;

-- Append-only immutability trigger on work_order_items (tested as postgres)
select pg_temp.assert_raises(
  'work_order_items append-only trigger blocks updates (23514)',
  $$
    update public.work_order_items
    set quantity = 999.000
    where work_order_id = (select id from wor_001_orders where description = 'Install water filter unit')
  $$,
  '23514'
);

-- Staff denied update on completed order & denied reopen_work_order (42501)
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000703'::uuid);
select pg_temp.assert_raises(
  'Staff denied update_work_order on completed work order',
  $$
    select * from public.update_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'installation',
      'normal',
      'Edit completed order'
    )
  $$,
  'P0001'
);
select pg_temp.assert_raises(
  'Staff denied reopen_work_order (42501)',
  $$
    select * from public.reopen_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      'Staff reopen attempt'
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'cancelling without reason rejected (22023)',
  $$
    select * from public.transition_work_order_status(
      (select id from wor_001_orders where description = 'Site inspection unassigned'),
      'cancelled',
      null,
      '   '
    )
  $$,
  '22023'
);
select * from public.transition_work_order_status(
  (select id from wor_001_orders where description = 'Site inspection unassigned'),
  'cancelled',
  null,
  'Customer postponed indefinitely'
);
reset role;

-- Admin reopen requires non-blank reason, succeeds with reason; Owner also succeeds
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000702'::uuid);
select pg_temp.assert_raises(
  'Admin denied reopen with blank reason (22023)',
  $$
    select * from public.reopen_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      '   '
    )
  $$,
  '22023'
);
select * from public.reopen_work_order(
  (select id from wor_001_orders where description = 'Install water filter unit'),
  'Customer reported pressure drop'
);
select pg_temp.assert_text_eq(
  'Admin reopen transitions completed work order to in_progress',
  (
    select status
    from public.work_orders
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  'in_progress'
);
-- Re-complete so Owner can also test reopen
select * from public.transition_work_order_status(
  (select id from wor_001_orders where description = 'Install water filter unit'),
  'completed',
  'Adjusted valve and re-tested'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000701'::uuid);
select * from public.reopen_work_order(
  (select id from wor_001_orders where description = 'Install water filter unit'),
  'Owner quality verification'
);
select pg_temp.assert_text_eq(
  'Owner reopen transitions completed work order to in_progress',
  (
    select status
    from public.work_orders
    where id = (select id from wor_001_orders where description = 'Install water filter unit')
  ),
  'in_progress'
);
select pg_temp.assert_raises(
  'Owner cannot reopen cancelled work order',
  $$
    select * from public.reopen_work_order(
      (select id from wor_001_orders where description = 'Site inspection unassigned'),
      'Cannot reopen cancelled'
    )
  $$,
  'P0001'
);
reset role;

-- Beta owner, disabled member, and non-member isolation
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000708'::uuid);
select pg_temp.assert_eq(
  'Beta owner cannot read Alpha work_orders',
  (select count(*) from public.work_orders where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'Beta owner cannot read Alpha work_order_items',
  (select count(*) from public.work_order_items where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'Beta owner cannot read Alpha work_order_attachments',
  (select count(*) from public.work_order_attachments where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'Beta owner cannot read Alpha storage objects',
  (
    select count(*)
    from storage.objects
    where bucket_id = 'work-order-attachments'
      and name like ((select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/%')
  ),
  0
);
select pg_temp.assert_raises(
  'Beta owner denied transition_work_order_status on Alpha work order (42501)',
  $$
    select * from public.transition_work_order_status(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      'completed',
      'Cross tenant'
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'Beta owner denied record_work_order_item_usage on Alpha work order (42501)',
  $$
    select * from public.record_work_order_item_usage(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      (select id from wor_001_warehouses where code = 'WOR-WH-MAIN'),
      (select id from wor_001_products where sku = 'WOR-FLT-1'),
      1.000
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000707'::uuid);
select pg_temp.assert_eq(
  'disabled member cannot read Alpha work_orders',
  (select count(*) from public.work_orders where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'disabled member cannot read Alpha storage objects',
  (
    select count(*)
    from storage.objects
    where bucket_id = 'work-order-attachments'
      and name like ((select id::text from wor_001_org_ids where slug = 'wor-001-test-alpha') || '/%')
  ),
  0
);
select pg_temp.assert_raises(
  'disabled member denied create_work_order (42501)',
  $$
    select * from public.create_work_order(
      (select id from wor_001_org_ids where slug = 'wor-001-test-alpha'),
      (select id from wor_001_customers where display_name = 'WOR Customer A1'),
      'general',
      'Disabled attempt'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000709'::uuid);
select pg_temp.assert_eq(
  'non-member cannot read Alpha work_orders',
  (select count(*) from public.work_orders where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')),
  0
);
select pg_temp.assert_raises(
  'non-member denied reopen_work_order (42501)',
  $$
    select * from public.reopen_work_order(
      (select id from wor_001_orders where description = 'Install water filter unit'),
      'Non-member attempt'
    )
  $$,
  '42501'
);
reset role;

-- Audit events verification
select pg_temp.assert_eq(
  'Alpha recorded 3 work_order.created audit events',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.created'
  ),
  3
);
select pg_temp.assert_eq(
  'Alpha recorded 1 work_order.updated audit event',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.updated'
  ),
  1
);
select pg_temp.assert_eq(
  'Alpha recorded 1 work_order.started audit event',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.started'
  ),
  1
);
select pg_temp.assert_eq(
  'Alpha recorded 1 work_order.item_used audit event',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.item_used'
  ),
  1
);
select pg_temp.assert_eq(
  'Alpha recorded 2 work_order.completed audit events',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.completed'
  ),
  2
);
select pg_temp.assert_eq(
  'Alpha recorded 2 work_order.reopened audit events with reason metadata',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.reopened'
      and length(btrim(coalesce(metadata->>'reason', ''))) > 0
  ),
  2
);
select pg_temp.assert_eq(
  'Alpha recorded 1 work_order.cancelled audit event',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from wor_001_org_ids where slug = 'wor-001-test-alpha')
      and action = 'work_order.cancelled'
  ),
  1
);

\echo 'TASK-WOR-001 work orders schema, RLS, storage, and RPC tests passed'
