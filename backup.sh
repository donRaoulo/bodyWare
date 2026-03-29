#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
CONTAINER="bodyware-postgres"
DB_USER="bodyware"
DB_NAME="bodyware"
REMOTE="${BACKUP_REMOTE:-gdrive:bodyware-backups}"
KEEP_LOCAL="${BACKUP_KEEP_LOCAL:-20}"
KEEP_REMOTE="${BACKUP_KEEP_REMOTE:-20}"

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/bodyware-$TS.sql"

# create dump
if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$OUT"; then
  rm -f "$OUT"
  exit 1
fi

# upload to Google Drive via rclone
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone ist nicht installiert. Installiere rclone und richte das Remote '$REMOTE' ein." >&2
  exit 1
fi

if ! rclone lsf "$REMOTE" >/dev/null 2>&1; then
  echo "Das rclone-Remote '$REMOTE' ist nicht erreichbar. Fuehre einmal 'rclone config' aus." >&2
  exit 1
fi

rclone copyto "$OUT" "$REMOTE/$(basename "$OUT")"

# keep only newest remote backups
mapfile -t REMOTE_FILES < <(rclone lsf "$REMOTE" --files-only | grep '^bodyware-.*\.sql$' | sort || true)
REMOTE_COUNT="${#REMOTE_FILES[@]}"
if [ "$REMOTE_COUNT" -gt "$KEEP_REMOTE" ]; then
  DELETE_COUNT=$((REMOTE_COUNT - KEEP_REMOTE))
  for ((i=0; i<DELETE_COUNT; i++)); do
    rclone deletefile "$REMOTE/${REMOTE_FILES[$i]}"
  done
fi

# keep only newest local backups
cd "$BACKUP_DIR"
ls -1tr bodyware-*.sql 2>/dev/null | head -n -"${KEEP_LOCAL}" | xargs -r rm --
