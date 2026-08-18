#!/usr/bin/env python3
"""Local GitHub Pages-like preview for QRFossil.

Serves the repo root as a static site and, like GitHub Pages, falls back to
404.html for unknown paths so /r/<slug> redirects work without a deploy.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NO_CACHE = "no-store, max-age=0"


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))

    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0].lower()
        if path.endswith((".html", ".js", ".css", ".json", ".svg")) or path == "/" or "/r/" in path:
            self.send_header("Cache-Control", NO_CACHE)
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def send_head(self):
        fallback = ROOT / "404.html"
        translated = Path(self.translate_path(self.path.split("?", 1)[0]))
        if translated.is_file() or translated.is_dir():
            return super().send_head()
        if not fallback.is_file():
            return super().send_head()
        try:
            file = fallback.open("rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(fallback.stat().st_size))
        self.send_header("Cache-Control", NO_CACHE)
        self.end_headers()
        return file


def main() -> int:
    parser = argparse.ArgumentParser(description="Preview QRFossil locally (GitHub Pages 404 fallback).")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    os.chdir(ROOT)
    handler = functools.partial(PreviewHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer((args.host, args.port), handler) as httpd:
            url = f"http://{args.host}:{args.port}/"
            print(f"QRFossil preview: {url}")
            print(f"Redirect check:   {url}r/example")
            print("Reload the browser after saving files. Ctrl+C to stop.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    except OSError as err:
        print(f"Could not bind {args.host}:{args.port}: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
