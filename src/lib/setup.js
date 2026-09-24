import { getPublicBase, inferBaseUrl, inferRepo, isLocalDev, setText, show } from "./utils.js";

function isUnsetBaseUrl(baseUrl) {
  const value = String(baseUrl || "").trim();
  if (!value) return true;
  // Localhost in committed config must not count as “configured” on a real Pages fork.
  if (!isLocalDev() && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(value)) {
    return true;
  }
  return false;
}

/** True when the live page URL is enough to know site URL + GitHub owner/repo. */
export function canInferSite() {
  if (isLocalDev()) return true;
  const { owner, repo } = inferRepo();
  return Boolean(owner && repo);
}

export function needsSetup(config) {
  if (config?.site && !isUnsetBaseUrl(config.site.baseUrl)) return false;
  // Standard github.io forks (and local preview) need no manual setup.
  return !canInferSite();
}

export function inferredSetup(config) {
  const repo = inferRepo();
  const stored = (config && config.site && config.site.github) || {};
  const owner = String(stored.owner || "").trim() || repo.owner;
  const name = String(stored.repo || "").trim() || repo.repo;
  const storedBase = String((config && config.site && config.site.baseUrl) || "").trim();
  return {
    owner,
    repo: name,
    // Prefill from the live page; never keep a stale localhost URL on Pages.
    baseUrl: isUnsetBaseUrl(storedBase) ? inferBaseUrl() : storedBase,
    siteName: (config && config.site && config.site.name) || "QRFossil",
  };
}

export async function validateEnvironment(config) {
  const pageBase = getPublicBase().replace(/\/+$/, "");
  const checks = [
    { id: "config", label: "Configuration found", url: `${pageBase}/data/qrfossil.json` },
    { id: "redirects", label: "Redirect manifest reachable", url: `${pageBase}/data/redirects.json` },
  ];
  const results = [];
  for (const check of checks) {
    try {
      const response = await fetch(check.url, { cache: "no-store" });
      results.push({ ...check, ok: response.ok });
    } catch {
      results.push({ ...check, ok: false });
    }
  }
  const savedBase = String(config?.site?.baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  const effectiveBase = !isUnsetBaseUrl(savedBase) ? savedBase : canInferSite() ? pageBase : "";
  results.push({
    id: "baseUrl",
    label: !isUnsetBaseUrl(savedBase)
      ? "Saved site URL matches this page"
      : "Site URL inferred from this page",
    ok: Boolean(effectiveBase) && effectiveBase === pageBase,
  });
  results.push({
    id: "pages",
    label: "GitHub Pages reachable",
    ok: results[0].ok || results[1].ok,
  });
  return results;
}

export function renderChecks(listEl, results) {
  if (!listEl) return;
  listEl.replaceChildren();
  for (const item of results) {
    const li = document.createElement("li");
    li.className = item.ok ? "ok" : "fail";
    setText(li, `${item.ok ? "✓" : "✗"} ${item.label}`);
    listEl.append(li);
  }
}

export function bindWizard({ root, config, onStart }) {
  const inferred = inferredSetup(config);
  const ownerInput = root.querySelector("#setup-owner");
  const repoInput = root.querySelector("#setup-repo");
  const urlInput = root.querySelector("#setup-url");
  const nameInput = root.querySelector("#setup-name");
  if (ownerInput) ownerInput.value = inferred.owner;
  if (repoInput) repoInput.value = inferred.repo;
  if (urlInput) urlInput.value = inferred.baseUrl;
  if (nameInput) nameInput.value = inferred.siteName;

  const pagesHint = root.querySelector("#pages-hint");
  show(pagesHint, true);

  root.querySelector("#setup-start")?.addEventListener("click", () => {
    onStart({
      owner: ownerInput.value.trim(),
      repo: repoInput.value.trim(),
      baseUrl: urlInput.value.trim().replace(/\/+$/, ""),
      siteName: nameInput.value.trim() || "QRFossil",
    });
  });
}
