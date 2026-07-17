# Git and Release Strategy

## Branches

- `main`: production-ready
- Feature branches: short-lived
- No long-running development branch unless explicitly introduced later

## Naming

```text
feat/<task-id>-description
fix/<task-id>-description
docs/<task-id>-description
chore/<task-id>-description
```

## Commits

Use conventional commit style.

```text
feat(sales): create draft sales order
fix(auth): reject disabled membership
test(rls): add cross-tenant customer coverage
docs(security): document file upload restrictions
```

## Pull Requests

- Linked to task
- Focused
- All CI passing
- Reviewed
- Migration impact described
- Security impact described

## Release Model

Initial release model:

```text
Merge to main
→ Production deployment
→ Smoke tests
→ Changelog entry
```

As usage grows, add release tags:

```text
v0.1.0 beta
v0.2.0 expanded beta
v1.0.0 stable
```

## Semantic Versioning

- Major: breaking contract or migration
- Minor: backward-compatible feature
- Patch: backward-compatible fix

## Hotfix

```text
Create fix branch from main
→ Add regression test
→ Apply focused fix
→ Run full checks
→ Merge
→ Deploy
→ Verify
→ Document incident if production impact occurred
```

## Rollback

Application rollback may use the previous deployment.

Database rollback requires a safe migration strategy. Do not assume application rollback automatically reverses schema changes.
