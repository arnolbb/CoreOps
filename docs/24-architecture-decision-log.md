# Architecture Decision Log

Use `templates/adr-template.md`.

## ADR Index

| ADR     | Title                                                  | Status   |
| ------- | ------------------------------------------------------ | -------- |
| ADR-001 | Use modular monolith                                   | Accepted |
| ADR-002 | Use Next.js App Router                                 | Proposed |
| ADR-003 | Use Supabase PostgreSQL, Auth, and Storage             | Proposed |
| ADR-004 | Tenant isolation through RLS plus server authorization | Proposed |
| ADR-005 | Inventory ledger and balance model                     | Proposed |
| ADR-006 | Payment correction through void or reversal            | Proposed |
| ADR-007 | Concurrency strategy for inventory                     | Pending  |
| ADR-008 | Server Actions versus Route Handlers boundaries        | Pending  |
| ADR-009 | System role storage model                              | Pending  |
| ADR-010 | File malware and signature validation approach         | Pending  |

## Foundation Decisions

| ADR      | Title                                     | Status   |
| -------- | ----------------------------------------- | -------- |
| ADR-0001 | Initial technology stack and version pins | Accepted |
| ADR-0002 | Local Supabase development setup          | Accepted |

## Accepted Decision: Modular Monolith

### Context

The product is early, maintained by a small team, and heavily developed with coding agents.

### Decision

Use one application and one primary database while preserving module boundaries.

### Consequences

Positive:

- Easier transactions
- Easier deployment
- Easier understanding
- Lower infrastructure cost

Negative:

- Requires discipline to avoid tightly coupled modules
- Future extraction may require explicit interfaces
