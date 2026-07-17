# CI and CD

## CI Goals

Every change must prove:

- Code quality
- Type safety
- Test success
- Build success
- Migration validity
- No obvious secret leakage

## Pull Request Pipeline

```text
Checkout
→ Install dependencies
→ Validate formatting
→ Lint
→ Typecheck
→ Unit tests
→ Integration tests
→ Production build
→ Migration checks
```

## Protected Branch Pipeline

```text
All PR checks
→ Critical Playwright tests
→ Preview verification
→ Deployment approval when configured
```

## Production Deployment

```text
Merge to main
→ Apply safe migrations
→ Deploy application
→ Run smoke tests
→ Monitor errors
```

## Migration Safety

Before deployment:

- Migration reviewed
- Forward compatibility considered
- Long locks considered
- Data backfill separated when large
- Recovery plan documented
- Preview or staging validation completed

Use expand-and-contract for breaking changes:

```text
Add new structure
→ Write both formats if needed
→ Backfill
→ Switch reads
→ Remove old structure later
```

## Required Secrets

CI and deployment secrets must be environment-specific and least-privileged.

## Failure Behavior

- Failed checks block merge
- Failed migration blocks deployment
- Failed smoke test triggers investigation
- Do not automatically destroy or reset production data
