#!/usr/bin/env node
/** Copy Vite build output into repo root for GitHub Pages (root deploy). */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");

if (!existsSync(join(dist, "index.html"))) {
  console.error("Run npm run build first — dist/index.html is missing.");
  process.exit(1);
}

cpSync(join(dist, "index.html"), join(root, "index.html"));

const assetsSrc = join(dist, "app-assets");
const assetsDest = join(root, "app-assets");
if (existsSync(assetsDest)) {
  rmSync(assetsDest, { recursive: true, force: true });
}
if (existsSync(assetsSrc)) {
  cpSync(assetsSrc, assetsDest, { recursive: true });
}

console.log("Synced dist → root (index.html + app-assets/)");
