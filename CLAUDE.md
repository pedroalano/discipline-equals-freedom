# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Phases 0, 1, and 2 complete, plus Pomodoro timer, Habits system, and Profile page. Auth + Zen Core MVP, Kanban Engine, Pomodoro focus timer, habit tracking with streak badges, and user profile management are fully implemented. Auth system includes email verification (Resend API), password reset flow, account lockout (5 failed attempts / 15min), and strong password requirements. Run `pnpm install` once on host for IDE intellisense, then use Docker for all app processes.

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
# Use --filter api exec so pnpm resolves the prisma binary from apps/api's dependencies
docker compose exec api pnpm --filter api exec prisma migrate dev --name <name>  # create + apply migration
docker compose exec api pnpm --filter api exec prisma migrate deploy             # apply existing migrations
docker compose exec api pnpm --filter api exec prisma generate                   # regenerate client after schema change
docker compose exec api pnpm --filter api exec prisma studio                     # open Prisma Studio

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

JWT access tokens (15m TTL) are stateless and include `emailVerified` claim. Refresh tokens are stored as bcrypt hashes in Redis (7d TTL, rotated on use) — this enables revocation without stateful sessions. Never store plaintext tokens. A NestJS JWT guard is applied globally; use a `@Public()` decorator to opt out on specific routes, or `@SkipEmailVerification()` for routes accessible to unverified users.

**Email verification:** New users receive a verification email via Resend API. Tokens are `crypto.randomBytes(32)` stored as SHA-256 hashes in Redis (24h TTL). Unverified users are blocked by a global `EmailVerifiedGuard` from all routes except verify-email, resend-verification, logout, refresh, and GET /users/me.

**Password reset:** Forgot-password generates a token (1h TTL in Redis), sends email, and always returns the same response (no email enumeration). Reset invalidates all sessions.

**Account lockout:** 5 failed login attempts per email triggers 15-minute lockout via Redis counter.

### Real-time

WebSockets (Socket.io) are scoped to board card sync only — not used for focus items or auth. Cards broadcast moves/edits to all clients joined to the same board "room". Conflict resolution is last-write-wins by server timestamp.

### Habits

Habit CRUD with `DAILY` or `CUSTOM` frequency (specific weekdays via `customDays` JSON). Active habits auto-generate FocusItems for the current day via `ensureHabitsGenerated()` — called on focus item list requests. FocusItems link back to their source habit via `habitId` (FK, `onDelete: SetNull` so completed items survive habit deletion). Streaks are computed from consecutive completed FocusItems sharing the same `habitId`. Frontend displays habits in a dedicated section above tasks with streak badges.

### Profile

User profile endpoints: update display name (`PATCH /users/me`), change password (requires current password verification), and delete account (cascades all user data). Profile page also displays account stats.

### Backend patterns

- Controllers are thin: validation via `class-validator` DTOs, logic in services, no business logic in controllers.
- All DTOs use `class-validator` decorators. Input is rejected at the controller boundary before reaching services.
- NestJS Throttler is applied on all auth endpoints.

### Frontend patterns

- React Server Components handle initial data fetching. Client Components handle real-time surfaces and interactivity.
- UI components use shadcn/ui (Radix primitives + Tailwind). Feature navigation uses a radial target icon menu with modal-based views.
- Zustand is for ephemeral client-only state. Server state (boards, cards, focus items, habits) goes through React Query or SWR.
- The Pomodoro store (`apps/web/src/store/pomodoro.ts`) uses Zustand with `persist` middleware (localStorage). It holds settings, daily count, and daily count date. Runtime timer state is not persisted and resets on load. No backend is involved — see ADR 005.
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

- **Analytics storage (Phase 3):** PostgreSQL aggregates vs. TimescaleDB — Defer to Phase 3; resolve before Phase 3 begins
