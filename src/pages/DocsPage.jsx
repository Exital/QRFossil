import { Link } from "react-router-dom";
import TopBar from "../components/layout/TopBar.jsx";
import { UPSTREAM_REPO } from "../components/layout/Sidebar.jsx";
import Banner, { Card } from "../components/ui/Banner.jsx";

function Code({ children }) {
  return <span className="break-all font-mono text-[0.9em] text-on-surface">{children}</span>;
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24">
      <h3 className="mb-sm text-headline-sm text-on-surface">{title}</h3>
      <div className="min-w-0 space-y-sm break-words text-body-sm text-on-surface-variant sm:text-body-md">
        {children}
      </div>
    </section>
  );
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const TOC = [
  ["overview", "Overview"],
  ["setup", "Setup"],
  ["codes", "QR codes"],
  ["design", "Design"],
  ["auth", "Editing & auth"],
  ["redirects", "Redirects"],
  ["settings", "Settings"],
  ["local", "Local preview"],
  ["build", "Building"],
];

export default function DocsPage() {
  return (
    <>
      <TopBar title="Docs" />
      <Banner />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background p-sm sm:p-gutter lg:p-margin-desktop">
        <div className="mb-gutter w-full max-w-3xl min-w-0">
          <h2 className="text-headline-md text-on-surface sm:text-headline-lg">How QRFossil works</h2>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            Dynamic QR codes hosted on GitHub Pages — no backend, database, or subscription. Your fork is the product.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-gutter">
          <Card className="min-w-0 overflow-hidden p-sm sm:p-md">
            <nav className="flex flex-wrap gap-xs sm:gap-sm text-body-sm">
              {TOC.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className="rounded-lg bg-surface-container-low px-sm py-xs text-primary hover:bg-surface-container-high"
                >
                  {label}
                </button>
              ))}
            </nav>
          </Card>

          <Card className="min-w-0 space-y-gutter overflow-hidden p-sm sm:p-md">
            <Section id="overview" title="Overview">
              <p>
                QRFossil stores configuration in your GitHub repository and serves a static dashboard from GitHub Pages.
                A printed QR encodes a <strong className="text-on-surface">permanent address</strong> on your site (for
                example <Code>…/r/menu</Code>). The destination URL can change later without reprinting.
              </p>
              <ul className="list-disc space-y-xs pl-md">
                <li>
                  <strong className="text-on-surface">Dashboard</strong> — React app in <Code>index.html</Code> +{" "}
                  <Code>app-assets/</Code>
                </li>
                <li>
                  <strong className="text-on-surface">Data</strong> — <Code>data/qrfossil.json</Code> (links + design) and{" "}
                  <Code>data/redirects.json</Code> (fast lookup for scanners)
                </li>
                <li>
                  <strong className="text-on-surface">Redirects</strong> — unknown paths like <Code>/r/slug</Code> fall
                  through to <Code>404.html</Code>, which loads <Code>public/redirect.js</Code>
                </li>
                <li>
                  <strong className="text-on-surface">Writes</strong> — browser → GitHub Contents API (or local preview
                  writer)
                </li>
              </ul>
            </Section>

            <Section id="setup" title="Get your own site">
              <ol className="list-decimal space-y-xs pl-md">
                <li>
                  Fork{" "}
                  <a className="text-primary hover:underline" href={UPSTREAM_REPO} target="_blank" rel="noopener noreferrer">
                    Exital/QRFossil
                  </a>
                </li>
                <li>
                  Repository → Settings → Pages → Deploy from <strong className="text-on-surface">main</strong>, folder{" "}
                  <strong className="text-on-surface">/</strong>
                </li>
                <li>
                  Open <Code>https://YOUR_USERNAME.github.io/QRFossil</Code>
                </li>
                <li>
                  Complete <Link className="text-primary hover:underline" to="/settings">Settings</Link> if prompted, then
                  create a QR
                </li>
              </ol>
            </Section>

            <Section id="codes" title="My QR Codes">
              <p>
                Each code has a <strong className="text-on-surface">name</strong>,{" "}
                <strong className="text-on-surface">slug</strong>, and{" "}
                <strong className="text-on-surface">destination URL</strong>. The slug becomes the permanent path{" "}
                <Code>/r/your-slug</Code>.
              </p>
              <ul className="list-disc space-y-xs pl-md">
                <li>
                  <Link className="text-primary hover:underline" to="/codes">
                    My QR Codes
                  </Link>{" "}
                  — search, copy link, preview QR, manage
                </li>
                <li>
                  <strong className="text-on-surface">Pause</strong> — printed codes stay valid but show a disabled message
                  instead of redirecting
                </li>
                <li>
                  <strong className="text-on-surface">Delete</strong> — removes the slug; existing prints stop working
                </li>
              </ul>
            </Section>

            <Section id="design" title="Design & download">
              <p>
                In the editor, open <strong className="text-on-surface">Design</strong> to set colors, dot/corner styles,
                size, margin, error correction, and an optional logo. Downloads are available as PNG (web) or SVG
                (vector/print).
              </p>
              <p>
                The preview always encodes the <em>permanent</em> URL, not the destination — so scanners hit your GitHub
                Pages redirect, not the final site directly.
              </p>
            </Section>

            <Section id="auth" title="Editing & GitHub token">
              <p>
                Viewing and downloading need no token. Saving, pausing, or deleting asks for a{" "}
                <strong className="text-on-surface">fine-grained personal access token</strong> for your fork only, with{" "}
                <strong className="text-on-surface">Contents → Read and write</strong>.
              </p>
              <p>
                The token lives in <Code>sessionStorage</Code> for this tab until you use{" "}
                <strong className="text-on-surface">Forget Token</strong> or close the session. It is never written into the
                repo or QR data.
              </p>
            </Section>

            <Section id="redirects" title="What scanners see">
              <p>
                Preferred: <Code>https://YOUR_USERNAME.github.io/QRFossil/r/menu</Code>
              </p>
              <p>
                Fallback: <Code>…/r/?id=menu</Code>
              </p>
              <p>
                The camera shows that URL (or your custom domain). After open, GitHub Pages briefly shows a wait page, then
                redirects to the destination from <Code>redirects.json</Code>.
              </p>
            </Section>

            <Section id="settings" title="Site settings fields">
              <ul className="list-disc space-y-xs pl-md">
                <li>
                  <strong className="text-on-surface">Site URL</strong> — public base embedded in printed codes
                </li>
                <li>
                  <strong className="text-on-surface">GitHub username / repository</strong> — which repo the dashboard writes
                  to when you save. Needed separately from Site URL when you use a custom domain or non-standard Pages
                  layout
                </li>
                <li>
                  <strong className="text-on-surface">Site name</strong> — branding in the sidebar
                </li>
              </ul>
            </Section>

            <Section id="local" title="Local preview">
              <p>
                For development, build the dashboard then run the Python preview server (mimics Pages 404 fallback and
                allows local saves without a GitHub token):
              </p>
              <pre className="max-w-full overflow-x-auto rounded-lg bg-surface-container-low p-sm font-mono text-label-sm text-on-surface whitespace-pre">
                {`docker compose run --rm pages
python3 scripts/preview.py`}
              </pre>
              <p>
                Open <Code>http://127.0.0.1:8765/</Code>. Saves write <Code>data/</Code> on disk; nothing is committed until
                you <Code>git commit</Code>.
              </p>
            </Section>

            <Section id="build" title="Building for GitHub Pages">
              <p>
                Source lives under <Code>src/</Code>. Pages serves the compiled <Code>index.html</Code> and{" "}
                <Code>app-assets/</Code> at the repo root — not <Code>dist/</Code> (gitignored).
              </p>
              <pre className="max-w-full overflow-x-auto rounded-lg bg-surface-container-low p-sm font-mono text-label-sm text-on-surface whitespace-pre">
                docker compose run --rm pages
              </pre>
              <p>
                Then commit the generated files and push <Code>main</Code>. Keep your <Code>data/</Code> and{" "}
                <Code>assets/logos/</Code> when pulling upstream updates.
              </p>
            </Section>
          </Card>

          <Card className="min-w-0 overflow-hidden p-sm sm:p-md">
            <p className="break-all text-body-sm text-on-surface-variant">
              Upstream project:{" "}
              <a className="text-primary hover:underline" href={UPSTREAM_REPO} target="_blank" rel="noopener noreferrer">
                {UPSTREAM_REPO}
              </a>
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
