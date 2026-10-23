# AFTERHOURS

An original fictional electronic music festival and audiovisual exhibition, imagined as an editorial poster that unfolds into a night in three acts.

**This is a design concept, not a real festival.** All sessions, times and spaces are fictional. There are no real artists, partners, tickets, bookings, payment forms or venue claims.

[Live experience](https://seoshiro.github.io/afterhours-experience/) · [Public release and final live QA evidence](https://github.com/seoshiro/afterhours-experience/releases/tag/v1.0.0)

## Experience

- Three original chromatic acts: Signal, Fracture and Afterimage, with original SVG interference artwork and restrained native scroll choreography.
- Nine fictional programme encounters, discipline filters and a personal “My night” shortlist saved only in this browser. Corrupted or unavailable storage does not block the experience.
- A poster studio with three colour palettes, thirteen interference variations and downloadable SVG or 1200 × 1600 PNG. Everything is generated locally; no upload or account.
- Optional quiet synthesized Web Audio ambient. Audio is off until an explicit click. Mute, cancellation, page hiding and leaving the document stop the audio. Returning to the page does not restart it.
- Responsive compositions, keyboard controls, visible focus, a skip link and reduced motion support. The experience does not depend on WebGL.

## Run locally

Node.js 22.12+ or 24 is recommended. Dependencies are locked in `package-lock.json`.

```sh
npm ci --ignore-scripts
npm run dev
```

The isolated development port is 4197. Production preview uses 4198. The GitHub Pages base path is `/afterhours-experience/`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright uses one isolated Chromium worker and the already installed Chrome browser. On Windows it uses `C:/Program Files/Google/Chrome/Application/chrome.exe`; on GitHub's Ubuntu runner it uses `/usr/bin/google-chrome`. Override `PLAYWRIGHT_CHROME_PATH` if needed. No browser dependency installation or apt step is required.

`PLAYWRIGHT_BASE_URL=https://seoshiro.github.io/afterhours-experience/` runs the same E2E suite against the published site. Tests write screenshots and machine-readable results under `evidence/`. See [local QA baseline](QA-REPORT.md), [independent code review](QA-CODE.md) and [independent visual review](QA-VISUAL.md) for actual results and limitations. The [v1.0.0 release](https://github.com/seoshiro/afterhours-experience/releases/tag/v1.0.0) publishes final CI/live results, exact source SHA, verified asset digests and live screenshots as versioned release evidence without changing the tested source commit.

## Free resources and licenses

All artwork, layout and synthesized audio are original code in this repository. No copyrighted recordings, stock photography, paid APIs, tracking or runtime third-party requests are used.

- Original application code and artwork: [MIT](LICENSE).
- Anton font: Copyright 2020 The Anton Project Authors, [SIL Open Font License 1.1](public/licenses/Anton-OFL.txt), self-hosted from `@fontsource/anton`.
- React / ReactDOM: MIT; Vite: MIT; TypeScript: Apache-2.0. Test and lint packages keep their respective licenses in the dependency packages. The lockfile records exact versions.

## Scope and limitations

The shortlist is device/browser local, with no cross-tab synchronization or server backup. Private browsing and storage restrictions can prevent persistence; the current visit still works. Downloads depend on browser support; if PNG encoding fails, SVG remains available. Export uses standard Arial/Helvetica fallback text for a portable standalone SVG. Ambient synthesis may be unavailable in restricted browsers; all content remains usable. Automated Chromium checks are distinct from human listening, assistive technology testing and real-device Safari/Firefox testing.

## Implementation and review

React + TypeScript, Vite, plain CSS, original SVG, localStorage and Web Audio. No canvas animation loop, WebGL engine, animation library, backend or service worker. CSS scroll timelines progressively enhance native scrolling and are disabled with reduced motion.

Five actual roles worked on the project: integrator/release, art/motion, interaction/audio, independent visual/browser QA, and independent code/security QA. ECC-derived Windows Engineering, UI Build/Review, Vercel React Review and Verification instructions informed the work. The 21st catalog search returned an unavailable-service error; no catalog code, paid generation or template was used.

Deployment is a free public GitHub Pages build via Actions. CI runs lint, typecheck, unit tests, production build and the complete Chromium E2E suite before deployment. The release manifest identifies its source commit and SHA-256 asset digests. A previous successful Actions deployment can be rerun for rollback without editing unrelated projects.
