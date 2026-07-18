-- Deterministic development seed.
--
-- Per docs/23-demo-and-seed-data.md the target seed covers demo organizations,
-- seed users, products, customers, sales, payments, and work orders.
--
-- This file currently performs NO inserts because the corresponding business
-- tables do not exist yet (TASK-FND-002 configures local Supabase only; it
-- intentionally adds no business modules). The file exists so that
-- `supabase db reset` exercises the full migrations -> seed workflow from the
-- start, and so the seed path is reproducible today.
--
-- As business tables land in later tasks, append deterministic, development-only
-- seed rows here using clearly fake data (owner.demo@example.test, etc.).
-- Never commit real or production-like data. Seed runs automatically after
-- migrations on every `supabase db reset`.

-- No-op marker: proves the seed step executes after migrations.
select 1 as seed_ok;
