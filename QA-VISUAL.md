# Independent visual and browser audit

Local release candidate checked on 2026-10-23, after integration of the poster keyboard-focus correction. **PASS: 20/20 Playwright tests, 33.3 seconds, one Chromium worker.** No unresolved P1, P2, or significant P3 finding in the tested scope. Live verification is a separate release gate and is not claimed by this report.

## Environment and scope

Installed Google Chrome 155.0.8059.86, headless, Windows 10.0.26200 x64, AMD Ryzen 5 7535HS, 12 logical processors, approximately 16 GB RAM. Each test uses an isolated browser context; no shared browser or CUA was controlled. Production Vite preview used only port 4198. Chrome ran with `--mute-audio`: tests verified Web Audio lifecycle without emitting audible sound. The restricted shell could not access loopback; authorized escalated execution was used for the isolated preview/browser process.

Applied the local ECC-derived frontend/performance workflow and UI Review instructions. The 21st CLI was unavailable; no 21st deterministic CLI result is claimed. Tests use Playwright, axe-core, native DOM/performance APIs and CDP. Visual review used actual `view_image` inspection.

## Verified behavior

| Boundary | Result | Evidence |
| --- | --- | --- |
| Desktop 1440×1000, tablet 768×1024, mobile 390×844, small mobile 320×740, landscape 844×390 | PASS | [Full-page and viewport screenshots](evidence/local/); no horizontal document overflow |
| Accessibility and contrast | PASS | Five axe scans using WCAG 2 A/AA and WCAG 2.1 AA tags: zero violations; raw `axe-*.json` files |
| Keyboard and motion | PASS | Visible skip-link focus, skip target focus, reduced-motion animations disabled, native anchor scroll, Back/Forward; keyboard poster exports retain their trigger |
| Programme | PASS | Nine sessions, three results per discipline, combined saved/disciplines, empty-state recovery, persistent add/remove and repeated/interrupted actions |
| Local selection failure | PASS | Malformed JSON, wrong schema version, duplicate/unknown IDs and simulated write quota error; current-visit functionality retained |
| Poster export | PASS | Three SVG themes parse as XML, fixed safe filenames, fictional scope in output; PNG magic bytes and 1200×1600 dimensions checked; range endpoints and preview changes verified |
| Export resilience | PASS | Ten synchronous SVG activation attempts produce one download; unavailable canvas offers SVG fallback; interrupted PNG/reload leaves fresh page usable |
| Audio | PASS | No context before click; running after opt-in; closed after mute, hidden/pagehide events and cancellation; no automatic resume; missing AudioContext leaves programme usable |
| Browser/runtime | PASS | Across all five viewports: zero page/console errors, failed requests, HTTP 4xx/5xx responses or external runtime requests |

The poster text/background palette contrast ratios were also calculated directly: ink/lime **14.57:1**, ink/coral **6.47:1**, paper/ultramarine **6.27:1**. These cover the exported poster's text, which axe cannot inspect inside an image.

## Visual evidence inspected

Inspected the full desktop/mobile/tablet compositions, 320/390 mobile viewport crops, landscape viewport, desktop hero, all three act crops, and poster preview. The cover typography, circular original artwork, three chromatic scenes, programme rows, poster controls and closing composition remained legible and ordered. No proven overlap, clipped control, inaccessible content or responsive layout defect remained. Native scroll is preserved; scene artwork uses progressive CSS view-timeline transforms with a reduced-motion/static fallback. Source contains no flashing opacity animation or strobe.

- [Desktop](evidence/local/desktop.png), [390px mobile](evidence/local/mobile.png), [320px mobile](evidence/local/small-mobile.png), [landscape](evidence/local/landscape.png)
- [Hero](evidence/local/hero.png), [Signal](evidence/local/act-signal.png), [Fracture](evidence/local/act-fracture.png), [Afterimage](evidence/local/act-afterimage.png)
- [Valid exported PNG](evidence/local/exports/afterhours-blue.png), [SVG](evidence/local/exports/afterhours-blue.svg)

## Measured performance

These are **single synthetic production-preview samples**, not Lighthouse scores, field Core Web Vitals, INP, or a performance improvement claim. Browser cache was cold; no warmup. Raw reports include timestamps, browser/hardware, navigation timings, resource entries, DOM count, long tasks and exact conditions.

| Conditions | FCP / LCP | CLS | Long tasks |
| --- | --- | --- | --- |
| 1440×1000, no network/CPU throttle | 300 / 300 ms | 0.00863 | None observed |
| 390×844, CDP CPU 4× slowdown, 150 ms latency, 1.6 Mbps download / 0.75 Mbps upload, cache disabled | 1736 / 1736 ms | 0.00721 | 81 and 193 ms |

The desktop filter change took **14.7 ms from DOM activation to the second animation frame**; this is not an INP measurement. Four runtime asset requests transferred 103,872 bytes including HTTP overhead (102,672 encoded body bytes), excluding the document. The mobile sample contained 534 DOM elements; the desktop sample contained 474 after applying its Sound filter.

Raw: [desktop](evidence/local/performance.json), [constrained mobile](evidence/local/performance-mobile-4x.json).

## Findings corrected and diagnostic limits

The initial exported poster times were inconsistent with the programme; they now match 19:00–04:00. Independent code QA found the synchronous SVG download burst, which was fixed before the passing final suite. Visual QA then proved that native `disabled` during export dropped keyboard focus to `BODY`; export buttons now keep focus using `aria-disabled`, `aria-busy` and the existing immediate operation guard. [Before](evidence/export-focus-before.json) / [after SVG and PNG](evidence/local/export-focus.json) record the actual focused element and `:focus-visible` state.

An element-only screenshot showed an offscreen fixed skip link despite computed `:focus=false`, transform `translateY(-75px)` and rectangle y=−63…−13. [Pointer-flow diagnostic](evidence/local/poster-pointer-focus.json) confirms the active element remains Export PNG. This was a locator screenshot capture artifact, so poster evidence uses a normal viewport capture; no product workaround was added.

**NOT TESTED:** Firefox/WebKit, physical phones/touch hardware, real screen-reader use, subjective audio listening, actual operating-system backgrounding, field traffic and live production in this local report. Hidden/pagehide behavior was exercised by DOM events plus real navigation/Back. No claim of complete accessibility/security coverage is made. Live rerun and exact deployment SHA/asset verification remain the integrator's release gate.
