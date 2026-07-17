# Demo and Seed Data

## Objectives

- Make local development reproducible
- Give agents predictable records
- Support E2E tests
- Demonstrate full workflow
- Avoid real personal data

## Demo Organizations

### CoreOps Demo Retail

- General product sales
- One warehouse
- Multiple products
- Customers
- Sales orders
- Payments

### CoreOps Demo Service

- Products and spare parts
- Technicians
- Work orders
- Used items
- Attachments represented by safe fixtures

### Segar Alami Pilot Template

Seed as configuration, not hard-coded behavior:

- Product categories: Purifier, Filter, Spare Part, Service
- Work types: Installation, Service, Maintenance
- Customer tags: Residential, Corporate, Warranty Active
- Roles: Owner, Admin, Sales, Technician

## Seed Users

Use clearly fake addresses:

```text
owner.demo@example.test
admin.demo@example.test
staff.demo@example.test
tech.demo@example.test
```

Never use real credentials or production password patterns.

## Seed Requirements

- Deterministic IDs where helpful for tests
- Safe to reset
- No production data
- Documented login workflow
- Separate test factory from demo seed when appropriate
