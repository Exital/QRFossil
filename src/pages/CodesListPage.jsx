import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QrModal from "../components/modals/QrModal.jsx";
import { useApp } from "../context/AppContext.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import Banner from "../components/ui/Banner.jsx";
import { Card, StatusBadge } from "../components/ui/Banner.jsx";
import Icon from "../components/ui/Icon.jsx";
import QrPreview from "../components/qr/QrPreview.jsx";
import { defaultQr } from "../lib/utils.js";

export default function CodesListPage() {
  const { linkEntries, copyLink, assetUrl, permanentUrl } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [qrView, setQrView] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return linkEntries;
    return linkEntries.filter(
      ([slug, link]) =>
        slug.includes(q) ||
        (link.name || "").toLowerCase().includes(q) ||
        (link.destination || "").toLowerCase().includes(q)
    );
  }, [linkEntries, search]);

  return (
    <>
      <TopBar title="My QR Codes" search={search} onSearchChange={setSearch} />
      <Banner />
      <main className="flex-1 overflow-y-auto bg-background p-sm sm:p-gutter lg:p-margin-desktop">
        <div className="mb-gutter flex flex-wrap items-center justify-between gap-sm">
          <div className="min-w-0">
            <h2 className="text-headline-lg text-on-surface">My QR Codes</h2>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              {filtered.length === 1 ? "1 link" : `${filtered.length} links`}
            </p>
          </div>
          <Link
            to="/codes/new"
            className="flex shrink-0 items-center gap-xs rounded-lg bg-primary px-md py-sm text-on-primary shadow-sm hover:opacity-90"
          >
            <Icon name="add" size={18} />
            Create
          </Link>
        </div>

        {filtered.length === 0 ? (
          <Card className="text-center py-xl">
            <Icon name="qr_code_2" size={48} className="mx-auto mb-sm text-outline" />
            <p className="text-body-md text-on-surface-variant">
              {search ? "No codes match your search." : "No QR links yet. Create one to mint a permanent address."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-md">
            {filtered.map(([slug, link]) => (
              <Card key={slug} className="group transition-shadow hover:shadow-card-hover">
                <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-sm sm:gap-md">
                    <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-xl border border-card bg-white p-xs sm:h-[160px] sm:w-[160px]">
                      <QrPreview
                        data={permanentUrl(slug)}
                        qr={{ ...defaultQr(), ...(link.qr || {}), size: 320 }}
                        logoUrl={link.qr?.logo ? assetUrl(link.qr.logo) : ""}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-sm">
                        <h3 className="text-headline-sm text-on-surface">{link.name || slug}</h3>
                        <StatusBadge enabled={link.enabled} />
                      </div>
                      <p className="mt-xs font-mono text-label-sm text-on-surface-variant">/r/{slug}</p>
                      <p className="mt-xs truncate text-body-sm text-on-surface-variant">
                        {link.enabled ? link.destination : "Disabled — scans show a paused message"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-xs sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => copyLink(slug)}
                      className="rounded-lg border border-outline-variant px-sm py-xs text-label-sm shadow-card transition-colors hover:bg-surface-container-low"
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrView({ slug, link })}
                      className="rounded-lg border border-outline-variant px-sm py-xs text-label-sm shadow-card transition-colors hover:bg-surface-container-low"
                    >
                      QR
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/codes/${slug}`)}
                      className="rounded-lg bg-primary px-sm py-xs text-label-sm text-on-primary shadow-sm hover:opacity-90"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <QrModal
        open={Boolean(qrView)}
        link={qrView?.link}
        slug={qrView?.slug}
        qrData={qrView ? permanentUrl(qrView.slug) : ""}
        logoUrl={qrView?.link?.qr?.logo ? assetUrl(qrView.link.qr.logo) : ""}
        onClose={() => setQrView(null)}
      />
    </>
  );
}
