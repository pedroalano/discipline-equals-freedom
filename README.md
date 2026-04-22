# ZenFocus

A full-stack productivity dashboard combining a minimalist daily focus surface with a Kanban board engine. Built for individual contributors who want a single tool that handles daily intention _and_ ongoing project work — without context-switching between apps.

## Stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | Next.js 14 (App Router), Tailwind CSS, Framer Motion, Zustand, React Query |
| Backend   | NestJS, Prisma, PostgreSQL, Redis                                          |
| Real-time | Socket.io (board card sync only)                                           |
| Auth      | JWT access tokens (15m) + Redis-backed refresh token rotation (7d)         |
| Monorepo  | pnpm workspaces + Turborepo                                                |
| Infra     | Docker Compose (all services containerized)                                |

## Getting started

All app processes run inside Docker. The only host-side requirement is Docker and (optionally) pnpm for IDE intellisense.

```bash
# 1. Install dependencies — generates pnpm-lock.yaml; commit this file
pnpm install

# 2. Copy and fill in secrets
cp .env.example .env
# Edit .env: generate JWT_SECRET and JWT_REFRESH_SECRET with:
# openssl rand -hex 64

# 3. Start all services (builds images on first run)
docker compose up --build

# 4. Run the initial database migration
docker compose exec api pnpm prisma migrate dev --name init
```

Once up:

- **http://localhost:3000** — Next.js frontend
- **http://localhost:3001/health** — NestJS API health check

## Project structure

```
apps/
  web/          Next.js 14+ frontend (App Router)
  api/          NestJS backend
packages/
  types/        Shared DTOs, Zod schemas, enums — source of truth for the network contract
  config/       Shared ESLint, TypeScript, Prettier configs
docs/
  decisions/    Architecture Decision Records (ADRs)
```

All request/response shapes are defined once in `packages/types` and imported by both apps. Type duplication across the network boundary is not allowed.

## Common commands

```bash
# Subsequent starts (no rebuild needed)
docker compose up

# Prisma
docker compose exec api pnpm prisma migrate dev     # new migration
docker compose exec api pnpm prisma generate        # regenerate client
docker compose exec api pnpm prisma studio          # open Studio

# Tests
docker compose exec api pnpm jest path/to/file.spec.ts

# Rebuild a service after Dockerfile or dependency changes
docker compose build api
docker compose build web

# Lint + typecheck on host (for CI parity)
pnpm turbo run lint typecheck
```

## Architecture highlights

- **Auth:** Stateless JWT access tokens. Refresh tokens stored as bcrypt hashes in Redis — never plaintext. Enables revocation without stateful sessions.
- **Real-time:** Socket.io scoped to board card sync only. Conflict resolution is last-write-wins by server timestamp.
- **Type safety:** `packages/types` is the single source of truth for all network shapes. Both apps import from it; neither defines its own copy.
- **Pomodoro timer:** Fully client-side — Zustand store with `persist` middleware (localStorage). Tracks work/break sessions, daily count, ambient sounds, and configurable durations with no backend dependency.
- **Habits:** CRUD with daily or custom-weekday frequency. Active habits auto-generate FocusItems each day. Streak tracking with badges.
- **Profile:** Display name update, password change, account deletion with cascade.
- **Auth hardening:** Email verification (Resend API), password reset flow, account lockout (5 failed attempts / 15min).
- **Testing:** Unit tests (Jest) on service logic, integration tests (Jest + Supertest) against a real test database, E2E (Playwright) on critical paths.

## Development roadmap

| Phase | Focus                                                                                  | Status   |
| ----- | -------------------------------------------------------------------------------------- | -------- |
| 0     | Monorepo scaffold, Docker environment, Prisma schema, CI                               | Complete |
| 1     | Auth, daily focus items, Unsplash background, protected routes                         | Complete |
| 2     | Kanban board, drag-and-drop, real-time card sync                                       | Complete |
| 2+    | Pomodoro timer, ambient sound engine, session notifications, keyboard shortcuts        | Complete |
| 2++   | Habits with streaks, user profile, email verification, password reset, account lockout | Complete |
| 3     | PWA, Chrome Extension, analytics                                                       | Planned  |
