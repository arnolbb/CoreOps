# CoreOps

> Working title: **CoreOps**  
> Product type: Multi-tenant SaaS for small and medium businesses  
> Primary use cases: customer management, products, inventory, sales, payments, and work orders

CoreOps is a modular business operations platform designed to support product-based, service-based, installation, maintenance, and distribution businesses.

The first real-world implementation can be used by Segar Alami, but the product must remain general enough to support many organizations.

## Current Status

This repository begins with an agent-ready documentation package. Development must follow the specifications in `/docs` and the permanent instructions in `AGENTS.md`.

## MVP Modules

1. Authentication
2. Organizations and memberships
3. Role-based access control
4. Customers
5. Products and categories
6. Warehouses and inventory ledger
7. Sales orders
8. Payments and invoices
9. Work orders
10. Dashboard and reports
11. Audit logs

## Technology Direction

- Next.js App Router
- TypeScript strict mode
- PostgreSQL through Supabase
- Supabase Auth
- Supabase Storage
- Tailwind CSS
- shadcn/ui
- Zod
- React Hook Form
- Vitest
- Playwright
- GitHub Actions
- Vercel

Exact dependency versions must be selected during implementation and recorded in an ADR.

## Development

Prerequisites: Node.js LTS (see `.nvmrc`), npm.

```bash
npm install      # install dependencies
npm run dev     # start the dev server at http://localhost:3000
npm run lint     # run ESLint
npm run typecheck # run the TypeScript compiler
npm run format   # format with Prettier
npm run build    # production build
npm start        # run the production build
```

Environment variables are documented in `.env.example`. Never commit `.env` files.

## Documentation Map

Start with:

- `AGENTS.md`
- `docs/00-documentation-index.md`
- `docs/01-product-vision.md`
- `docs/02-product-requirements.md`
- `docs/05-system-architecture.md`
- `docs/06-database-design.md`
- `docs/07-authorization-and-permissions.md`
- `docs/11-development-workflow.md`
- `docs/20-agent-prompt-playbook.md`

## Development Principle

Build one complete vertical slice at a time:

```text
Specification
→ Database migration
→ Authorization
→ Backend logic
→ UI
→ Automated tests
→ Documentation
→ Review
```

A feature is not complete merely because the page works visually. It must satisfy security, tenant isolation, validation, testing, and documentation requirements.

## Recommended First Milestone

```text
Register
→ Create organization
→ Invite member
→ Add customer
→ Add product
→ Add inventory
→ Create sales order
→ Record payment
→ Create work order
→ Complete work order
```

## License

Not selected yet. Do not assume the project is open source until an explicit license is added.
