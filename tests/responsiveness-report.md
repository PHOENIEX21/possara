# Responsive browser audit — 2026-10-02

## Findings fixed

- Unknown URLs previously rendered a blank page. Added a responsive `Page not found` screen inside the normal app layout, with Home and Opportunities recovery links. Browser verified Home navigation.
- The install reminder covered a large portion of sign-in and job-application forms on a 320×568 viewport. Suppressed it during sign-in, password recovery, email verification and job applications. Existing suppression during creation and CBT remains, including trailing-slash CBT URLs.
- Corrected the isolated browser job fixture to explicitly use `closes_at: null`, matching the real no-deadline database shape. An omitted value incorrectly sent the fixture through the closed-job state.

## Coverage and results

| Browser checks | Viewports | Result |
| --- | --- | --- |
| Public Home, Jobs, Scholarships, Opportunities, Connect, Study, Sign-in, Plus, Organizations and Search | 320px wide | No document-wide horizontal overflow or framework error overlay |
| Loaded Home, Jobs, Scholarships, Connect, Study, Opportunities and Sign-in | 390×900, 768×900, 1440×900 | Content loaded; document width matched viewport; no broken visible images; no page errors |
| Local application, candidate CBT and employer CBT builder, with API interception | 320px, 768px, 1440px | No horizontal overflow or controls extending outside viewport |
| Mobile navigation | 320×568 | Menu content scrolls inside the panel; body scroll locks; Escape closes it |
| Header search | 320×568 | Search navigates to `/search?q=scholarships` |
| Not-found page | 320×568 | Content and recovery links render; Home link works |
| Sign-in and application form | 320×568 | Install overlay absent after fix; screenshots inspected |

Home category and Connect profession rails scroll horizontally within their own rows as intended. Decorative elements are clipped within their cards. Neither increased document width in the audited viewports.

Screenshots: `responsive-home-320.png`, `responsive-menu-320.png`, `responsive-not-found-320.png`, `responsive-signin-320.png`, `responsive-application-320.png`, `responsive-builder-desktop.png`.

Production build and lint pass; existing lint warnings remain. Five relevant regression checks pass: app audit, auth resume, auth return paths, install lifecycle and install assets.

This audit used desktop Edge with emulated viewport sizes. Protected application/CBT layouts used mocked API responses; no real application was submitted. It does not certify every route, real-device Safari/Android behavior, virtual-keyboard layout, slow-network performance or all authenticated workflows.
