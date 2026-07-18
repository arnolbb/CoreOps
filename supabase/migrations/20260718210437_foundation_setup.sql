-- Initial migration: shared, non-business foundations.
--
-- Scope of TASK-FND-002: configure local Supabase development and establish
-- the migration workflow. This migration intentionally creates NO business
-- tables (no organizations, auth profiles, customers, products, inventory,
-- sales, payments, or work orders). Those arrive in later feature tasks
-- (TASK-ORG-001, TASK-CUS-001, TASK-PRO-001, ...).
--
-- It only enables cross-cutting extensions and a shared `updated_at` trigger
-- helper that every future tenant table will reuse, per docs/06-database-design.md
-- (UUID primary keys, UTC timestamps, `created_at` / `updated_at`).

-- pgcrypto: provides gen_random_uuid() for UUID primary keys.
create extension if not exists pgcrypto;

-- citext: case-insensitive text, used for emails (invitations, customers).
create extension if not exists citext;

-- Shared trigger function: stamp `updated_at` on row update.
-- Future migrations attach it per table:
--   create trigger <tbl>_set_updated_at
--     before update on <tbl>
--     for each row execute function set_updated_at();
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
