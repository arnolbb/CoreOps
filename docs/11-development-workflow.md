# Development Workflow

## Principles

- Documentation before large implementation
- Small tasks
- Vertical slices
- Reviewable pull requests
- Tests with every feature
- No silent architecture drift
- Production safety over coding speed

## Task Lifecycle

```text
BACKLOG
→ READY
→ IN_PROGRESS
→ REVIEW
→ DONE
```

## Before Coding

Agent or developer must:

1. Read `AGENTS.md`
2. Read the task
3. Read linked specifications
4. Inspect existing code patterns
5. Identify database impact
6. Identify permission requirements
7. Identify tenant risks
8. Define test plan
9. Confirm out-of-scope items

## Implementation Order

For a normal feature:

```text
Feature specification
→ Migration
→ RLS and constraints
→ Domain logic
→ Server contract
→ UI
→ Tests
→ Documentation
```

For UI-only work:

```text
Existing contract
→ Component
→ States
→ Accessibility
→ Tests
```

## Vertical Slice Example

Customer creation:

- Migration and policy
- Customer input schema
- Create-customer service
- Authorization check
- Form
- Success and error states
- Integration test
- Cross-tenant test
- Playwright test
- Documentation update

## Review Checklist

### Product

- Meets acceptance criteria
- No unrelated behavior
- Status language matches specification

### Security

- Server-side permission check
- Tenant isolation
- Safe errors
- No secret exposure
- File restrictions if relevant

### Data

- Migration included
- Constraints correct
- Transaction safety
- Indexes present
- No silent data loss

### UI

- Loading
- Empty
- Error
- Mobile
- Accessibility

### Tests

- Positive case
- Validation failure
- Permission denial
- Cross-tenant denial
- State conflict
- Critical E2E where applicable

## Documentation Updates

Update when relevant:

- Product requirements
- Database design
- API contract
- Permission matrix
- ADR
- Changelog
- Runbook
- Task status

## Agent Handoff

When an agent stops, it must state:

- What is complete
- What is incomplete
- Files changed
- Tests run
- Current failures
- Next recommended task
- Any migration risk
