import { PhotoViewer } from "./PhotoViewer";

export function ProfilePhotoViewer({ src, name, onClose }: {
  src: string;
  name: string;
  onClose: () => void;
  downloadable?: boolean;
}) {
  return <PhotoViewer urls={[src]} title={name} onClose={onClose} />;
}
