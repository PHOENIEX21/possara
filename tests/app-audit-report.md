# Application audit � 2026-10-01

## Scope and fixes

Reviewed app routing/auth guards, opportunity and community queries, job discovery/applications, CBT candidate and employer flows, study practice, application tracking, upload helpers and existing regression checks. This is not an exhaustive certification of every route.

- Jobs: organization vacancies now obey search/work-style filters and contribute to counts and empty-state decisions.
- Scholarships/opportunities: category failures propagate as errors rather than false empty results; community category failures do likewise; missing categories return no unrelated posts. Live opportunities refresh every 15 seconds to re-evaluate deadlines. Scholarship loading/error states account for both feeds.
- Hiring: application submission refreshes the individual application and employer list; CBT saves refresh job settings; submissions refresh review/results. Team search uses the existing escaped filter helper.
- CBT: component state is isolated by account and job, so navigating between assessments resets local timer/submission/score state. Builder waits for both saved questions and job settings, surfaces load failures, rejects empty assessments, and no longer selects an answer merely by typing into an empty option.
- Study practice: switching topics resets progress; failed persistence no longer creates an unhandled promise rejection, and displays a message.
- Opportunity tracking/checklists: mutation failures are handled by React Query; tracker update/delete failures are visible, and checklist input clears only after a successful save.
- Updated database test fixture selection to use an email-verified applicant, matching current write policies.

## Verification

- Production TypeScript/Vite build and lint: pass (existing lint warnings remain).
- `node tests/app-audit.mjs`: passes isolated component/query checks for native job filtering/counts, category failures, cache invalidation, CBT route keys and builder loading/error gates. These mocks do not substitute for real browser lifecycle testing.
- Existing checks pass: auth-resume, auth-return-path, moment-publishing, job-availability, job-validation (5 tests), search, next-step, install-assets, install-lifecycle, ios-moment-photos and moment-photo-copy.
- Live `tests/hiring-flow.sql` passed in a transaction ending in ROLLBACK: job creation, screening/application submission, applicant answer-key privacy, start/resume without timer reset, draft saving, score write protection, immutable started questions, rejection of late answer edits, grading saved answers after expiry, idempotent submission and employer result visibility. No test records retained.
- Live inspection: all public tables have RLS; job-documents bucket is private; CBT question policies restrict direct reads to organization owners/recruiters.
- Browser checks attempted with agent-browser. Chrome was unavailable; installed Edge could not establish the automation connection. Visual rendering and complete browser interactions remain unverified.

## Existing operational findings

- Three active, non-expired scholarships exist.
- One open job requires CBT but has no questions. Employer must supply the real assessment; no questions or answer keys were fabricated.
- Two job records retain status=open after their deadlines. Existing application/deadline checks treat them as closed. No deadline was extended.
- Security advisors report 1 policy-info finding (blocked_terms), 3 anonymous and 29 authenticated SECURITY DEFINER warnings, and disabled leaked-password protection. These warning counts match the previous repository report. Function warnings require authorization review individually, rather than blanket revocation that breaks app APIs. This pass verified hiring behavior, not every privileged function.
- Frontend deployed on 2026-10-01 to the existing Cloudflare Pages production project: https://possara.pages.dev (deployment https://59247354.possara.pages.dev). No permanent database changes were performed.
- Post-deployment HTTP checks passed for /, /jobs, /scholarships and /applications. HTML and six key JavaScript assets matched the tested local build byte-for-byte. This verifies deployment delivery; the browser automation limitation above still applies.
- Deployment used the tested working tree, including uncommitted fixes; no Git commit or push was performed.

## Follow-up verification — 2026-10-01

- Fresh production build, lint and all 16 local regression checks pass. Existing lint warnings remain.
- Edge automation works when launched outside the sandbox. Live home feed renders; job search updates role counts and the no-match state; all three scholarship cards render; logged-out Applications shows sign-in. Mobile scholarship and employer builder screenshots were inspected.
- Local browser CBT checks use `browser-fixture.js` to intercept API requests. Two answers persisted across reload, the timer continued, submission rendered the mock result, and the employer builder loaded saved questions and the 10-minute limit. Typing a new option did not automatically select its correct-answer radio. Browser error checks returned no page errors. These isolated UI checks complement the live SQL tests; they do not claim a real authenticated production browser submission.
- Re-ran live `hiring-flow.sql`: pass, transaction rolled back.
- Added and ran live `security-boundaries.sql`: pass, transaction rolled back. Checks anonymous privileged API grants, public-table RLS, birthday privacy, hidden presence, own-profile scope, role escalation denial, admin access denial, recruiter answer-key scope and anonymous private-API denial.
- Reviewed current definitions of all 29 authenticated-callable definer signatures and three anonymous-callable signatures. Public profile/statistics APIs intentionally return public fields or aggregate counts; birthday fields obey visibility. Own-account/profile and role helpers use `auth.uid()`. Admin discovery functions check `is_admin()`. Employer assessment/interview/edit functions check organization owner/recruiter membership. Applicant submission/start/grading functions bind the operation to the caller; CBT question reads omit answer keys. Member directory/presence APIs mask hidden timestamps; skill and trust APIs expose intended directory/rank information. All public definer functions have configured search paths; no public tables lack RLS and no public views were returned by inspection. No blanket privilege revocations were applied.
- `blocked_terms` has deny-by-default RLS with no client policies; the advisory is informational. Current advisory counts remain 1 policy info, 3 anonymous definer, 29 authenticated definer, and 1 leaked-password warning.
- Organization plan is Free. Supabase's [password-security documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) states leaked-password protection requires Pro or above. It remains disabled; no paid upgrade was performed.
- The employer-provided questions for one CBT job remain outstanding.

## Computer-literacy assessment and polish — 2026-10-02

- At the user's request, configured the missing AVORA Receptionist assessment with 12 original multiple-choice questions and a 15-minute limit. Topics cover booking lookup, reservation accuracy, spreadsheet totals and sorting, phishing, file naming, receipts, screen locking, double-booking prevention, email CC, outage handling and guest-record correction.
- Job: `46dc9db2-a7c8-483a-9098-c446ed162a28`. Saved through the existing employer assessment RPC after confirming zero questions and zero started attempts. Verified 12 questions, four distinct choices per question and valid answer keys. Answer keys are stored only in the protected database, not in this repository or frontend assets.
- The Receptionist deadline is September 24, 2026; it has passed. The existing deadline was preserved and the job was not reopened for new applications. The assessment is configured for its existing application workflow.
- Live authorization check passed: a verified non-recruiter cannot read this assessment's answer keys. Test transaction rolled back.
- Employer builder now requires only the first two options; extra choices are optional. Empty-option radios are disabled, question/option/radio/removal controls have accessible labels, and all form edits are disabled while a save is pending. Missing roles show an unavailable state. Job search has an accessible name and work-style buttons expose selection with `aria-pressed`.
- Build and lint pass (existing warnings remain); all 10 relevant local regression checks pass. Isolated Edge browser checks confirmed a newly added two-choice question submits with only two choices, edits lock during a delayed save, and the success message appears afterward. Mobile builder screenshot inspected; no browser page errors reported.
- Deployed to the existing Cloudflare Pages production project: https://possara.pages.dev (deployment https://2c2635e3.possara.pages.dev). Production HTML, Jobs asset and JobCbtBuilder asset match the tested local build byte-for-byte. Live browser verified the updated accessible job search.
- Supabase remains on Free; paid leaked-password protection was not enabled.
