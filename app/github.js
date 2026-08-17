import {
  TOKEN_KEY,
  decodeUtf8Base64,
  encodeBytesBase64,
  encodeUtf8Base64,
  inferRepo,
  looksLikeSecret,
} from "./utils.js";

const API = "https://api.github.com";
const ACCEPT = "application/vnd.github+json";
const API_VERSION = "2022-11-28";

export class GitConflictError extends Error {
  constructor(message) {
    super(message || "Repository changed — reloaded. Please retry.");
    this.name = "GitConflictError";
  }
}

export class GitAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "GitAuthError";
  }
}

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, String(token || "").trim());
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function resolveRepo(config) {
  const inferred = inferRepo();
  const stored = (config && config.site && config.site.github) || {};
  return {
    owner: stored.owner || inferred.owner,
    repo: stored.repo || inferred.repo,
  };
}

function encodePath(path) {
  return String(path)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

async function api(path, { method = "GET", body, token } = {}) {
  const auth = token || getToken();
  if (!auth) throw new GitAuthError("GitHub access required.");
  const headers = {
    Accept: ACCEPT,
    "X-GitHub-Api-Version": API_VERSION,
    Authorization: `Bearer ${auth}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  return { response, data };
}

export async function validateToken(token, owner, repo) {
  const trimmed = String(token || "").trim();
  if (!trimmed) throw new GitAuthError("Enter a GitHub token.");
  if (!owner || !repo) throw new GitAuthError("Repository could not be detected.");

  const { response, data } = await api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    token: trimmed,
  });

  if (response.status === 401) {
    throw new GitAuthError("This token was rejected. Check that it was copied correctly and has not expired.");
  }
  if (response.status === 404) {
    throw new GitAuthError(`This token cannot see ${owner}/${repo}. Grant access to this repository only.`);
  }
  if (!response.ok) {
    throw new GitAuthError(data && data.message ? data.message : "Could not validate this token.");
  }

  const fullName = String(data.full_name || "").toLowerCase();
  const expected = `${owner}/${repo}`.toLowerCase();
  if (fullName && fullName !== expected) {
    throw new GitAuthError(`This token opened ${data.full_name}, not ${owner}/${repo}.`);
  }

  const perms = data.permissions;
  const canPush = !perms || perms.push || perms.admin || perms.maintain;
  if (!canPush) {
    throw new GitAuthError(
      "This token can read the repository but cannot modify it. Required: Contents → Read and write."
    );
  }

  const file = await api(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath("data/qrfossil.json")}`,
    { token: trimmed }
  );
  if (file.response.status === 404) {
    throw new GitAuthError("Connected, but data/qrfossil.json was not found in this repository.");
  }
  if (!file.response.ok && file.response.status !== 403) {
    throw new GitAuthError("This token could not read the QRFossil configuration file.");
  }

  return {
    owner: data.owner && data.owner.login ? data.owner.login : owner,
    repo: data.name || repo,
    fullName: data.full_name,
  };
}

export async function getFile(owner, repo, path) {
  const { response, data } = await api(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`
  );
  if (response.status === 404) return null;
  if (response.status === 409 || response.status === 422) {
    throw new GitConflictError();
  }
  if (!response.ok) {
    throw new Error((data && data.message) || `Could not read ${path}.`);
  }
  const text = data.encoding === "base64" ? decodeUtf8Base64(data.content) : "";
  return { sha: data.sha, text, path: data.path, size: data.size };
}

export async function putFile(owner, repo, { path, text, bytes, sha, message }) {
  const content = bytes ? encodeBytesBase64(bytes) : encodeUtf8Base64(text);
  const payload = text || "";
  const token = getToken();
  if (token && payload.includes(token)) {
    throw new Error("Refusing to write: the file would contain the access token.");
  }
  if (looksLikeSecret(payload)) {
    throw new Error("Refusing to write: the file looks like it contains a GitHub token.");
  }

  const body = { message, content };
  if (sha) body.sha = sha;

  const { response, data } = await api(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`,
    { method: "PUT", body }
  );

  if (response.status === 409 || (response.status === 422 && /sha/i.test(String(data && data.message)))) {
    throw new GitConflictError();
  }
  if (response.status === 401 || response.status === 403) {
    throw new GitAuthError(
      "This token can read the repository but cannot modify it. Required: Contents → Read and write."
    );
  }
  if (!response.ok) {
    throw new Error((data && data.message) || `Could not write ${path}.`);
  }
  return data;
}

export async function deleteFile(owner, repo, { path, sha, message }) {
  if (!sha) return null;
  const { response, data } = await api(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`,
    { method: "DELETE", body: { message, sha } }
  );
  if (response.status === 404) return null;
  if (response.status === 409) throw new GitConflictError();
  if (!response.ok) {
    throw new Error((data && data.message) || `Could not delete ${path}.`);
  }
  return data;
}
