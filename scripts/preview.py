#!/usr/bin/env python3
"""Local GitHub Pages-like preview for QRFossil.

Serves the repo root as a static site and, like GitHub Pages, falls back to
404.html for unknown paths so /r/<slug> redirects work without a deploy.

On loopback only, also accepts /__dev/* writes so the dashboard can save
without a GitHub commit. That API is not present on GitHub Pages.
"""

from __future__ import annotations

import argparse
import base64
import functools
import hashlib
import json
import os
import posixpath
import re
import socketserver
import sys
from http.server import SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
NO_CACHE = "no-store, max-age=0"
MAX_BYTES = 1_000_000
ALLOWED_FILES = frozenset({"data/qrfossil.json", "data/redirects.json"})
LOGO_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$")
LOOPBACK = {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


def file_sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_relpath(rel: str) -> Path | None:
    rel = str(rel or "").replace("\\", "/").lstrip("/")
    if not rel or rel.startswith("/") or ".." in rel.split("/"):
        return None
    rel = posixpath.normpath(rel)
    if rel.startswith("../") or rel == "..":
        return None
    if rel in ALLOWED_FILES:
        dest = (ROOT / rel).resolve()
    elif rel.startswith("assets/logos/") and rel.count("/") == 2:
        name = rel.rsplit("/", 1)[-1]
        if not LOGO_NAME.fullmatch(name):
            return None
        dest = (ROOT / rel).resolve()
    else:
        return None
    try:
        dest.relative_to(ROOT.resolve())
    except ValueError:
        return None
    return dest


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))

    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0].lower()
        if path.endswith((".html", ".js", ".css", ".json", ".svg")) or path == "/" or "/r/" in path or path.startswith("/__dev/"):
            self.send_header("Cache-Control", NO_CACHE)
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def send_head(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/__dev/"):
            self.send_error(404, "File not found")
            return None
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

    def _loopback_client(self) -> bool:
        host = self.client_address[0]
        return host in LOOPBACK

    def _loopback_host(self) -> bool:
        raw = (self.headers.get("Host") or "").split("@")[-1]
        hostname = raw.rsplit(":", 1)[0].strip("[]").lower()
        return hostname in {"127.0.0.1", "localhost"}

    def _allow_dev(self) -> bool:
        return self._loopback_client() and self._loopback_host()

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", NO_CACHE)
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict | None:
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            self._send_json(415, {"message": "Content-Type must be application/json."})
            return None
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0 or length > MAX_BYTES * 2:
            self._send_json(400, {"message": "Invalid body."})
            return None
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"message": "Invalid JSON."})
            return None
        if not isinstance(data, dict):
            self._send_json(400, {"message": "Invalid JSON."})
            return None
        return data

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/__dev/status":
            if not self._allow_dev():
                self._send_json(403, {"ok": False, "message": "Local writer is loopback-only."})
                return
            self._send_json(200, {"ok": True, "mode": "local"})
            return
        if parsed.path == "/__dev/file":
            if not self._allow_dev():
                self._send_json(403, {"message": "Local writer is loopback-only."})
                return
            rel = (parse_qs(parsed.query).get("path") or [""])[0]
            dest = safe_relpath(rel)
            if dest is None:
                self._send_json(400, {"message": "Path is not writable in local preview."})
                return
            if not dest.is_file():
                self._send_json(404, {"message": "Not found."})
                return
            data = dest.read_bytes()
            self._send_json(
                200,
                {
                    "path": rel.replace("\\", "/").lstrip("/"),
                    "sha": file_sha(data),
                    "size": len(data),
                    "encoding": "base64",
                    "content": base64.b64encode(data).decode("ascii"),
                },
            )
            return
        super().do_GET()

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/__dev/file":
            self.send_error(404, "File not found")
            return
        if not self._allow_dev():
            self._send_json(403, {"message": "Local writer is loopback-only."})
            return
        if (self.headers.get("X-QRFossil-Local") or "") != "1":
            self._send_json(403, {"message": "Missing local preview header."})
            return
        body = self._read_json_body()
        if body is None:
            return
        dest = safe_relpath(str(body.get("path") or ""))
        if dest is None:
            self._send_json(400, {"message": "Path is not writable in local preview."})
            return
        try:
            data = base64.b64decode(str(body.get("content") or ""))
        except Exception:
            self._send_json(400, {"message": "Invalid base64 content."})
            return
        if len(data) > MAX_BYTES:
            self._send_json(413, {"message": "File too large."})
            return
        expected = body.get("sha")
        if dest.is_file():
            current = file_sha(dest.read_bytes())
            if expected and expected != current:
                self._send_json(409, {"message": "Repository changed — reloaded. Please retry."})
                return
        elif expected:
            self._send_json(409, {"message": "Repository changed — reloaded. Please retry."})
            return
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        self._send_json(200, {"path": dest.relative_to(ROOT).as_posix(), "sha": file_sha(data)})

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != "/__dev/file":
            self.send_error(404, "File not found")
            return
        if not self._allow_dev():
            self._send_json(403, {"message": "Local writer is loopback-only."})
            return
        if (self.headers.get("X-QRFossil-Local") or "") != "1":
            self._send_json(403, {"message": "Missing local preview header."})
            return
        body = self._read_json_body()
        if body is None:
            return
        rel = str(body.get("path") or "")
        dest = safe_relpath(rel)
        if dest is None or not rel.startswith("assets/logos/"):
            self._send_json(400, {"message": "Path is not deletable in local preview."})
            return
        if not dest.is_file():
            self._send_json(404, {"message": "Not found."})
            return
        expected = body.get("sha")
        current = file_sha(dest.read_bytes())
        if expected and expected != current:
            self._send_json(409, {"message": "Repository changed — reloaded. Please retry."})
            return
        dest.unlink()
        self._send_json(200, {"ok": True})


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
            if args.host not in {"127.0.0.1", "localhost"}:
                print("Warning: bind to 127.0.0.1. The local writer refuses non-loopback clients.", file=sys.stderr)
            else:
                print("Local saves write data/ and assets/logos/ on disk. Nothing is committed.")
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
