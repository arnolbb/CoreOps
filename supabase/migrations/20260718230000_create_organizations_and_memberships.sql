-- TASK-ORG-001: organizations and memberships.
--
-- This migration creates the first tenant boundary for CoreOps. It is limited
-- to organizations, organization memberships, tenant-isolation RLS helpers, and
-- the minimum database invariants required by docs/02-product-requirements.md,
-- docs/06-database-design.md, and docs/07-authorization-and-permissions.md.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  business_type text not null default 'general',
  timezone text not null default 'UTC',
  currency_code char(3) not null default 'USD',
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizations_name_not_blank check (length(btrim(name)) > 0),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_business_type_not_blank check (length(btrim(business_type)) > 0),
  constraint organizations_timezone_not_blank check (length(btrim(timezone)) > 0),
  constraint organizations_currency_code_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint organizations_status_valid check (status in ('active', 'disabled')),
  constraint organizations_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint organizations_slug_unique unique (slug)
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_memberships_role_valid check (
    role in ('owner', 'admin', 'manager', 'staff', 'technician', 'viewer')
  ),
  constraint organization_memberships_status_valid check (status in ('active', 'disabled')),
  constraint organization_memberships_organization_user_unique unique (organization_id, user_id)
);

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

create index organizations_status_idx
  on public.organizations (status);

create index organization_memberships_user_status_idx
  on public.organization_memberships (user_id, status);

create index organization_memberships_organization_status_idx
  on public.organization_memberships (organization_id, status);

create index organization_memberships_active_owner_idx
  on public.organization_memberships (organization_id)
  where role = 'owner' and status = 'active';

create or replace function public.current_user_has_active_membership(checked_organization_id uuid)
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
  );
$$;

create or replace function public.current_user_is_organization_owner(checked_organization_id uuid)
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
      and memberships.role = 'owner'
      and memberships.status = 'active'
  );
$$;

create or replace function public.prevent_last_active_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owner_count integer;
begin
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id then
      raise exception 'organization_memberships.organization_id cannot be changed'
        using errcode = '23514';
    end if;

    if new.user_id <> old.user_id then
      raise exception 'organization_memberships.user_id cannot be changed'
        using errcode = '23514';
    end if;
  end if;

  if old.role = 'owner'
    and old.status = 'active'
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'
      or new.status <> 'active'
    ) then
    perform pg_advisory_xact_lock(hashtextextended(old.organization_id::text, 0));

    select count(*)
      into remaining_owner_count
    from public.organization_memberships memberships
    where memberships.organization_id = old.organization_id
      and memberships.id <> old.id
      and memberships.role = 'owner'
      and memberships.status = 'active';

    if remaining_owner_count = 0 then
      raise exception 'organization must retain at least one active owner'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger organization_memberships_prevent_last_active_owner_loss
before update or delete on public.organization_memberships
for each row execute function public.prevent_last_active_owner_loss();

create or replace function public.create_organization(
  organization_name text,
  organization_slug text,
  organization_business_type text default 'general',
  organization_timezone text default 'UTC',
  organization_currency_code text default 'USD',
  organization_settings jsonb default '{}'::jsonb
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  created_organization public.organizations;
begin
  if authenticated_user_id is null then
    raise exception 'authentication required to create an organization'
      using errcode = '42501';
  end if;

  insert into public.organizations (
    name,
    slug,
    business_type,
    timezone,
    currency_code,
    settings
  ) values (
    btrim(organization_name),
    lower(btrim(organization_slug)),
    btrim(coalesce(organization_business_type, 'general')),
    btrim(coalesce(organization_timezone, 'UTC')),
    upper(btrim(coalesce(organization_currency_code, 'USD'))),
    coalesce(organization_settings, '{}'::jsonb)
  )
  returning * into created_organization;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status
  ) values (
    created_organization.id,
    authenticated_user_id,
    'owner',
    'active'
  );

  return created_organization;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

create policy organizations_select_active_members
on public.organizations
for select
to authenticated
using (public.current_user_has_active_membership(id));

create policy organizations_update_active_owners
on public.organizations
for update
to authenticated
using (public.current_user_is_organization_owner(id))
with check (public.current_user_is_organization_owner(id));

create policy organization_memberships_select_active_members
on public.organization_memberships
for select
to authenticated
using (public.current_user_has_active_membership(organization_id));

create policy organization_memberships_insert_active_owners
on public.organization_memberships
for insert
to authenticated
with check (public.current_user_is_organization_owner(organization_id));

create policy organization_memberships_update_active_owners
on public.organization_memberships
for update
to authenticated
using (public.current_user_is_organization_owner(organization_id))
with check (public.current_user_is_organization_owner(organization_id));

create policy organization_memberships_delete_active_owners
on public.organization_memberships
for delete
to authenticated
using (public.current_user_is_organization_owner(organization_id));

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_memberships from anon, authenticated;

grant select, update on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_memberships to authenticated;

revoke execute on function public.current_user_has_active_membership(uuid) from public;
revoke execute on function public.current_user_is_organization_owner(uuid) from public;
revoke execute on function public.prevent_last_active_owner_loss() from public;
revoke execute on function public.create_organization(text, text, text, text, text, jsonb) from public;

grant execute on function public.current_user_has_active_membership(uuid) to authenticated;
grant execute on function public.current_user_is_organization_owner(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text, text, text, jsonb) to authenticated;
