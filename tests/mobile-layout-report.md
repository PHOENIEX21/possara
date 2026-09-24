# Mobile layout repair — 24 September 2026

Fixed the navigation drawer appearing behind the sticky home welcome/filter section. The drawer now covers page content and bottom navigation, locks background scrolling, makes background content inert, traps keyboard focus, closes with Escape or a backdrop tap, restores focus, and closes when switching to desktop width or another route.

Organization pages place the avatar and name on separate rows on phones. Names, descriptions and contact information wrap without clipping. Avatars render above the cover image rather than being partially hidden by it.

Verified in Edge:

- Real home feed at 360px: the menu wins hit-testing over the sticky welcome/filter area.
- Escape and backdrop dismissal, focus return, background inert state and scroll lock all passed.
- Tab and Shift+Tab wrap inside the menu.
- Resizing from mobile to 1024px closes the drawer, restores scrolling and removes background inert state.
- Real EPhoenix Hotels & Tourism page at 360px: no clipped text, document width 360px, profile content width 336px.
- Isolated organization fixture with an unusually long unbroken name, URL, location and description: no text overflow at 320px, 390px, 768px or 1280px. Fixture requests were intercepted; no organization data was changed.
- Production TypeScript/Vite build passed. Targeted lint had no errors; state-in-effect warnings remain.

Screenshots: `../menu-mobile-fixed.png` and `../organization-mobile-fixed.png`.
