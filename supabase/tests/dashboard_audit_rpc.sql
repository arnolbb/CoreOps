\echo 'Running TASK-DSH-001 dashboard audit read RPC tests'

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

delete from public.audit_logs
where organization_id in (
  select id from public.organizations where slug like 'dsh-001-test-%'
);

delete from public.organization_memberships
where user_id in (
  '00000000-0000-4000-8000-000000000801'::uuid,
  '00000000-0000-4000-8000-000000000802'::uuid,
  '00000000-0000-4000-8000-000000000803'::uuid,
  '00000000-0000-4000-8000-000000000804'::uuid,
  '00000000-0000-4000-8000-000000000805'::uuid,
  '00000000-0000-4000-8000-000000000806'::uuid
)
or organization_id in (
  select id from public.organizations where slug like 'dsh-001-test-%'
);

delete from public.organizations where slug like 'dsh-001-test-%';

alter table public.organization_memberships
  enable trigger organization_memberships_prevent_last_active_owner_loss;

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000801'::uuid,
  '00000000-0000-4000-8000-000000000802'::uuid,
  '00000000-0000-4000-8000-000000000803'::uuid,
  '00000000-0000-4000-8000-000000000804'::uuid,
  '00000000-0000-4000-8000-000000000805'::uuid,
  '00000000-0000-4000-8000-000000000806'::uuid
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000801'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'dsh-001-owner-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000802'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'dsh-001-admin-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000803'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'dsh-001-staff-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000804'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'dsh-001-viewer-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000805'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'dsh-001-disabled-a@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000806'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'dsh-001-owner-b@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

select pg_temp.assert_true(
  'authenticated can execute get_recent_organization_audit_logs RPC',
  has_function_privilege('authenticated', 'public.get_recent_organization_audit_logs(uuid, integer)', 'execute')
);
select pg_temp.assert_false(
  'anon cannot execute get_recent_organization_audit_logs RPC',
  has_function_privilege('anon', 'public.get_recent_organization_audit_logs(uuid, integer)', 'execute')
);
select pg_temp.assert_false(
  'authenticated cannot select public.audit_logs directly',
  has_table_privilege('authenticated', 'public.audit_logs', 'select')
);

set role authenticated;
select pg_temp.assert_raises(
  'unauthenticated caller with null auth.uid() denied audit log read',
  $$
    select * from public.get_recent_organization_audit_logs('00000000-0000-4000-8000-000000000999'::uuid)
  $$,
  '42501'
);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000801'::uuid);
select public.create_organization('DSH 001 Test Alpha', 'dsh-001-test-alpha', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000806'::uuid);
select public.create_organization('DSH 001 Test Beta', 'dsh-001-test-beta', 'general', 'UTC', 'USD', '{}'::jsonb);
reset role;

create temp table dsh_001_org_ids as
select slug, id from public.organizations where slug like 'dsh-001-test-%';
grant select on dsh_001_org_ids to authenticated;

set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000801'::uuid);
insert into public.organization_memberships (organization_id, user_id, role, status) values
  ((select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'), '00000000-0000-4000-8000-000000000802'::uuid, 'admin', 'active'),
  ((select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'), '00000000-0000-4000-8000-000000000803'::uuid, 'staff', 'active'),
  ((select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'), '00000000-0000-4000-8000-000000000804'::uuid, 'viewer', 'active'),
  ((select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'), '00000000-0000-4000-8000-000000000805'::uuid, 'admin', 'disabled');
reset role;

-- Seed 55 Alpha audit log rows and 3 newer Beta audit log rows
insert into public.audit_logs (
  organization_id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  created_at
)
select
  (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
  case
    when gs = 55 then '00000000-0000-4000-8000-000000000802'::uuid
    when gs = 54 then null::uuid
    else '00000000-0000-4000-8000-000000000801'::uuid
  end,
  'alpha.event_' || lpad(gs::text, 2, '0'),
  'dashboard_test',
  ('00000000-0000-4000-8000-' || lpad((900 + gs)::text, 12, '0'))::uuid,
  now() - ((56 - gs) * interval '1 minute')
from generate_series(1, 55) as gs;

insert into public.audit_logs (
  organization_id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  created_at
)
select
  (select id from dsh_001_org_ids where slug = 'dsh-001-test-beta'),
  '00000000-0000-4000-8000-000000000806'::uuid,
  'beta.event_' || lpad(gs::text, 2, '0'),
  'dashboard_test',
  gen_random_uuid(),
  now() - ((4 - gs) * interval '1 second')
from generate_series(1, 3) as gs;

-- Alpha owner can read Alpha audit logs with limit clamping and tenant isolation
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000801'::uuid);

select pg_temp.assert_eq(
  'alpha owner default limit returns 10 rows',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha')
    )
  ),
  10
);

select pg_temp.assert_eq(
  'alpha owner never receives beta audit logs',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      50
    )
    where action like 'beta.%'
  ),
  0
);

select pg_temp.assert_eq(
  'alpha owner p_limit=3 returns 3 rows',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      3
    )
  ),
  3
);

select pg_temp.assert_eq(
  'alpha owner p_limit=0 clamps to 1 row',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      0
    )
  ),
  1
);

select pg_temp.assert_eq(
  'alpha owner p_limit=100 clamps to 50 rows',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      100
    )
  ),
  50
);

select pg_temp.assert_eq(
  'alpha owner null p_limit falls back to 10 rows',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      null
    )
  ),
  10
);

select pg_temp.assert_text_eq(
  'alpha owner sees newest event first',
  (
    select action
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      3
    )
    order by created_at desc
    limit 1
  ),
  'alpha.event_55'
);

select pg_temp.assert_text_eq(
  'alpha owner sees actor_email from auth.users',
  (
    select actor_email
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      3
    )
    order by created_at desc
    limit 1
  ),
  'dsh-001-admin-a@example.test'
);

select pg_temp.assert_text_eq(
  'alpha owner sees entity_type on returned audit row',
  (
    select entity_type
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      3
    )
    order by created_at desc
    limit 1
  ),
  'dashboard_test'
);

select pg_temp.assert_text_eq(
  'alpha owner sees expected entity_id on returned audit row',
  (
    select entity_id::text
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      3
    )
    order by created_at desc
    limit 1
  ),
  '00000000-0000-4000-8000-000000000955'
);

select pg_temp.assert_text_eq(
  'alpha owner preserves audit rows with null actor_user_id',
  (
    select actor_email
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      3
    )
    order by created_at desc
    offset 1
    limit 1
  ),
  null
);

select pg_temp.assert_raises(
  'alpha owner denied beta audit logs',
  $$
    select * from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-beta')
    )
  $$,
  '42501'
);
reset role;

-- Alpha admin can read ONLY Alpha audit logs with p_limit respected
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000802'::uuid);

select pg_temp.assert_eq(
  'alpha admin p_limit=5 returns 5 alpha rows',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      5
    )
    where action like 'alpha.%'
  ),
  5
);

select pg_temp.assert_eq(
  'alpha admin never receives beta audit logs',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      50
    )
    where action like 'beta.%'
  ),
  0
);

select pg_temp.assert_text_eq(
  'alpha admin sees newest alpha event first',
  (
    select action
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha'),
      5
    )
    order by created_at desc
    limit 1
  ),
  'alpha.event_55'
);

select pg_temp.assert_raises(
  'alpha admin denied beta audit logs',
  $$
    select * from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-beta')
    )
  $$,
  '42501'
);
reset role;

-- Alpha staff denied with 42501
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000803'::uuid);
select pg_temp.assert_raises(
  'alpha staff denied audit log read',
  $$
    select * from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha')
    )
  $$,
  '42501'
);
reset role;

-- Alpha viewer denied with 42501
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000804'::uuid);
select pg_temp.assert_raises(
  'alpha viewer denied audit log read',
  $$
    select * from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha')
    )
  $$,
  '42501'
);
reset role;

-- Alpha disabled member denied with 42501
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000805'::uuid);
select pg_temp.assert_raises(
  'alpha disabled member denied audit log read',
  $$
    select * from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha')
    )
  $$,
  '42501'
);
reset role;

-- Beta owner denied Alpha audit logs with 42501 and reads ONLY Beta logs
set role authenticated;
select pg_temp.set_authenticated_claims('00000000-0000-4000-8000-000000000806'::uuid);
select pg_temp.assert_raises(
  'beta owner denied alpha audit log read',
  $$
    select * from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-alpha')
    )
  $$,
  '42501'
);

select pg_temp.assert_eq(
  'beta owner reads 3 total rows for beta',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-beta'),
      10
    )
  ),
  3
);

select pg_temp.assert_eq(
  'beta owner reads only beta audit logs',
  (
    select count(*)
    from public.get_recent_organization_audit_logs(
      (select id from dsh_001_org_ids where slug = 'dsh-001-test-beta'),
      10
    )
    where action like 'beta.%'
  ),
  3
);
reset role;

\echo 'TASK-DSH-001 dashboard audit read RPC tests passed'
