# Authorization and Permissions

## Model

```text
Authenticated user
+ Active organization membership
+ Permission
+ Resource belongs to organization
= Allowed action
```

## Permission Codes

### Organization

- `organization.read`
- `organization.update`
- `organization.delete`
- `members.read`
- `members.invite`
- `members.update`
- `members.remove`
- `roles.read`
- `roles.manage`

### Customers

- `customers.read`
- `customers.create`
- `customers.update`
- `customers.archive`
- `customers.export`

### Products

- `products.read`
- `products.create`
- `products.update`
- `products.archive`
- `products.view_cost`

### Inventory

- `inventory.read`
- `inventory.adjust`
- `inventory.transfer`
- `inventory.view_history`

### Sales

- `sales.read`
- `sales.create`
- `sales.update_draft`
- `sales.confirm`
- `sales.cancel`
- `sales.view_cost`
- `sales.export`

### Payments

- `payments.read`
- `payments.create`
- `payments.void`

### Work Orders

- `work_orders.read`
- `work_orders.create`
- `work_orders.update`
- `work_orders.assign`
- `work_orders.start`
- `work_orders.complete`
- `work_orders.cancel`
- `work_orders.reopen`

### Reports

- `reports.operational`
- `reports.financial`

### Audit

- `audit.read`

## Default Permission Matrix

| Permission Area       | Owner |       Admin |              Staff |          Technician |   Viewer |
| --------------------- | ----: | ----------: | -----------------: | ------------------: | -------: |
| Organization settings |  Full | Read/Update |                 No |                  No |       No |
| Members               |  Full |     Limited |                 No |                  No |       No |
| Customers             |  Full |        Full | Create/Read/Update |       Assigned read |     Read |
| Products              |  Full |        Full |               Read |                Read |     Read |
| Product cost          |   Yes |    Optional |                 No |                  No |       No |
| Inventory view        |   Yes |         Yes |                Yes |             Limited |     Read |
| Inventory adjust      |   Yes |         Yes |           Optional |                  No |       No |
| Sales                 |  Full |        Full |        Create/Read |                  No |     Read |
| Payments              |  Full |        Full |           Optional |                  No |     Read |
| Work orders           |  Full |        Full |               Full | Assigned operations |     Read |
| Financial reports     |   Yes |         Yes |                 No |                  No | Optional |
| Audit logs            |   Yes |    Optional |                 No |                  No |       No |

Exact defaults must be implemented as seed data and tested when the dedicated RBAC tables are introduced. TASK-ORG-001 only constrains membership role codes and records the RBAC deferral in ADR-0004.

## Ownership Rules

Some rules cannot be overridden by normal permissions:

- Last Owner cannot be removed
- Last Owner cannot be demoted
- Non-Owner cannot delete organization
- Admin cannot grant ownership unless explicitly allowed by product policy
- User cannot accept an invitation for a different authenticated email unless verified workflow supports it

## Resource Scoping

Authorization helpers should use a structure similar to:

```text
requireAuthenticatedUser()
requireActiveMembership(organizationId)
requirePermission(permissionCode)
requireResourceOrganization(resourceId, organizationId)
```

Do not expose `organizationId` as a trusted field from the client.

## RLS Policy Expectations

For each tenant table:

- SELECT requires active membership
- INSERT requires active membership and matching organization
- UPDATE requires active membership and permission strategy
- DELETE is disabled or limited according to product rules

Because database RLS may not easily express all dynamic permissions efficiently, use layered controls:

```text
RLS tenant isolation
+ server-side permission check
+ database constraints
```

## Authorization Test Matrix

Every feature must test:

- Unauthenticated access
- Authenticated without organization membership
- Active membership without permission
- Active membership with permission
- Disabled membership
- Cross-tenant guessed resource ID
- Same user with different roles in two organizations
