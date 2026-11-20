\echo 'Running TASK-SAL-001 sales order, items, and payments schema and RLS tests'

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

delete from public.payments
where organization_id in (
  select id from public.organizations where slug like 'sal-001-test-%'
);

delete from public.sales_order_items
where organization_id in (
  select id from public.organizations where slug like 'sal-001-test-%'
);

delete from public.sales_orders
where organization_id in (
  select id from public.organizations where slug like 'sal-001-test-%'
);

delete from public.customers
where organization_id in (
  select id from public.organizations where slug like 'sal-001-test-%'
);

delete from public.products
where organization_id in (
  select id from public.organizations where slug like 'sal-001-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000501'::uuid,
  '00000000-0000-4000-8000-000000000503'::uuid,
  '00000000-0000-4000-8000-000000000504'::uuid,
  '00000000-0000-4000-8000-000000000505'::uuid,
  '00000000-0000-4000-8000-000000000506'::uuid,
  '00000000-0000-4000-8000-000000000507'::uuid,
  '00000000-0000-4000-8000-000000000508'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'sal-001-test-%'
);

delete from public.organizations where slug like 'sal-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000501'::uuid,
  '00000000-0000-4000-8000-000000000503'::uuid,
  '00000000-0000-4000-8000-000000000504'::uuid,
  '00000000-0000-4000-8000-000000000505'::uuid,
  '00000000-0000-4000-8000-000000000506'::uuid,
  '00000000-0000-4000-8000-000000000507'::uuid,
  '00000000-0000-4000-8000-000000000508'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000501'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000503'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-staff-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000504'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000505'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-tech-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000506'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000507'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000508'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'sal-001-non-member@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

select pg_temp.assert_eq(
  'sales tables have RLS enabled',
  (
    select count(*)
    from pg_class
    where oid in (
      'public.sales_orders'::regclass,
      'public.sales_order_items'::regclass,
      'public.payments'::regclass
    )
      and relrowsecurity
  ),
  3
);

select pg_temp.assert_false(
  'anon cannot select sales_orders',
  has_table_privilege('anon', 'public.sales_orders', 'select')
);
select pg_temp.assert_false(
  'authenticated cannot delete sales_orders',
  has_table_privilege('authenticated', 'public.sales_orders', 'delete')
);
select pg_temp.assert_false(
  'authenticated cannot delete payments',
  has_table_privilege('authenticated', 'public.payments', 'delete')
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000501'::uuid);
select public.create_organization('SAL 001 Test Alpha', 'sal-001-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000507'::uuid);
select public.create_organization('SAL 001 Test Beta', 'sal-001-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table sal_001_org_ids as
select slug, id from public.organizations where slug like 'sal-001-test-%';
grant select on sal_001_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000501'::uuid);
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from sal_001_org_ids where slug = 'sal-001-test-alpha'), '00000000-0000-4000-8000-000000000503'::uuid, 'staff', 'active'),
  ((select id from sal_001_org_ids where slug = 'sal-001-test-alpha'), '00000000-0000-4000-8000-000000000504'::uuid, 'viewer', 'active'),
  ((select id from sal_001_org_ids where slug = 'sal-001-test-alpha'), '00000000-0000-4000-8000-000000000505'::uuid, 'technician', 'active'),
  ((select id from sal_001_org_ids where slug = 'sal-001-test-alpha'), '00000000-0000-4000-8000-000000000506'::uuid, 'staff', 'disabled');

insert into public.customers (organization_id, customer_type, display_name, created_by)
values ((select id from sal_001_org_ids where slug = 'sal-001-test-alpha'), 'individual', 'SAL Alpha Customer', '00000000-0000-4000-8000-000000000501'::uuid);

insert into public.products (organization_id, product_type, name, unit, cost_price, selling_price, created_by)
values ((select id from sal_001_org_ids where slug = 'sal-001-test-alpha'), 'goods', 'General Unit', 'pcs', 100.00, 250.00, '00000000-0000-4000-8000-000000000501'::uuid);

insert into public.sales_orders (organization_id, order_number, customer_id, subtotal, grand_total, created_by)
values (
  (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
  'SO-2026-0001',
  (select id from public.customers where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha') and display_name = 'SAL Alpha Customer'),
  250.00,
  250.00,
  '00000000-0000-4000-8000-000000000501'::uuid
);

insert into public.sales_order_items (
  organization_id, sales_order_id, product_id, item_type, name_snapshot, unit_snapshot, quantity, unit_price, line_total
) values (
  (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
  (select id from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha') and order_number = 'SO-2026-0001'),
  (select id from public.products where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha') and name = 'General Unit'),
  'goods', 'General Unit', 'pcs', 1.000, 250.00, 250.00
);

insert into public.payments (organization_id, sales_order_id, amount, payment_method, created_by)
values (
  (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
  (select id from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha') and order_number = 'SO-2026-0001'),
  250.00,
  'cash',
  '00000000-0000-4000-8000-000000000501'::uuid
);

select pg_temp.assert_raises(
  'duplicate order number case-insensitively in same org rejected',
  $$
    insert into public.sales_orders (organization_id, order_number, customer_id, grand_total, created_by)
    values (
      (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
      'so-2026-0001',
      (select id from public.customers where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha') and display_name = 'SAL Alpha Customer'),
      100.00,
      '00000000-0000-4000-8000-000000000501'::uuid
    )
  $$,
  '23505'
);

select pg_temp.assert_raises(
  'non-positive payment amount rejected',
  $$
    insert into public.payments (organization_id, sales_order_id, amount, payment_method, created_by)
    values (
      (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
      (select id from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha') and order_number = 'SO-2026-0001'),
      0.00,
      'cash',
      '00000000-0000-4000-8000-000000000501'::uuid
    )
  $$,
  '23514'
);
reset role;

-- Beta creates its own customer, product, and sales order with same order number
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000507'::uuid);
insert into public.customers (organization_id, customer_type, display_name, created_by)
values ((select id from sal_001_org_ids where slug = 'sal-001-test-beta'), 'individual', 'SAL Beta Customer', '00000000-0000-4000-8000-000000000507'::uuid);

insert into public.sales_orders (organization_id, order_number, customer_id, grand_total, created_by)
values (
  (select id from sal_001_org_ids where slug = 'sal-001-test-beta'),
  'SO-2026-0001',
  (select id from public.customers where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-beta') and display_name = 'SAL Beta Customer'),
  50.00,
  '00000000-0000-4000-8000-000000000507'::uuid
);
reset role;

create temp table sal_001_customers as
select display_name, id from public.customers
where organization_id in (select id from sal_001_org_ids);
grant select on sal_001_customers to authenticated;

create temp table sal_001_orders as
select organization_id, order_number, id from public.sales_orders
where organization_id in (select id from sal_001_org_ids);
grant select on sal_001_orders to authenticated;

-- Cross-tenant composite FK rejected
select pg_temp.assert_raises(
  'cross-tenant customer reference in sales_orders rejected',
  $$
    insert into public.sales_orders (organization_id, order_number, customer_id, grand_total, created_by)
    values (
      (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
      'SO-2026-CROSS',
      (select id from sal_001_customers where display_name = 'SAL Beta Customer'),
      10.00,
      '00000000-0000-4000-8000-000000000501'::uuid
    )
  $$,
  '23503'
);

select pg_temp.assert_raises(
  'cross-tenant sales_order reference in payments rejected',
  $$
    insert into public.payments (organization_id, sales_order_id, amount, payment_method, created_by)
    values (
      (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
      (select id from sal_001_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-beta')),
      10.00,
      'cash',
      '00000000-0000-4000-8000-000000000501'::uuid
    )
  $$,
  '23503'
);

-- Immutability trigger blocks organization_id change
select pg_temp.assert_raises(
  'sales_orders.organization_id is immutable',
  $$
    update public.sales_orders
    set organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-beta')
    where id = (select id from sal_001_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'))
  $$,
  '23514'
);

-- Viewer can read Alpha sales/items/payments but cannot write
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000504'::uuid);
select pg_temp.assert_eq(
  'viewer reads Alpha sales orders only',
  (select count(*) from public.sales_orders where organization_id in (select id from sal_001_org_ids)),
  1
);
select pg_temp.assert_eq(
  'viewer reads Alpha payments',
  (select count(*) from public.payments where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  1
);
select pg_temp.assert_raises(
  'viewer cannot insert sales order',
  $$
    insert into public.sales_orders (organization_id, order_number, customer_id, grand_total, created_by)
    values (
      (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
      'SO-VIEWER',
      (select id from sal_001_customers where display_name = 'SAL Alpha Customer'),
      10.00,
      '00000000-0000-4000-8000-000000000504'::uuid
    )
  $$,
  '42501'
);
reset role;

-- Technician has no sales read access
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000505'::uuid);
select pg_temp.assert_eq(
  'technician cannot read sales orders',
  (select count(*) from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'technician cannot read payments',
  (select count(*) from public.payments where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
reset role;

-- Cross-tenant (Beta owner), disabled member, and non-member isolation
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000507'::uuid);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha sales orders',
  (select count(*) from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha sales order items',
  (select count(*) from public.sales_order_items where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha payments',
  (select count(*) from public.payments where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
select pg_temp.assert_raises(
  'beta owner cannot insert payment into Alpha',
  $$
    insert into public.payments (organization_id, sales_order_id, amount, payment_method, created_by)
    values (
      (select id from sal_001_org_ids where slug = 'sal-001-test-alpha'),
      (select id from sal_001_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
      10.00,
      'cash',
      '00000000-0000-4000-8000-000000000507'::uuid
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000506'::uuid);
select pg_temp.assert_eq(
  'disabled member cannot read Alpha sales orders',
  (select count(*) from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000508'::uuid);
select pg_temp.assert_eq(
  'non-member cannot read Alpha sales orders',
  (select count(*) from public.sales_orders where organization_id = (select id from sal_001_org_ids where slug = 'sal-001-test-alpha')),
  0
);
reset role;

\echo 'TASK-SAL-001 sales order, items, and payments schema and RLS tests passed'
