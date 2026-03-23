# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Phase 0 complete. Monorepo scaffold is in place. Run `pnpm install` once on the host to generate `pnpm-lock.yaml`, then use Docker for all app processes.

## Monorepo Structure

```
apps/
  web/        → Next.js 14+ frontend (App Router)
  api/        → NestJS backend
packages/
  types/      → Shared DTOs, Zod schemas, enums (source of truth for network contract)
  config/     → Shared ESLint, TypeScript, Prettier configs
docs/
  decisions/  → Architecture Decision Records (ADRs)
```

**Key constraint:** All request/response shapes must be defined in `packages/types` and imported by both `apps/web` and `apps/api`. Never duplicate type definitions across apps.

## Commands

```bash
# ── First-time bootstrap ──────────────────────────────────────────────────────
pnpm install            # generates pnpm-lock.yaml; commit this file
cp .env.example .env    # fill in JWT_SECRET and JWT_REFRESH_SECRET

# ── Docker (primary workflow — no host Node required after bootstrap) ──────────
docker compose up --build   # first run: builds images + starts all 4 containers
docker compose up           # subsequent runs
docker compose up -d        # run in background

# ── Prisma ────────────────────────────────────────────────────────────────────
docker compose exec api pnpm prisma migrate dev     # create + apply a new migration
docker compose exec api pnpm prisma migrate deploy  # apply existing migrations
docker compose exec api pnpm prisma generate        # regenerate client after schema change
docker compose exec api pnpm prisma studio          # open Prisma Studio

# ── Tests ─────────────────────────────────────────────────────────────────────
docker compose exec api pnpm jest path/to/file.spec.ts   # run a single backend test
docker compose exec api pnpm test                        # run all backend tests

# ── Rebuild after Dockerfile or dependency changes ────────────────────────────
docker compose build api
docker compose build web

# ── Host-side (optional — for IDE/intellisense only) ─────────────────────────
pnpm install
pnpm turbo run lint typecheck
pnpm turbo run test
```

## Architecture Notes

### Auth

JWT access tokens (15m TTL) are stateless. Refresh tokens are stored as bcrypt hashes in Redis (7d TTL, rotated on use) — this enables revocation without stateful sessions. Never store plaintext tokens. A NestJS JWT guard is applied globally; use a `@Public()` decorator to opt out on specific routes.

### Real-time

WebSockets (Socket.io) are scoped to board card sync only — not used for focus items or auth. Cards broadcast moves/edits to all clients joined to the same board "room". Conflict resolution is last-write-wins by server timestamp.

### Backend patterns

- Controllers are thin: validation via `class-validator` DTOs, logic in services, no business logic in controllers.
- All DTOs use `class-validator` decorators. Input is rejected at the controller boundary before reaching services.
- NestJS Throttler is applied on all auth endpoints.

### Frontend patterns

- React Server Components handle initial data fetching. Client Components handle real-time surfaces and interactivity.
- Zustand is for ephemeral client-only state. Server state (boards, cards, focus items) goes through React Query or SWR.
- Unsplash API calls are server-side only — the API key must never reach the client bundle.

### Testing layers

- **Unit (Jest):** NestJS service logic and `packages/types` utilities.
- **Integration (Jest + Supertest):** NestJS controllers against a real test database — no DB-layer mocks.
- **E2E (Playwright):** Full critical paths: auth flow, focus item creation, board/card CRUD, drag-and-drop persistence.

## Engineering Rules

- `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-floating-promises` are set to `error`. No exceptions.
- Conventional Commits format is enforced via commitlint.
- CORS must be configured explicitly in production — no wildcard `*`.
- Helmet middleware must remain enabled on the NestJS app.

## Open Architectural Decisions

Before implementing the relevant phase, resolve these and document each as an ADR in `docs/decisions/`:

- **Card position storage:** fractional indexing vs. integer rank + rebalance
- **Next.js auth strategy:** next-auth v5 vs. custom JWT cookie
- **WebSocket auth:** token in handshake query vs. cookie
- **Analytics storage (Phase 3):** PostgreSQL aggregates vs. TimescaleDB
