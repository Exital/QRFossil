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

No Node, Docker, database, or server is required for **using** a fork on GitHub Pages. If the dashboard does not load, wait a minute for Pages to finish deploying, then confirm Pages is enabled on `main`.

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

## License

MIT. `qr-code-styling` is used via npm (MIT).
