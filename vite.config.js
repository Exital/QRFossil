import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

function repoFileMiddleware(prefix, dir) {
  return (req, res, next) => {
    const url = req.url?.split("?")[0] || "";
    if (!url.startsWith(prefix)) return next();
    const rel = url.slice(prefix.length).replace(/^\/+/, "");
    if (!rel || rel.includes("..")) return next();
    const file = resolve(dir, rel);
    if (!existsSync(file)) return next();
    if (prefix === "/data/") res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(readFileSync(file));
  };
}

function previewProxy() {
  const target = "http://127.0.0.1:8765";
  return async (req, res, next) => {
    if (!req.url?.startsWith("/__dev")) return next();
    try {
      const headers = { ...req.headers, host: "127.0.0.1:8765" };
      delete headers["accept-encoding"];
      const init = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        init.body = Buffer.concat(chunks);
      }
      const response = await fetch(`${target}${req.url}`, init);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key !== "transfer-encoding") res.setHeader(key, value);
      });
      const body = Buffer.from(await response.arrayBuffer());
      res.end(body);
    } catch {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ message: "Run python3 scripts/preview.py for local saves." }));
    }
  };
}

export default defineConfig({
  root: "src",
  publicDir: resolve(rootDir, "public"),
  base: "./",
  server: {
    fs: { allow: [rootDir] },
  },
  build: {
    outDir: resolve(rootDir, "dist"),
    assetsDir: "app-assets",
    emptyOutDir: true,
  },
  plugins: [
    react(),
    {
      name: "qrfossil-dev-static",
      configureServer(server) {
        server.middlewares.use(repoFileMiddleware("/data/", resolve(rootDir, "data")));
        server.middlewares.use(repoFileMiddleware("/assets/logos/", resolve(rootDir, "assets/logos")));
        server.middlewares.use(previewProxy());
      },
    },
  ],
});
