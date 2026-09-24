import { useEffect, useMemo, useRef } from "react";
import { downloadQr, prepareQrImage, renderQr } from "../../lib/qr.js";
import { defaultQr } from "../../lib/utils.js";
import Icon from "../ui/Icon.jsx";

const PREVIEW_DEBOUNCE_MS = 120;

export default function QrPreview({ data, qr, logoUrl, className = "" }) {
  const mountRef = useRef(null);
  const seqRef = useRef(0);

  const qrSettings = useMemo(() => ({ ...defaultQr(), ...(qr || {}) }), [qr]);
  const qrKey = useMemo(() => JSON.stringify(qrSettings), [qrSettings]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const seq = ++seqRef.current;
        if (!mountRef.current || !data) return;

        const src = logoUrl ? await prepareQrImage(logoUrl) : "";
        if (cancelled || seq !== seqRef.current) return;

        try {
          await renderQr(mountRef.current, data, qrSettings, src, { fit: true });
        } catch {
          if (!cancelled && seq === seqRef.current && mountRef.current) {
            mountRef.current.textContent = "Preview unavailable.";
          }
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [data, qrKey, qrSettings, logoUrl]);

  return (
    <div className={`relative flex items-center justify-center ${className}`} aria-label="QR code preview">
      <div ref={mountRef} className="flex h-full w-full items-center justify-center overflow-hidden" />
    </div>
  );
}

export function DownloadButtons({ data, qr, logoUrl, slug, format, onFormatChange }) {
  async function handleDownload(ext) {
    const src = logoUrl ? await prepareQrImage(logoUrl) : "";
    await downloadQr(data, qr, src, { name: slug, extension: ext });
  }

  const formats = [
    { id: "png", label: "PNG", sub: "For Web" },
    { id: "svg", label: "SVG", sub: "Vector" },
  ];

  return (
    <div className="w-full space-y-sm">
      <h4 className="mb-xs text-center font-label-md text-on-surface-variant">Download Format</h4>
      <div className="grid grid-cols-2 gap-xs">
        {formats.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFormatChange(f.id)}
            className={`flex flex-col items-center justify-center rounded-lg border p-sm transition-colors ${
              format === f.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-card hover:border-primary hover:bg-primary/5 group"
            }`}
          >
            <span className={`font-label-md ${format === f.id ? "font-bold" : "text-on-surface group-hover:text-primary"}`}>
              {f.label}
            </span>
            <span className={`text-[10px] ${format === f.id ? "opacity-80" : "text-on-surface-variant"}`}>{f.sub}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => handleDownload(format)}
        className="mt-sm flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-sm font-label-md text-on-primary shadow-sm transition-opacity hover:opacity-90"
      >
        <Icon name="download" size={18} />
        Download {format.toUpperCase()}
      </button>
    </div>
  );
}
