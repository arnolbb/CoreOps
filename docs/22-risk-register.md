# Risk Register

| ID    | Risk                                           | Likelihood |   Impact | Mitigation                                             | Owner       |
| ----- | ---------------------------------------------- | ---------: | -------: | ------------------------------------------------------ | ----------- |
| R-001 | Cross-tenant data access                       |     Medium | Critical | RLS, server checks, cross-tenant tests                 | Engineering |
| R-002 | AI agent introduces inconsistent architecture  |       High |     High | AGENTS.md, ADRs, small tasks, review                   | Maintainer  |
| R-003 | Scope becomes full enterprise ERP              |       High |     High | MVP non-goals, roadmap discipline                      | Product     |
| R-004 | Negative stock from concurrent operations      |     Medium |     High | Transactions, locking or atomic function, tests        | Engineering |
| R-005 | Duplicate payment submission                   |     Medium |     High | Idempotency key, transaction, regression tests         | Engineering |
| R-006 | Production secret leakage                      |     Medium | Critical | Secret scanning, environment separation, rotation      | Engineering |
| R-007 | Private file exposed publicly                  |     Medium |     High | Private storage, signed access, permission checks      | Engineering |
| R-008 | Migration causes data loss                     |     Medium | Critical | Review, staging rehearsal, backup, expand-contract     | Engineering |
| R-009 | Backup exists but restore fails                |     Medium | Critical | Scheduled restore rehearsal                            | Operations  |
| R-010 | UI becomes too complex for staff               |     Medium |   Medium | Real-user tests, simple workflows                      | Product     |
| R-011 | One maintainer cannot operate system           |       High |     High | Modular monolith, runbooks, documentation              | Maintainer  |
| R-012 | Cost increases with storage or traffic         |     Medium |   Medium | Usage monitoring, limits, pricing review               | Product     |
| R-013 | Logs contain personal or secret data           |     Medium |     High | Structured redaction and review                        | Engineering |
| R-014 | Segar Alami-specific requirements pollute core |       High |   Medium | Configuration, tags, templates, ADR review             | Product     |
| R-015 | No legal privacy baseline                      |     Medium |     High | Draft policy, professional review before public launch | Product     |
