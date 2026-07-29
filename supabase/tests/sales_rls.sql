-- TASK-SAL-001: sales order schema and RLS tests.

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

delete from public.payments;
delete from public.sales_order_items;
delete from public.sales_orders;
delete from public.customers;
delete from public.products;
delete from public.organization_memberships;
delete from public.organizations;
delete from auth.users where email in ('owner-sal@example.test', 'viewer-sal@example.test');

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner-sal@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'viewer-sal@example.test');

select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
select public.create_organization('SAL Org Alpha', 'sal-org-alpha', 'general', 'UTC', 'USD');
reset role;

do $$
declare
  org_alpha_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'sal-org-alpha';
  insert into public.organization_memberships (organization_id, user_id, role, status)
  values (org_alpha_id, '44444444-4444-4444-8444-444444444444', 'viewer', 'active');
end;
$$;

-- Test 1: Owner creates sales order, item, and payment
set role authenticated;
select public.set_authenticated_claims('11111111-1111-4111-8111-111111111111');
do $$
declare
  org_alpha_id uuid;
  cust_id uuid;
  prod_id uuid;
  order_id uuid;
  item_id uuid;
  pay_id uuid;
begin
  select id into org_alpha_id from public.organizations where slug = 'sal-org-alpha';

  insert into public.customers (organization_id, customer_type, display_name, created_by)
  values (org_alpha_id, 'individual', 'Customer Alpha', '11111111-1111-4111-8111-111111111111')
  returning id into cust_id;

  insert into public.products (organization_id, product_type, name, unit, cost_price, selling_price, created_by)
  values (org_alpha_id, 'goods', 'Purifier Unit', 'pcs', 100.00, 250.00, '11111111-1111-4111-8111-111111111111')
  returning id into prod_id;

  insert into public.sales_orders (organization_id, order_number, customer_id, grand_total, created_by)
  values (org_alpha_id, 'SO-2026-0001', cust_id, 250.00, '11111111-1111-4111-8111-111111111111')
  returning id into order_id;

  insert into public.sales_order_items (
    organization_id, sales_order_id, product_id, item_type, name_snapshot, unit_snapshot, quantity, unit_price, line_total
  )
  values (
    org_alpha_id, order_id, prod_id, 'goods', 'Purifier Unit', 'pcs', 1.000, 250.00, 250.00
  )
  returning id into item_id;

  insert into public.payments (organization_id, sales_order_id, amount, payment_method, created_by)
  values (org_alpha_id, order_id, 250.00, 'cash', '11111111-1111-4111-8111-111111111111')
  returning id into pay_id;

  perform public.test_assert(order_id is not null, 'Order should be created');
  perform public.test_assert(item_id is not null, 'Item should be created');
  perform public.test_assert(pay_id is not null, 'Payment should be created');
end;
$$;
reset role;

-- Test 2: Viewer can read sales order
set role authenticated;
select public.set_authenticated_claims('44444444-4444-4444-8444-444444444444');
do $$
declare
  order_count integer;
begin
  select count(*) into order_count from public.sales_orders;
  perform public.test_assert_eq(order_count, 1, 'Viewer should read 1 order');
end;
$$;
reset role;

drop function public.test_assert(boolean, text);
drop function public.test_assert_eq(anyelement, anyelement, text);
