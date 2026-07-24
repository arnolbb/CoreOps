\echo 'Running TASK-CUS-001 customer schema and RLS tests'

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

delete from public.customer_tags
where organization_id in (
  select id
  from public.organizations
  where slug like 'cus-001-test-%'
);

delete from public.customer_addresses
where organization_id in (
  select id
  from public.organizations
  where slug like 'cus-001-test-%'
);

delete from public.tags
where organization_id in (
  select id
  from public.organizations
  where slug like 'cus-001-test-%'
);

delete from public.customers
where organization_id in (
  select id
  from public.organizations
  where slug like 'cus-001-test-%'
);

delete from public.audit_logs
where organization_id in (
  select id
  from public.organizations
  where slug like 'cus-001-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000101'::uuid,
  '00000000-0000-4000-8000-000000000102'::uuid,
  '00000000-0000-4000-8000-000000000103'::uuid,
  '00000000-0000-4000-8000-000000000104'::uuid,
  '00000000-0000-4000-8000-000000000105'::uuid,
  '00000000-0000-4000-8000-000000000106'::uuid,
  '00000000-0000-4000-8000-000000000107'::uuid,
  '00000000-0000-4000-8000-000000000108'::uuid
)
or organization_id in (
  select id
  from public.organizations
  where slug like 'cus-001-test-%'
);

delete from public.organizations
where slug like 'cus-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000101'::uuid,
  '00000000-0000-4000-8000-000000000102'::uuid,
  '00000000-0000-4000-8000-000000000103'::uuid,
  '00000000-0000-4000-8000-000000000104'::uuid,
  '00000000-0000-4000-8000-000000000105'::uuid,
  '00000000-0000-4000-8000-000000000106'::uuid,
  '00000000-0000-4000-8000-000000000107'::uuid,
  '00000000-0000-4000-8000-000000000108'::uuid
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-4000-8000-000000000101'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-owner-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000102'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-admin-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-staff-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000104'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-viewer-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000105'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-technician-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000106'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-disabled-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000107'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-owner-b@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000108'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'cus-001-non-member@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select pg_temp.assert_eq(
  'customer tables exist',
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('customers', 'customer_addresses', 'tags', 'customer_tags')
  ),
  4
);

select pg_temp.assert_eq(
  'customer helper functions exist',
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'current_user_can_read_customers',
        'current_user_can_create_customers',
        'current_user_can_update_customers',
        'current_user_can_archive_customers',
        'customer_is_active_in_organization',
        'archive_customer'
      )
  ),
  6
);

select pg_temp.assert_eq(
  'customer table RLS enabled',
  (
    select count(*)
    from pg_class
    where oid in (
      'public.customers'::regclass,
      'public.customer_addresses'::regclass,
      'public.tags'::regclass,
      'public.customer_tags'::regclass
    )
      and relrowsecurity
  ),
  4
);

select pg_temp.assert_eq(
  'customer RLS policies exist',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'customers_select_customer_readers',
        'customers_insert_customer_creators',
        'customers_update_active_customer_editors',
        'customer_addresses_select_customer_readers',
        'customer_addresses_insert_customer_editors',
        'customer_addresses_update_customer_editors',
        'tags_select_customer_readers',
        'tags_insert_customer_editors',
        'tags_update_customer_editors',
        'customer_tags_select_customer_readers',
        'customer_tags_insert_customer_editors',
        'customer_tags_delete_customer_editors'
      )
  ),
  12
);

select pg_temp.assert_eq(
  'no hard delete policies for customer records',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'customer_addresses', 'tags')
      and cmd = 'DELETE'
  ),
  0
);

select pg_temp.assert_eq(
  'no update policy for customer tag relationships',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_tags'
      and cmd = 'UPDATE'
  ),
  0
);

select pg_temp.assert_false(
  'anon cannot select customers',
  has_table_privilege('anon', 'public.customers', 'select')
);
select pg_temp.assert_false(
  'anon cannot select customer addresses',
  has_table_privilege('anon', 'public.customer_addresses', 'select')
);
select pg_temp.assert_false(
  'anon cannot select tags',
  has_table_privilege('anon', 'public.tags', 'select')
);
select pg_temp.assert_false(
  'anon cannot select customer tag relationships',
  has_table_privilege('anon', 'public.customer_tags', 'select')
);

select pg_temp.assert_true(
  'authenticated can select insert update customers',
  has_table_privilege('authenticated', 'public.customers', 'select')
  and has_table_privilege('authenticated', 'public.customers', 'insert')
  and has_table_privilege('authenticated', 'public.customers', 'update')
);
select pg_temp.assert_false(
  'authenticated cannot delete customers',
  has_table_privilege('authenticated', 'public.customers', 'delete')
);
select pg_temp.assert_false(
  'authenticated cannot update customer tag relationships',
  has_table_privilege('authenticated', 'public.customer_tags', 'update')
);
select pg_temp.assert_true(
  'authenticated can execute archive_customer RPC',
  has_function_privilege('authenticated', 'public.archive_customer(uuid)', 'execute')
);
select pg_temp.assert_false(
  'anon cannot execute archive_customer RPC',
  has_function_privilege('anon', 'public.archive_customer(uuid)', 'execute')
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select public.create_organization(
  'CUS 001 Test Alpha',
  'cus-001-test-alpha',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000107'::uuid);
select public.create_organization(
  'CUS 001 Test Beta',
  'cus-001-test-beta',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

create temp table cus_001_org_ids as
select slug, id
from public.organizations
where slug like 'cus-001-test-%';

grant select on cus_001_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
) values
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    '00000000-0000-4000-8000-000000000102'::uuid,
    'admin',
    'active'
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    '00000000-0000-4000-8000-000000000103'::uuid,
    'staff',
    'active'
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    '00000000-0000-4000-8000-000000000104'::uuid,
    'viewer',
    'active'
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    '00000000-0000-4000-8000-000000000105'::uuid,
    'technician',
    'active'
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    '00000000-0000-4000-8000-000000000106'::uuid,
    'staff',
    'disabled'
  );
reset role;

insert into public.customers (
  organization_id,
  customer_type,
  display_name,
  company_name,
  phone,
  email,
  status,
  notes,
  created_by,
  archived_at
) values
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    'individual',
    'CUS 001 Alpha Active',
    null,
    '+620000000001',
    'cus-001-alpha-active@example.test',
    'active',
    'alpha active notes',
    '00000000-0000-4000-8000-000000000101'::uuid,
    null
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    'business',
    'CUS 001 Alpha Archived',
    'Archived Co',
    '+620000000002',
    'cus-001-alpha-archived@example.test',
    'archived',
    'alpha archived sensitive notes',
    '00000000-0000-4000-8000-000000000101'::uuid,
    now() - interval '1 day'
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-beta'),
    'individual',
    'CUS 001 Beta Active',
    null,
    '+620000000003',
    'cus-001-beta-active@example.test',
    'active',
    'beta active notes',
    '00000000-0000-4000-8000-000000000107'::uuid,
    null
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    'individual',
    'CUS 001 Archive Target',
    null,
    null,
    null,
    'active',
    'do not copy this secret-ish note to audit',
    '00000000-0000-4000-8000-000000000101'::uuid,
    null
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    'individual',
    'CUS 001 Staff Archive Denied',
    null,
    null,
    null,
    'active',
    null,
    '00000000-0000-4000-8000-000000000101'::uuid,
    null
  );

create temp table cus_001_customer_ids as
select display_name, id
from public.customers
where organization_id in (select id from cus_001_org_ids);

grant select on cus_001_customer_ids to authenticated;

insert into public.tags (organization_id, name, color_token) values
  ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'VIP', 'info'),
  ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'Service', 'success'),
  ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'Editable', 'warning'),
  ((select id from cus_001_org_ids where slug = 'cus-001-test-beta'), 'VIP', 'info');

create temp table cus_001_tag_ids as
select organization_id, name, id
from public.tags
where organization_id in (select id from cus_001_org_ids);

grant select on cus_001_tag_ids to authenticated;

insert into public.customer_addresses (
  organization_id,
  customer_id,
  label,
  address_line_1,
  city,
  country_code,
  is_primary
) values
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
    'Main',
    'Alpha Street 1',
    'Alpha City',
    'ID',
    true
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-beta'),
    (select id from cus_001_customer_ids where display_name = 'CUS 001 Beta Active'),
    'Main',
    'Beta Street 1',
    'Beta City',
    'ID',
    true
  );

create temp table cus_001_address_ids as
select label, organization_id, customer_id, id
from public.customer_addresses
where organization_id in (select id from cus_001_org_ids);

grant select on cus_001_address_ids to authenticated;

insert into public.customer_tags (organization_id, customer_id, tag_id) values
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
    (
      select id
      from cus_001_tag_ids
      where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
        and name = 'VIP'
    )
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-beta'),
    (select id from cus_001_customer_ids where display_name = 'CUS 001 Beta Active'),
    (
      select id
      from cus_001_tag_ids
      where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-beta')
        and name = 'VIP'
    )
  );

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select pg_temp.assert_eq(
  'owner can read active and archived alpha customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  4
);
select pg_temp.assert_eq(
  'owner cannot read beta customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-beta')
  ),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000102'::uuid);
select pg_temp.assert_eq(
  'admin can read alpha customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  4
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000103'::uuid);
select pg_temp.assert_eq(
  'staff can read alpha customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  4
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000104'::uuid);
select pg_temp.assert_eq(
  'viewer can read alpha customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  4
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000105'::uuid);
select pg_temp.assert_eq(
  'technician has no broad customer read',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000106'::uuid);
select pg_temp.assert_eq(
  'disabled member cannot read customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000108'::uuid);
select pg_temp.assert_eq(
  'non-member cannot read customers',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
insert into public.customers (
  organization_id,
  customer_type,
  display_name,
  created_by
) values (
  (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
  'individual',
  'CUS 001 Owner Created',
  '00000000-0000-4000-8000-000000000101'::uuid
);
select pg_temp.assert_eq(
  'owner can create customer',
  (
    select count(*)
    from public.customers
    where display_name = 'CUS 001 Owner Created'
  ),
  1
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000102'::uuid);
insert into public.customers (
  organization_id,
  customer_type,
  display_name,
  created_by
) values (
  (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
  'individual',
  'CUS 001 Admin Created',
  '00000000-0000-4000-8000-000000000102'::uuid
);
select pg_temp.assert_eq(
  'admin can create customer',
  (
    select count(*)
    from public.customers
    where display_name = 'CUS 001 Admin Created'
  ),
  1
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000103'::uuid);
insert into public.customers (
  organization_id,
  customer_type,
  display_name,
  created_by
) values (
  (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
  'individual',
  'CUS 001 Staff Created',
  '00000000-0000-4000-8000-000000000103'::uuid
);
select pg_temp.assert_eq(
  'staff can create customer',
  (
    select count(*)
    from public.customers
    where display_name = 'CUS 001 Staff Created'
  ),
  1
);
with attempted_update as (
  update public.customers
  set notes = 'staff update succeeded'
  where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active')
  returning id
)
select pg_temp.assert_eq('staff can update active customer', (select count(*) from attempted_update), 1);
select pg_temp.assert_raises(
  'staff cannot archive with direct update',
  $$
    update public.customers
    set status = 'archived', archived_at = now()
    where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Staff Archive Denied')
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'staff cannot archive with RPC',
  $$
    select * from public.archive_customer(
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Staff Archive Denied')
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000104'::uuid);
select pg_temp.assert_raises(
  'viewer cannot create customer',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Viewer Created',
      '00000000-0000-4000-8000-000000000104'::uuid
    )
  $$,
  '42501'
);
with attempted_update as (
  update public.customers
  set notes = 'viewer update denied'
  where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active')
  returning id
)
select pg_temp.assert_eq('viewer cannot update customer', (select count(*) from attempted_update), 0);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000105'::uuid);
select pg_temp.assert_raises(
  'technician cannot create customer',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Technician Created',
      '00000000-0000-4000-8000-000000000105'::uuid
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000106'::uuid);
select pg_temp.assert_raises(
  'disabled member cannot create customer',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Disabled Created',
      '00000000-0000-4000-8000-000000000106'::uuid
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000108'::uuid);
select pg_temp.assert_raises(
  'non-member cannot create customer',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Non Member Created',
      '00000000-0000-4000-8000-000000000108'::uuid
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select pg_temp.assert_raises(
  'owner cannot spoof created_by',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Spoofed Creator',
      '00000000-0000-4000-8000-000000000102'::uuid
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'owner cannot insert archived customer directly',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      status,
      archived_at,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Direct Archived',
      'archived',
      now(),
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '42501'
);
select pg_temp.assert_raises(
  'owner cannot create customer in another tenant',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-beta'),
      'individual',
      'CUS 001 Cross Tenant Created',
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '42501'
);
with attempted_update as (
  update public.customers
  set notes = 'cross tenant update denied'
  where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Beta Active')
  returning id
)
select pg_temp.assert_eq('owner cannot update beta customer', (select count(*) from attempted_update), 0);
select pg_temp.assert_raises(
  'owner cannot hard delete customer',
  $$
    delete from public.customers
    where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active')
  $$,
  '42501'
);
select * from public.archive_customer(
  (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target')
);
select pg_temp.assert_text_eq(
  'owner archive RPC marks customer archived',
  (
    select status
    from public.customers
    where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target')
  ),
  'archived'
);
reset role;
select pg_temp.assert_eq(
  'archive RPC writes one audit row',
  (
    select count(*)
    from public.audit_logs
    where action = 'customer.archived'
      and entity_type = 'customer'
      and entity_id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target')
  ),
  1
);
select pg_temp.assert_eq(
  'archive audit omits full notes',
  (
    select count(*)
    from public.audit_logs
    where action = 'customer.archived'
      and (
        before_data::text like '%secret-ish%'
        or after_data::text like '%secret-ish%'
        or metadata::text like '%secret-ish%'
      )
  ),
  0
);
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select pg_temp.assert_raises(
  'archived customer cannot be re-archived',
  $$
    select * from public.archive_customer(
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target')
    )
  $$,
  'P0001'
);
with attempted_archived_update as (
  update public.customers
  set notes = 'archived update denied'
  where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target')
  returning id
)
select pg_temp.assert_eq(
  'archived customer cannot be updated directly',
  (select count(*) from attempted_archived_update),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000107'::uuid);
select pg_temp.assert_raises(
  'cross-tenant owner cannot archive alpha customer',
  $$
    select * from public.archive_customer(
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Staff Archive Denied')
    )
  $$,
  '42501'
);
reset role;

select pg_temp.assert_raises(
  'invalid customer type rejected',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'invalid',
      'CUS 001 Invalid Type',
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'blank customer display name rejected',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      '   ',
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'invalid customer email rejected',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      email,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Invalid Email',
      'not-an-email',
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'active customer cannot have archived_at',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      status,
      archived_at,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Invalid Archive State',
      'active',
      now(),
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'archived customer requires archived_at',
  $$
    insert into public.customers (
      organization_id,
      customer_type,
      display_name,
      status,
      created_by
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      'individual',
      'CUS 001 Missing Archived At',
      'archived',
      '00000000-0000-4000-8000-000000000101'::uuid
    )
  $$,
  '23514'
);
insert into public.customers (
  organization_id,
  customer_type,
  display_name,
  phone,
  email,
  created_by
) values
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    'individual',
    'CUS 001 Duplicate Identity',
    '+620000009999',
    'cus-001-duplicate@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  (
    (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
    'business',
    'CUS 001 Duplicate Identity',
    '+620000009999',
    'cus-001-duplicate@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  );
select pg_temp.assert_eq(
  'duplicate customer display_name email and phone allowed in same organization',
  (
    select count(*)
    from public.customers
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
      and display_name = 'CUS 001 Duplicate Identity'
      and phone = '+620000009999'
      and email = 'cus-001-duplicate@example.test'
  ),
  2
);

select pg_temp.assert_raises(
  'customer organization id immutable',
  $$
    update public.customers
    set organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-beta')
    where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active')
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'customer created_by immutable',
  $$
    update public.customers
    set created_by = '00000000-0000-4000-8000-000000000102'::uuid
    where id = (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active')
  $$,
  '23514'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select pg_temp.assert_eq(
  'owner can read alpha customer addresses',
  (
    select count(*)
    from public.customer_addresses
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  1
);
insert into public.customer_addresses (
  organization_id,
  customer_id,
  label,
  address_line_1,
  country_code
) values (
  (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
  (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
  'Owner Secondary',
  'Owner Address 1',
  'ID'
);
with attempted_update as (
  update public.customer_addresses
  set city = 'Updated Alpha City'
  where id = (
    select id
    from cus_001_address_ids
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  )
  returning id
)
select pg_temp.assert_eq('owner can update customer address', (select count(*) from attempted_update), 1);
select pg_temp.assert_raises(
  'owner cannot insert address for archived customer',
  $$
    insert into public.customer_addresses (
      organization_id,
      customer_id,
      label,
      address_line_1,
      country_code
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target'),
      'Archived Address',
      'Archived Address 1',
      'ID'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000104'::uuid);
select pg_temp.assert_eq(
  'viewer can read customer addresses',
  (
    select count(*)
    from public.customer_addresses
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  2
);
select pg_temp.assert_raises(
  'viewer cannot insert customer address',
  $$
    insert into public.customer_addresses (
      organization_id,
      customer_id,
      label,
      address_line_1,
      country_code
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      'Viewer Address',
      'Viewer Address 1',
      'ID'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000105'::uuid);
select pg_temp.assert_eq(
  'technician cannot read customer addresses',
  (
    select count(*)
    from public.customer_addresses
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  0
);
reset role;

select pg_temp.assert_raises(
  'cross-tenant customer address reference rejected',
  $$
    insert into public.customer_addresses (
      organization_id,
      customer_id,
      label,
      address_line_1,
      country_code
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Beta Active'),
      'Cross Tenant',
      'Cross Tenant Address 1',
      'ID'
    )
  $$,
  '23503'
);
select pg_temp.assert_raises(
  'second primary address for same customer rejected',
  $$
    insert into public.customer_addresses (
      organization_id,
      customer_id,
      label,
      address_line_1,
      country_code,
      is_primary
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      'Duplicate Primary',
      'Duplicate Primary Address 1',
      'ID',
      true
    )
  $$,
  '23505'
);
select pg_temp.assert_raises(
  'invalid country code rejected',
  $$
    insert into public.customer_addresses (
      organization_id,
      customer_id,
      label,
      address_line_1,
      country_code
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      'Invalid Country',
      'Invalid Country Address 1',
      'id'
    )
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'invalid latitude rejected',
  $$
    insert into public.customer_addresses (
      organization_id,
      customer_id,
      label,
      address_line_1,
      country_code,
      latitude
    ) values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      'Invalid Latitude',
      'Invalid Latitude Address 1',
      'ID',
      91
    )
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'customer address organization id immutable',
  $$
    update public.customer_addresses
    set organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-beta')
    where id = (
      select id
      from cus_001_address_ids
      where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
    )
  $$,
  '23514'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select pg_temp.assert_eq(
  'owner can read alpha tags',
  (
    select count(*)
    from public.tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  3
);
insert into public.tags (organization_id, name, color_token)
values ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'Owner Tag', 'info');
with attempted_update as (
  update public.tags
  set color_token = 'success'
  where id = (
    select id
    from cus_001_tag_ids
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
      and name = 'Editable'
  )
  returning id
)
select pg_temp.assert_eq('owner can update tag', (select count(*) from attempted_update), 1);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000104'::uuid);
select pg_temp.assert_eq(
  'viewer can read tags',
  (
    select count(*)
    from public.tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  4
);
select pg_temp.assert_raises(
  'viewer cannot create tag',
  $$
    insert into public.tags (organization_id, name)
    values ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'Viewer Tag')
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000105'::uuid);
select pg_temp.assert_eq(
  'technician cannot read tags',
  (
    select count(*)
    from public.tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  0
);
reset role;

select pg_temp.assert_raises(
  'case-insensitive duplicate tag rejected in same organization',
  $$
    insert into public.tags (organization_id, name)
    values ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'vip')
  $$,
  '23505'
);
select pg_temp.assert_raises(
  'tag rename to case-insensitive duplicate rejected',
  $$
    update public.tags
    set name = 'vIp'
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
      and name = 'Service'
  $$,
  '23505'
);
insert into public.tags (organization_id, name)
values
  ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), 'Cross Org Tag'),
  ((select id from cus_001_org_ids where slug = 'cus-001-test-beta'), 'cross org tag');
select pg_temp.assert_eq(
  'same tag name case allowed across organizations',
  (
    select count(*)
    from public.tags
    where lower(name) = 'cross org tag'
  ),
  2
);
select pg_temp.assert_raises(
  'blank tag name rejected',
  $$
    insert into public.tags (organization_id, name)
    values ((select id from cus_001_org_ids where slug = 'cus-001-test-alpha'), '   ')
  $$,
  '23514'
);
select pg_temp.assert_raises(
  'tag organization id immutable',
  $$
    update public.tags
    set organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-beta')
    where id = (
      select id
      from cus_001_tag_ids
      where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
        and name = 'VIP'
    )
  $$,
  '23514'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000101'::uuid);
select pg_temp.assert_eq(
  'owner can read customer tag relationships',
  (
    select count(*)
    from public.customer_tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  1
);
insert into public.customer_tags (organization_id, customer_id, tag_id)
values (
  (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
  (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
  (
    select id
    from cus_001_tag_ids
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
      and name = 'Service'
  )
);
select pg_temp.assert_eq(
  'owner can assign tag to active customer',
  (
    select count(*)
    from public.customer_tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  2
);
select pg_temp.assert_raises(
  'owner cannot assign tag to archived customer',
  $$
    insert into public.customer_tags (organization_id, customer_id, tag_id)
    values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Archive Target'),
      (
        select id
        from cus_001_tag_ids
        where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
          and name = 'Editable'
      )
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000104'::uuid);
select pg_temp.assert_eq(
  'viewer can read customer tag relationships',
  (
    select count(*)
    from public.customer_tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  2
);
select pg_temp.assert_raises(
  'viewer cannot assign customer tag',
  $$
    insert into public.customer_tags (organization_id, customer_id, tag_id)
    values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      (
        select id
        from cus_001_tag_ids
        where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
          and name = 'Editable'
      )
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000105'::uuid);
select pg_temp.assert_eq(
  'technician cannot read customer tag relationships',
  (
    select count(*)
    from public.customer_tags
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  ),
  0
);
reset role;

select pg_temp.assert_raises(
  'cross-tenant customer tag customer reference rejected',
  $$
    insert into public.customer_tags (organization_id, customer_id, tag_id)
    values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Beta Active'),
      (
        select id
        from cus_001_tag_ids
        where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
          and name = 'Editable'
      )
    )
  $$,
  '23503'
);
select pg_temp.assert_raises(
  'cross-tenant customer tag tag reference rejected',
  $$
    insert into public.customer_tags (organization_id, customer_id, tag_id)
    values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      (
        select id
        from cus_001_tag_ids
        where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-beta')
          and name = 'VIP'
      )
    )
  $$,
  '23503'
);
select pg_temp.assert_raises(
  'duplicate customer tag relationship rejected',
  $$
    insert into public.customer_tags (organization_id, customer_id, tag_id)
    values (
      (select id from cus_001_org_ids where slug = 'cus-001-test-alpha'),
      (select id from cus_001_customer_ids where display_name = 'CUS 001 Alpha Active'),
      (
        select id
        from cus_001_tag_ids
        where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
          and name = 'VIP'
      )
    )
  $$,
  '23505'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000103'::uuid);
with removed_tag as (
  delete from public.customer_tags
  where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
    and tag_id = (
      select id
      from cus_001_tag_ids
      where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
        and name = 'Service'
    )
  returning tag_id
)
select pg_temp.assert_eq('staff can remove tag relationship', (select count(*) from removed_tag), 1);
select pg_temp.assert_raises(
  'customer tag relationship update denied',
  $$
    update public.customer_tags
    set tag_id = (
      select id
      from cus_001_tag_ids
      where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
        and name = 'Editable'
    )
    where organization_id = (select id from cus_001_org_ids where slug = 'cus-001-test-alpha')
  $$,
  '42501'
);
reset role;

\echo 'TASK-CUS-001 customer schema and RLS tests passed'
