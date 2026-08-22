import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";

export default function AuthModal({ open, onClose, onConnect }) {
  const { repo } = useApp();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConnect() {
    setError("");
    setLoading(true);
    try {
      await onConnect(token.trim());
      setToken("");
      onClose();
    } catch (err) {
      setError(err.message || "Could not connect.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setToken("");
    setError("");
    onClose();
  }

  const repoLabel = repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : "this repository";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/60 p-md backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-card"
        role="dialog"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="auth-title" className="text-headline-sm text-on-surface">
          QRFossil needs GitHub write access
        </h2>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          Create a fine-grained GitHub token for <strong>{repoLabel}</strong> with permission{" "}
          <strong>Contents → Read and write</strong>. Nothing more.
        </p>
        <p className="mt-sm">
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Open GitHub Token Settings
          </a>
        </p>
        <label className="mt-md block text-label-sm text-on-surface-variant">
          Token
          <input
            type="password"
            className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-xs font-mono text-body-sm focus:border-primary focus:ring-0"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {error && <p className="mt-xs text-body-sm text-error">{error}</p>}
        <div className="mt-md flex justify-end gap-sm">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-outline-variant px-md py-xs text-body-sm transition-colors hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading || !token.trim()}
            className="rounded-lg bg-primary px-md py-xs text-body-sm text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
