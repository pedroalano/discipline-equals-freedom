#!/usr/bin/env bash
# Daily Postgres dump. Keeps last 7. Cron entry suggested in deploy/README.md.
#
# Usage:
#   /opt/zenfocus/deploy/backup.sh
#
# Restore (to a fresh container):
#   gunzip -c /opt/zenfocus/backups/<date>.sql.gz | \
#     docker compose -f docker-compose.prod.yml exec -T postgres \
#       psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/zenfocus}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/docker-compose.prod.yml}"

mkdir -p "$BACKUP_DIR"

# shellcheck disable=SC1091
source "$REPO_DIR/.env"

STAMP="$(date +%F_%H%M%S)"
OUTFILE="$BACKUP_DIR/${STAMP}.sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    | gzip -9 > "$OUTFILE"

echo "wrote $OUTFILE"

find "$BACKUP_DIR" -maxdepth 1 -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
