import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import Banner from "../components/ui/Banner.jsx";
import { Card, StatusBadge } from "../components/ui/Banner.jsx";
import Icon from "../components/ui/Icon.jsx";
import QrPreview from "../components/qr/QrPreview.jsx";
import { defaultQr } from "../lib/utils.js";

export default function DashboardPage() {
  const { linkEntries, siteName, baseUrl, copyLink, permanentUrl, assetUrl } = useApp();
  const navigate = useNavigate();

  const active = linkEntries.filter(([, l]) => l.enabled).length;
  const paused = linkEntries.length - active;

  return (
    <>
      <TopBar title="Dashboard" />
      <Banner />
      <main className="flex-1 overflow-y-auto bg-background p-gutter lg:p-margin-desktop">
        <div className="mb-gutter">
          <h2 className="text-headline-lg text-on-surface">Welcome back</h2>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            Manage dynamic QR codes stored in your GitHub repository — no backend required.
          </p>
        </div>

        <div className="mb-gutter grid grid-cols-1 gap-gutter sm:grid-cols-3">
          <Card>
            <p className="text-body-sm text-on-surface-variant">Total QR Codes</p>
            <p className="mt-xs text-[32px] font-bold tracking-tight text-on-surface">{linkEntries.length}</p>
          </Card>
          <Card>
            <p className="text-body-sm text-on-surface-variant">Active</p>
            <p className="mt-xs text-[32px] font-bold tracking-tight text-active-text">{active}</p>
          </Card>
          <Card>
            <p className="text-body-sm text-on-surface-variant">Paused</p>
            <p className="mt-xs text-[32px] font-bold tracking-tight text-disabled-text">{paused}</p>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-md">
          <h3 className="text-headline-sm text-on-surface">Recent codes</h3>
          <Link to="/codes" className="text-body-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        {linkEntries.length === 0 ? (
          <Card className="text-center">
            <Icon name="qr_code_2" size={48} className="mx-auto mb-sm text-outline" />
            <p className="text-body-md text-on-surface-variant">
              No QR links yet. Create one to mint a permanent address.
            </p>
            <button
              type="button"
              onClick={() => navigate("/codes/new")}
              className="mt-md rounded-lg bg-primary px-md py-sm text-on-primary shadow-sm hover:opacity-90"
            >
              Create your first QR
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
            {linkEntries.slice(0, 4).map(([slug, link]) => (
              <Card
                key={slug}
                className="cursor-pointer transition-shadow hover:shadow-card-hover"
                onClick={() => navigate(`/codes/${slug}`)}
              >
                <div className="flex items-start gap-md">
                  <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-card bg-white p-xs">
                    <QrPreview
                      data={permanentUrl(slug)}
                      qr={{ ...defaultQr(), ...(link.qr || {}), size: 160 }}
                      logoUrl={link.qr?.logo ? assetUrl(link.qr.logo) : ""}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-sm">
                      <div className="min-w-0">
                        <h4 className="text-headline-sm text-on-surface">{link.name || slug}</h4>
                        <p className="mt-xs font-mono text-label-sm text-on-surface-variant">/r/{slug}</p>
                      </div>
                      <StatusBadge enabled={link.enabled} />
                    </div>
                    <p className="mt-sm truncate text-body-sm text-on-surface-variant">
                      {link.enabled ? link.destination : "Disabled"}
                    </p>
                    <div className="mt-md flex gap-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyLink(slug);
                        }}
                        className="rounded-lg border border-outline-variant px-sm py-xs text-label-sm hover:bg-surface-container-low"
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/codes/${slug}`);
                        }}
                        className="rounded-lg bg-primary/10 px-sm py-xs text-label-sm text-primary hover:bg-primary/20"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-gutter">
          <h3 className="text-headline-sm text-on-surface">{siteName}</h3>
          <p className="mt-xs font-mono text-label-sm text-on-surface-variant">{baseUrl || "Configure site URL in Settings"}</p>
        </Card>
      </main>
    </>
  );
}
