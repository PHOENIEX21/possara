# Your next step — verification

- Home's For You feed shows one personal action for signed-in members: a saved opportunity closing within seven days, otherwise a recent profile match, otherwise an active saved opportunity. Incomplete profiles get a direct profile-editor link when no opportunity is available.
- Saved and matched listings are checked against current status and deadline. Closed, expired, invalid-deadline, or inaccessible listings are not recommended.
- Hide for 24 hours is stored per member on the device; Show my next step restores the card. No new database tables, notifications, or permissions were added for this card.
- Add to calendar exports an iCalendar file with the exact UTC deadline, the listing URL, and a one-day reminder when that reminder would still be in the future. The user must open/import the file into their calendar. Text is escaped and Unicode lines are folded to RFC 5545's 75-octet limit.
- Production build and targeted lint passed. `node tests/next-step.mjs` passed priority, status/deadline filtering, timezone, calendar escaping, Unicode folding, link validation, and reminder-timing checks.
- Isolated browser checks passed at 390px: urgent saved item takes priority; exact listing URL; hide/restore; match fallback; closed item hidden; no horizontal overflow; calendar Blob generated with correct listing URL and confirmation. No real saves or applications were changed. Screenshot: `tests/next-step-mobile.png`.
- Browser fixture: run `tests/browser-fixture.js`, then `tests/next-step-browser.js` through the browser evaluator. The fixture intercepts all API requests.
- The previously approved Moment-notification migration is live and its rollback-only production verification is recorded in `tests/moments-install-verification.md` and `tests/moment-notifications-live.sql`.
