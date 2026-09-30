# iOS Moment compatibility — 2026-09-30

- Existing composer-preservation and IndexedDB draft recovery remain platform-independent.
- Added HEIC/HEIF selection and signature recognition. Native browser decoding converts the photo to JPEG, at most 2048 pixels on its longest side, for the existing Moment storage allowlist. No new dependencies or database changes.
- Unsupported HEIC decoding explains how to use a JPEG copy; invalid photos are not silently accepted. Input and output retain the 8 MB limit.
- Reconstruct File names/types if draft storage returns plain Blobs.
- Bound IndexedDB open/read/write waits to five seconds so unavailable device storage does not indefinitely disable selection or publishing.
- `tests/ios-moment-photos.mjs`: HEIC header detection, native-decoder handoff (mocked), conversion dimensions, JPEG type/name, cleanup and unsupported-decoder error passed.
- `tests/moment-photo-copy.mjs`: Android and normal image regression tests passed.
- Actual browser Canvas JPEG conversion and IndexedDB Blob-to-File recovery passed. Used a PNG for the real decoding test; native HEIC decoding is not available in the Windows browser used here.
- TypeScript/Vite production build and lint passed (existing lint warnings).
- Physical iPhone/Safari picker and native HEIC decoding remain untested on hardware. Safari 17+ HEIC support is documented by [WebKit](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/).
