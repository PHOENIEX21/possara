# Photo picker/session resume repair — 2026-09-29

Reported symptom: selecting photos shows Loading, then an empty composer.

Cause: `hydrateUser` reset `loading`, role and email verification on every auth event, including repeated SIGNED_IN and TOKEN_REFRESHED for the same user. CreateContent and protected routes then unmounted the composers, discarding their in-memory File objects. Account-state RPCs also started inside the auth callback.

Changes:
- Refresh the same hydrated user in the background without resetting identity, verification or loading.
- Defer account-state RPCs until after the auth callback returns, following [Supabase's callback deadlock guidance](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).
- Preserve current verified state on transient refresh errors; authorization remains enforced by database policies. Actual sign-out clears state immediately. Version checks prevent stale responses from restoring a signed-out account.
- Post submission now has a lock/busy state covering classification and publishing, catches errors visibly, and tolerates unavailable local draft storage.

Verification:
- `node tests/auth-resume.mjs`: passed initial sign-in, repeated sign-in/token refresh, error and thrown network failures, sign-out during an in-flight refresh, different-account sign-in and timer cleanup.
- `node tests/moment-publishing.mjs`: passed existing Moment publish regression cases.
- Browser: used a real PNG File in each native file input; emitted SIGNED_IN and TOKEN_REFRESHED; confirmed the same preview DOM element stayed mounted; published both a post with its image URL and a Moment with its storage path; both returned to the feed. API writes were intercepted, so no real content was published.
- `npm run build`: passed TypeScript and Vite.
- `npm run lint`: passed with existing warnings. `git diff --check`: passed.

This verifies the browser return/session sequence; it does not automate the operating system's photo picker UI on a physical phone.
