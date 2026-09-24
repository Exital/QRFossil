import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import Banner, { Card } from "../components/ui/Banner.jsx";
import { inferredSetup, validateEnvironment } from "../lib/setup.js";

export default function SettingsPage() {
  const { config, saveSetup, showSetup, requestWriteAccess } = useApp();
  const inferred = inferredSetup(config || {});
  const [setup, setSetup] = useState(inferred);
  const [checks, setChecks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSetup(inferredSetup(config || {}));
  }, [config]);

  useEffect(() => {
    validateEnvironment(config).then(setChecks);
  }, [config]);

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

  const fieldClass =
    "mt-xs w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-0";

  return (
    <>
      <TopBar title="Settings" />
      <Banner />
      <main className="flex-1 overflow-y-auto bg-background p-sm sm:p-gutter lg:p-margin-desktop">
        <div className="mb-gutter">
          <h2 className="text-headline-lg text-on-surface">Site settings</h2>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            Site URL is what printed QR codes encode. GitHub username and repository are for saving edits via the
            GitHub API — they are not the same as the public site address.
          </p>
        </div>

        {showSetup && (
          <Card className="mb-gutter border-primary/30 bg-primary/5">
            <h3 className="text-headline-sm text-on-surface">Finish setup</h3>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              This site isn’t on a standard <span className="font-mono">*.github.io</span> URL, so Site URL /
              GitHub username / repository couldn’t be inferred. Set them below and save once.
            </p>
          </Card>
        )}

        <form onSubmit={handleSave} className="max-w-2xl space-y-gutter">
          <Card>
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <label className="text-label-sm text-on-surface-variant sm:col-span-2">
                Site name
                <input
                  className={fieldClass}
                  value={setup.siteName}
                  onChange={(e) => setSetup({ ...setup, siteName: e.target.value })}
                  placeholder="QRFossil"
                  autoComplete="off"
                />
                <span className="mt-xs block text-[12px] font-normal text-outline">
                  Shown in the sidebar and browser tab branding.
                </span>
              </label>

              <label className="text-label-sm text-on-surface-variant sm:col-span-2">
                Site URL
                <input
                  className={`${fieldClass} font-mono`}
                  value={setup.baseUrl}
                  onChange={(e) => setSetup({ ...setup, baseUrl: e.target.value })}
                  placeholder="https://YOUR_USERNAME.github.io/QRFossil"
                  autoComplete="off"
                />
                <span className="mt-xs block text-[12px] font-normal text-outline">
                  Public base used for permanent QR links (<span className="font-mono">…/r/your-slug</span>). Use your
                  GitHub Pages URL or a custom domain. No trailing slash.
                </span>
              </label>

              <div className="sm:col-span-2 rounded-lg border border-outline-variant/60 bg-surface-container-low p-sm">
                <p className="text-label-sm font-semibold text-on-surface">Why GitHub username &amp; repository?</p>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Site URL tells scanners where to go. Username and repository tell QRFossil{" "}
                  <em>which GitHub repo to write</em> when you save (via a fine-grained token). On a normal{" "}
                  <span className="font-mono">*.github.io/RepoName</span> site these are inferred automatically; set
                  them if you use a custom domain or a non-standard layout.
                </p>
              </div>

              <label className="text-label-sm text-on-surface-variant">
                GitHub username
                <input
                  className={fieldClass}
                  value={setup.owner}
                  onChange={(e) => setSetup({ ...setup, owner: e.target.value })}
                  placeholder="YOUR_USERNAME"
                  autoComplete="off"
                />
                <span className="mt-xs block text-[12px] font-normal text-outline">
                  Owner of the fork that stores <span className="font-mono">data/qrfossil.json</span>.
                </span>
              </label>
              <label className="text-label-sm text-on-surface-variant">
                Repository
                <input
                  className={fieldClass}
                  value={setup.repo}
                  onChange={(e) => setSetup({ ...setup, repo: e.target.value })}
                  placeholder="QRFossil"
                  autoComplete="off"
                />
                <span className="mt-xs block text-[12px] font-normal text-outline">
                  Usually <span className="font-mono">QRFossil</span> — the repo name, not the full URL.
                </span>
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
