export const APP_VERSION = "0.1.0";
export const TOKEN_KEY = "qrfossil.github.token";
export const CONFIG_PATH = "data/qrfossil.json";
export const REDIRECTS_PATH = "data/redirects.json";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isLocalDev() {
  const host = location.hostname;
  return host === "127.0.0.1" || host === "localhost";
}

export function getPublicBase() {
  const { origin, hostname, pathname } = location;
  const parts = pathname.replace(/\/index\.html$/i, "").split("/").filter(Boolean);
  if (hostname.endsWith(".github.io")) {
    if (!parts.length || parts[0] === "r") return origin;
    return `${origin}/${parts[0]}`;
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  return origin;
}

export function inferRepo() {
  const host = location.hostname;
  if (host.endsWith(".github.io")) {
    const owner = host.slice(0, -".github.io".length);
    const parts = location.pathname.replace(/\/index\.html$/i, "").split("/").filter(Boolean);
    const repo = parts[0] && parts[0] !== "r" ? parts[0] : `${owner}.github.io`;
    return { owner, repo };
  }
  return { owner: "", repo: "" };
}

export function inferBaseUrl() {
  return getPublicBase();
}

export function permanentUrl(baseUrl, slug) {
  const root = String(baseUrl || getPublicBase()).replace(/\/+$/, "");
  return `${root}/r/${slug}`;
}

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isValidSlug(slug) {
  return typeof slug === "string" && slug.length >= 1 && slug.length <= 64 && SLUG_RE.test(slug);
}

export function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function shortId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function extensionForFile(file) {
  const name = (file.name || "").toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/);
  if (match && ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(match[1])) {
    return match[1] === "jpeg" ? "jpg" : match[1];
  }
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return map[file.type] || "png";
}

export function encodeUtf8Base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function decodeUtf8Base64(b64) {
  const binary = atob(String(b64 || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBytesBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function setText(el, value) {
  if (el) el.textContent = value == null ? "" : String(value);
}

export function show(el, visible) {
  if (!el) return;
  el.hidden = !visible;
}

export async function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

export function defaultQr() {
  return {
    foreground: "#1c1a16",
    background: "#e7e4dc",
    errorCorrection: "H",
    dots: "rounded",
    corners: "rounded",
    logo: "",
    logoSize: 0.2,
    size: 280,
    margin: 8,
  };
}

export function emptyLink(name = "", slug = "") {
  return {
    name,
    enabled: true,
    destination: "",
    createdAt: nowIso(),
    qr: defaultQr(),
    _slug: slug,
  };
}

export function looksLikeSecret(value) {
  return /(?:github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{20,}/.test(String(value || ""));
}

export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) return path;
  const base = getPublicBase().replace(/\/+$/, "");
  return `${base}/${String(path).replace(/^\/+/, "")}`;
}
