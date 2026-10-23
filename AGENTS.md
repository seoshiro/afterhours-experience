# Project instructions

This repository is only AFTERHOURS, an original fictional event design concept. Keep changes scoped here. Use React + TypeScript with plain CSS and original SVG graphics. All resources must be free. No external runtime requests, real artists, paid services, forms, booking, analytics, accounts, new credentials, or permission changes. Audio must require a user gesture and must stop when hidden. Respect reduced motion and native scrolling.

Roles: integrator owns App, programme, release and docs; art/motion owns styles.css and Artwork.tsx; interaction owns PosterStudio.tsx, SoundToggle.tsx and their modules; visual/browser QA owns browser evidence and E2E; code QA owns logic tests and independent release review. Coordinate edits through the integrator. QA reports must distinguish PASS from NOT TESTED.

Use isolated Playwright Chromium contexts, at most one browser worker, ports 4197/4198. Never control shared CUA. Validate 320/390/768/desktop and landscape, keyboard, reduced motion, corrupted/quota local storage, exports, repeated/interrupted actions and history. Unit, lint, typecheck, build, E2E and independent audits are required before deployment.
