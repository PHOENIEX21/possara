import { Download, X } from "lucide-react";

export function ProfilePhotoViewer({
  src,
  name,
  onClose,
  downloadable = false,
}: {
  src: string;
  name: string;
  onClose: () => void;
  downloadable?: boolean;
}) {
  async function savePhoto() {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "possara-photo"}.${blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photo`}
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {downloadable && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); void savePhoto(); }}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Save photo to device"
            title="Save photo"
          >
            <Download size={22} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close photo"
        >
          <X size={24} />
        </button>
      </div>
      <div className="max-w-lg" onClick={(event) => event.stopPropagation()}>
        <img
          src={src}
          alt={name}
          className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
        <p className="mt-3 text-center text-sm font-medium text-white">{name}</p>
      </div>
    </div>
  );
}
