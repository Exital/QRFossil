import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../components/modals/ConfirmModal.jsx";
import TopBar from "../components/layout/TopBar.jsx";
import QrPreview, { DownloadButtons } from "../components/qr/QrPreview.jsx";
import Banner, { Breadcrumb, Card, StatusBadge } from "../components/ui/Banner.jsx";
import Icon from "../components/ui/Icon.jsx";
import Toggle from "../components/ui/Toggle.jsx";
import { CORNER_OPTIONS, DOT_OPTIONS, ECC_OPTIONS } from "../lib/qr.js";
import { useApp } from "../context/AppContext.jsx";
import { defaultQr, isValidHttpUrl } from "../lib/utils.js";

function emptyForm() {
  return {
    name: "",
    slug: "",
    destination: "",
    qr: defaultQr(),
  };
}

export default function EditorPage() {
  const { slug: routeSlug } = useParams();
  const navigate = useNavigate();
  const {
    config,
    linkEntries,
    requestWriteAccess,
    saveLink,
    toggleEnabled,
    deleteLink,
    slugify,
    assetUrl,
    permanentUrl,
    showToast,
  } = useApp();

  const isNew = routeSlug === "new";
  const existingSlug = isNew ? null : routeSlug;
  const existingLink = existingSlug && config?.links?.[existingSlug];
  const loadedSlug = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [pendingLogo, setPendingLogo] = useState(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [showDesign, setShowDesign] = useState(!isNew);
  const [downloadFormat, setDownloadFormat] = useState("svg");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (isNew) {
      loadedSlug.current = null;
      setForm(emptyForm());
      setSlugTouched(false);
      setPendingLogo(null);
      setLogoCleared(false);
      setShowDesign(false);
      return;
    }
    if (!config?.links?.[existingSlug]) return;
    if (loadedSlug.current === existingSlug) return;
    loadedSlug.current = existingSlug;
    const link = config.links[existingSlug];
    setForm({
      name: link.name || "",
      slug: existingSlug,
      destination: link.destination || "",
      qr: { ...defaultQr(), ...(link.qr || {}) },
    });
    setSlugTouched(true);
    setPendingLogo(null);
    setLogoCleared(false);
    setShowDesign(true);
  }, [isNew, existingSlug, config]);

  const previewSlug = slugify(form.slug) || "your-slug";
  const qrData = permanentUrl(previewSlug);
  const logoPreviewSrc = useMemo(() => {
    if (pendingLogo) return pendingLogo.blobUrl;
    if (logoCleared) return "";
    if (existingLink?.qr?.logo) return assetUrl(existingLink.qr.logo);
    return "";
  }, [pendingLogo, logoCleared, existingLink, assetUrl]);

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugTouched && isNew) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function updateQr(key, value) {
    setForm((prev) => ({ ...prev, qr: { ...prev.qr, [key]: value } }));
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (pendingLogo?.blobUrl) URL.revokeObjectURL(pendingLogo.blobUrl);
    if (!file) {
      setPendingLogo(null);
      return;
    }
    setPendingLogo({ file, blobUrl: URL.createObjectURL(file) });
    setLogoCleared(false);
  }

  function clearLogo() {
    if (pendingLogo?.blobUrl) URL.revokeObjectURL(pendingLogo.blobUrl);
    setPendingLogo(null);
    setLogoCleared(true);
  }

  async function handleSave() {
    setSaving(true);
    const access = await requestWriteAccess();
    if (!access.ok) {
      setSaving(false);
      return;
    }
    const ok = await saveLink({
      editingSlug: existingSlug,
      values: { ...form, slug: slugify(form.slug) },
      pendingLogo: pendingLogo?.file || null,
      logoCleared,
    });
    setSaving(false);
    if (ok) {
      if (pendingLogo?.blobUrl) URL.revokeObjectURL(pendingLogo.blobUrl);
      setPendingLogo(null);
      loadedSlug.current = null;
      navigate(`/codes/${slugify(form.slug)}`, { replace: true });
    }
  }

  async function handleToggleEnabled(enabled) {
    const access = await requestWriteAccess();
    if (!access.ok) return;
    await toggleEnabled(existingSlug, enabled);
  }

  async function handleTestLink() {
    if (!isValidHttpUrl(form.destination)) {
      showToast("Enter a valid destination URL first.", "error");
      return;
    }
    window.open(form.destination, "_blank", "noopener,noreferrer");
  }

  if (!isNew && config && !existingLink) {
    return (
      <>
        <TopBar title="QR Management" />
        <main className="flex flex-1 items-center justify-center p-gutter">
          <Card className="text-center">
            <p className="text-body-md text-on-surface-variant">QR code not found.</p>
            <Link to="/codes" className="mt-md inline-block text-primary hover:underline">
              Back to My QR Codes
            </Link>
          </Card>
        </main>
      </>
    );
  }

  const pageTitle = isNew ? "Create QR Code" : form.name || existingSlug;

  return (
    <>
      <TopBar title="QR Management" />
      <Banner />
      <main className="flex-1 overflow-y-auto bg-background p-gutter lg:p-margin-desktop">
        <div className="mb-gutter flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Breadcrumb
              items={[
                { label: "My QR Codes", to: "/codes" },
                { label: pageTitle },
              ]}
            />
            <h2 className="flex flex-wrap items-center gap-sm text-headline-lg text-on-surface">
              {pageTitle}
              {!isNew && existingLink && <StatusBadge enabled={existingLink.enabled} />}
            </h2>
          </div>
          {!isNew && existingLink && (
            <div className="flex items-center gap-sm">
              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    title: existingLink.enabled ? `Pause “${existingSlug}”?` : `Enable “${existingSlug}”?`,
                    body: existingLink.enabled
                      ? "Existing printed QR codes will show a paused message instead of redirecting."
                      : "Scans will redirect to the destination again.",
                    action: existingLink.enabled ? "Pause" : "Enable",
                    danger: false,
                    onConfirm: async () => {
                      setConfirm(null);
                      const access = await requestWriteAccess();
                      if (!access.ok) return;
                      const ok = await toggleEnabled(existingSlug, !existingLink.enabled);
                      if (ok) navigate("/codes");
                    },
                  })
                }
                className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-body-sm shadow-card transition-colors hover:bg-surface-container-low"
              >
                <Icon name={existingLink.enabled ? "pause" : "play_arrow"} size={18} />
                {existingLink.enabled ? "Pause" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    title: `Permanently delete “${existingSlug}”?`,
                    body: "Existing printed QR codes using this address will stop working.",
                    action: "Permanently Delete",
                    danger: true,
                    onConfirm: async () => {
                      setConfirm(null);
                      const access = await requestWriteAccess();
                      if (!access.ok) return;
                      const ok = await deleteLink(existingSlug);
                      if (ok) navigate("/codes");
                    },
                  })
                }
                className="flex items-center gap-xs rounded-lg border border-error/30 bg-surface-container-lowest px-sm py-xs text-body-sm text-error shadow-card transition-colors hover:bg-error-container"
              >
                <Icon name="delete" size={18} />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="flex flex-col gap-gutter lg:col-span-7">
            <Card>
              <div className="mb-sm flex items-center justify-between">
                <h3 className="flex items-center gap-xs text-headline-sm text-on-surface">
                  <Icon name="link" className="text-primary" />
                  Destination
                </h3>
                <span className="rounded bg-surface-container-low px-2 py-1 font-label-md text-body-sm text-on-surface-variant">
                  Dynamic QR
                </span>
              </div>
              <p className="mb-md text-body-sm text-on-surface-variant">
                Update where this QR code directs users without having to reprint it.
              </p>

              <label className="mb-sm block text-label-sm text-on-surface-variant">Name</label>
              <input
                className="mb-md w-full rounded-[16px] border border-card bg-surface px-sm py-sm text-body-md outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(79,70,229,0.2)] focus:ring-0"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                maxLength={80}
                placeholder="Q3 Marketing Campaign"
              />

              <label className="mb-sm block text-label-sm text-on-surface-variant">Slug</label>
              <input
                className="mb-md w-full rounded-[16px] border border-card bg-surface px-sm py-sm font-mono text-body-md outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(79,70,229,0.2)] focus:ring-0 disabled:opacity-60"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  updateField("slug", e.target.value);
                }}
                readOnly={!isNew}
                maxLength={64}
                spellCheck={false}
                placeholder="q3-marketing"
              />

              <p className="mb-md font-mono text-label-sm text-on-surface-variant">
                Permanent URL: {qrData}
              </p>

              <div className="flex flex-col gap-sm sm:flex-row">
                <div className="relative flex-1">
                  <Icon
                    name="language"
                    size={20}
                    className="absolute left-sm top-1/2 -translate-y-1/2 text-outline"
                  />
                  <input
                    className="w-full rounded-[16px] border border-card bg-surface py-sm pl-xl pr-sm text-body-md outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(79,70,229,0.2)] focus:ring-0"
                    type="url"
                    value={form.destination}
                    onChange={(e) => updateField("destination", e.target.value)}
                    placeholder="https://example.com/campaign"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="rounded-[16px] border border-outline-variant bg-surface px-md py-sm font-label-md shadow-sm transition-colors hover:bg-surface-container-low"
                >
                  Test Link
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-[16px] bg-primary px-md py-sm font-label-md text-on-primary shadow-sm transition-colors hover:bg-surface-tint disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </Card>

            <Card>
              <div className="mb-md flex items-center justify-between">
                <h3 className="text-headline-sm text-on-surface">Design & Advanced</h3>
                <button
                  type="button"
                  onClick={() => setShowDesign(!showDesign)}
                  className="flex items-center gap-xs font-label-sm text-primary hover:text-primary-container"
                >
                  <Icon name="palette" size={16} />
                  {showDesign ? "Hide design" : "Design"}
                </button>
              </div>

              {showDesign && (
                <div className="space-y-md border-b border-outline-variant/50 pb-md">
                  <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
                    <label className="text-label-sm text-on-surface-variant">
                      Foreground
                      <input
                        type="color"
                        className="mt-xs h-10 w-full cursor-pointer rounded-lg border border-outline-variant"
                        value={form.qr.foreground}
                        onChange={(e) => updateQr("foreground", e.target.value)}
                      />
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      Background
                      <input
                        type="color"
                        className="mt-xs h-10 w-full cursor-pointer rounded-lg border border-outline-variant"
                        value={form.qr.background}
                        onChange={(e) => updateQr("background", e.target.value)}
                      />
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      Error correction
                      <select
                        className="mt-xs w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-xs py-xs text-body-sm"
                        value={form.qr.errorCorrection}
                        onChange={(e) => updateQr("errorCorrection", e.target.value)}
                      >
                        {ECC_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      Dot style
                      <select
                        className="mt-xs w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-xs py-xs text-body-sm"
                        value={form.qr.dots}
                        onChange={(e) => updateQr("dots", e.target.value)}
                      >
                        {DOT_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      Corner style
                      <select
                        className="mt-xs w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-xs py-xs text-body-sm"
                        value={form.qr.corners}
                        onChange={(e) => updateQr("corners", e.target.value)}
                      >
                        {CORNER_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      QR size ({form.qr.size}px)
                      <input
                        type="range"
                        min={160}
                        max={512}
                        step={8}
                        className="mt-xs w-full"
                        value={form.qr.size}
                        onChange={(e) => updateQr("size", Number(e.target.value))}
                      />
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      Margin ({form.qr.margin})
                      <input
                        type="range"
                        min={0}
                        max={32}
                        step={1}
                        className="mt-xs w-full"
                        value={form.qr.margin}
                        onChange={(e) => updateQr("margin", Number(e.target.value))}
                      />
                    </label>
                    <label className="text-label-sm text-on-surface-variant">
                      Logo size
                      <input
                        type="range"
                        min={0.12}
                        max={0.32}
                        step={0.02}
                        className="mt-xs w-full"
                        value={form.qr.logoSize}
                        onChange={(e) => updateQr("logoSize", Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <label className="block text-label-sm text-on-surface-variant">
                    Logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                      className="mt-xs block w-full text-body-sm"
                      onChange={handleLogoChange}
                    />
                  </label>
                  {(logoPreviewSrc || pendingLogo) && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="text-body-sm text-error hover:underline"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              )}

              <div className="mt-md space-y-md">
                <div className="flex items-center justify-between py-sm">
                  <div>
                    <h4 className="font-semibold text-on-surface">Status</h4>
                    <p className="text-body-sm text-on-surface-variant">
                      {existingLink?.enabled !== false ? "Code is active and redirecting." : "Code is paused."}
                    </p>
                  </div>
                  {!isNew && existingLink && (
                    <Toggle
                      id="enabled-toggle"
                      checked={existingLink.enabled !== false}
                      onChange={handleToggleEnabled}
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-gutter lg:col-span-5">
            <Card className="flex flex-col items-center">
              <div className="mb-md flex w-full items-center justify-between">
                <h3 className="text-headline-sm text-on-surface">Preview</h3>
              </div>
              <div className="relative mb-lg mx-auto flex aspect-square w-full max-w-[360px] shrink-0 items-center justify-center rounded-2xl border border-card bg-white p-md shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
                <QrPreview data={qrData} qr={form.qr} logoUrl={logoPreviewSrc} className="flex h-full w-full items-center justify-center" />
              </div>
              <DownloadButtons
                data={qrData}
                qr={form.qr}
                logoUrl={logoPreviewSrc}
                slug={previewSlug}
                format={downloadFormat}
                onFormatChange={setDownloadFormat}
              />
            </Card>

            {!isNew && (
              <Card className="flex items-center justify-between transition-all hover:shadow-card-hover">
                <div>
                  <p className="mb-xs text-body-sm text-on-surface-variant">Total codes</p>
                  <h3 className="text-[40px] font-bold tracking-tight text-on-surface">{linkEntries.length}</h3>
                </div>
                <Icon name="arrow_forward" className="text-outline" />
              </Card>
            )}
          </div>
        </div>
      </main>

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title}
        body={confirm?.body}
        action={confirm?.action}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </>
  );
}
