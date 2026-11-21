-- TASK-DSH-001: dashboard recent audit logs read RPC.
--
-- Adds a SECURITY DEFINER RPC to read recent organization-scoped audit logs
-- for active owners and admins without exposing public.audit_logs or auth.users.

create or replace function public.get_recent_organization_audit_logs(
  target_organization_id uuid,
  p_limit integer default 10
)
returns table (
  id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  actor_email text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  if auth.uid() is null then
    raise exception 'audit authentication required' using errcode = '42501';
  end if;

  if not public.current_user_has_organization_role(
    target_organization_id,
    array['owner', 'admin']
  ) then
    raise exception 'audit log permission denied' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.action,
    a.entity_type,
    a.entity_id,
    u.email::text as actor_email,
    a.created_at
  from public.audit_logs a
  left join auth.users u on u.id = a.actor_user_id
  where a.organization_id = target_organization_id
  order by a.created_at desc
  limit v_limit;
end;
$$;

revoke execute on function public.get_recent_organization_audit_logs(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_recent_organization_audit_logs(uuid, integer)
  to authenticated;
