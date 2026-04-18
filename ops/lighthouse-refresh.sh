#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/icloush/app}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

cd "$APP_DIR"

echo "[deploy] current dir: $APP_DIR"
echo "[deploy] pulling branch: $BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] rebuilding containers with $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" up -d --build

echo "[deploy] done"
docker compose -f "$COMPOSE_FILE" ps
