-- TASK-ORG-003: organization member invitations.
--
-- This migration adds secure organization invitations with hashed one-time
-- tokens, Owner/Admin authorization rules, tenant-scoped RLS, and minimal audit
-- records for membership-sensitive invitation actions.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  before_data jsonb null,
  after_data jsonb null,
  request_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint audit_logs_action_not_blank check (length(btrim(action)) > 0),
  constraint audit_logs_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint audit_logs_before_data_object check (
    before_data is null or jsonb_typeof(before_data) = 'object'
  ),
  constraint audit_logs_after_data_object check (
    after_data is null or jsonb_typeof(after_data) = 'object'
  )
);

create index audit_logs_organization_created_at_idx
  on public.audit_logs (organization_id, created_at desc);

create index audit_logs_actor_created_at_idx
  on public.audit_logs (actor_user_id, created_at desc)
  where actor_user_id is not null;

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  email public.citext not null,
  role text not null,
  token_hash text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid null references auth.users(id) on delete restrict,
  accepted_at timestamptz null,
  revoked_by uuid null references auth.users(id) on delete restrict,
  revoked_at timestamptz null,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_invitations_email_not_blank check (length(btrim(email::text)) > 0),
  constraint organization_invitations_email_length check (length(email::text) <= 320),
  constraint organization_invitations_role_valid check (role in ('admin', 'staff')),
  constraint organization_invitations_status_valid check (
    status in ('pending', 'accepted', 'revoked', 'expired')
  ),
  constraint organization_invitations_token_hash_format check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint organization_invitations_expires_after_created check (expires_at > created_at),
  constraint organization_invitations_accepted_fields_consistent check (
    (
      status = 'accepted'
      and accepted_by is not null
      and accepted_at is not null
    )
    or
    (
      status <> 'accepted'
      and accepted_by is null
      and accepted_at is null
    )
  ),
  constraint organization_invitations_revoked_fields_consistent check (
    (
      status = 'revoked'
      and revoked_by is not null
      and revoked_at is not null
    )
    or
    (
      status <> 'revoked'
      and revoked_by is null
      and revoked_at is null
    )
  )
);

create trigger organization_invitations_set_updated_at
before update on public.organization_invitations
for each row execute function public.set_updated_at();

create unique index organization_invitations_token_hash_unique
  on public.organization_invitations (token_hash);

create unique index organization_invitations_pending_email_unique
  on public.organization_invitations (organization_id, email)
  where status = 'pending';

create index organization_invitations_organization_status_idx
  on public.organization_invitations (organization_id, status);

create index organization_invitations_organization_email_idx
  on public.organization_invitations (organization_id, email);

create index organization_invitations_expires_at_idx
  on public.organization_invitations (expires_at);

create index organization_invitations_invited_by_idx
  on public.organization_invitations (organization_id, invited_by);

create or replace function public.current_user_has_organization_role(
  checked_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and memberships.role = any(allowed_roles)
  );
$$;

create or replace function public.current_user_can_invite_member(
  checked_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_has_organization_role(
    checked_organization_id,
    array['owner', 'admin']
  );
$$;

create or replace function public.current_user_can_assign_invitation_role(
  checked_organization_id uuid,
  assigned_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = checked_organization_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'active'
      and (
        (memberships.role = 'owner' and assigned_role in ('admin', 'staff'))
        or (memberships.role = 'admin' and assigned_role = 'staff')
      )
  );
$$;

create or replace function public.record_organization_audit_event(
  target_organization_id uuid,
  actor_id uuid,
  audit_action text,
  audit_entity_type text,
  audit_entity_id uuid,
  audit_before_data jsonb default null,
  audit_after_data jsonb default null,
  audit_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  ) values (
    target_organization_id,
    actor_id,
    audit_action,
    audit_entity_type,
    audit_entity_id,
    audit_before_data,
    audit_after_data,
    coalesce(audit_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.create_organization_invitation(
  target_organization_id uuid,
  invited_email public.citext,
  assigned_role text,
  invitation_token_hash text,
  invitation_expires_at timestamptz
)
returns table (
  invitation_id uuid,
  organization_id uuid,
  email public.citext,
  role text,
  status text,
  expires_at timestamptz,
  was_resent boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  normalized_email public.citext := lower(btrim(invited_email::text))::public.citext;
  existing_invitation public.organization_invitations;
  saved_invitation public.organization_invitations;
begin
  if authenticated_user_id is null then
    raise exception 'invitation authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations organizations
    where organizations.id = target_organization_id
      and organizations.status = 'active'
  ) then
    raise exception 'invitation organization unavailable' using errcode = '42501';
  end if;

  if not public.current_user_can_invite_member(target_organization_id) then
    raise exception 'invitation permission denied' using errcode = '42501';
  end if;

  if not public.current_user_can_assign_invitation_role(target_organization_id, assigned_role) then
    raise exception 'invitation role not allowed' using errcode = '42501';
  end if;

  if normalized_email::text !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invitation invalid email' using errcode = '23514';
  end if;

  if invitation_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invitation invalid token hash' using errcode = '23514';
  end if;

  if invitation_expires_at <= now() then
    raise exception 'invitation invalid expiry' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.organization_memberships memberships
    join auth.users users on users.id = memberships.user_id
    where memberships.organization_id = target_organization_id
      and memberships.status = 'active'
      and lower(users.email) = normalized_email::text
  ) then
    raise exception 'invitation already member' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_organization_id::text || ':' || normalized_email::text, 0)
  );

  update public.organization_invitations invitations
  set status = 'expired'
  where invitations.organization_id = target_organization_id
    and invitations.email = normalized_email
    and invitations.status = 'pending'
    and invitations.expires_at <= now();

  select *
    into existing_invitation
  from public.organization_invitations invitations
  where invitations.organization_id = target_organization_id
    and invitations.email = normalized_email
    and invitations.status = 'pending'
  for update;

  if found then
    update public.organization_invitations invitations
    set role = assigned_role,
      token_hash = invitation_token_hash,
      expires_at = invitation_expires_at,
      invited_by = authenticated_user_id,
      last_sent_at = now()
    where invitations.id = existing_invitation.id
    returning * into saved_invitation;

    perform public.record_organization_audit_event(
      target_organization_id,
      authenticated_user_id,
      'member.invitation_resent',
      'organization_invitation',
      saved_invitation.id,
      jsonb_build_object(
        'email', existing_invitation.email::text,
        'role', existing_invitation.role,
        'status', existing_invitation.status
      ),
      jsonb_build_object(
        'email', saved_invitation.email::text,
        'role', saved_invitation.role,
        'status', saved_invitation.status
      ),
      '{}'::jsonb
    );

    return query select
      saved_invitation.id,
      saved_invitation.organization_id,
      saved_invitation.email,
      saved_invitation.role,
      saved_invitation.status,
      saved_invitation.expires_at,
      true;
    return;
  end if;

  select *
    into existing_invitation
  from public.organization_invitations invitations
  where invitations.organization_id = target_organization_id
    and invitations.email = normalized_email
    and invitations.status = 'expired'
  order by invitations.updated_at desc
  limit 1
  for update;

  if found then
    update public.organization_invitations invitations
    set role = assigned_role,
      token_hash = invitation_token_hash,
      status = 'pending',
      expires_at = invitation_expires_at,
      invited_by = authenticated_user_id,
      last_sent_at = now(),
      accepted_by = null,
      accepted_at = null,
      revoked_by = null,
      revoked_at = null
    where invitations.id = existing_invitation.id
    returning * into saved_invitation;

    perform public.record_organization_audit_event(
      target_organization_id,
      authenticated_user_id,
      'member.invitation_resent',
      'organization_invitation',
      saved_invitation.id,
      jsonb_build_object(
        'email', existing_invitation.email::text,
        'role', existing_invitation.role,
        'status', existing_invitation.status
      ),
      jsonb_build_object(
        'email', saved_invitation.email::text,
        'role', saved_invitation.role,
        'status', saved_invitation.status
      ),
      '{}'::jsonb
    );

    return query select
      saved_invitation.id,
      saved_invitation.organization_id,
      saved_invitation.email,
      saved_invitation.role,
      saved_invitation.status,
      saved_invitation.expires_at,
      true;
    return;
  end if;

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    expires_at,
    invited_by
  ) values (
    target_organization_id,
    normalized_email,
    assigned_role,
    invitation_token_hash,
    invitation_expires_at,
    authenticated_user_id
  )
  returning * into saved_invitation;

  perform public.record_organization_audit_event(
    target_organization_id,
    authenticated_user_id,
    'member.invitation_created',
    'organization_invitation',
    saved_invitation.id,
    null,
    jsonb_build_object(
      'email', saved_invitation.email::text,
      'role', saved_invitation.role,
      'status', saved_invitation.status
    ),
    '{}'::jsonb
  );

  return query select
    saved_invitation.id,
    saved_invitation.organization_id,
    saved_invitation.email,
    saved_invitation.role,
    saved_invitation.status,
    saved_invitation.expires_at,
    false;
end;
$$;

create or replace function public.revoke_organization_invitation(invitation_id uuid)
returns table (
  revoked_invitation_id uuid,
  organization_id uuid,
  email public.citext,
  role text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  invitation public.organization_invitations;
  saved_invitation public.organization_invitations;
begin
  if authenticated_user_id is null then
    raise exception 'invitation authentication required' using errcode = '42501';
  end if;

  select *
    into invitation
  from public.organization_invitations invitations
  where invitations.id = invitation_id
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0001';
  end if;

  if not public.current_user_can_assign_invitation_role(invitation.organization_id, invitation.role) then
    raise exception 'invitation permission denied' using errcode = '42501';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'invitation not active' using errcode = 'P0001';
  end if;

  if invitation.expires_at <= now() then
    update public.organization_invitations invitations
    set status = 'expired'
    where invitations.id = invitation.id;

    raise exception 'invitation expired' using errcode = 'P0001';
  end if;

  update public.organization_invitations invitations
  set status = 'revoked',
    revoked_by = authenticated_user_id,
    revoked_at = now()
  where invitations.id = invitation.id
  returning * into saved_invitation;

  perform public.record_organization_audit_event(
    saved_invitation.organization_id,
    authenticated_user_id,
    'member.invitation_revoked',
    'organization_invitation',
    saved_invitation.id,
    jsonb_build_object(
      'email', invitation.email::text,
      'role', invitation.role,
      'status', invitation.status
    ),
    jsonb_build_object(
      'email', saved_invitation.email::text,
      'role', saved_invitation.role,
      'status', saved_invitation.status
    ),
    '{}'::jsonb
  );

  return query select
    saved_invitation.id,
    saved_invitation.organization_id,
    saved_invitation.email,
    saved_invitation.role,
    saved_invitation.status;
end;
$$;

create or replace function public.get_organization_invitation_preview(invitation_token_hash text)
returns table (
  invitation_status text,
  organization_name text,
  invited_email public.citext,
  assigned_role text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when invitations.status = 'pending' and invitations.expires_at <= now() then 'expired'
      else invitations.status
    end as invitation_status,
    organizations.name as organization_name,
    invitations.email as invited_email,
    invitations.role as assigned_role,
    invitations.expires_at
  from public.organization_invitations invitations
  join public.organizations organizations on organizations.id = invitations.organization_id
  where invitations.token_hash = invitation_token_hash
  limit 1;
$$;

create or replace function public.get_organization_team_members(target_organization_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email public.citext,
  role text,
  status text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    memberships.id as membership_id,
    memberships.user_id,
    users.email::public.citext as email,
    memberships.role,
    memberships.status,
    memberships.joined_at
  from public.organization_memberships memberships
  join auth.users users on users.id = memberships.user_id
  where memberships.organization_id = target_organization_id
    and public.current_user_has_organization_role(
      target_organization_id,
      array['owner', 'admin']
    )
  order by memberships.joined_at asc, users.email asc;
$$;

create or replace function public.accept_organization_invitation(invitation_token_hash text)
returns table (
  membership_id uuid,
  organization_id uuid,
  role text,
  status text,
  reactivated boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  authenticated_email text;
  invitation public.organization_invitations;
  membership public.organization_memberships;
  saved_membership public.organization_memberships;
  was_reactivated boolean := false;
begin
  if authenticated_user_id is null then
    raise exception 'invitation authentication required' using errcode = '42501';
  end if;

  select lower(users.email)
    into authenticated_email
  from auth.users users
  where users.id = authenticated_user_id;

  if authenticated_email is null or length(btrim(authenticated_email)) = 0 then
    raise exception 'invitation email mismatch' using errcode = '42501';
  end if;

  select *
    into invitation
  from public.organization_invitations invitations
  where invitations.token_hash = invitation_token_hash
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0001';
  end if;

  if invitation.status = 'revoked' then
    raise exception 'invitation revoked' using errcode = 'P0001';
  end if;

  if invitation.status = 'accepted' then
    raise exception 'invitation already accepted' using errcode = 'P0001';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'invitation not active' using errcode = 'P0001';
  end if;

  if invitation.expires_at <= now() then
    update public.organization_invitations invitations
    set status = 'expired'
    where invitations.id = invitation.id;

    raise exception 'invitation expired' using errcode = 'P0001';
  end if;

  if authenticated_email <> lower(invitation.email::text) then
    raise exception 'invitation email mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations organizations
    where organizations.id = invitation.organization_id
      and organizations.status = 'active'
  ) then
    raise exception 'invitation organization unavailable' using errcode = '42501';
  end if;

  select *
    into membership
  from public.organization_memberships memberships
  where memberships.organization_id = invitation.organization_id
    and memberships.user_id = authenticated_user_id
  for update;

  if found and membership.status = 'active' then
    raise exception 'invitation already member' using errcode = 'P0001';
  end if;

  if found then
    update public.organization_memberships memberships
    set status = 'active',
      role = invitation.role,
      joined_at = now()
    where memberships.id = membership.id
    returning * into saved_membership;

    was_reactivated := true;

    perform public.record_organization_audit_event(
      invitation.organization_id,
      authenticated_user_id,
      'member.membership_reactivated',
      'organization_membership',
      saved_membership.id,
      jsonb_build_object(
        'role', membership.role,
        'status', membership.status
      ),
      jsonb_build_object(
        'role', saved_membership.role,
        'status', saved_membership.status
      ),
      '{}'::jsonb
    );
  else
    insert into public.organization_memberships (
      organization_id,
      user_id,
      role,
      status
    ) values (
      invitation.organization_id,
      authenticated_user_id,
      invitation.role,
      'active'
    )
    returning * into saved_membership;
  end if;

  update public.organization_invitations invitations
  set status = 'accepted',
    accepted_by = authenticated_user_id,
    accepted_at = now()
  where invitations.id = invitation.id;

  perform public.record_organization_audit_event(
    invitation.organization_id,
    authenticated_user_id,
    'member.invitation_accepted',
    'organization_invitation',
    invitation.id,
    jsonb_build_object(
      'email', invitation.email::text,
      'role', invitation.role,
      'status', invitation.status
    ),
    jsonb_build_object(
      'email', invitation.email::text,
      'role', invitation.role,
      'status', 'accepted'
    ),
    jsonb_build_object('reactivated', was_reactivated)
  );

  return query select
    saved_membership.id,
    saved_membership.organization_id,
    saved_membership.role,
    saved_membership.status,
    was_reactivated;
end;
$$;

alter table public.audit_logs enable row level security;
alter table public.organization_invitations enable row level security;

create policy organization_invitations_select_team_managers
on public.organization_invitations
for select
to authenticated
using (
  public.current_user_has_organization_role(organization_id, array['owner', 'admin'])
);

revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.organization_invitations from anon, authenticated;

grant select on table public.organization_invitations to authenticated;

revoke execute on function public.current_user_has_organization_role(uuid, text[]) from public;
revoke execute on function public.current_user_can_invite_member(uuid) from public;
revoke execute on function public.current_user_can_assign_invitation_role(uuid, text) from public;
revoke execute on function public.record_organization_audit_event(uuid, uuid, text, text, uuid, jsonb, jsonb, jsonb) from public;
revoke execute on function public.create_organization_invitation(uuid, public.citext, text, text, timestamptz) from public;
revoke execute on function public.revoke_organization_invitation(uuid) from public;
revoke execute on function public.get_organization_invitation_preview(text) from public;
revoke execute on function public.get_organization_team_members(uuid) from public;
revoke execute on function public.accept_organization_invitation(text) from public;

grant execute on function public.current_user_has_organization_role(uuid, text[]) to authenticated;
grant execute on function public.current_user_can_invite_member(uuid) to authenticated;
grant execute on function public.current_user_can_assign_invitation_role(uuid, text) to authenticated;
grant execute on function public.create_organization_invitation(uuid, public.citext, text, text, timestamptz) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
grant execute on function public.get_organization_invitation_preview(text) to anon, authenticated;
grant execute on function public.get_organization_team_members(uuid) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
