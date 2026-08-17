const DOT_TYPES = ["square", "rounded", "extra-rounded", "dots", "classy", "classy-rounded"];
const CORNER_TYPES = ["square", "rounded", "extra-rounded", "dot"];
const ECC = ["L", "M", "Q", "H"];

function QRCtor() {
  const ctor = window.QRCodeStyling;
  if (!ctor) throw new Error("QR generator failed to load.");
  return ctor;
}

function clamp(n, min, max) {
  const value = Number(n);
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeQr(qr = {}) {
  const dots = DOT_TYPES.includes(qr.dots) ? qr.dots : "rounded";
  const corners = CORNER_TYPES.includes(qr.corners) ? qr.corners : "rounded";
  return {
    foreground: qr.foreground || "#1c1a16",
    background: qr.background || "#e7e4dc",
    errorCorrection: ECC.includes(qr.errorCorrection) ? qr.errorCorrection : "H",
    dots,
    corners,
    logo: qr.logo || "",
    logoSize: clamp(qr.logoSize, 0.1, 0.4),
    size: clamp(qr.size, 128, 1024),
    margin: clamp(qr.margin, 0, 48),
  };
}

export function createQr(data, qr, imageUrl) {
  const settings = normalizeQr(qr);
  const Ctor = QRCtor();
  const hasImage = Boolean(imageUrl);
  return new Ctor({
    width: settings.size,
    height: settings.size,
    type: "canvas",
    data,
    image: hasImage ? imageUrl : undefined,
    margin: settings.margin,
    qrOptions: {
      errorCorrectionLevel: hasImage ? "H" : settings.errorCorrection,
    },
    dotsOptions: {
      color: settings.foreground,
      type: settings.dots,
    },
    backgroundOptions: {
      color: settings.background,
    },
    cornersSquareOptions: {
      color: settings.foreground,
      type: settings.corners === "dot" ? "dot" : settings.corners,
    },
    cornersDotOptions: {
      color: settings.foreground,
      type: settings.corners === "extra-rounded" ? "dot" : settings.corners === "rounded" ? "dot" : settings.corners,
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: settings.logoSize,
      margin: 4,
      crossOrigin: "anonymous",
    },
  });
}

export function renderQr(container, data, qr, imageUrl) {
  if (!container) return null;
  container.replaceChildren();
  const instance = createQr(data, qr, imageUrl);
  instance.append(container);
  return instance;
}

export async function downloadQr(data, qr, imageUrl, { name, extension }) {
  const instance = createQr(data, qr, imageUrl);
  await instance.download({ name: name || "qr", extension: extension || "png" });
}

export const DOT_OPTIONS = DOT_TYPES;
export const CORNER_OPTIONS = CORNER_TYPES;
export const ECC_OPTIONS = ECC;
