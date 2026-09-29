# Search and group tools verification

Date: 2026-09-29

## Release scope

- Small search button immediately beside Messages in the header, including Home. Clicking opens a focused search field without changing header height. Escape/close and outside-click dismiss it.
- URL-backed search results for people, public posts, open jobs, active opportunities, organizations and groups accessible to the signed-in user. Results link to the corresponding profile, post, listing or group.
- Group-history search covers message text and attachment filenames beyond the currently loaded conversation. Results open and highlight the exact message.
- Group Opportunities section supports sharing existing open listings with a note, nearest-deadline ordering, calendar downloads, and removal by the sharer or group admins.
- Organization managers can create associated official groups. Groups link back to the organization and derive the verification badge from its current record. Organization pages list groups the viewer may access.
- Fixed the existing anonymous opportunity-read policy: visitors read published listings without invoking the restricted staff helper. Staff/author access remains in the authenticated policy.

## Completed checks

- TypeScript/Vite build and lint of new/changed search and group components passed.
- `tests/search.mjs` passed: punctuation and quotes remain search text, LIKE wildcard characters are escaped, and input length is bounded.
- Expanded `tests/groups-db.mjs` passed in isolated PostgreSQL: authorized organization association, rejection of forged organization association, member-only sharing/reading, duplicate and expired-listing rejection, and removal authorization. Existing group security tests also pass.
- Production migration `community_opportunities_organizations` applied successfully.
- `tests/group-tools-live.sql` passed with rollback. It checks official group creation, shared listings when an open job exists, private access, removal, and anonymous opportunity reads. Synthetic test data does not persist.
- Production security advisor counts are unchanged: no new findings.
- Live public API checks passed for names containing punctuation, job filters with deadlines, and anonymous opportunity search (HTTP 200 after the permission-policy fix).
- Isolated browser at 390 x 844: search is beside Messages, receives focus, preserves header height and has no horizontal page overflow. All six result categories rendered and search navigation preserved the query.
- Isolated group browser checks: an older search result opens its exact highlighted message; official organization badge/link render; opportunity sharing shows the listing, deadline and calendar action. Mobile tabs were adjusted to keep labels intact while scrolling.

## Evidence and boundaries

`home-search-mobile.png` and `group-opportunities-mobile.png` capture the mobile interface. Browser tests use `browser-fixture.js`, `groups-browser.js` and `search-tools-browser.js`; they do not message real users or publish test content. Database checks independently exercise the live authorization path with rollback. Global search returns up to 20 matches per category; group history search returns the newest 50 matches; shared opportunities show the latest 100 shares. Voice calling, polls, events and automatic helper matching are outside this release.
