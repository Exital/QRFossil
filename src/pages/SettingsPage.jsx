import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import Banner, { Card } from "../components/ui/Banner.jsx";
import { inferredSetup, validateEnvironment } from "../lib/setup.js";

export default function SettingsPage() {
  const { config, saveSetup, showSetup, siteName, requestWriteAccess } = useApp();
  const inferred = inferredSetup(config || {});
  const [setup, setSetup] = useState(inferred);
  const [checks, setChecks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSetup(inferredSetup(config || {}));
  }, [config]);

  useEffect(() => {
    validateEnvironment().then(setChecks);
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const access = await requestWriteAccess();
    if (!access.ok) {
      setSaving(false);
      return;
    }
    await saveSetup({
      ...setup,
      baseUrl: setup.baseUrl.trim().replace(/\/+$/, ""),
      siteName: setup.siteName.trim() || "QRFossil",
    });
    setSaving(false);
  }

  return (
    <>
      <TopBar title="Settings" />
      <Banner />
      <main className="flex-1 overflow-y-auto bg-background p-gutter lg:p-margin-desktop">
        <div className="mb-gutter">
          <h2 className="text-headline-lg text-on-surface">Site settings</h2>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            Configure how QRFossil identifies your GitHub Pages deployment.
          </p>
        </div>

        {showSetup && (
          <Card className="mb-gutter border-primary/30 bg-primary/5">
            <h3 className="text-headline-sm text-on-surface">Welcome to {siteName}</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Finish setup so printed QR codes use the correct permanent URL.
            </p>
          </Card>
        )}

        <form onSubmit={handleSave} className="max-w-2xl space-y-gutter">
          <Card>
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <label className="text-label-sm text-on-surface-variant">
                GitHub username
                <input
                  className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-xs text-body-sm focus:border-primary focus:ring-0"
                  value={setup.owner}
                  onChange={(e) => setSetup({ ...setup, owner: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="text-label-sm text-on-surface-variant">
                Repository
                <input
                  className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-xs text-body-sm focus:border-primary focus:ring-0"
                  value={setup.repo}
                  onChange={(e) => setSetup({ ...setup, repo: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="text-label-sm text-on-surface-variant sm:col-span-2">
                Site name
                <input
                  className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-xs text-body-sm focus:border-primary focus:ring-0"
                  value={setup.siteName}
                  onChange={(e) => setSetup({ ...setup, siteName: e.target.value })}
                  autoComplete="off"
                />
              </label>
              <label className="text-label-sm text-on-surface-variant sm:col-span-2">
                Site URL
                <input
                  className="mt-xs w-full rounded-lg border border-outline-variant bg-surface px-sm py-xs font-mono text-body-sm focus:border-primary focus:ring-0"
                  value={setup.baseUrl}
                  onChange={(e) => setSetup({ ...setup, baseUrl: e.target.value })}
                  autoComplete="off"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-md rounded-lg bg-primary px-md py-sm text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </Card>

          <Card>
            <h3 className="mb-md text-headline-sm text-on-surface">Environment checks</h3>
            <ul className="space-y-xs">
              {checks.map((item) => (
                <li
                  key={item.id}
                  className={`text-body-sm ${item.ok ? "text-active-text" : "text-error"}`}
                >
                  {item.ok ? "✓" : "✗"} {item.label}
                </li>
              ))}
            </ul>
            {checks.some((c) => c.id === "pages" && !c.ok) && (
              <p className="mt-md text-body-sm text-on-surface-variant">
                GitHub Pages does not appear to be enabled. Open Repository → Settings → Pages and deploy from the{" "}
                <strong>main</strong> branch.
              </p>
            )}
          </Card>
        </form>
      </main>
    </>
  );
}
