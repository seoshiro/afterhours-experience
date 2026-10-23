# AFTERHOURS — local release baseline

This report covers the original fictional festival concept in this repository. It records executed checks and their limits; it is not a certification of every browser or device. Final CI, live E2E, exact source/asset verification and live screenshots are published in the [v1.0.0 release](https://github.com/seoshiro/afterhours-experience/releases/tag/v1.0.0), preserving the one tested source commit.

## Release gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Independent code/security review | PASS | [QA-CODE.md](QA-CODE.md); no unresolved P1/P2/significant P3 |
| TypeScript | PASS | `npm run typecheck` on Windows, Node 24.18.0 |
| ESLint | PASS | `npm run lint`, including the release manifest script |
| Unit regression | PASS | 54 tests across programme, poster and audio; Vitest 5.0.5 |
| Production build | PASS | Vite 7.3.7; self-hosted assets, relative GitHub Pages base |
| Full dependency audit | PASS | `npm audit --audit-level=moderate`: 0 known vulnerabilities after patching development-only Vitest |
| Browser/visual review | PASS | 20/20 final local E2E scenarios; [independent visual report](QA-VISUAL.md) |
| GitHub Actions and live verification | Separate release evidence | [Final public QA and screenshots](https://github.com/seoshiro/afterhours-experience/releases/tag/v1.0.0) |

## Story and boundaries

The visitor enters a visual cover, scrolls through three fictional acts, filters nine encounters, saves a device-local shortlist, creates a palette/phase variation of an original poster, and downloads SVG or PNG. Optional synthesized sound starts only on an explicit gesture and stops on mute, cancelled startup, hidden page or leaving the document. There is no API/backend, booking/payment, account, analytics or real event.

Browser checks use one isolated installed Chrome worker with audio output muted at the browser process level to avoid disturbing the sleeping user. Tests still inspect real AudioContext creation and running/closed states. Screenshots and raw data are in [evidence/local](evidence/local).

Covered journeys: 1440×1000, 768×1024, 390×844, 320×740 and 844×390 landscape; full-page/viewport/act screenshots; zero document horizontal overflow; axe WCAG 2 A/AA and 2.1 AA including contrast; clean console, failed-response and runtime external-request checks; keyboard skip and visible focus; reduced motion; native anchor scroll with Back/Forward; each programme discipline; empty and combined shortlist states; reload persistence; corrupted/version-invalid/unknown IDs and quota denial; repeated/interrupted selection; SVG theme/XML/filename validation; actual 1200×1600 PNG signature/dimensions; rapid export clicks; unavailable PNG fallback; interrupted export reload; silent audio initial load; explicit start/mute, hidden/pagehide/Back, delayed start cancellation and unavailable audio fallback.

## Measured performance

Local production build, Windows 11 (10.0.26200), AMD Ryzen 5 7535HS, 12 logical CPUs, approximately 16 GB RAM; installed headless Chrome 155.0.8059.86. Fresh isolated context/cold cache, single synthetic samples. These are not Lighthouse scores or field Core Web Vitals.

| Condition | FCP | LCP | CLS | Interaction measurement |
| --- | --- | --- | --- | --- |
| Desktop 1440×1000, no CPU/network throttle | 300 ms | 300 ms | 0.0086 | Filter DOM click → second animation frame: 14.7 ms, not INP |
| Mobile 390×844, CPU 4×, 150 ms latency, 1.6 Mbps down / 0.75 Mbps up, CDP cache disabled | 1736 ms | 1736 ms | 0.0072 | Not measured in this condition |

Raw entries, exact conditions, resources, memory/DOM and long tasks: [desktop](evidence/local/performance.json), [throttled mobile](evidence/local/performance-mobile-4x.json). Production output: approximately 249 KB minified JS (78 KB gzip), 24 KB CSS (5.9 KB gzip), 19 KB served WOFF2. No recurring JavaScript rendering loop or WebGL context is used.

## Corrections and regressions

Independent review identified and fixed the exported schedule mismatch, invalid inherited palette keys, resource cleanup on refused/stalled PNG/download operations, synchronous repeated SVG downloads, keyboard focus lost by natively disabling a busy export button, and Node lint imports in release tooling. Corresponding unit/browser regressions remain in the suite. The initial browser run also found ambiguous test selectors; these were corrected to target the intended navigation/status controls without weakening product assertions.

## Not tested and limits

Real iOS/Android devices, Safari, Firefox, a human screen-reader session, hardware listening quality and field usage metrics were not tested. Sound tests run with output muted and establish lifecycle/state rather than subjective audio quality. Performance samples depend on this machine and synthetic throttling. Storage is per browser and not synchronized between tabs/devices. Static source review and a clean advisory scan are not a comprehensive penetration test. Future new advisories may change the dependency result.

## Roles and tools actually used

Five real agents: integrator/release; art/motion; interaction/audio; independent visual/browser QA; independent code/security QA. Tools: PowerShell, Node/npm, React/TypeScript/Vite, Vitest, ESLint, Playwright/installed Chrome, axe, Git/gh, GitHub Actions and GitHub Pages. Instructions applied: local ECC-derived Windows Engineering and selected architecture/frontend/security/quality references, UI Build/Review, Vercel React Review and Verification. 21st catalog search was attempted and returned a service failure; no paid generation, catalog component or template was used. No CUA browser, Blender, external images, music recordings, new authentication or paid resource was needed.
