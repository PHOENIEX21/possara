# Android Moment photo recovery — 2026-09-30

The user confirmed Android shows Loading and then loses selected Moment photos after the earlier session-refresh fix.

Changes:
- The create page no longer replaces an identified user's composer with a loading placeholder. Composers are keyed by user ID so account changes still reset them.
- Copy native photo bytes before clearing the file input. Detect JPEG/PNG/WebP from their signatures, accepting empty/generic Android provider MIME values without blindly trusting file extensions.
- Save selected photo Files in IndexedDB under the user/organization draft key. Restore them after remount/reload; expire recovery after 24 hours and clear after publication/removal.
- Show preparation, restoration, unreadable photo and device-storage errors near the preview. Block publishing while photo copying/restoration is in progress.

Verification:
- `node --experimental-strip-types tests/moment-photo-copy.mjs`: passed missing/generic MIME, independent file copy, JPEG/PNG/WebP detection, unsupported/empty/oversized/unreadable files.
- `npm run build`: TypeScript and Vite passed.
- `npm run lint`: passed with existing warnings.
- Browser with isolated API fixtures: generated a valid PNG using Canvas and selected it with an empty MIME type; verified naturalWidth > 0. Forced auth loading=true and emitted session refresh; the same preview remained mounted.
- Full browser reload (not just rerender): the photo restored from IndexedDB with a visible decoded preview; publishing sent its storage path and returned to the feed; draft storage was empty afterward.
- Production's previous composer response had `Cache-Control: public, max-age=0, must-revalidate` and the expected previous build. No evidence of stale server HTML.

No real user content was posted during these tests. Android's native OS picker was not automated on a physical device; the reported handoff, missing MIME, loading and page-reload scenarios were tested in the browser.
