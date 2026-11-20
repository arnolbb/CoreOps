\echo 'Running TASK-PRO-001 product schema and RLS tests'

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

delete from public.products
where organization_id in (
  select id from public.organizations where slug like 'pro-001-test-%'
);

delete from public.product_categories
where organization_id in (
  select id from public.organizations where slug like 'pro-001-test-%'
);

delete from public.audit_logs
where organization_id in (
  select id from public.organizations where slug like 'pro-001-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000201'::uuid,
  '00000000-0000-4000-8000-000000000202'::uuid,
  '00000000-0000-4000-8000-000000000203'::uuid,
  '00000000-0000-4000-8000-000000000204'::uuid,
  '00000000-0000-4000-8000-000000000205'::uuid,
  '00000000-0000-4000-8000-000000000206'::uuid,
  '00000000-0000-4000-8000-000000000207'::uuid,
  '00000000-0000-4000-8000-000000000208'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'pro-001-test-%'
);

delete from public.organizations where slug like 'pro-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000201'::uuid,
  '00000000-0000-4000-8000-000000000202'::uuid,
  '00000000-0000-4000-8000-000000000203'::uuid,
  '00000000-0000-4000-8000-000000000204'::uuid,
  '00000000-0000-4000-8000-000000000205'::uuid,
  '00000000-0000-4000-8000-000000000206'::uuid,
  '00000000-0000-4000-8000-000000000207'::uuid,
  '00000000-0000-4000-8000-000000000208'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000201'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000202'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-admin-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000203'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-staff-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000204'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000205'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-technician-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000206'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000207'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000208'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'pro-001-non-member@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

select pg_temp.assert_eq(
  'product tables have RLS enabled',
  (
    select count(*)
    from pg_class
    where oid in ('public.product_categories'::regclass, 'public.products'::regclass)
      and relrowsecurity
  ),
  2
);

select pg_temp.assert_false(
  'anon cannot select products',
  has_table_privilege('anon', 'public.products', 'select')
);
select pg_temp.assert_false(
  'authenticated cannot hard-delete products',
  has_table_privilege('authenticated', 'public.products', 'delete')
);
select pg_temp.assert_true(
  'authenticated can execute archive_product RPC',
  has_function_privilege('authenticated', 'public.archive_product(uuid)', 'execute')
);
select pg_temp.assert_false(
  'anon cannot execute archive_product RPC',
  has_function_privilege('anon', 'public.archive_product(uuid)', 'execute')
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000201'::uuid);
select public.create_organization('PRO 001 Test Alpha', 'pro-001-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000207'::uuid);
select public.create_organization('PRO 001 Test Beta', 'pro-001-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table pro_001_org_ids as
select slug, id from public.organizations where slug like 'pro-001-test-%';
grant select on pro_001_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000201'::uuid);
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), '00000000-0000-4000-8000-000000000202'::uuid, 'admin', 'active'),
  ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), '00000000-0000-4000-8000-000000000203'::uuid, 'staff', 'active'),
  ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), '00000000-0000-4000-8000-000000000204'::uuid, 'viewer', 'active'),
  ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), '00000000-0000-4000-8000-000000000205'::uuid, 'technician', 'active'),
  ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), '00000000-0000-4000-8000-000000000206'::uuid, 'staff', 'disabled');
reset role;

-- Owner creates category and product in Alpha
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000201'::uuid);
insert into public.product_categories (organization_id, name)
values ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), 'Hardware');

insert into public.products (
  organization_id, product_type, name, sku, category_id, unit, cost_price, selling_price, created_by
) values (
  (select id from pro_001_org_ids where slug = 'pro-001-test-alpha'),
  'goods',
  'Standard Unit A',
  'SKU-001',
  (select id from public.product_categories where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-alpha') and name = 'Hardware'),
  'pcs',
  10.00,
  25.00,
  '00000000-0000-4000-8000-000000000201'::uuid
);

select pg_temp.assert_raises(
  'duplicate SKU case-insensitively in same org rejected',
  $$
    insert into public.products (organization_id, product_type, name, sku, unit, created_by)
    values (
      (select id from pro_001_org_ids where slug = 'pro-001-test-alpha'),
      'goods',
      'Duplicate SKU Product',
      'sku-001',
      'pcs',
      '00000000-0000-4000-8000-000000000201'::uuid
    )
  $$,
  '23505'
);

select pg_temp.assert_raises(
  'duplicate category name case-insensitively in same org rejected',
  $$
    insert into public.product_categories (organization_id, name)
    values ((select id from pro_001_org_ids where slug = 'pro-001-test-alpha'), 'hardware')
  $$,
  '23505'
);
reset role;

-- Beta creates its own category and product with the same SKU (tenant-scoped uniqueness)
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000207'::uuid);
insert into public.product_categories (organization_id, name)
values ((select id from pro_001_org_ids where slug = 'pro-001-test-beta'), 'Hardware');

insert into public.products (
  organization_id, product_type, name, sku, unit, created_by
) values (
  (select id from pro_001_org_ids where slug = 'pro-001-test-beta'),
  'goods',
  'Beta Unit',
  'SKU-001',
  'pcs',
  '00000000-0000-4000-8000-000000000207'::uuid
);
reset role;

create temp table pro_001_cat_ids as
select organization_id, name, id from public.product_categories
where organization_id in (select id from pro_001_org_ids);
grant select on pro_001_cat_ids to authenticated;

create temp table pro_001_product_ids as
select organization_id, name, id from public.products
where organization_id in (select id from pro_001_org_ids);
grant select on pro_001_product_ids to authenticated;

-- Cross-tenant category FK rejected
select pg_temp.assert_raises(
  'cross-tenant category reference rejected by composite FK',
  $$
    insert into public.products (organization_id, product_type, name, category_id, unit, created_by)
    values (
      (select id from pro_001_org_ids where slug = 'pro-001-test-alpha'),
      'goods',
      'Cross-Tenant Category Product',
      (select id from pro_001_cat_ids where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-beta') and name = 'Hardware'),
      'pcs',
      '00000000-0000-4000-8000-000000000201'::uuid
    )
  $$,
  '23503'
);

-- Viewer and Technician can read Alpha products but cannot write
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000204'::uuid);
select pg_temp.assert_eq(
  'viewer reads only Alpha products',
  (select count(*) from public.products where organization_id in (select id from pro_001_org_ids)),
  1
);
select pg_temp.assert_raises(
  'viewer cannot insert product',
  $$
    insert into public.products (organization_id, product_type, name, unit, created_by)
    values (
      (select id from pro_001_org_ids where slug = 'pro-001-test-alpha'),
      'goods', 'Viewer Item', 'pcs', '00000000-0000-4000-8000-000000000204'::uuid
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000205'::uuid);
select pg_temp.assert_eq(
  'technician reads Alpha products',
  (select count(*) from public.products where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-alpha')),
  1
);
select pg_temp.assert_raises(
  'technician cannot insert product',
  $$
    insert into public.products (organization_id, product_type, name, unit, created_by)
    values (
      (select id from pro_001_org_ids where slug = 'pro-001-test-alpha'),
      'goods', 'Tech Item', 'pcs', '00000000-0000-4000-8000-000000000205'::uuid
    )
  $$,
  '42501'
);
reset role;

-- Cross-tenant, disabled member, and non-member isolation
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000207'::uuid);
select pg_temp.assert_eq(
  'beta owner cannot read Alpha products',
  (select count(*) from public.products where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-alpha')),
  0
);
select pg_temp.assert_raises(
  'beta owner cannot insert product into Alpha',
  $$
    insert into public.products (organization_id, product_type, name, unit, created_by)
    values (
      (select id from pro_001_org_ids where slug = 'pro-001-test-alpha'),
      'goods', 'Cross Org Item', 'pcs', '00000000-0000-4000-8000-000000000207'::uuid
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'beta owner cannot archive Alpha product',
  $$
    select * from public.archive_product(
      (select id from pro_001_product_ids where name = 'Standard Unit A')
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000206'::uuid);
select pg_temp.assert_eq(
  'disabled member cannot read Alpha products',
  (select count(*) from public.products where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-alpha')),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000208'::uuid);
select pg_temp.assert_eq(
  'non-member cannot read Alpha products',
  (select count(*) from public.products where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-alpha')),
  0
);
reset role;

-- Immutability trigger blocks organization_id change
select pg_temp.assert_raises(
  'products.organization_id is immutable',
  $$
    update public.products
    set organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-beta')
    where id = (select id from pro_001_product_ids where name = 'Standard Unit A')
  $$,
  '23514'
);

-- Archive RPC permission and audit log checks
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000203'::uuid);
select pg_temp.assert_raises(
  'staff cannot archive product',
  $$
    select * from public.archive_product(
      (select id from pro_001_product_ids where name = 'Standard Unit A')
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000201'::uuid);
select pg_temp.assert_eq(
  'owner can archive Alpha product via RPC',
  (
    select count(*)
    from public.archive_product(
      (select id from pro_001_product_ids where name = 'Standard Unit A')
    )
    where is_active = false and archived_at is not null
  ),
  1
);
select pg_temp.assert_raises(
  'archiving already archived product fails',
  $$
    select * from public.archive_product(
      (select id from pro_001_product_ids where name = 'Standard Unit A')
    )
  $$,
  'P0001'
);
reset role;

select pg_temp.assert_eq(
  'product archive records audit event',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from pro_001_org_ids where slug = 'pro-001-test-alpha')
      and action = 'product.archived'
      and entity_id = (select id from pro_001_product_ids where name = 'Standard Unit A')
  ),
  1
);

\echo 'TASK-PRO-001 product schema and RLS tests passed'
