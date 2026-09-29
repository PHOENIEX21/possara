# Job reopening and Moment publishing — 2026-09-29

- Production diagnosis: two job rows had `status=open` with expired deadlines. Reopening previously changed only status.
- Organization counts/cards, organization page, applicant detail and application form now share status/deadline rules. Public job queries exclude expired deadlines.
- Reopening writes the chosen future deadline (or explicit no deadline) and status atomically. Returned status is checked. Database trigger rejects opening with an expired deadline, including older clients.
- Rollback-only production SQL passed: expired reopening rejected, future reopening accepted, no-deadline reopening accepted, closing accepted. Existing application/assessment records were not changed.
- `node --experimental-strip-types tests/job-availability.mjs`: passed, including exact deadline boundary.
- `node tests/moment-publishing.mjs`: passed text, two photos with library music, stalled feed refresh, lost response recovery and preservation of files after ambiguous failures.
- Browser with intercepted APIs: expired job shows Reopen; confirmation disabled until a deadline choice; explicit no deadline updates the persisted fixture and shows Close. Text Moment saves its content and returns to the feed.
- Rollback-only production Moment checks passed: personal text insert; organization image/audio insert; both storage metadata records readable under authenticated RLS. These checks do not upload real file bytes or leave Moments/notifications behind.
- TypeScript and Vite production build passed. Lint passed with existing warnings. Initial normal TypeScript attempt hit a machine memory allocation failure; subsequent check passed.
- Database security advisory counts unchanged: 1 internal table policy info, 3 anon definer warnings, 29 authenticated definer warnings, 1 password protection warning.
- Exact user-reported Moment failure remains unconfirmed pending its error message. Fixed independently verified failure paths: awaiting feed refresh after successful publishing, unsafe file deletion after an uncertain insert response, local draft storage exceptions, and duplicate identity validation.
