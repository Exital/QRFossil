# QRFossil

Dynamic QR codes without a backend, database, or subscription.

Fork QRFossil, enable GitHub Pages, and manage editable QR codes directly from your own GitHub-hosted dashboard.

Your GitHub repository stores the configuration.

GitHub Pages hosts the dashboard and redirects.

GitHub handles version history and permissions.

Your QR codes never depend on QRFossil’s infrastructure—because QRFossil doesn’t have any.

**QR codes built to outlive their creator.**

## Get your own QRFossil in 2 minutes

1. Fork this repository
2. Repository Settings → Pages → Deploy from the `main` branch, folder `/` (root)
3. Open `https://YOUR_USERNAME.github.io/QRFossil`
4. Create your first QR

Done.

No Node, Docker, database, or server is required for **using** a fork on GitHub Pages. Changing the dashboard UI does need a build (Docker, below). If the dashboard does not load, wait a minute for Pages to finish deploying, then confirm Pages is enabled on `main`.

## How it works

| Role | Provided by |
| --- | --- |
| Dashboard | GitHub Pages (`index.html`) |
| Redirects | GitHub Pages (`/r/your-slug` via `404.html`) |
| Database | `data/qrfossil.json` and `data/redirects.json` |
| Assets | `assets/logos/` |
| Writes | GitHub REST API |
| Auth | Fine-grained personal access token |
| Token storage | `sessionStorage` for this browser tab only |
| History | Git |

QR visitors load a tiny redirect runtime. They never download the dashboard, QR editor, or GitHub integration.

A printed QR encodes your permanent address, for example:

`https://YOUR_USERNAME.github.io/QRFossil/r/menu`

Change the destination in the dashboard later. The printed code stays the same.

## Write access

Viewing the dashboard and downloading QR images does not need a token.

The first time you save, QRFossil asks for a fine-grained GitHub token:

- Repository: only your QRFossil fork
- Permission: **Contents → Read and write**
- Nothing more

The token stays in `sessionStorage` until the tab session ends. Use **Forget Token** to drop it immediately. It is never written to the repository, to `localStorage`, or into QR data.

## Redirect URLs

Preferred public form:

`https://YOUR_USERNAME.github.io/QRFossil/r/menu`

Fallback, useful if a scanner or host mishandles the clean path:

`https://YOUR_USERNAME.github.io/QRFossil/r/?id=menu`

Disabled links show a disabled message instead of redirecting. Unknown slugs show “QR not found.”

## Custom domains

Point a domain you control (for example `qr.example.com`) at GitHub Pages and add a `CNAME` file in this repository. Printed codes should use the domain you own, so they can outlive GitHub Pages itself if you later move the site.

Destination URLs are not secret. Anyone who opens a QR can observe where it goes.

## Analytics

Fresh forks start with analytics off. GitHub Pages cannot keep exact scan counts by itself. Optional providers can be added later without changing the static core.

## Build the dashboard (Docker)

The React dashboard is compiled to static files GitHub Pages can serve: `index.html` and `app-assets/`. `dist/` is only a temporary folder and is gitignored. You do not need Node on the host.

From the repo root:

```bash
docker compose run --rm pages
```

Or:

```bash
./scripts/build-docker.sh
```

The container bind-mounts this repository at `/app` and writes the build back onto the host. `node_modules` stays in a Docker volume (`qrfossil-node-modules`), not in your working tree.

After a successful build, commit the generated files and push `main`:

- `index.html`
- `app-assets/`

Pages publishes the **repo root**, not `dist/`.

Equivalent `docker run` (after `docker build -t qrfossil-pages .`):

```bash
docker run --rm \
  -v "$PWD:/app" \
  -v qrfossil-node-modules:/app/node_modules \
  qrfossil-pages
```

Without Docker, `npm ci && npm run build:pages` does the same thing if you have Node 20+ locally.

## Local preview

Fork users do not need this. For changing QRFossil itself, do not push-and-wait on Pages.

Build the dashboard (Docker, above), then use the Python preview server (which mimics GitHub Pages redirects and local file writes):

```bash
docker compose run --rm pages
python3 scripts/preview.py
```

Then open `http://127.0.0.1:8765/`. That server mimics GitHub Pages: unknown paths such as `/r/example` are served with `404.html`, so redirects work locally.

For UI development with hot reload:

```bash
npm run dev
```

Vite serves the dashboard on `http://127.0.0.1:5173/`. Saving to `data/` still requires `python3 scripts/preview.py` on port 8765 and using the built dashboard (`npm run build:pages`) — the dev server does not include the local writer API.

Create, edit, and save from the dashboard. On localhost the preview server writes `data/` and `assets/logos/` on disk. Nothing is committed, and no GitHub token is required. Git stays a separate `git diff` / `git commit` when you want to publish.

Do not bind the preview server to a public address. The writer only accepts loopback clients (`127.0.0.1` / `localhost`). GitHub Pages never runs this Python process, so a public Pages site cannot use the local writer.

```bash
python3 scripts/preview.py --port 9000
```

## Updating QRFossil

Application source lives under `src/`. Built assets land in `app-assets/` at the repo root after the Docker (or npm) build. Your state lives in `data/` and `assets/logos/`. When you pull upstream changes, keep those two directories yours.

## License

MIT. `qr-code-styling` is used via npm (MIT).
