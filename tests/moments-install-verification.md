# Moments, notifications, and installation

## Implemented

- `/moments/:id` opens the selected Moment. Expired, deleted, or inaccessible Moments have an explicit unavailable state.
- Moment reply/reaction links open and highlight the relevant interaction. Comment links open the discussion and highlight the selected comment, with a message for deleted comments.
- Moment terminology covers creation, viewing, accessibility labels, and saved filenames.
- Watched Moments use persisted `story_views` records and a gray ring / Viewed label; new Moments in a group remain unread.
- Names link directly to profiles or organization pages in Moment cards, headers, viewers, replies, notifications, reaction summaries, messages, study discussions, team members, applicant review, and admin lists.
- The prepared migration adds actor identity to notifications, fixes new content destinations, and recovers legacy Moment links only where unambiguous. Unrecoverable legacy Moment notifications get an unavailable destination rather than another person's profile or a different Moment.
- Prepared opportunity digest: up to two suggestions per three days on returning to the app, using category, skills/profession, location, deadlines, and notification preferences. No repeat listing recommendations. Incomplete profiles get a reminder at most once per 14 days, linking directly to the editor.
- A shared install controller captures browser install events at startup, displays a dismissible prompt, and remembers accepted installations. Seven-day dismissal cooldown; installed-state synchronization across tabs; standalone detection; manual Safari instructions. Browser storage clearing or separate browser profiles can remove the remembered state.
- Manifest and favicon now use the current gradient P logo. PNG sizes: 180, 192, 512, plus a maskable 512 icon. Stable manifest identity remains `/`. Existing OS shortcuts can retain their cached icon until the browser updates them, or until the shortcut is reinstalled.

## Verification

- TypeScript and production build pass.
- Local PostgreSQL (PGlite) migration and trigger tests: exact Moment/comment/reaction destinations, actor identity, organization Moments, profile reminder deduplication, matching, location/deadline filtering, two-result limit, three-day rate limit, opt-out, and anonymous execution denial. This is an isolated schema fixture, not a claim of live Supabase end-to-end verification.
- Browser fixture checks pass: second-Moment notification opens the second Moment; author profile link; saved view; gray Viewed state after reload; exact reply; unavailable Moment; highlighted comment.
- Install browser checks pass: event makes prompt visible; native prompt invoked once; accepted install hides banner and menu button; remains suppressed after full reload; dismissal cooldown; failed installer gives an error and releases the busy state; mobile banner fits at 390px without overflow.
- `tests/install-assets.mjs` checks PNG dimensions, manifest identity, maskable and Apple icon references. Rendered icon inspected visually.
- Mobile screenshot: `tests/install-prompt-mobile.png`. No nested interactive elements on the tested feed.
- Targeted lint has no errors. Existing warnings remain in main.tsx, AppLayout, Profile, and Messages (Fast Refresh and hook/state patterns).
- Read-only Supabase security advisor review performed before migration. Existing advisories include intentional public profile/statistics RPCs, authenticated definer RPCs, an internal table without client policies, and leaked-password protection disabled. These predate this change. References: https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Production boundary

Automatic approval review rejected the production migration because it changes database functions, grants, and existing notification links. No production database mutation was applied. The web release supports both schemas and skips the digest gracefully when the new RPC is absent. Production notification generation and personalized alerts require approval to apply `supabase/migrations/20260925182228_moment_notification_destinations.sql`.

Installation follows https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt . Browser-controlled icon updates are described at https://web.dev/articles/manifest-updates . Native OS installation was simulated, not performed on the user's computer.
