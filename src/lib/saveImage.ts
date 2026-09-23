export async function saveImage(src: string, name = "possara-photo") {
  const response = await fetch(src);
  if (!response.ok) throw new Error("This photo could not be downloaded. Try opening the original image.");
  const blob = await response.blob();
  if (!blob.size || (blob.type && !blob.type.startsWith("image/") && blob.type !== "application/octet-stream")) {
    throw new Error("The image is unavailable. Try reopening the photo.");
  }
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg" };
  const suffix = new URL(src, window.location.href).pathname.match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1];
  const filename = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "possara-photo";
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${filename}.${extensions[blob.type] || suffix || "jpg"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
