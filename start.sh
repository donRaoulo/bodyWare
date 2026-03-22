#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git ist nicht installiert."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker ist nicht installiert."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Weder 'docker compose' noch 'docker-compose' gefunden."
  exit 1
fi

echo "==> Pull latest changes"
git pull --ff-only

echo "==> Rebuild and restart frontend container"
"${COMPOSE_CMD[@]}" up -d --build --no-deps web

echo "==> Frontend container status"
"${COMPOSE_CMD[@]}" ps web

echo "Fertig."
