\echo 'Running TASK-ORG-003 member invitation tests'

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

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000011'::uuid,
  '00000000-0000-4000-8000-000000000012'::uuid,
  '00000000-0000-4000-8000-000000000013'::uuid,
  '00000000-0000-4000-8000-000000000014'::uuid,
  '00000000-0000-4000-8000-000000000015'::uuid,
  '00000000-0000-4000-8000-000000000016'::uuid,
  '00000000-0000-4000-8000-000000000017'::uuid
)
or organization_id in (
  select id
  from public.organizations
  where slug like 'org-003-test-%'
);

delete from public.organization_invitations
where organization_id in (
  select id
  from public.organizations
  where slug like 'org-003-test-%'
)
or email::text like 'org-003-%@example.test';

delete from public.audit_logs
where organization_id in (
  select id
  from public.organizations
  where slug like 'org-003-test-%'
);

delete from public.organizations
where slug like 'org-003-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000011'::uuid,
  '00000000-0000-4000-8000-000000000012'::uuid,
  '00000000-0000-4000-8000-000000000013'::uuid,
  '00000000-0000-4000-8000-000000000014'::uuid,
  '00000000-0000-4000-8000-000000000015'::uuid,
  '00000000-0000-4000-8000-000000000016'::uuid,
  '00000000-0000-4000-8000-000000000017'::uuid
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
    '00000000-0000-4000-8000-000000000011'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-owner@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000012'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-admin@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000013'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-staff@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000014'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-active-member@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000015'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-disabled-member@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000016'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-invitee@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000017'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'org-003-wrong-user@example.test',
    'not-a-real-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

select pg_temp.assert_true(
  'organization_invitations RLS enabled',
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.organization_invitations'::regclass
  )
);

select pg_temp.assert_true(
  'audit_logs RLS enabled',
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.audit_logs'::regclass
  )
);

select pg_temp.assert_eq(
  'invitation select policy exists',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_invitations'
      and policyname = 'organization_invitations_select_team_managers'
  ),
  1
);

select pg_temp.assert_raises(
  'owner role cannot be invited by constraint',
  $$
    insert into public.organization_invitations (
      organization_id,
      email,
      role,
      token_hash,
      expires_at,
      invited_by
    ) values (
      gen_random_uuid(),
      'org-003-bad-role@example.test',
      'owner',
      repeat('a', 64),
      now() + interval '7 days',
      '00000000-0000-4000-8000-000000000011'::uuid
    )
  $$,
  '23514'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000011'::uuid);
select public.create_organization(
  'ORG 003 Test Alpha',
  'org-003-test-alpha',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000017'::uuid);
select public.create_organization(
  'ORG 003 Test Beta',
  'org-003-test-beta',
  'general',
  'UTC',
  'USD',
  '{}'::jsonb
);
reset role;

create temp table org_003_ids as
select slug, id
from public.organizations
where slug like 'org-003-test-%';

grant select on org_003_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000011'::uuid);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
) values
  (
    (select id from org_003_ids where slug = 'org-003-test-alpha'),
    '00000000-0000-4000-8000-000000000012'::uuid,
    'admin',
    'active'
  ),
  (
    (select id from org_003_ids where slug = 'org-003-test-alpha'),
    '00000000-0000-4000-8000-000000000013'::uuid,
    'staff',
    'active'
  ),
  (
    (select id from org_003_ids where slug = 'org-003-test-alpha'),
    '00000000-0000-4000-8000-000000000014'::uuid,
    'staff',
    'active'
  ),
  (
    (select id from org_003_ids where slug = 'org-003-test-alpha'),
    '00000000-0000-4000-8000-000000000015'::uuid,
    'staff',
    'disabled'
  );

select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-new-admin@example.test',
  'admin',
  repeat('1', 64),
  now() + interval '7 days'
);

select pg_temp.assert_eq(
  'owner can invite admin',
  (
    select count(*)
    from public.organization_invitations
    where email = 'org-003-new-admin@example.test'
      and role = 'admin'
      and status = 'pending'
  ),
  1
);

select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-new-staff@example.test',
  'staff',
  repeat('2', 64),
  now() + interval '7 days'
);

select pg_temp.assert_eq(
  'owner can invite staff',
  (
    select count(*)
    from public.organization_invitations
    where email = 'org-003-new-staff@example.test'
      and role = 'staff'
      and status = 'pending'
  ),
  1
);

select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-duplicate@example.test',
  'staff',
  repeat('3', 64),
  now() + interval '7 days'
);

select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-duplicate@example.test',
  'staff',
  repeat('4', 64),
  now() + interval '8 days'
);

select pg_temp.assert_eq(
  'duplicate pending invitation keeps one row',
  (
    select count(*)
    from public.organization_invitations
    where email = 'org-003-duplicate@example.test'
      and status = 'pending'
  ),
  1
);

select pg_temp.assert_text_eq(
  'duplicate pending invitation rotates token hash',
  (
    select token_hash
    from public.organization_invitations
    where email = 'org-003-duplicate@example.test'
      and status = 'pending'
  ),
  repeat('4', 64)
);

select pg_temp.assert_raises(
  'active member cannot be invited',
  $$
    select * from public.create_organization_invitation(
      (select id from org_003_ids where slug = 'org-003-test-alpha'),
      'org-003-active-member@example.test',
      'staff',
      repeat('5', 64),
      now() + interval '7 days'
    )
  $$,
  'P0001'
);

select pg_temp.assert_raises(
  'direct invitation insert denied',
  $$
    insert into public.organization_invitations (
      organization_id,
      email,
      role,
      token_hash,
      expires_at,
      invited_by
    ) values (
      (select id from org_003_ids where slug = 'org-003-test-alpha'),
      'org-003-direct@example.test',
      'staff',
      repeat('6', 64),
      now() + interval '7 days',
      '00000000-0000-4000-8000-000000000011'::uuid
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000012'::uuid);

select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-admin-staff-invite@example.test',
  'staff',
  repeat('7', 64),
  now() + interval '7 days'
);

select pg_temp.assert_eq(
  'admin can invite staff',
  (
    select count(*)
    from public.organization_invitations
    where email = 'org-003-admin-staff-invite@example.test'
      and role = 'staff'
  ),
  1
);

select pg_temp.assert_raises(
  'admin cannot invite admin',
  $$
    select * from public.create_organization_invitation(
      (select id from org_003_ids where slug = 'org-003-test-alpha'),
      'org-003-admin-admin-invite@example.test',
      'admin',
      repeat('8', 64),
      now() + interval '7 days'
    )
  $$,
  '42501'
);

select pg_temp.assert_eq(
  'admin can read invitations in own organization',
  (
    select count(*)
    from public.organization_invitations
    where organization_id = (select id from org_003_ids where slug = 'org-003-test-alpha')
  ),
  4
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000013'::uuid);

select pg_temp.assert_raises(
  'staff cannot invite staff',
  $$
    select * from public.create_organization_invitation(
      (select id from org_003_ids where slug = 'org-003-test-alpha'),
      'org-003-staff-staff-invite@example.test',
      'staff',
      repeat('9', 64),
      now() + interval '7 days'
    )
  $$,
  '42501'
);

select pg_temp.assert_eq(
  'staff cannot read invitations',
  (
    select count(*)
    from public.organization_invitations
    where organization_id = (select id from org_003_ids where slug = 'org-003-test-alpha')
  ),
  0
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000017'::uuid);
select pg_temp.assert_raises(
  'cross-tenant owner cannot invite into another organization',
  $$
    select * from public.create_organization_invitation(
      (select id from org_003_ids where slug = 'org-003-test-alpha'),
      'org-003-cross-tenant@example.test',
      'staff',
      repeat('a', 64),
      now() + interval '7 days'
    )
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000011'::uuid);
select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-invitee@example.test',
  'staff',
  repeat('b', 64),
  now() + interval '7 days'
);
reset role;

select pg_temp.assert_text_eq(
  'preview returns pending status for valid token hash',
  (
    select invitation_status
    from public.get_organization_invitation_preview(repeat('b', 64))
  ),
  'pending'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000017'::uuid);
select pg_temp.assert_raises(
  'wrong email cannot accept invitation',
  $$
    select * from public.accept_organization_invitation(repeat('b', 64))
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000016'::uuid);
select * from public.accept_organization_invitation(repeat('b', 64));
reset role;

select pg_temp.assert_eq(
  'matching email acceptance creates active membership',
  (
    select count(*)
    from public.organization_memberships
    where organization_id = (select id from org_003_ids where slug = 'org-003-test-alpha')
      and user_id = '00000000-0000-4000-8000-000000000016'::uuid
      and role = 'staff'
      and status = 'active'
  ),
  1
);

select pg_temp.assert_text_eq(
  'accepted invitation is marked accepted',
  (
    select status
    from public.organization_invitations
    where token_hash = repeat('b', 64)
  ),
  'accepted'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000016'::uuid);
select pg_temp.assert_raises(
  'accepted invitation cannot be accepted twice',
  $$
    select * from public.accept_organization_invitation(repeat('b', 64))
  $$,
  'P0001'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000011'::uuid);
select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-disabled-member@example.test',
  'staff',
  repeat('c', 64),
  now() + interval '7 days'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000015'::uuid);
select * from public.accept_organization_invitation(repeat('c', 64));
reset role;

select pg_temp.assert_eq(
  'disabled member acceptance reactivates membership',
  (
    select count(*)
    from public.organization_memberships
    where organization_id = (select id from org_003_ids where slug = 'org-003-test-alpha')
      and user_id = '00000000-0000-4000-8000-000000000015'::uuid
      and role = 'staff'
      and status = 'active'
  ),
  1
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000011'::uuid);
select * from public.create_organization_invitation(
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-revoked@example.test',
  'staff',
  repeat('d', 64),
  now() + interval '7 days'
);
select * from public.revoke_organization_invitation(
  (
    select id
    from public.organization_invitations
    where token_hash = repeat('d', 64)
  )
);
reset role;

select pg_temp.assert_text_eq(
  'revoked invitation marked revoked',
  (
    select status
    from public.organization_invitations
    where token_hash = repeat('d', 64)
  ),
  'revoked'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000016'::uuid);
select pg_temp.assert_raises(
  'revoked invitation cannot be accepted',
  $$
    select * from public.accept_organization_invitation(repeat('d', 64))
  $$,
  'P0001'
);
reset role;

reset role;
insert into public.organization_invitations (
  organization_id,
  email,
  role,
  token_hash,
  status,
  expires_at,
  invited_by,
  created_at
) values (
  (select id from org_003_ids where slug = 'org-003-test-alpha'),
  'org-003-expired@example.test',
  'staff',
  repeat('e', 64),
  'pending',
  now() - interval '1 day',
  '00000000-0000-4000-8000-000000000011'::uuid,
  now() - interval '8 days'
);

select pg_temp.assert_text_eq(
  'preview treats past pending invitation as expired',
  (
    select invitation_status
    from public.get_organization_invitation_preview(repeat('e', 64))
  ),
  'expired'
);

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000016'::uuid);
select pg_temp.assert_raises(
  'expired invitation cannot be accepted',
  $$
    select * from public.accept_organization_invitation(repeat('e', 64))
  $$,
  'P0001'
);
reset role;

select pg_temp.assert_text_eq(
  'expired invitation remains pending until resend because rejected accept rolls back',
  (
    select status
    from public.organization_invitations
    where token_hash = repeat('e', 64)
  ),
  'pending'
);

select pg_temp.assert_eq(
  'invitation audit rows written',
  (
    select count(*)
    from public.audit_logs
    where organization_id = (select id from org_003_ids where slug = 'org-003-test-alpha')
      and action in (
        'member.invitation_created',
        'member.invitation_resent',
        'member.invitation_revoked',
        'member.invitation_accepted',
        'member.membership_reactivated'
      )
  ),
  12
);

select pg_temp.assert_eq(
  'audit metadata does not contain token hash values',
  (
    select count(*)
    from public.audit_logs
    where metadata::text like '%' || repeat('b', 64) || '%'
      or before_data::text like '%' || repeat('b', 64) || '%'
      or after_data::text like '%' || repeat('b', 64) || '%'
  ),
  0
);

\echo 'TASK-ORG-003 member invitation tests passed'
