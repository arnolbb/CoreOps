# Personas and Roles

## Personas

### Business Owner

Goals:

- Know current sales and outstanding payments
- Prevent stock loss
- Control employee access
- Review operational performance
- Reduce dependence on spreadsheets

Pain points:

- Information arrives late
- Stock and payment records do not match
- Employees use private chat for work assignments
- No audit trail

### Administrator

Goals:

- Maintain customer and product data
- Record sales and payments
- Assign work
- Correct operational errors safely

Pain points:

- Repetitive manual work
- Duplicate records
- Unclear responsibility
- Permission limitations are inconsistent

### Staff or Sales User

Goals:

- Add customers quickly
- Create orders
- Check product availability
- Track follow-up status

### Technician or Field Worker

Goals:

- See today's assigned jobs
- Open customer location
- Update status
- Record used items
- Upload evidence
- Complete work from a phone

### Viewer or Auditor

Goals:

- Read reports
- Inspect records
- Avoid accidental modifications

## Default Roles

### Owner

- Full organization control
- Billing and ownership
- Member and role management
- Sensitive reports
- Destructive organization operations

### Admin

- Broad operational access
- Manage customers, products, sales, inventory, and work orders
- Invite non-owner members if permitted
- Cannot delete organization
- Cannot remove last Owner

### Manager

- Manage selected operational modules
- View reports
- Approve selected actions
- No ownership control

### Staff

- Create and update daily operational data
- Limited reporting
- No organization settings
- No sensitive permission management

### Technician

- View assigned work
- Update assigned work
- Record used inventory if permitted
- Limited customer details required for service

### Viewer

- Read-only access to permitted modules

## Role Design Principle

Roles are bundles of permissions. Application logic must check permissions, not role names, except for immutable ownership rules.

## Role Assignment Rules

- Membership belongs to one organization
- Same user may have different roles in different organizations
- Role changes apply only inside that organization
- Disabled membership has no access
- Custom roles are post-MVP
