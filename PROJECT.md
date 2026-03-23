# ZenFocus: Full-Stack Productivity Dashboard

ZenFocus is a TypeScript monorepo application combining a minimalist "New Tab" focus dashboard with a Kanban board engine. The frontend targets a distraction-free daily workflow; the backend exposes a durable API for state that survives browser sessions.

---

## Problem Statement

Existing productivity tools operate at opposite extremes: ambient dashboards (Momentum) lack persistence and organization primitives, while project tools (Trello, Jira) are too complex for daily personal focus. ZenFocus occupies the middle ground: a single surface that handles a user's daily intention AND their ongoing project work, without context-switching between apps.

**Target user:** Individual contributors and knowledge workers who self-manage their workload.

---

## Success Criteria (Measurable)

| Metric                                | Target                             |
| ------------------------------------- | ---------------------------------- |
| Largest Contentful Paint (LCP)        | < 1.2s on 4G                       |
| Interaction to Next Paint (INP)       | < 200ms                            |
| Time to First Byte (TTFB)             | < 200ms                            |
| API p99 latency (CRUD ops)            | < 100ms                            |
| Core Web Vitals pass rate             | 100% on Lighthouse CI              |
| Unit test coverage (backend services) | ≥ 80%                              |
| E2E critical path coverage            | 100% of auth + focus + board flows |

---

## Technical Stack

### Frontend

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion — scoped to interaction feedback only (no decorative animations on initial load paths)
- **State:** Zustand — for client-only ephemeral state; server state via React Query or SWR
- **Data fetching:** React Server Components for initial data; Client Components for real-time and interactive surfaces

### Backend

- **Framework:** NestJS (modular, DI-based architecture)
- **Database:** PostgreSQL via Prisma ORM
- **Real-time:** Socket.io (WebSockets) — scoped to board card sync only
- **Auth:** JWT access tokens (15m TTL) + refresh tokens stored in Redis (7d TTL, rotated on use). Redis also used for rate-limiting and job queues if needed.
- **Validation:** `class-validator` + `class-transformer` on all DTOs at the controller boundary

> **Note on JWT + Redis:** Access tokens are stateless. Redis stores refresh token hashes only, enabling revocation without stateful sessions. This is not a contradiction — it is a deliberate hybrid.

### Infrastructure

- **Monorepo tooling:** pnpm workspaces + Turborepo (task caching, pipeline orchestration)
- **Shared packages:** `packages/types` (shared DTOs and Zod schemas), `packages/config` (shared ESLint/TS configs)
- **Local environment:** Docker Compose — PostgreSQL + Redis services only. App processes run on host.
- **CI/CD:** GitHub Actions — lint, typecheck, unit tests, E2E tests (Playwright), Docker build validation on every PR
- **Deployment:** Vercel (frontend) + Render (backend). Render chosen over DigitalOcean for managed zero-downtime deploys without infra ops overhead at this stage.

---

## Architecture

```
apps/
  web/        → Next.js frontend
  api/        → NestJS backend
packages/
  types/      → Shared DTOs, Zod schemas, enums
  config/     → Shared ESLint, TypeScript, Prettier configs
```

**Type safety across the network boundary** is enforced by `packages/types` — all request/response shapes are defined once and imported by both `apps/web` and `apps/api`. No type duplication.

**Why NestJS over Next.js API Routes:**

- WebSocket lifecycle management requires a persistent server process
- NestJS DI enables clean module boundaries (AuthModule, BoardModule, FocusModule)
- Guards, interceptors, and pipes provide a composable request pipeline without middleware spaghetti

### Core Data Model (simplified)

```
User           → id, email, passwordHash, createdAt
RefreshToken   → id, userId, tokenHash, expiresAt
FocusItem      → id, userId, text, date, completed
Board          → id, userId, title, createdAt
List           → id, boardId, title, position
Card           → id, listId, title, description, position, updatedAt
```

---

## Development Roadmap

### Phase 0: Foundation (prerequisite to all phases)

- [ ] Initialize monorepo with pnpm workspaces + Turborepo
- [ ] Scaffold `apps/web` (Next.js), `apps/api` (NestJS), `packages/types`, `packages/config`
- [ ] Configure shared ESLint (Airbnb-TS), Prettier, `tsconfig` base
- [ ] Set up Docker Compose (PostgreSQL + Redis)
- [ ] Initialize Prisma schema with `User`, `RefreshToken`, `FocusItem`, `Board`, `List`, `Card` models
- [ ] GitHub Actions CI pipeline: lint → typecheck → test
- [ ] Configure Husky + lint-staged (pre-commit: lint + typecheck)

**Exit criteria:** `pnpm turbo run build lint typecheck test` passes on a clean clone.

---

### Phase 1: Auth + Zen Core (MVP)

- [ ] Auth module: register, login, logout, refresh token rotation
- [ ] JWT guard applied globally; public decorator for unauthenticated routes
- [ ] Daily Image: Unsplash API integration with server-side caching (avoid per-user rate limits)
- [ ] Clock & Greeting: typography-first, timezone-aware, SSR-rendered
- [ ] FocusItem CRUD: create today's focus, mark complete, persist per user per day
- [ ] Protected Next.js routes with session (next-auth or custom JWT cookie strategy)

**Exit criteria:** A user can register, log in, set a daily focus item, and see it persist on page refresh. Auth tokens rotate correctly. Unsplash image loads from cache on repeat visits.

---

### Phase 2: Kanban Engine

- [ ] Board, List, Card CRUD (NestJS REST endpoints)
- [ ] Drag-and-drop UI with `@hello-pangea/dnd`; optimistic updates on client
- [ ] Position reordering: store fractional index or integer rank; recalculate on conflicts
- [ ] Real-time card sync via Socket.io: broadcast card moves/edits to other tabs/clients in the same board room
- [ ] Conflict resolution strategy: last-write-wins with server timestamp (document this decision)
- [ ] Playwright E2E: create board → add card → drag card → verify persistence

**Exit criteria:** Two browser tabs open on the same board show card moves in real-time. Drag-and-drop order persists on hard refresh.

---

### Phase 3: Ecosystem

- [ ] PWA manifest + service worker (Workbox): offline read access to today's focus and current boards
- [ ] Chrome Extension (Manifest V3): replaces New Tab, authenticates against the same NestJS API via stored refresh token
- [ ] Analytics module: focus completion rate per day, streak tracking, board velocity (cards completed per week)
- [ ] OpenAPI spec auto-generated from NestJS decorators; used to validate extension API calls match contract

**Exit criteria:** Extension installs, authenticates, and shows today's focus without opening the web app.

---

## Engineering Standards

### Code Quality

- **No `any`.** ESLint rule `@typescript-eslint/no-explicit-any` set to `error`.
- **No unhandled promises.** `@typescript-eslint/no-floating-promises` set to `error`.
- SOLID principles in NestJS services: one responsibility per service, dependencies injected not instantiated.
- All NestJS controllers are thin — business logic lives in services, not controllers.

### Testing

- **Unit tests (Jest):** business logic in NestJS services, utility functions in `packages/types`
- **Integration tests (Jest + Supertest):** NestJS controllers against a real test database (no mocks at the DB layer)
- **E2E tests (Playwright):** full critical paths in a running environment
- Coverage target: ≥ 80% on backend service files; no coverage requirement on Next.js page components

### Security

- Input validation on every DTO via `class-validator` — reject at the controller, not in the service
- Rate limiting on auth endpoints (NestJS Throttler module)
- Refresh tokens stored as bcrypt hashes in Redis, never plaintext
- CORS configured explicitly — no wildcard `*` in production
- Helmet middleware enabled on NestJS app
- Unsplash API key server-side only — never exposed to the client

### Observability

- Structured JSON logging via Pino (NestJS logger override)
- Request ID propagated via `X-Request-ID` header through the full stack
- Error boundaries in Next.js with Sentry integration (frontend + backend)

### Git Workflow

- Trunk-based development: short-lived feature branches, merge to `main` via PR
- PR requires: CI green + 1 approval
- Conventional Commits format enforced via commitlint

---

## Open Decisions (ADR Candidates)

| Decision              | Options                                                       | Status           |
| --------------------- | ------------------------------------------------------------- | ---------------- |
| Card position storage | Fractional indexing vs. integer rank + rebalance              | Undecided        |
| Next.js auth strategy | next-auth v5 vs. custom JWT cookie                            | Undecided        |
| WebSocket auth        | Token in handshake query vs. cookie                           | Undecided        |
| Analytics storage     | PostgreSQL aggregates vs. dedicated time-series (TimescaleDB) | Defer to Phase 3 |

> Each decision should be resolved before the phase that depends on it begins, and documented as an ADR in `docs/decisions/`.
