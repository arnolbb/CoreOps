# Contributing

## Workflow

1. Choose or create a task in `TASKS.md`.
2. Create a branch from the latest `main`.
3. Implement one focused task.
4. Add or update tests.
5. Update documentation.
6. Open a pull request using `.github/PULL_REQUEST_TEMPLATE.md`.
7. Resolve review comments.
8. Merge only after all required checks pass.

## Branch Naming

```text
feat/ORG-001-create-organization
fix/INV-014-negative-stock-race
docs/ARCH-003-record-storage-decision
chore/CI-002-add-typecheck
```

## Commit Convention

```text
feat(customers): add customer creation flow
fix(inventory): prevent negative stock during concurrent sale
test(auth): cover cross-tenant membership access
docs(api): document sales order errors
chore(ci): run Playwright on protected branches
```

## Pull Request Size

Prefer focused pull requests. Large features should be split vertically rather than creating one massive PR.

A good PR should generally:

- Solve one task
- Be reviewable without reading unrelated changes
- Contain its own tests
- Include migration notes when relevant
- Explain security and tenant impact

## Reviews

Reviewers must check:

- Product requirement compliance
- Tenant isolation
- Authorization
- Validation
- Transaction safety
- Error handling
- Test quality
- Accessibility
- Documentation
- Migration reversibility

## Prohibited Practices

- Direct commits to protected `main`
- Committing secrets
- Disabling security policies
- Skipping tests without an issue reference
- Editing production schema manually
- Merging failed CI
- Using client-side checks as the only authorization
