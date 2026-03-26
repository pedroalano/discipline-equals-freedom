# ADR 004: Analytics Storage Strategy

**Date:** 2026-03-26
**Status:** Proposed

## Context

Phase 3 will introduce an analytics module covering:

- Focus completion rate per day (how many focus items were marked complete)
- Streak tracking (consecutive days with at least one completed focus item)
- Board velocity metrics (cards completed per week per board)

These workloads involve time-ordered event data queried by time range, aggregated at day/week granularity. Two storage strategies are under consideration:

1. **PostgreSQL aggregates** — store raw event rows in the existing PostgreSQL database, compute aggregates at query time or via materialized views
2. **TimescaleDB** — a PostgreSQL extension that adds hypertables (automatic time-based partitioning) and continuous aggregates, purpose-built for time-series workloads

## Options

### Option A: PostgreSQL aggregates

Store analytics events in regular PostgreSQL tables (e.g., `focus_completions`, `card_events`) indexed on `(user_id, created_at)`. Compute metrics using SQL window functions or materialized views refreshed on a schedule.

**Pros:**

- No new infrastructure — reuses the existing PostgreSQL container
- Standard SQL; no extension-specific syntax to learn
- Simpler deployment and backup strategy
- Sufficient for Phase 3 data volumes (single-user or small-team scale)

**Cons:**

- Manual partitioning or index tuning required if data grows large
- Materialized view refresh logic must be managed explicitly
- Range queries over large time windows may degrade without careful indexing

### Option B: TimescaleDB

Replace or extend the existing PostgreSQL instance with TimescaleDB. Create hypertables for event streams; use continuous aggregates for pre-computed daily/weekly rollups.

**Pros:**

- Automatic time-based partitioning (chunks) with no manual index management
- Continuous aggregates refresh incrementally — no full recompute
- Compression and retention policies built in
- Horizontally scales well for multi-user or high-frequency event ingestion

**Cons:**

- Additional infrastructure complexity: TimescaleDB Docker image, version alignment with Prisma
- Continuous aggregates are not supported by Prisma — raw SQL required for aggregate queries
- Overkill for Phase 3 scope; adds operational overhead before scale justifies it
- Team must learn TimescaleDB-specific concepts (hypertables, chunks, compression policies)

## Decision

**Deferred.** No decision has been made. This ADR documents the trade-offs to be resolved before Phase 3 begins.

Given Phase 3 scope (single-user productivity app, not high-frequency telemetry), the strong prior is Option A (PostgreSQL aggregates) — the infrastructure savings and Prisma compatibility outweigh TimescaleDB's scaling advantages at this stage. TimescaleDB should only be chosen if the analytics requirements expand significantly (e.g., per-second event ingestion, retention policies, or sub-second aggregate queries over years of data).

## Consequences

- Resolve this decision before beginning the Phase 3 analytics module.
- If Option A is chosen: add `focus_completions` and `card_events` tables to the Prisma schema; implement materialized view refresh as a scheduled NestJS task or database trigger.
- If Option B is chosen: update the Docker Compose `db` service to use the `timescale/timescaledb` image; document all raw SQL queries that bypass Prisma.
