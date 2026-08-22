import QRCodeStyling from "qr-code-styling";

const DOT_TYPES = ["square", "rounded", "extra-rounded", "dots", "classy", "classy-rounded"];
const CORNER_TYPES = ["square", "rounded", "extra-rounded", "dot"];
const ECC = ["L", "M", "Q", "H"];

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

function imageOptions(logoSize) {
  return {
    hideBackgroundDots: true,
    imageSize: logoSize,
    margin: 4,
    saveAsBlob: false,
  };
}

export function createQr(data, qr, imageUrl) {
  const settings = normalizeQr(qr);
  const hasImage = Boolean(imageUrl);
  return new QRCodeStyling({
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
    imageOptions: imageOptions(settings.logoSize),
  });
}

function loadHtmlImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo could not be loaded."));
    img.src = url;
  });
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("QR render failed."));
    };
    img.src = url;
  });
}

function rasterizeImage(img) {
  const width = Math.max(img.naturalWidth || 0, img.width || 0, 256);
  const height = Math.max(img.naturalHeight || 0, img.height || 0, 256);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, width, height);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export async function prepareQrImage(url) {
  if (!url) return "";
  try {
    const img = await loadHtmlImage(url);
    return rasterizeImage(img);
  } catch {
    return "";
  }
}

function paintLogo(ctx, logo, settings) {
  const inner = Math.max(1, settings.size - 2 * settings.margin);
  const box = inner * settings.logoSize;
  const x = (settings.size - box) / 2;
  const y = (settings.size - box) / 2;
  ctx.fillStyle = settings.background;
  ctx.fillRect(x, y, box, box);
  ctx.drawImage(logo, x, y, box, box);
}

async function compositeQr(data, qr, imageUrl) {
  const settings = normalizeQr(qr);
  const instance = createQr(data, qr, imageUrl);
  const blob = await instance.getRawData("png");
  if (!blob) throw new Error("QR generator failed.");
  const qrImg = await blobToImage(blob);
  const canvas = document.createElement("canvas");
  canvas.width = settings.size;
  canvas.height = settings.size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("QR generator failed.");
  ctx.drawImage(qrImg, 0, 0, settings.size, settings.size);
  if (imageUrl) {
    const logo = await loadHtmlImage(imageUrl);
    paintLogo(ctx, logo, settings);
  }
  return canvas;
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function renderQr(container, data, qr, imageUrl, { fit = false } = {}) {
  if (!container) return null;
  const canvas = await compositeQr(data, qr, imageUrl);
  if (fit) {
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
  }
  container.replaceChildren(canvas);
  return canvas;
}

export async function downloadQr(data, qr, imageUrl, { name, extension }) {
  const src = await prepareQrImage(imageUrl);
  const canvas = await compositeQr(data, qr, src);
  const file = name || "qr";
  if (extension === "svg") {
    const png = canvas.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${png}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    triggerDownload(href, `${file}.svg`);
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return;
  }
  triggerDownload(canvas.toDataURL("image/png"), `${file}.png`);
}

export const DOT_OPTIONS = DOT_TYPES;
export const CORNER_OPTIONS = CORNER_TYPES;
export const ECC_OPTIONS = ECC;
