import { clearToken, getToken, setToken, validateToken } from "./github.js";
import { setText, show } from "./utils.js";

export function bindAuth({
  badgeEl,
  enableBtn,
  connectedEl,
  repoEl,
  forgetBtn,
  modal,
  onModeChange,
}) {
  const tokenInput = modal.querySelector("#token-input");
  const errorEl = modal.querySelector("#auth-error");
  const connectBtn = modal.querySelector("#auth-connect");
  const cancelBtn = modal.querySelector("#auth-cancel");
  const repoNeedEl = modal.querySelector("#auth-repo");
  let pending = null;

  function close() {
    show(modal, false);
    tokenInput.value = "";
    if (pending) {
      pending.reject(new Error("Authentication cancelled."));
      pending = null;
    }
  }

  function open(repo) {
    setText(repoNeedEl, repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : "this repository");
    const settings = modal.querySelector("#token-settings");
    if (settings) {
      settings.href = "https://github.com/settings/personal-access-tokens/new";
    }
    setText(errorEl, "");
    show(modal, true);
    tokenInput.focus();
  }

  function prompt(repo) {
    return new Promise((resolve, reject) => {
      pending = { resolve, reject, repo };
      open(repo);
    });
  }

  connectBtn?.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    const repo = pending ? pending.repo : null;
    setText(errorEl, "");
    connectBtn.disabled = true;
    try {
      if (!repo) throw new Error("Repository unknown.");
      await validateToken(token, repo.owner, repo.repo);
      setToken(token);
      const done = pending;
      pending = null;
      show(modal, false);
      tokenInput.value = "";
      onModeChange(true);
      if (done) done.resolve(token);
    } catch (err) {
      setText(errorEl, err.message || "Could not connect.");
    } finally {
      connectBtn.disabled = false;
    }
  });

  cancelBtn?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  forgetBtn?.addEventListener("click", () => {
    clearToken();
    onModeChange(false);
  });

  enableBtn?.addEventListener("click", async () => {
    if (getToken()) {
      onModeChange(true);
      return;
    }
    try {
      await prompt(enableBtn._repo || { owner: "", repo: "" });
    } catch {
      onModeChange(false);
    }
  });

  function render({ canEdit, repo }) {
    enableBtn._repo = repo;
    const connected = Boolean(getToken());
    setText(badgeEl, canEdit ? "Editor" : "Read-only");
    badgeEl.classList.toggle("is-edit", canEdit);
    show(enableBtn, !canEdit);
    show(connectedEl, connected);
    if (repoEl) setText(repoEl, repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : "");
  }

  return { prompt, render };
}
