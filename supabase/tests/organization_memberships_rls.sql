\echo 'Running TASK-ORG-001 organization membership RLS tests'

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

-- Deterministic cleanup makes the test repeatable against a reset database or a
-- developer database where a previous interrupted test left rows behind.
alter table public.organization_memberships
  disable trigger organization_memberships_prevent_last_active_owner_loss;

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000002'::uuid,
  '00000000-0000-4000-8000-000000000003'::uuid,
  '00000000-0000-4000-8000-000000000004'::uuid
)
or organization_id in (
  select id
  from public.organizations
  where slug like 'org-001-test-%'
);

delete from public.organizations
where slug like 'org-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000002'::uuid,
  '00000000-0000-4000-8000-000000000003'::uuid,
  '00000000-0000-4000-8000-000000000004'::uuid
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
    '00000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-001-owner-a@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-001-owner-b@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-001-disabled-member@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-001-non-member@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select pg_temp.assert_true(
  'organizations RLS enabled',
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.organizations'::regclass
  )
);

select pg_temp.assert_true(
  'organization_memberships RLS enabled',
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.organization_memberships'::regclass
  )
);

select pg_temp.assert_eq(
  'required RLS policies exist',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations', 'organization_memberships')
      and policyname in (
        'organizations_select_active_members',
        'organizations_update_active_owners',
        'organization_memberships_select_active_members',
        'organization_memberships_insert_active_owners',
        'organization_memberships_update_active_owners',
        'organization_memberships_delete_active_owners'
      )
  ),
  6
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000001'::uuid);
select public.create_organization(
  'ORG 001 Test Alpha',
  'org-001-test-alpha',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

select pg_temp.assert_eq(
  'atomic organization creation created organization and owner membership',
  (
    select count(*)
    from public.organizations organizations
    join public.organization_memberships memberships
      on memberships.organization_id = organizations.id
    where organizations.slug = 'org-001-test-alpha'
      and memberships.user_id = '00000000-0000-4000-8000-000000000001'::uuid
      and memberships.role = 'owner'
      and memberships.status = 'active'
  ),
  1
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000002'::uuid);
select public.create_organization(
  'ORG 001 Test Beta',
  'org-001-test-beta',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000004'::uuid);
select public.create_organization(
  'ORG 001 Test Gamma',
  'org-001-test-gamma',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

create temp table test_organization_ids as
select slug, id
from public.organizations
where slug like 'org-001-test-%';

grant select on test_organization_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000001'::uuid);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
) values (
  (select id from test_organization_ids where slug = 'org-001-test-alpha'),
  '00000000-0000-4000-8000-000000000002'::uuid,
  'staff',
  'active'
);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
) values (
  (select id from test_organization_ids where slug = 'org-001-test-alpha'),
  '00000000-0000-4000-8000-000000000003'::uuid,
  'staff',
  'disabled'
);

select pg_temp.assert_eq(
  'active membership access',
  (
    select count(*)
    from public.organizations
    where slug = 'org-001-test-alpha'
  ),
  1
);

select pg_temp.assert_eq(
  'active membership can read memberships in own organization',
  (
    select count(*)
    from public.organization_memberships
    where organization_id = (select id from test_organization_ids where slug = 'org-001-test-alpha')
  ),
  3
);

select pg_temp.assert_eq(
  'cross-tenant read denial',
  (
    select count(*)
    from public.organizations
    where slug = 'org-001-test-beta'
  ),
  0
);

with attempted_update as (
  update public.organizations
  set name = 'Tampered Beta'
  where slug = 'org-001-test-beta'
  returning id
)
select pg_temp.assert_eq(
  'cross-tenant update denial',
  (select count(*) from attempted_update),
  0
);

select pg_temp.assert_raises(
  'cross-tenant membership insert denial',
  $$
    insert into public.organization_memberships (
      organization_id,
      user_id,
      role,
      status
    ) values (
      (select id from test_organization_ids where slug = 'org-001-test-beta'),
      '00000000-0000-4000-8000-000000000001'::uuid,
      'staff',
      'active'
    )
  $$,
  '42501'
);

select pg_temp.assert_raises(
  'duplicate membership rejection',
  $$
    insert into public.organization_memberships (
      organization_id,
      user_id,
      role,
      status
    ) values (
      (select id from test_organization_ids where slug = 'org-001-test-alpha'),
      '00000000-0000-4000-8000-000000000002'::uuid,
      'staff',
      'active'
    )
  $$,
  '23505'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000002'::uuid);
select pg_temp.assert_eq(
  'active non-owner membership access',
  (
    select count(*)
    from public.organizations
    where slug = 'org-001-test-alpha'
  ),
  1
);
with attempted_staff_update as (
  update public.organizations
  set name = 'Tampered Alpha'
  where slug = 'org-001-test-alpha'
  returning id
)
select pg_temp.assert_eq(
  'active non-owner organization update denied',
  (select count(*) from attempted_staff_update),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000003'::uuid);
select pg_temp.assert_eq(
  'disabled membership organization access denied',
  (
    select count(*)
    from public.organizations
    where slug = 'org-001-test-alpha'
  ),
  0
);
select pg_temp.assert_eq(
  'disabled membership list access denied',
  (
    select count(*)
    from public.organization_memberships
    where organization_id = (select id from test_organization_ids where slug = 'org-001-test-alpha')
  ),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000004'::uuid);
select pg_temp.assert_eq(
  'non-member organization access denied',
  (
    select count(*)
    from public.organizations
    where slug = 'org-001-test-alpha'
  ),
  0
);
select pg_temp.assert_eq(
  'non-member membership list access denied',
  (
    select count(*)
    from public.organization_memberships
    where organization_id = (select id from test_organization_ids where slug = 'org-001-test-alpha')
  ),
  0
);
reset role;

select pg_temp.assert_raises(
  'last owner demotion rejected',
  $$
    update public.organization_memberships
    set role = 'admin'
    where organization_id = (select id from test_organization_ids where slug = 'org-001-test-gamma')
      and user_id = '00000000-0000-4000-8000-000000000004'::uuid
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'last owner disable rejected',
  $$
    update public.organization_memberships
    set status = 'disabled'
    where organization_id = (select id from test_organization_ids where slug = 'org-001-test-gamma')
      and user_id = '00000000-0000-4000-8000-000000000004'::uuid
  $$,
  '23514'
);

select pg_temp.assert_raises(
  'last owner removal rejected',
  $$
    delete from public.organization_memberships
    where organization_id = (select id from test_organization_ids where slug = 'org-001-test-gamma')
      and user_id = '00000000-0000-4000-8000-000000000004'::uuid
  $$,
  '23514'
);
reset role;

\echo 'TASK-ORG-001 organization membership RLS tests passed'
