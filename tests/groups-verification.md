# POSSARA Groups and Help verification

Date: 2026-09-29

## Implemented

- Groups directory accessible from Connect and Messages, plus dedicated group pages.
- Public discovery and private invitations; optional admin approval; owner/admin/member roles; member removal and leaving.
- Chat, replies, three reactions, pinned messages, reporting through the existing admin reports queue.
- Help requests and offers, with resolved/reopen actions for authors and admins.
- Private file uploads and authenticated downloads, capped at 10 MB. Images, PDF, Word and supported audio files.
- Muting, unread activity, exact-message notification links, clickable profile names, refresh-safe text drafts.
- Idempotent message submission prevents duplicate sends after a lost response.
- Authentication return paths retain invitations and reject external redirects.

## Checks completed

- Production TypeScript/Vite build: passed.
- Targeted lint: new Groups, hooks and return-path helper pass. Existing warnings in Messages (effect dependency) and VerifyEmail (resend timer memo) remain unchanged.
- `tests/groups-db.mjs`: passed against isolated PGlite PostgreSQL. Covers role escalation denial, private visibility, pending-member denial, invitation rotation, cross-group reply rejection, membership removal, attachment RLS, help resolution, reactions, reporting, muting, exact notification destinations, unverified account writes, and idempotent retries.
- `tests/auth-return-path.mjs`: passed local return links and rejected external/backslash/control-character redirects.
- Mobile browser at 390 x 844: no horizontal overflow; long names wrap; Help layout inspected (`groups-help-mobile.png`). Draft restored after an actual reload; notification destination highlighted the specific message.
- Isolated browser requests: sending clears the draft after success; reply targets retained; reactions, help resolution, muting, read requests and member tools work. A PDF fixture uploads, appears under Files and downloads with its original name; files above 10 MB are rejected before upload.
- Both migrations applied to Supabase project `qetadbstyojabagixrjp`.
- `tests/groups-live.sql`: passed on production in one rollback-only transaction using verified profiles. No test groups, messages, reports or notifications persist.
- Live RLS enabled on all four exposed group tables. Existing storage policies are bucket-scoped; none broaden access to the new private bucket.
- Security advisors: no new findings after the verification follow-up. Existing findings remain: internal blocked_terms table with deny-by-default RLS, existing public/authenticated definer functions, and password leak protection configuration.

## Verification boundaries

Browser upload/download checks use isolated fixtures; they do not upload real files or send messages to real users. Database authorization and group workflows were also exercised separately on production with rollback. This is the initial groups release: chat refreshes every five seconds while active; it does not include voice/video calling or end-to-end encryption. The directory shows the latest 100 public groups plus joined groups, and older conversation history loads in batches of 100.
