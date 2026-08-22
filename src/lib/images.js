export function readFileBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(file);
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a usable image."));
    };
    img.src = url;
  });
}

export async function prepareImageBytes(file, extensionForFile) {
  if (file.size > 2_000_000) throw new Error("Logo must be under 2 MB.");
  if (file.type === "image/svg+xml" || extensionForFile(file) === "svg") {
    if (file.size > 400_000) throw new Error("SVG logo must be under 400 KB.");
    return { bytes: await readFileBytes(file), ext: "svg" };
  }
  const bitmap = await fileToImage(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  if (!blob) throw new Error("Could not process that image.");
  if (blob.size > 700_000) throw new Error("Processed logo is too large for GitHub file updates.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: "png" };
}
