import { getPublicBase, inferBaseUrl, inferRepo, setText, show } from "./utils.js";

export function needsSetup(config) {
  const baseUrl = config && config.site && config.site.baseUrl;
  return !String(baseUrl || "").trim();
}

export function inferredSetup(config) {
  const repo = inferRepo();
  const stored = (config && config.site && config.site.github) || {};
  const owner = stored.owner || repo.owner;
  const name = stored.repo || repo.repo;
  return {
    owner,
    repo: name,
    baseUrl: (config && config.site && config.site.baseUrl) || inferBaseUrl(),
    siteName: (config && config.site && config.site.name) || "QRFossil",
  };
}

export async function validateEnvironment() {
  const base = getPublicBase().replace(/\/+$/, "");
  const checks = [
    { id: "config", label: "Configuration found", url: `${base}/data/qrfossil.json` },
    { id: "redirects", label: "Redirect manifest reachable", url: `${base}/data/redirects.json` },
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
  const expected = base;
  const actual = getPublicBase();
  results.push({
    id: "baseUrl",
    label: "Site URL matches this page",
    ok: actual.replace(/\/+$/, "") === expected.replace(/\/+$/, ""),
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
