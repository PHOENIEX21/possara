# POSSARA verification — 23 September 2026

The checked hiring journey is organization job setup → application → timed exam → employer review. Social checks cover the home layout, post music and Moment reactions.

## Evidence

| Check | Result | Boundary covered |
| --- | --- | --- |
| Production build | Passed | TypeScript and Vite compilation |
| Public route smoke checks | 16 routes rendered without horizontal overflow or captured JavaScript errors | Real app browser rendering; not exhaustive interaction coverage |
| Hiring integration (`hiring-flow.sql`) | Passed; transaction rolled back | Real database authorization, job creation/publication, application, repeat-safe exam start, saved answers, deadline handling, scoring and employer result access |
| Exam protection | Passed | Applicant cannot read answer keys or change scores; started exam questions cannot be replaced |
| Draft refresh checks | Passed | Application cover letter/screening, job title, exam-builder question, interview question and selected exam answer survived an actual browser reload with isolated API fixtures |
| Timer refresh | Passed | Remaining time continued from the original start instead of resetting |
| Post music | Passed | POSSARA Music opened, five original tracks displayed and Calm Dawn selected in the composer |
| Moment reactions | Passed | Six choices rendered; Wow selection saved and displayed in the isolated browser fixture; real database add/change/remove transaction also passed |
| Header spacing | Passed | Desktop: header bottom 65px, welcome top 64px. Mobile: 61px and 60px. No gap or horizontal overflow |
| Logo | Visually inspected | Reference-inspired gradient P and solid purple POSSARA wordmark |

Public routes checked: `/`, `/jobs`, `/organizations`, `/opportunities`, `/scholarships`, `/competitions`, `/admissions`, `/connect`, `/learn`, `/places`, `/search`, `/plus`, `/privacy`, `/terms`, `/security`, `/signin`.

## Changes and limits

- Draft writes happen on input, before refresh. Exam answers also save to the server, and scoring uses server time. Storage failures are shown to the user.
- Employer review now exposes every submitted document and the applicant photo through short-lived signed links.
- Job editing preserves the closing date. Existing screening questions are read-only to preserve applicant answers; duplicate the role for a different screening form.
- Completed application upload paths persist. Browser-selected files that have not finished uploading cannot be restored after refresh.
- Browser hiring tests used `browser-fixture.js`, which intercepts API requests. They did not submit real applications, contact applicants or publish posts. The database tests independently exercised the real backend and rolled back their records.
- A real signed-in device upload/download and the complete live browser-to-backend hiring journey remain unverified. The earlier upload fix and policy checks do not substitute for that device test.
- Remaining checks include recruiter edits to jobs authored by another team member and cross-device exam draft conflicts. Same-device reconnect recovery and atomic job creation were checked in the follow-up below.
- The follow-up production build passes without the earlier bundle-size warning. This report does not certify every interaction across the whole app.

Preview: run `npm run dev` and open the displayed local URL. Header screenshot: `../header-check.png`.

## Reliability and performance follow-up

- Job creation and screening now commit in one database transaction through `create_job_with_screening`. A persisted request ID prevents duplicates when the same submission is retried. The migration was applied to the connected Supabase project.
- `job-creation.sql` passed against the real database with rollback: invalid screening leaves no partial job, valid saves include questions, retries do not duplicate questions, authorship remains correct, and outsiders are rejected. The original hiring integration test also passed again.
- Five Node test cases passed (`node --test tests/job-validation.test.mjs`): valid forms, optional pay, invalid pay ranges, publication requirements, exam duration bounds and malformed screening choices.
- Final isolated browser wizard test passed: entering job basics, advancing through all five steps and saving sent one `create_job_with_screening` request with a request ID and three questions, then navigated to organization management. No real job was published. The final production rebuild also passed.
- Browser test with an isolated API fixture simulated a failed exam-draft request. The answer remained in localStorage, a recovery message appeared, and an `online` event retried successfully and cleared the message. This verifies same-device recovery before the deadline, not offline submission after it or cross-device conflict resolution.
- Applications now show loading, retry and closed-job states instead of presenting a partially loaded form. Job media uses the same filename-based MIME normalization as application documents.
- Secondary pages load on demand with an accessible loading state. JavaScript referenced by the initial production HTML dropped from approximately 1,169,820 bytes to 720,135 bytes (38%); individually gzipped totals dropped from 300,680 to 212,797 bytes (29%). These are build measurements, not a measured improvement in load time on a real phone.
- Fourteen development routes and five compiled-production routes loaded with no captured JavaScript errors or stuck page-loading states. The production build passed without a large-chunk warning.
- Targeted lint returned no errors; existing React hook/purity warnings remain in the layout and timed hiring screens.
- Automatic approval review rejected a proposed broader manager-permission migration. That portion was removed; the approved migration retains existing RLS policies and uses `SECURITY INVOKER`. Recruiter permissions were not broadened.
- Supabase advisors found no notice for the new invoker function. Existing findings remain: callable security-definer endpoints requiring review, a locked-down `blocked_terms` table without policies, and disabled leaked-password protection. See [function-access review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These were not automatically treated as newly introduced vulnerabilities or changed without inspection.

Database function design was checked against the [Supabase function documentation](https://supabase.com/docs/guides/database/functions).
