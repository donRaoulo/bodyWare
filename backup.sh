#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
CONTAINER="bodyware-postgres"
DB_USER="bodyware"
DB_NAME="bodyware"

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/bodyware-$TS.sql"

# create dump
if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$OUT"; then
  rm -f "$OUT"
  exit 1
fi

# keep only newest 20 backups
cd "$BACKUP_DIR"
ls -1tr bodyware-*.sql 2>/dev/null | head -n -20 | xargs -r rm --
