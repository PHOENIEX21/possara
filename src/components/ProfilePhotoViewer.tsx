import { X } from "lucide-react";

export function ProfilePhotoViewer({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} profile photo`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close profile photo"
      >
        <X size={24} />
      </button>
      <div className="max-w-lg" onClick={(event) => event.stopPropagation()}>
        <img
          src={src}
          alt={`${name} profile`}
          className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
        <p className="mt-3 text-center text-sm font-medium text-white">{name}</p>
      </div>
    </div>
  );
}
