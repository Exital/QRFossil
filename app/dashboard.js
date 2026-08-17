import { bindAuth } from "./auth-ui.js";
import {
  GitAuthError,
  GitConflictError,
  clearToken,
  deleteFile,
  getFile,
  getToken,
  putFile,
  resolveRepo,
  validateToken,
} from "./github.js";
import { CORNER_OPTIONS, DOT_OPTIONS, ECC_OPTIONS, downloadQr, renderQr } from "./qr.js";
import { buildRedirects } from "./redirects.js";
import { bindWizard, needsSetup, renderChecks, validateEnvironment } from "./setup.js";
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
  setText,
  shortId,
  show,
  slugify,
} from "./utils.js";

const state = {
  config: null,
  canEdit: false,
  view: "home",
  editingSlug: null,
  pendingLogo: null,
  logoCleared: false,
  preview: null,
};

const els = {};

function repo() {
  return resolveRepo(state.config);
}

function toast(message, kind = "info") {
  const el = els.toast;
  el.dataset.kind = kind;
  setText(el, message);
  show(el, true);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => show(el, false), 4200);
}

function banner(message, kind = "error") {
  els.banner.dataset.kind = kind;
  setText(els.banner, message);
  show(els.banner, Boolean(message));
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

async function ensureWriteAccess() {
  const { owner, repo: name } = repo();
  if (!owner || !name) throw new GitAuthError("Repository could not be detected. Finish setup first.");
  let token = getToken();
  if (!token) {
    token = await els.auth.prompt({ owner, repo: name });
  } else {
    await validateToken(token, owner, name);
  }
  state.canEdit = true;
  renderChrome();
}

async function saveConfig(mutator, message) {
  await ensureWriteAccess();
  const { owner, repo: name } = repo();
  const file = await getFile(owner, name, CONFIG_PATH);
  if (!file) throw new Error("data/qrfossil.json was not found in this repository.");
  const config = JSON.parse(file.text);
  config.links = config.links || {};
  config.site = config.site || {};
  const result = mutator(config) || config;
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
  state.config = result;
  return result;
}

async function uploadLogo(slug, file) {
  const { owner, repo: name } = repo();
  const prepared = await prepareImageBytes(file);
  const path = `assets/logos/${slug}-${shortId()}.${prepared.ext}`;
  const bytes = prepared.bytes;
  await putFile(owner, name, {
    path,
    bytes,
    message: `qrfossil: upload logo for "${slug}"`,
  });
  return `/${path}`;
}

async function maybeDeleteLogo(path) {
  if (!path || !path.startsWith("/assets/logos/")) return;
  const { owner, repo: name } = repo();
  const relative = path.replace(/^\//, "");
  try {
    const file = await getFile(owner, name, relative);
    if (file) {
      await deleteFile(owner, name, {
        path: relative,
        sha: file.sha,
        message: `qrfossil: remove unused logo`,
      });
    }
  } catch {
    /* best-effort */
  }
}

function readFileBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(file);
  });
}

async function prepareImageBytes(file) {
  if (file.size > 2_000_000) throw new Error("Logo must be under 2 MB.");
  if (file.type === "image/svg+xml" || extensionForFile(file) === "svg") {
    if (file.size > 400_000) throw new Error("SVG logo must be under 400 KB.");
    return { bytes: await readFileBytes(file), ext: "svg" };
  }
  const bitmap = await fileToImage(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  if (!blob) throw new Error("Could not process that image.");
  if (blob.size > 700_000) throw new Error("Processed logo is too large for GitHub file updates.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: "png" };
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a usable image."));
    };
    img.src = url;
  });
}

function renderChrome() {
  const siteName = (state.config && state.config.site && state.config.site.name) || "QRFossil";
  setText(els.siteName, siteName === "QRFossil" ? "" : siteName);
  show(els.siteName, siteName && siteName !== "QRFossil");
  const { owner, repo: name } = repo();
  els.auth.render({ canEdit: state.canEdit, repo: { owner, repo: name } });
  show(els.createBtn, true);
  els.createBtn.disabled = false;
}

function linkEntries() {
  const links = (state.config && state.config.links) || {};
  return Object.entries(links).sort((a, b) => {
    const ta = a[1].createdAt || "";
    const tb = b[1].createdAt || "";
    if (ta === tb) return a[0].localeCompare(b[0]);
    return ta < tb ? 1 : -1;
  });
}

function renderHome() {
  state.view = "home";
  show(els.setup, needsSetup(state.config) && !state._setupDismissed);
  show(els.home, true);
  show(els.editor, false);
  const entries = linkEntries();
  const n = entries.length;
  setText(els.linkCount, n === 1 ? "1 Link" : `${n} Links`);
  els.list.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    setText(empty, "No QR links yet. Create one to mint a permanent address.");
    els.list.append(empty);
    return;
  }
  const baseUrl = (state.config.site && state.config.site.baseUrl) || getPublicBase();
  for (const [slug, link] of entries) {
    els.list.append(renderRow(slug, link, baseUrl));
  }
}

function renderRow(slug, link, baseUrl) {
  const row = document.createElement("article");
  row.className = "link-row";
  if (!link.enabled) row.classList.add("is-disabled");

  const title = document.createElement("h2");
  setText(title, link.name || slug);

  const slugLine = document.createElement("p");
  slugLine.className = "mono";
  setText(slugLine, `/r/${slug}`);

  const dest = document.createElement("p");
  dest.className = "dest";
  setText(dest, link.enabled ? link.destination : "Disabled");

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(title, slugLine, dest);

  const actions = document.createElement("div");
  actions.className = "row-actions";
  actions.append(
    actionButton("Copy Link", () => onCopy(slug, baseUrl)),
    actionButton("QR", () => openQrModal(slug, link, baseUrl)),
    actionButton("Edit", () => openEditor(slug)),
    moreMenu(slug, link)
  );

  row.append(meta, actions);
  return row;
}

function actionButton(label, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost";
  setText(btn, label);
  btn.addEventListener("click", onClick);
  return btn;
}

function moreMenu(slug, link) {
  const wrap = document.createElement("div");
  wrap.className = "more";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "btn btn-ghost";
  toggle.setAttribute("aria-haspopup", "true");
  setText(toggle, "More");
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.hidden = true;

  const disable = document.createElement("button");
  disable.type = "button";
  setText(disable, link.enabled ? "Disable" : "Enable");
  disable.addEventListener("click", () => {
    menu.hidden = true;
    if (link.enabled) confirmDisable(slug);
    else void onEnable(slug);
  });

  const del = document.createElement("button");
  del.type = "button";
  del.className = "danger";
  setText(del, "Delete");
  del.addEventListener("click", () => {
    menu.hidden = true;
    confirmDelete(slug);
  });

  menu.append(disable, del);
  toggle.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
  });
  wrap.append(toggle, menu);
  return wrap;
}

async function onCopy(slug, baseUrl) {
  await copyText(permanentUrl(baseUrl, slug));
  toast("Link copied.");
}

function fillSelect(select, options, value) {
  select.replaceChildren();
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option;
    setText(el, option);
    select.append(el);
  }
  select.value = value;
}

function openEditor(slug) {
  state.view = "editor";
  state.editingSlug = slug || null;
  clearPendingLogo();
  state.logoCleared = false;
  delete els.slugInput.dataset.touched;
  show(els.home, false);
  show(els.setup, false);
  show(els.editor, true);

  const isNew = !slug;
  const link = isNew ? { name: "", enabled: true, destination: "", qr: defaultQr() } : state.config.links[slug];
  els.slugInput.value = slug || "";
  els.slugInput.readOnly = !isNew;
  els.nameInput.value = link.name || "";
  els.destInput.value = link.destination || "";
  const qr = { ...defaultQr(), ...(link.qr || {}) };
  els.fgInput.value = qr.foreground;
  els.bgInput.value = qr.background;
  els.logoSizeInput.value = String(qr.logoSize);
  els.sizeInput.value = String(qr.size);
  els.marginInput.value = String(qr.margin);
  fillSelect(els.eccInput, ECC_OPTIONS, qr.errorCorrection);
  fillSelect(els.dotsInput, DOT_OPTIONS, qr.dots);
  fillSelect(els.cornersInput, CORNER_OPTIONS, qr.corners);
  els.logoInput.value = "";
  setText(els.editorTitle, isNew ? "Create QR" : `Edit ${link.name || slug}`);
  updatePermanentPreview();
  updateQrPreview();
}

function editorValues() {
  const slug = slugify(els.slugInput.value);
  return {
    slug,
    name: els.nameInput.value.trim(),
    destination: els.destInput.value.trim(),
    qr: {
      foreground: els.fgInput.value,
      background: els.bgInput.value,
      errorCorrection: els.eccInput.value,
      dots: els.dotsInput.value,
      corners: els.cornersInput.value,
      logo: currentLogoPath(),
      logoSize: Number(els.logoSizeInput.value),
      size: Number(els.sizeInput.value),
      margin: Number(els.marginInput.value),
    },
  };
}

function currentLogoPath() {
  if (state.pendingLogo) return state.pendingLogo.blobUrl;
  if (state.logoCleared) return "";
  const slug = state.editingSlug;
  if (slug && state.config.links[slug] && state.config.links[slug].qr) {
    return state.config.links[slug].qr.logo || "";
  }
  return "";
}

function logoPreviewSrc() {
  if (state.pendingLogo) return state.pendingLogo.blobUrl;
  if (state.logoCleared) return "";
  const slug = state.editingSlug;
  const path = slug && state.config.links[slug] && state.config.links[slug].qr ? state.config.links[slug].qr.logo : "";
  return path ? assetUrl(path) : "";
}

function updatePermanentPreview() {
  const slug = slugify(els.slugInput.value) || "your-slug";
  const baseUrl = (state.config.site && state.config.site.baseUrl) || getPublicBase();
  setText(els.permUrl, permanentUrl(baseUrl, slug));
}

function updateQrPreview() {
  const values = editorValues();
  const baseUrl = (state.config.site && state.config.site.baseUrl) || getPublicBase();
  const data = permanentUrl(baseUrl, values.slug || "your-slug");
  try {
    state.preview = renderQr(els.qrPreview, data, values.qr, logoPreviewSrc());
  } catch (err) {
    setText(els.qrPreview, err.message || "Preview unavailable.");
  }
}

function clearPendingLogo() {
  if (state.pendingLogo && state.pendingLogo.blobUrl) URL.revokeObjectURL(state.pendingLogo.blobUrl);
  state.pendingLogo = null;
}

async function onSave() {
  const values = editorValues();
  if (!values.name) return toast("Give this QR a name.", "error");
  if (!isValidSlug(values.slug)) return toast("Use a lowercase slug with letters, numbers, and hyphens.", "error");
  if (!isValidHttpUrl(values.destination)) return toast("Destination must be an http:// or https:// URL.", "error");

  const isNew = !state.editingSlug;
  if (isNew && state.config.links[values.slug]) return toast("That slug is already in use.", "error");

  els.saveBtn.disabled = true;
  try {
    if (needsSetup(state.config)) {
      const inferred = {
        owner: repo().owner,
        repo: repo().repo,
        baseUrl: getPublicBase(),
        siteName: (state.config.site && state.config.site.name) || "QRFossil",
      };
      applySite(state.config, inferred);
    }

    let uploadedPath = null;
    const oldLogo =
      !isNew && state.config.links[state.editingSlug] && state.config.links[state.editingSlug].qr
        ? state.config.links[state.editingSlug].qr.logo
        : "";

    await ensureWriteAccess();
    if (state.pendingLogo) {
      uploadedPath = await uploadLogo(values.slug, state.pendingLogo.file);
      values.qr.logo = uploadedPath;
    } else if (state.logoCleared) {
      values.qr.logo = "";
    } else if (!isNew) {
      values.qr.logo = oldLogo || "";
    } else {
      values.qr.logo = "";
    }

    const previous = isNew ? null : state.config.links[state.editingSlug];
    const message = commitMessage(isNew, values.slug, previous, values, Boolean(uploadedPath));

    await saveConfig((config) => {
      if (needsSetup(config) && state.config.site) {
        config.site = { ...config.site, ...state.config.site };
      }
      const existing = config.links[values.slug] || {};
      config.links[values.slug] = {
        name: values.name,
        enabled: existing.enabled !== false,
        destination: values.destination,
        createdAt: existing.createdAt || nowIso(),
        updatedAt: nowIso(),
        qr: values.qr,
      };
    }, message);

    if ((uploadedPath || state.logoCleared) && oldLogo && oldLogo !== uploadedPath) await maybeDeleteLogo(oldLogo);
    clearPendingLogo();
    state.logoCleared = false;
    toast("Saved. GitHub Pages may take a minute to publish.");
    renderHome();
  } catch (err) {
    await handleWriteError(err);
  } finally {
    els.saveBtn.disabled = false;
  }
}

function commitMessage(isNew, slug, previous, values, logoUploaded) {
  if (isNew) return `qrfossil: create link "${slug}"`;
  if (logoUploaded) return `qrfossil: upload logo for "${slug}"`;
  if (previous && previous.destination !== values.destination) return `qrfossil: update destination "${slug}"`;
  return `qrfossil: update QR design "${slug}"`;
}

async function handleWriteError(err) {
  if (err instanceof GitConflictError) {
    try {
      state.config = await loadConfigFromPages();
    } catch {
      /* keep */
    }
    renderChrome();
    if (state.view === "home") renderHome();
    toast("Repository changed — reloaded. Please retry.", "error");
    return;
  }
  if (err instanceof GitAuthError) {
    clearToken();
    state.canEdit = false;
    renderChrome();
    toast(err.message, "error");
    return;
  }
  if (err && err.message === "Authentication cancelled.") return;
  toast(err.message || "Save failed.", "error");
}

function confirmDisable(slug) {
  openConfirm({
    title: `Disable “${slug}”?`,
    body: "Existing printed QR codes using this address will show a disabled message instead of redirecting.",
    action: "Disable",
    danger: false,
    onConfirm: () => onDisable(slug),
  });
}

function confirmDelete(slug) {
  openConfirm({
    title: `Permanently delete “${slug}”?`,
    body: "Existing printed QR codes using this address will stop working.",
    action: "Permanently Delete",
    danger: true,
    onConfirm: () => onDelete(slug),
  });
}

function openConfirm({ title, body, action, danger, onConfirm }) {
  setText(els.confirmTitle, title);
  setText(els.confirmBody, body);
  setText(els.confirmOk, action);
  els.confirmOk.classList.toggle("btn-danger", danger);
  show(els.confirm, true);
  els.confirmOk.onclick = async () => {
    show(els.confirm, false);
    await onConfirm();
  };
}

async function onDisable(slug) {
  try {
    await saveConfig((config) => {
      if (config.links[slug]) {
        config.links[slug].enabled = false;
        config.links[slug].updatedAt = nowIso();
      }
    }, `qrfossil: disable "${slug}"`);
    toast(`Disabled “${slug}”.`);
    renderHome();
  } catch (err) {
    await handleWriteError(err);
  }
}

async function onEnable(slug) {
  try {
    await saveConfig((config) => {
      if (config.links[slug]) {
        config.links[slug].enabled = true;
        config.links[slug].updatedAt = nowIso();
      }
    }, `qrfossil: enable "${slug}"`);
    toast(`Enabled “${slug}”.`);
    renderHome();
  } catch (err) {
    await handleWriteError(err);
  }
}

async function onDelete(slug) {
  try {
    const logo = state.config.links[slug] && state.config.links[slug].qr && state.config.links[slug].qr.logo;
    await saveConfig((config) => {
      delete config.links[slug];
    }, `qrfossil: delete "${slug}"`);
    if (logo) await maybeDeleteLogo(logo);
    toast(`Deleted “${slug}”.`);
    renderHome();
  } catch (err) {
    await handleWriteError(err);
  }
}

function openQrModal(slug, link, baseUrl) {
  const data = permanentUrl(baseUrl, slug);
  setText(els.qrModalTitle, link.name || slug);
  setText(els.qrModalUrl, data);
  renderQr(els.qrModalPreview, data, link.qr || defaultQr(), assetUrl(link.qr && link.qr.logo));
  els.dlPng.onclick = () => downloadQr(data, link.qr, assetUrl(link.qr && link.qr.logo), { name: slug, extension: "png" });
  els.dlSvg.onclick = () => downloadQr(data, link.qr, assetUrl(link.qr && link.qr.logo), { name: slug, extension: "svg" });
  show(els.qrModal, true);
}

async function onSetupStart(setup) {
  if (!setup.owner || !setup.repo || !setup.baseUrl) {
    toast("Fill in username, repository, and site URL.", "error");
    return;
  }
  try {
    applySite(state.config, setup);
    await saveConfig((config) => {
      applySite(config, setup);
    }, "qrfossil: update site settings");
    state._setupDismissed = true;
    toast("Site settings saved.");
    renderChrome();
    renderHome();
  } catch (err) {
    await handleWriteError(err);
  }
}

function cacheEls() {
  els.siteName = document.querySelector("#site-name");
  els.banner = document.querySelector("#banner");
  els.toast = document.querySelector("#toast");
  els.setup = document.querySelector("#setup-panel");
  els.home = document.querySelector("#home");
  els.editor = document.querySelector("#editor");
  els.list = document.querySelector("#link-list");
  els.linkCount = document.querySelector("#link-count");
  els.createBtn = document.querySelector("#create-qr");
  els.editorTitle = document.querySelector("#editor-title");
  els.nameInput = document.querySelector("#field-name");
  els.slugInput = document.querySelector("#field-slug");
  els.destInput = document.querySelector("#field-destination");
  els.permUrl = document.querySelector("#permanent-url");
  els.fgInput = document.querySelector("#field-fg");
  els.bgInput = document.querySelector("#field-bg");
  els.logoInput = document.querySelector("#field-logo");
  els.logoSizeInput = document.querySelector("#field-logo-size");
  els.sizeInput = document.querySelector("#field-size");
  els.marginInput = document.querySelector("#field-margin");
  els.eccInput = document.querySelector("#field-ecc");
  els.dotsInput = document.querySelector("#field-dots");
  els.cornersInput = document.querySelector("#field-corners");
  els.qrPreview = document.querySelector("#qr-preview");
  els.saveBtn = document.querySelector("#save-link");
  els.cancelBtn = document.querySelector("#cancel-edit");
  els.confirm = document.querySelector("#confirm-modal");
  els.confirmTitle = document.querySelector("#confirm-title");
  els.confirmBody = document.querySelector("#confirm-body");
  els.confirmOk = document.querySelector("#confirm-ok");
  els.confirmCancel = document.querySelector("#confirm-cancel");
  els.qrModal = document.querySelector("#qr-modal");
  els.qrModalTitle = document.querySelector("#qr-modal-title");
  els.qrModalUrl = document.querySelector("#qr-modal-url");
  els.qrModalPreview = document.querySelector("#qr-modal-preview");
  els.dlPng = document.querySelector("#dl-png");
  els.dlSvg = document.querySelector("#dl-svg");
  els.authModal = document.querySelector("#auth-modal");
}

function bindUi() {
  document.querySelector("#editor-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void onSave();
  });
  els.createBtn.addEventListener("click", () => openEditor(null));
  els.cancelBtn.addEventListener("click", () => {
    clearPendingLogo();
    state.logoCleared = false;
    renderHome();
  });
  els.saveBtn.addEventListener("click", () => void onSave());
  els.nameInput.addEventListener("input", () => {
    if (!els.slugInput.readOnly && !els.slugInput.dataset.touched) {
      els.slugInput.value = slugify(els.nameInput.value);
      updatePermanentPreview();
      updateQrPreview();
    }
  });
  els.slugInput.addEventListener("input", () => {
    els.slugInput.dataset.touched = "1";
    updatePermanentPreview();
    updateQrPreview();
  });
  for (const el of [
    els.destInput,
    els.fgInput,
    els.bgInput,
    els.logoSizeInput,
    els.sizeInput,
    els.marginInput,
    els.eccInput,
    els.dotsInput,
    els.cornersInput,
  ]) {
    el.addEventListener("input", updateQrPreview);
    el.addEventListener("change", updateQrPreview);
  }
  els.logoInput.addEventListener("change", () => {
    clearPendingLogo();
    const file = els.logoInput.files && els.logoInput.files[0];
    if (!file) {
      updateQrPreview();
      return;
    }
    state.pendingLogo = { file, blobUrl: URL.createObjectURL(file) };
    state.logoCleared = false;
    updateQrPreview();
  });
  document.querySelector("#clear-logo")?.addEventListener("click", () => {
    clearPendingLogo();
    els.logoInput.value = "";
    state.logoCleared = true;
    updateQrPreview();
  });
  document.addEventListener("click", (event) => {
    for (const menu of document.querySelectorAll(".menu")) {
      if (menu.hidden) continue;
      if (!menu.parentElement.contains(event.target)) menu.hidden = true;
    }
  });
  els.confirmCancel.addEventListener("click", () => show(els.confirm, false));
  els.confirm.addEventListener("click", (e) => {
    if (e.target === els.confirm) show(els.confirm, false);
  });
  document.querySelector("#qr-modal-close")?.addEventListener("click", () => show(els.qrModal, false));
  els.qrModal.addEventListener("click", (e) => {
    if (e.target === els.qrModal) show(els.qrModal, false);
  });

  els.auth = bindAuth({
    badgeEl: document.querySelector("#mode-badge"),
    enableBtn: document.querySelector("#enable-editing"),
    connectedEl: document.querySelector("#github-status"),
    repoEl: document.querySelector("#github-repo"),
    forgetBtn: document.querySelector("#forget-token"),
    modal: els.authModal,
    onModeChange: async (editing) => {
      if (editing) {
        try {
          await ensureWriteAccess();
        } catch (err) {
          if (err && err.message !== "Authentication cancelled.") toast(err.message, "error");
          state.canEdit = false;
        }
      } else {
        state.canEdit = false;
      }
      renderChrome();
    },
  });
}

async function boot() {
  cacheEls();
  bindUi();
  banner("");
  try {
    state.config = await loadConfigFromPages();
  } catch (err) {
    banner(
      "QRFossil could not load its configuration. If this is a new fork, enable GitHub Pages: Repository → Settings → Pages → Deploy from main."
    );
    state.config = {
      schemaVersion: 1,
      appVersion: APP_VERSION,
      site: { name: "QRFossil", baseUrl: "", github: { owner: "", repo: "" } },
      analytics: { provider: "none" },
      links: {},
    };
  }

  if (getToken()) {
    try {
      const r = repo();
      if (r.owner && r.repo) {
        await validateToken(getToken(), r.owner, r.repo);
        state.canEdit = true;
      }
    } catch {
      clearToken();
      state.canEdit = false;
    }
  }

  renderChrome();
  bindWizard({
    root: els.setup,
    config: state.config,
    onStart: onSetupStart,
  });
  const checks = await validateEnvironment();
  renderChecks(document.querySelector("#setup-checks"), checks);
  const pagesOk = checks.find((c) => c.id === "pages");
  show(document.querySelector("#pages-hint"), pagesOk && !pagesOk.ok);
  renderHome();
}

boot();
