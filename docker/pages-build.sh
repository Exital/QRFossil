#!/bin/sh
set -eu
cd /app
npm ci
npm run build:pages
echo "Wrote index.html and app-assets/ on the mounted repo."
