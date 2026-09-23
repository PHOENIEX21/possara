export const DOCUMENT_TYPES = [
  { label: "PDF", mime: "application/pdf", extensions: ["pdf"] },
  { label: "Word", mime: "application/msword", extensions: ["doc"] },
  { label: "Word (.docx)", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extensions: ["docx"] },
  { label: "JPG", mime: "image/jpeg", extensions: ["jpg", "jpeg"] },
  { label: "PNG", mime: "image/png", extensions: ["png"] },
  { label: "WebP", mime: "image/webp", extensions: ["webp"] },
];
export const DEFAULT_DOCUMENT_TYPES = DOCUMENT_TYPES.map(item => item.mime);
export type ApplicationDefaults = { labels: string[]; accept: string[]; required: boolean };
export const DEFAULT_APPLICATION: ApplicationDefaults = { labels: ["CV / résumé"], accept: DEFAULT_DOCUMENT_TYPES, required: true };

export function documentMime(file: Pick<File, "name" | "type">) {
  const type = file.type.toLowerCase().split(";")[0].trim();
  if (DEFAULT_DOCUMENT_TYPES.includes(type)) return type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!type || ["application/octet-stream", "application/zip", "image/jpg", "application/x-pdf"].includes(type)) {
    return DOCUMENT_TYPES.find(item => item.extensions.includes(extension || ""))?.mime || type;
  }
  return type;
}
export function documentAccept(types: string[]) {
  return [...types, ...DOCUMENT_TYPES.filter(item => types.includes(item.mime)).flatMap(item => item.extensions.map(ext => `.${ext}`))].join(",");
}
export function uploadErrorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error ? String(error.message) : "Upload failed. Check your connection and choose the file again.";
}
export function validateApplicationDefaults(value: ApplicationDefaults) {
  const labels = value.labels.map(label => label.trim());
  if (!labels.length || labels.some(label => !label)) throw new Error("Give every upload field a name.");
  if (new Set(labels.map(label => label.toLowerCase())).size !== labels.length) throw new Error("Use a different name for each upload field.");
  if (!value.accept.length) throw new Error("Choose at least one accepted file format.");
  return { ...value, labels };
}
