# Definition of Done

A feature is done only when all applicable items pass.

## Product

- Acceptance criteria met
- Out-of-scope behavior not introduced
- User-facing language is consistent
- Edge cases documented

## Architecture

- Follows modular boundaries
- No unjustified dependency
- No unrelated refactor
- ADR added for meaningful architectural decision

## Database

- Migration added
- Constraints added
- Indexes considered
- Tenant ownership enforced
- RLS enabled
- Fresh migration works
- Upgrade path tested
- No unsafe manual production steps

## Authorization

- Required permission defined
- Server-side permission enforced
- Tenant isolation enforced
- Cross-tenant test added
- Disabled membership tested
- Direct URL or API access tested

## Validation

- Input schema exists
- Server-side validation exists
- Boundary values tested
- Safe errors returned
- Duplicate submission handled where required

## UI

- Loading state
- Empty state
- Success state
- Validation error
- Authorization error
- Unexpected error
- Mobile layout
- Accessibility basics
- Destructive confirmation

## Testing

- Unit tests
- Integration tests
- Permission tests
- Tenant tests
- E2E for critical flow
- Regression test for fixed bug

## Operations

- Logs added where required
- Audit event added where required
- Metrics or alert impact considered
- Runbook updated when operational behavior changes

## Documentation

- Relevant spec updated
- API contract updated
- Database document updated
- Changelog updated
- Task marked done

## Quality Gates

- Formatting passes
- Lint passes
- Typecheck passes
- Tests pass
- Production build passes
- PR approved
