# Database Design

## Conventions

- PostgreSQL
- UUID primary keys
- `snake_case`
- UTC timestamps
- `created_at` and `updated_at`
- Tenant tables include `organization_id`
- Foreign keys are explicit
- Monetary values use fixed precision
- Soft deletion only when required
- All tenant tables use RLS

## Core Tables

### profiles

Application profile linked to authentication user.

```text
id uuid PK
display_name text
avatar_url text nullable
created_at timestamptz
updated_at timestamptz
```

### organizations

```text
id uuid PK
name text
slug text unique
business_type text
timezone text
currency_code char(3)
status text
settings jsonb
created_at timestamptz
updated_at timestamptz
```

### organization_memberships

```text
id uuid PK
organization_id uuid FK
user_id uuid FK
role text
status text
joined_at timestamptz
created_at timestamptz
updated_at timestamptz

unique (organization_id, user_id)
index (user_id, status)
index (organization_id, status)
index (organization_id) where role = 'owner' and status = 'active'
```

TASK-ORG-001 stores default role codes directly as constrained text to keep the first tenant boundary minimal. Full role and permission tables are deferred per ADR-0004.

### roles

```text
id uuid PK
organization_id uuid nullable
code text
name text
is_system boolean
created_at timestamptz
updated_at timestamptz
```

System roles may use a nullable organization or another explicit global-role model. Final design requires an ADR.

### permissions

```text
id uuid PK
code text unique
description text
```

### role_permissions

```text
role_id uuid FK
permission_id uuid FK
primary key (role_id, permission_id)
```

### invitations

```text
id uuid PK
organization_id uuid FK
email citext
role_id uuid FK
token_hash text
status text
expires_at timestamptz
invited_by uuid
accepted_by uuid nullable
created_at timestamptz
updated_at timestamptz
```

Never store invitation token plaintext.

## Customers

### customers

```text
id uuid PK
organization_id uuid FK
customer_type text
display_name text
company_name text nullable
phone text nullable
email citext nullable
status text
notes text nullable
created_by uuid
created_at timestamptz
updated_at timestamptz
archived_at timestamptz nullable

index (organization_id, display_name)
index (organization_id, phone)
index (organization_id, email)
```

### customer_addresses

```text
id uuid PK
organization_id uuid FK
customer_id uuid FK
label text
address_line_1 text
address_line_2 text nullable
city text nullable
province text nullable
postal_code text nullable
country_code char(2)
latitude numeric nullable
longitude numeric nullable
is_primary boolean
created_at timestamptz
updated_at timestamptz
```

### tags

```text
id uuid PK
organization_id uuid FK
name text
color_token text nullable
unique (organization_id, name)
```

### customer_tags

```text
customer_id uuid FK
tag_id uuid FK
primary key (customer_id, tag_id)
```

## Products

### product_categories

```text
id uuid PK
organization_id uuid FK
name text
parent_id uuid nullable
created_at timestamptz
updated_at timestamptz
unique (organization_id, name)
```

### products

```text
id uuid PK
organization_id uuid FK
product_type text
name text
sku text nullable
category_id uuid nullable
unit text
description text nullable
cost_price numeric(18,2)
selling_price numeric(18,2)
track_inventory boolean
minimum_stock numeric(18,3) nullable
is_active boolean
image_path text nullable
created_by uuid
created_at timestamptz
updated_at timestamptz
archived_at timestamptz nullable

unique (organization_id, sku) where sku is not null
index (organization_id, name)
```

## Inventory

### warehouses

```text
id uuid PK
organization_id uuid FK
name text
code text
address text nullable
is_active boolean
created_at timestamptz
updated_at timestamptz

unique (organization_id, code)
```

### inventory_balances

```text
organization_id uuid FK
warehouse_id uuid FK
product_id uuid FK
quantity numeric(18,3)
version bigint
updated_at timestamptz

primary key (warehouse_id, product_id)
```

### inventory_transactions

```text
id uuid PK
organization_id uuid FK
warehouse_id uuid FK
product_id uuid FK
transaction_type text
quantity_delta numeric(18,3)
quantity_before numeric(18,3)
quantity_after numeric(18,3)
reference_type text nullable
reference_id uuid nullable
reason text nullable
created_by uuid
created_at timestamptz
idempotency_key text nullable

index (organization_id, product_id, created_at)
index (organization_id, reference_type, reference_id)
unique (organization_id, idempotency_key) where idempotency_key is not null
```

Inventory transactions are append-only.

## Sales

### sales_orders

```text
id uuid PK
organization_id uuid FK
order_number text
customer_id uuid FK
status text
payment_status text
currency_code char(3)
subtotal numeric(18,2)
discount_total numeric(18,2)
tax_total numeric(18,2)
grand_total numeric(18,2)
paid_total numeric(18,2)
notes text nullable
confirmed_at timestamptz nullable
completed_at timestamptz nullable
cancelled_at timestamptz nullable
created_by uuid
created_at timestamptz
updated_at timestamptz

unique (organization_id, order_number)
index (organization_id, status, created_at)
```

### sales_order_items

```text
id uuid PK
organization_id uuid FK
sales_order_id uuid FK
product_id uuid nullable
item_type text
name_snapshot text
sku_snapshot text nullable
unit_snapshot text
quantity numeric(18,3)
unit_price numeric(18,2)
discount_amount numeric(18,2)
tax_amount numeric(18,2)
line_total numeric(18,2)
created_at timestamptz
```

### payments

```text
id uuid PK
organization_id uuid FK
sales_order_id uuid FK
amount numeric(18,2)
payment_method text
reference text nullable
status text
paid_at timestamptz
notes text nullable
created_by uuid
created_at timestamptz
voided_at timestamptz nullable
voided_by uuid nullable
void_reason text nullable
```

## Work Orders

### work_orders

```text
id uuid PK
organization_id uuid FK
work_order_number text
customer_id uuid FK
customer_address_id uuid nullable
work_type text
priority text
status text
assigned_to uuid nullable
scheduled_start timestamptz nullable
scheduled_end timestamptz nullable
description text
completion_notes text nullable
started_at timestamptz nullable
completed_at timestamptz nullable
cancelled_at timestamptz nullable
created_by uuid
created_at timestamptz
updated_at timestamptz

unique (organization_id, work_order_number)
index (organization_id, status, scheduled_start)
index (organization_id, assigned_to, status)
```

### work_order_items

```text
id uuid PK
organization_id uuid FK
work_order_id uuid FK
product_id uuid FK
warehouse_id uuid FK
name_snapshot text
quantity numeric(18,3)
created_by uuid
created_at timestamptz
```

### work_order_attachments

```text
id uuid PK
organization_id uuid FK
work_order_id uuid FK
storage_path text
file_name text
mime_type text
size_bytes bigint
attachment_type text
uploaded_by uuid
created_at timestamptz
```

## Audit

### audit_logs

```text
id uuid PK
organization_id uuid FK
actor_user_id uuid nullable
action text
entity_type text
entity_id uuid nullable
before_data jsonb nullable
after_data jsonb nullable
request_id text nullable
metadata jsonb nullable
created_at timestamptz
```

Audit logs are append-only and protected from normal users.

## Tenant Integrity

Every child table containing both `organization_id` and a parent ID must prevent cross-organization references.

Preferred methods:

- Composite foreign keys
- Transactional validation
- Database function constraints
- Carefully tested service logic

Do not rely only on application convention.

## Deletion Policy

- Authentication user: handled according to identity provider policy
- Organization: soft-disable first; destructive purge is later and controlled
- Customer: archive
- Product: archive or deactivate
- Inventory transaction: never delete
- Confirmed order: never hard-delete
- Payment: void, do not delete
- Completed work order: retain
- Audit log: retain according to policy

## Required Migration Tests

- Fresh database migration
- Upgrade from previous schema
- RLS enabled
- Required policies exist
- Constraints reject cross-tenant references
- Seed data loads
