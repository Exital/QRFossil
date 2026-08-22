#!/bin/sh
# Build the GitHub Pages dashboard in Docker. Writes index.html + app-assets/ here.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  docker compose run --rm pages
elif command -v docker >/dev/null 2>&1; then
  docker build -t qrfossil-pages "$ROOT"
  docker run --rm \
    -v "$ROOT:/app" \
    -v qrfossil-node-modules:/app/node_modules \
    qrfossil-pages
else
  echo "Docker is required to build without a local Node install." >&2
  exit 1
fi
