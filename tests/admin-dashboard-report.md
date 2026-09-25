# Admin dashboard organization — 25 September 2026

Replaced the long dashboard with 12 labeled tool cards in three groups: Review & approve, Manage the community, and Content & learning. Each card explains its purpose. Review queues show pending counts; the overview includes compact membership and review summaries.

Each tool opens a dedicated view via `?section=...`, with All admin tools navigation and a tool selector. Opportunity discovery retains its existing dedicated route. URL state supports deep links, refresh and browser history. Moderation query failures are visible; pending moderation requests disable conflicting action buttons. Member role controls and note fields now have accessible labels.

Verification:

- All 12 tool cards opened their expected views in an isolated authenticated browser fixture, without rendering errors or mobile horizontal overflow.
- Tool selector changed from verification to reports; browser Back restored verification.
- Mobile and desktop layouts were visually inspected. Screenshots: `../admin-dashboard-mobile.png` and `../admin-dashboard-desktop.png`.
- Production build and targeted lint passed. `git diff --check` passed.
- No real approval, deletion or moderation action was performed during the UI tests.
