-- TASK-PRO-001: product schema and RLS tests.

set client_min_messages = warning;

create or replace function public.test_assert(
  condition boolean,
  message text
)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception 'Assertion failed: %', message;
  end if;
end;
$$;

create or replace function public.test_assert_eq(
  actual anyelement,
  expected anyelement,
  message text
)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'Assertion failed: % (expected %, got %)', message, expected, actual;
  end if;
end;
$$;

reset role;

delete from public.products;
delete from public.product_categories;
delete from public.organization_memberships;
delete from public.organizations;
delete from auth.users where email in ('owner-pro@example.test', 'admin-pro@example.test', 'staff-pro@example.test', 'viewer-pro@example.test', 'technician-pro@example.test', 'other-pro@example.test');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner-pro@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'admin-pro@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'staff-pro@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'viewer-pro@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'technician-pro@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'other-pro@example.test');

select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
select public.create_organization('PRO Org Alpha', 'pro-org-alpha', 'general', 'UTC', 'USD');
reset role;

select public.set_authenticated_claims('66666666-6666-4666-8666-666666666666');
select public.create_organization('PRO Org Beta', 'pro-org-beta', 'general', 'UTC', 'USD');
reset role;

do $$
declare
  org_alpha_id uuid;
  org_beta_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'pro-org-alpha';
  select id into org_beta_id from public.organizations where slug = 'pro-org-beta';

  insert into public.organization_memberships (organization_id, user_id, role, status)
  values
    (org_alpha_id, '22222222-2222-4222-8222-222222222222', 'admin', 'active'),
    (org_alpha_id, '33333333-3333-4333-8333-333333333333', 'staff', 'active'),
    (org_alpha_id, '44444444-4444-4444-8444-444444444444', 'viewer', 'active'),
    (org_alpha_id, '55555555-5555-4555-8555-555555555555', 'technician', 'active');
end;
$$;

set role authenticated;

-- Test 1: Owner can insert category and product in Alpha
select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
do $$
declare
  org_alpha_id uuid;
  cat_id uuid;
  prod_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'pro-org-alpha';

  insert into public.product_categories (organization_id, name)
  values (org_alpha_id, 'Filters')
  returning id into cat_id;

  insert into public.products (
    organization_id, product_type, name, sku, category_id, unit, cost_price, selling_price, created_by
  )
  values (
    org_alpha_id, 'goods', 'Water Filter Cartridge', 'FLT-001', cat_id, 'pcs', 10.00, 25.00, '11111111-1111-4111-8111-111111111111'
  )
  returning id into prod_id;

  perform public.test_assert(prod_id is not null, 'Product should be inserted');
end;
$$;
reset role;

-- Test 2: Technician can read products in Alpha
set role authenticated;
select public.set_authenticated_claims('55555555-5555-4555-8555-555555555555');
do $$
declare
  prod_count integer;
begin
  select count(*) into prod_count from public.products;
  perform public.test_assert_eq(prod_count, 1, 'Technician should read 1 product');
end;
$$;
reset role;

-- Test 3: Other org user cannot read Alpha products
set role authenticated;
select public.set_authenticated_claims('66666666-6666-4666-8666-666666666666');
do $$
declare
  prod_count integer;
begin
  select count(*) into prod_count from public.products;
  perform public.test_assert_eq(prod_count, 0, 'Beta org user should read 0 Alpha products');
end;
$$;
reset role;

drop function public.test_assert(boolean, text);
drop function public.test_assert_eq(anyelement, anyelement, text);
