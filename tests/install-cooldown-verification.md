# Install reminder cooldown

Date: 2026-09-29

- Close, native installer dismissal and installer acceptance suppress automatic reminders for 21 days.
- Acceptance alone does not record a successful install. The `appinstalled` event, standalone/minimal-ui display mode, or explicit iOS user confirmation records installation.
- Known installations remain hidden indefinitely unless a new native browser installation offer arrives after the cooldown. Time alone does not forget an installation.
- Installed-app launches always hide the prompt. Opening the installed app renews the remembered confirmation.
- Existing installation flags migrate quietly. Cross-tab installation/close events hide other prompts without writing timestamps back and forth.
- A 44 px close control remains visible; text explains the three-week dismissal period.
- In-memory suppression works when storage is blocked; persistence across browser sessions requires browser storage.

Validation: `tests/install-lifecycle.mjs` passes boundary tests before/after 21 days, accepted versus confirmed install, legacy flags, iOS, blocked storage, standalone mode and cross-tab synchronization. `tests/install-assets.mjs` verifies the existing current-logo assets and manifest. Targeted lint and production build pass. Browser tests use a simulated install event; they do not claim to automate an OS-level installation.

Platform references: [successful installation event](https://developer.mozilla.org/en-US/docs/Web/API/Window/appinstalled_event), [installer choice](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/userChoice), [browser install eligibility event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).
