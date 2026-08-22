import { useState } from "react";
import QrPreview, { DownloadButtons } from "../qr/QrPreview.jsx";
import Icon from "../ui/Icon.jsx";
import { defaultQr } from "../../lib/utils.js";

export default function QrModal({ open, link, slug, qrData, logoUrl, onClose }) {
  const [format, setFormat] = useState("svg");
  if (!open || !link) return null;

  const qr = { ...defaultQr(), ...(link.qr || {}) };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/60 p-md backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-card"
        role="dialog"
        aria-labelledby="qr-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-md flex items-center justify-between">
          <h2 id="qr-modal-title" className="text-headline-sm text-on-surface">
            {link.name || slug}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-xs hover:bg-surface-container-low">
            <Icon name="close" />
          </button>
        </div>
        <p className="mb-md break-all font-mono text-label-sm text-on-surface-variant">{qrData}</p>
        <div className="mb-md flex h-64 items-center justify-center rounded-xl border border-card bg-white p-md">
          <QrPreview data={qrData} qr={qr} logoUrl={logoUrl} className="flex h-full w-full items-center justify-center" />
        </div>
        <DownloadButtons
          data={qrData}
          qr={qr}
          logoUrl={logoUrl}
          slug={slug}
          format={format}
          onFormatChange={setFormat}
        />
      </div>
    </div>
  );
}
