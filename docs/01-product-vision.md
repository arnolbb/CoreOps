# Product Vision

## Working Name

**CoreOps**

The name is temporary and may change without affecting product architecture.

## Vision

Help small and medium businesses manage customers, products, inventory, sales, payments, and field or service work in one reliable system.

## Product Statement

CoreOps is a modular, multi-tenant business operations SaaS for organizations that sell products, provide services, perform installations, manage stock, or coordinate operational work.

## Problem

Many small businesses operate through disconnected spreadsheets, chat messages, paper notes, and personal memory.

Typical problems include:

- Customer data is scattered
- Stock numbers are unreliable
- Sales history is incomplete
- Payments are hard to track
- Work assignments are sent through chat
- Service history is not connected to customers
- Owners cannot see current operational status
- Access is not controlled by role
- Important actions are not auditable

## Target Customer

Initial target:

- Small and medium businesses
- 2–100 active staff
- Product, service, installation, maintenance, retail, or distribution operations
- Currently using spreadsheets or fragmented tools
- Need shared operational visibility
- Do not need complex enterprise accounting yet

## Initial Industry Examples

- Water purifier sales and service
- AC installation and maintenance
- Electronics sales and repair
- Small distributors
- Equipment suppliers
- Home service businesses
- Workshop or repair operations
- Small retail businesses

## Core Value

```text
One workspace
→ Shared customer and product data
→ Traceable stock and transactions
→ Clear work ownership
→ Controlled access
→ Useful operational reporting
```

## Product Principles

### General Core, Configurable Usage

Core entities must remain general. Industry-specific behavior should be supported through configuration, tags, templates, and later custom fields.

### Operational Clarity

Every important action should have:

- A responsible user
- A timestamp
- A status
- A clear next action
- An audit trail when sensitive

### Safe by Default

Tenant isolation and authorization are product requirements, not optional technical improvements.

### Progressive Complexity

Start with a focused operational system. Add accounting, automation, subscriptions, and advanced customization only after the core is stable.

### Mobile-Aware

Field workers and staff must be able to complete essential work from a phone browser.

## Non-Goals for MVP

- Full accounting ledger
- Payroll
- Tax filing
- Marketplace
- Native mobile application
- Public customer portal
- Workflow builder
- User-defined database schema
- Advanced procurement
- Manufacturing resource planning
- AI automation inside the product
- Multi-region enterprise infrastructure

## Success Metrics for Beta

- Organization can complete the primary workflow without spreadsheets
- Users from one organization cannot access another organization's data
- Inventory changes are traceable
- Work orders have clear ownership and status
- New staff can learn the main workflows without direct developer support
- Critical user flows pass automated tests
- Backup restore is verified
- Real users complete at least one full weekly operating cycle

## Product Constraints

- Small development team
- Heavy use of coding agents
- Must remain understandable by one human maintainer
- Must avoid unnecessary infrastructure
- Must support controlled iteration
