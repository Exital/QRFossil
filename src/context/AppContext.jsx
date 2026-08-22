import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  GitAuthError,
  GitConflictError,
  clearToken,
  deleteFile,
  getFile,
  getToken,
  isLocalDev,
  probeLocalWriter,
  putFile,
  resolveRepo,
  setToken,
  validateToken,
} from "../lib/github.js";
import { prepareImageBytes } from "../lib/images.js";
import { buildRedirects } from "../lib/redirects.js";
import { needsSetup } from "../lib/setup.js";
import {
  APP_VERSION,
  CONFIG_PATH,
  REDIRECTS_PATH,
  assetUrl,
  copyText,
  defaultQr,
  extensionForFile,
  getPublicBase,
  isValidHttpUrl,
  isValidSlug,
  nowIso,
  permanentUrl,
  shortId,
  slugify,
} from "../lib/utils.js";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

async function loadConfigFromPages() {
  const response = await fetch(`${getPublicBase()}/data/qrfossil.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("Configuration could not be loaded.");
  return response.json();
}

function applySite(config, setup) {
  config.site = config.site || {};
  config.site.name = setup.siteName;
  config.site.baseUrl = setup.baseUrl;
  config.site.github = { owner: setup.owner, repo: setup.repo };
  config.appVersion = APP_VERSION;
}

export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [banner, setBanner] = useState("");
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("qrfossil.dark") === "1";
    } catch {
      return false;
    }
  });
  const toastTimer = useRef(null);
  const authWaiter = useRef(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const repo = useCallback(() => resolveRepo(config), [config]);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    if (authWaiter.current) {
      authWaiter.current({ ok: false, needsAuth: true });
      authWaiter.current = null;
    }
  }, []);

  const showToast = useCallback((message, kind = "info") => {
    setToast({ message, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  async function ensureWriteAccessLocal() {
    if (!isLocalDev()) return;
    if (!(await probeLocalWriter())) {
      throw new Error("Start python3 scripts/preview.py to save locally. A plain static server cannot write files.");
    }
  }

  const requestWriteAccess = useCallback(async () => {
    if (isLocalDev()) {
      try {
        await ensureWriteAccessLocal();
        setCanEdit(true);
        return { ok: true, needsAuth: false };
      } catch (err) {
        showToast(err.message, "error");
        setCanEdit(false);
        return { ok: false, needsAuth: false };
      }
    }

    const { owner, repo: name } = repo();
    if (!owner || !name) {
      showToast("Finish setup in Settings before saving.", "error");
      return { ok: false, needsAuth: false };
    }

    const token = getToken();
    if (!token) {
      setAuthModalOpen(true);
      return new Promise((resolve) => {
        authWaiter.current = resolve;
      });
    }

    try {
      await validateToken(token, owner, name);
      setCanEdit(true);
      return { ok: true, needsAuth: false };
    } catch (err) {
      clearToken();
      setCanEdit(false);
      if (err instanceof GitAuthError) showToast(err.message, "error");
      setAuthModalOpen(true);
      return new Promise((resolve) => {
        authWaiter.current = resolve;
      });
    }
  }, [repo, showToast]);

  const ensureWriteAccess = useCallback(async () => {
    const access = await requestWriteAccess();
    if (!access.ok) {
      if (access.needsAuth) throw new GitAuthError("NEEDS_AUTH");
      throw new Error("Editing is not available.");
    }
  }, [requestWriteAccess]);

  const loadConfig = useCallback(async () => {
    try {
      const data = await loadConfigFromPages();
      setConfig(data);
      setBanner("");
      return data;
    } catch {
      setBanner(
        "QRFossil could not load its configuration. If this is a new fork, enable GitHub Pages: Repository → Settings → Pages → Deploy from main."
      );
      const fallback = {
        schemaVersion: 1,
        appVersion: APP_VERSION,
        site: { name: "QRFossil", baseUrl: "", github: { owner: "", repo: "" } },
        analytics: { provider: "none" },
        links: {},
      };
      setConfig(fallback);
      return fallback;
    }
  }, []);

  const saveConfig = useCallback(
    async (mutator, message) => {
      await ensureWriteAccess();
      const { owner, repo: name } = repo();
      const file = await getFile(owner, name, CONFIG_PATH);
      if (!file) throw new Error("data/qrfossil.json was not found in this repository.");
      const next = JSON.parse(file.text);
      next.links = next.links || {};
      next.site = next.site || {};
      const result = mutator(next) || next;
      const serialized = `${JSON.stringify(result, null, 2)}\n`;
      await putFile(owner, name, { path: CONFIG_PATH, text: serialized, sha: file.sha, message });
      result.links = result.links || {};
      const redirects = `${JSON.stringify(buildRedirects(result), null, 2)}\n`;
      const redirectFile = await getFile(owner, name, REDIRECTS_PATH);
      const previousText = redirectFile ? redirectFile.text.replace(/\s+$/, "") : "";
      if (previousText !== redirects.replace(/\s+$/, "")) {
        await putFile(owner, name, {
          path: REDIRECTS_PATH,
          text: redirects,
          sha: redirectFile ? redirectFile.sha : undefined,
          message: "qrfossil: update redirects",
        });
      }
      setConfig(result);
      return result;
    },
    [ensureWriteAccess, repo]
  );

  const uploadLogo = useCallback(
    async (slug, file) => {
      const { owner, repo: name } = repo();
      const prepared = await prepareImageBytes(file, extensionForFile);
      const path = `assets/logos/${slug}-${shortId()}.${prepared.ext}`;
      await putFile(owner, name, {
        path,
        bytes: prepared.bytes,
        message: `qrfossil: upload logo for "${slug}"`,
      });
      return `/${path}`;
    },
    [repo]
  );

  const maybeDeleteLogo = useCallback(
    async (path) => {
      if (!path || !path.startsWith("/assets/logos/")) return;
      const { owner, repo: name } = repo();
      const relative = path.replace(/^\//, "");
      try {
        const file = await getFile(owner, name, relative);
        if (file) {
          await deleteFile(owner, name, {
            path: relative,
            sha: file.sha,
            message: "qrfossil: remove unused logo",
          });
        }
      } catch {
        /* best-effort */
      }
    },
    [repo]
  );

  const handleWriteError = useCallback(
    async (err) => {
      if (err instanceof GitConflictError) {
        try {
          await loadConfig();
        } catch {
          /* keep */
        }
        showToast("Repository changed — reloaded. Please retry.", "error");
        return;
      }
      if (err instanceof GitAuthError) {
        if (err.message === "NEEDS_AUTH") return err;
        clearToken();
        setCanEdit(false);
        showToast(err.message, "error");
        return;
      }
      if (err && err.message === "Authentication cancelled.") return;
      showToast(err.message || "Save failed.", "error");
    },
    [loadConfig, showToast]
  );

  const commitMessage = (isNew, slug, previous, values, logoUploaded) => {
    if (isNew) return `qrfossil: create link "${slug}"`;
    if (logoUploaded) return `qrfossil: upload logo for "${slug}"`;
    if (previous && previous.destination !== values.destination) return `qrfossil: update destination "${slug}"`;
    return `qrfossil: update QR design "${slug}"`;
  };

  const saveLink = useCallback(
    async ({ editingSlug, values, pendingLogo, logoCleared }) => {
      if (!config) {
        showToast("Configuration is still loading.", "error");
        return false;
      }
      if (!values.name) {
        showToast("Give this QR a name.", "error");
        return false;
      }
      if (!isValidSlug(values.slug)) {
        showToast("Use a lowercase slug with letters, numbers, and hyphens.", "error");
        return false;
      }
      if (!isValidHttpUrl(values.destination)) {
        showToast("Destination must be an http:// or https:// URL.", "error");
        return false;
      }

      const isNew = !editingSlug;
      if (isNew && config.links[values.slug]) {
        showToast("That slug is already in use.", "error");
        return false;
      }

      try {
        if (needsSetup(config)) {
          const inferred = {
            owner: repo().owner,
            repo: repo().repo,
            baseUrl: getPublicBase(),
            siteName: config.site?.name || "QRFossil",
          };
          applySite(config, inferred);
        }

        let uploadedPath = null;
        const oldLogo =
          !isNew && config.links[editingSlug]?.qr ? config.links[editingSlug].qr.logo : "";

        await ensureWriteAccess();
        const qr = { ...values.qr };
        if (pendingLogo) {
          uploadedPath = await uploadLogo(values.slug, pendingLogo);
          qr.logo = uploadedPath;
        } else if (logoCleared) {
          qr.logo = "";
        } else if (!isNew) {
          qr.logo = oldLogo || "";
        } else {
          qr.logo = "";
        }

        const previous = isNew ? null : config.links[editingSlug];
        const message = commitMessage(isNew, values.slug, previous, values, Boolean(uploadedPath));

        await saveConfig((next) => {
          if (needsSetup(next) && config.site) {
            next.site = { ...next.site, ...config.site };
          }
          const existing = next.links[values.slug] || {};
          next.links[values.slug] = {
            name: values.name,
            enabled: existing.enabled !== false,
            destination: values.destination,
            createdAt: existing.createdAt || nowIso(),
            updatedAt: nowIso(),
            qr,
          };
        }, message);

        if ((uploadedPath || logoCleared) && oldLogo && oldLogo !== uploadedPath) {
          await maybeDeleteLogo(oldLogo);
        }

        showToast(
          isLocalDev() ? "Saved locally. Nothing was committed." : "Saved. GitHub Pages may take a minute to publish.",
          "success"
        );
        return true;
      } catch (err) {
        await handleWriteError(err);
        return false;
      }
    },
    [config, ensureWriteAccess, handleWriteError, maybeDeleteLogo, repo, saveConfig, showToast, uploadLogo]
  );

  const toggleEnabled = useCallback(
    async (slug, enabled) => {
      try {
        await saveConfig((next) => {
          if (next.links[slug]) {
            next.links[slug].enabled = enabled;
            next.links[slug].updatedAt = nowIso();
          }
        }, enabled ? `qrfossil: enable "${slug}"` : `qrfossil: disable "${slug}"`);
        showToast(`${enabled ? "Enabled" : "Disabled"} “${slug}”.`, "success");
        return true;
      } catch (err) {
        await handleWriteError(err);
        return false;
      }
    },
    [handleWriteError, saveConfig, showToast]
  );

  const deleteLink = useCallback(
    async (slug) => {
      try {
        const logo = config.links[slug]?.qr?.logo;
        await saveConfig((next) => {
          delete next.links[slug];
        }, `qrfossil: delete "${slug}"`);
        if (logo) await maybeDeleteLogo(logo);
        showToast(`Deleted “${slug}”.`, "success");
        return true;
      } catch (err) {
        await handleWriteError(err);
        return false;
      }
    },
    [config, handleWriteError, maybeDeleteLogo, saveConfig, showToast]
  );

  const saveSetup = useCallback(
    async (setup) => {
      if (!setup.owner || !setup.repo || !setup.baseUrl) {
        showToast("Fill in username, repository, and site URL.", "error");
        return false;
      }
      try {
        applySite(config, setup);
        await saveConfig((next) => {
          applySite(next, setup);
        }, "qrfossil: update site settings");
        setSetupDismissed(true);
        showToast("Site settings saved.", "success");
        return true;
      } catch (err) {
        await handleWriteError(err);
        return false;
      }
    },
    [config, handleWriteError, saveConfig, showToast]
  );

  const connectGitHub = useCallback(
    async (token) => {
      const { owner, repo: name } = repo();
      await validateToken(token, owner, name);
      setToken(token);
      setCanEdit(true);
      setAuthModalOpen(false);
      showToast("Connected to GitHub.", "success");
      if (authWaiter.current) {
        authWaiter.current({ ok: true, needsAuth: false });
        authWaiter.current = null;
      }
      return true;
    },
    [repo, showToast]
  );

  const enableEditing = useCallback(async () => {
    return requestWriteAccess();
  }, [requestWriteAccess]);

  const forgetToken = useCallback(() => {
    clearToken();
    setCanEdit(false);
    showToast("Token forgotten.", "info");
  }, [showToast]);

  const copyLink = useCallback(
    async (slug) => {
      const baseUrl = config?.site?.baseUrl || getPublicBase();
      await copyText(permanentUrl(baseUrl, slug));
      showToast("Link copied.", "success");
    },
    [config, showToast]
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try {
      localStorage.setItem("qrfossil.dark", darkMode ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      const data = await loadConfig();
      if (isLocalDev()) {
        const ok = await probeLocalWriter();
        setCanEdit(ok);
        if (!ok) {
          setBanner("Local preview is read-only until you run python3 scripts/preview.py.");
        }
      } else if (getToken()) {
        try {
          const r = resolveRepo(data);
          if (r.owner && r.repo) {
            await validateToken(getToken(), r.owner, r.repo);
            setCanEdit(true);
          }
        } catch {
          clearToken();
          setCanEdit(false);
        }
      }
    })();
  }, [loadConfig]);

  const linkEntries = useMemo(() => {
    const links = config?.links || {};
    return Object.entries(links).sort((a, b) => {
      const ta = a[1].createdAt || "";
      const tb = b[1].createdAt || "";
      if (ta === tb) return a[0].localeCompare(b[0]);
      return ta < tb ? 1 : -1;
    });
  }, [config]);

  const siteName = config?.site?.name || "QRFossil";
  const baseUrl = config?.site?.baseUrl || getPublicBase();
  const showSetup = needsSetup(config) && !setupDismissed;

  const value = {
    config,
    setConfig,
    canEdit,
    setCanEdit,
    banner,
    toast,
    showToast,
    darkMode,
    setDarkMode,
    repo: repo(),
    siteName,
    baseUrl,
    linkEntries,
    showSetup,
    setupDismissed,
    setSetupDismissed,
    loadConfig,
    saveLink,
    toggleEnabled,
    deleteLink,
    saveSetup,
    connectGitHub,
    enableEditing,
    requestWriteAccess,
    forgetToken,
    copyLink,
    authModalOpen,
    closeAuthModal,
    slugify,
    defaultQr,
    assetUrl,
    permanentUrl: (slug) => permanentUrl(baseUrl, slug),
    isLocalDev: isLocalDev(),
    hasToken: Boolean(getToken()),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export { slugify, defaultQr, assetUrl };
