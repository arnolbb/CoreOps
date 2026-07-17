# Changelog

All notable user-visible and operational changes must be documented here.

The format follows these sections:

- Added
- Changed
- Fixed
- Security
- Deprecated
- Removed

## Unreleased

### Added

- Initial agent-ready product and engineering documentation package.
- Next.js 16 App Router project scaffold with TypeScript strict mode, Tailwind CSS v4, ESLint flat config, and Prettier.
- Base source structure under `src/` (`app/`, `components/ui`, `components/shared`, `lib/`, `types/`) per the system architecture.
- Root layout, home page, error boundary, and loading state.
- npm scripts: `lint`, `typecheck`, `format`, `format:check`, `build`, `start`.
- `.nvmrc` pinning Node 24 LTS.
- ADR-0001 recording the initial technology stack and version pins.

### Changed

- None.

### Fixed

- None.

### Security

- Defined mandatory multi-tenant isolation and authorization standards.
