# Independent code QA — AFTERHOURS

Reviewer role: code / performance / security QA, separate from implementation.

Scope: React component behavior, programme and local shortlist validation, poster output boundaries, browser resource cleanup, opt-in audio and interrupted actions, dependency and release configuration. Browser/visual results are tracked by the independent browser QA role.

Applied instructions: project `AGENTS.md`; local ECC Windows Engineering security/release and quality/debug references; Vercel React Best Practices review skill. This is a selective ECC-derived process, not an ECC runtime installation.

Independent source review and unit verification were completed on 2026-10-23 UTC. Browser/visual and deployment results belong to the separate reports; they are not implied by the unit results.

| Check | Status | Evidence |
| --- | --- | --- |
| Unit logic tests | PASS | `npm test`: 54/54 tests in 3 files, Vitest 5.0.5, 1.23 s on Windows/Node 24.18.0 |
| TypeScript | PASS | `npm run typecheck`, exit 0 after interaction fixes |
| Full ESLint | PASS | `npm run lint`, exit 0 after explicit `node:process` and `node:console` imports in the release script |
| Production build | NOT TESTED by this role | Integrator builds the final artifact; avoided changing `dist` during browser QA |
| Local storage schema and quota | PASS, unit scope | 26 programme tests: malformed/oversized/unsupported schema; valid ID whitelist; deduplication; order; denied reads; failed quota writes; immutable selection; discipline/shortlist intersection |
| Poster SVG / PNG resource lifecycle | PASS, unit scope | 23 poster tests: phase bounds; palette whitelist; safe filenames; fictional scope; render/encoding cancellation and timeout; URL cleanup; refused download cleanup |
| Audio opt-in / async cancellation / cleanup | PASS, unit scope | 5 audio tests: silent construction; explicit start; mute and source disposal; interrupted/out-of-order resume; unsupported/denied context |
| React review | PASS, source scope | Effect listeners removed; resources disposed on unmount; async audio uses generation invalidation; no mount autoplay; derived programme state; bounded local storage schema |
| Runtime dependencies and external request surface | PASS, source scope | React/ReactDOM plus self-hosted OFL font. No fetch/XHR, analytics, forms, backend, payment, unsafe HTML sink, or runtime third-party request. GitHub link opens only on user action |
| CI configuration | PASS, source scope | Verify job gates deployment; contents read by default; pages/id-token write only for deploy; locked `npm ci --ignore-scripts`; one Playwright Chrome worker; no apt or browser installer |
| Manifest design | PASS, source scope | Source commit plus per-file SHA-256; local fixed subprocess arguments; paths normalized for Windows. Actual deployed identity is verified by integrator |
| Dependency audit | PASS, integrator evidence | Integrator reported full `npm audit`: 0 vulnerabilities after upgrading Vitest to 5.0.5. This role inspected the updated manifest/lockfile and did not duplicate registry calls |
| Live browser / CI execution | NOT TESTED by this role | Independent browser role and integrator own the actual execution evidence |

## Findings and resolution

1. **P2 — exported schedule disagreed with the programme.** `src/poster.ts` initially printed 22:00–06:00 while the three acts were 19:00–04:00. Implementation now follows the programme. Regression assertion retained in `src/poster.test.ts`.
2. **P2 - repeated synchronous SVG export could bypass the busy guard.** `src/PosterStudio.tsx` originally completed the SVG path before React could commit the busy state. The implementation now holds the ref guard across a zero-delay task boundary and checks cancellation before producing output. The ten-click burst is covered by the independent browser suite; see its actual result.
3. **P3 — inherited palette keys were not rejected at runtime.** Fixed by whitelisting theme values before palette lookup. Tests include `__proto__`, `toString`, path traversal-like strings and markup-like strings.
4. **P3 — stalled PNG encoding and refused downloads needed complete cleanup.** Encoding now has an abort listener and timeout; link removal is in `finally`; URL release is idempotent. Unit tests cover late callbacks after abort, stalled image/encoder, canvas unavailability, repeated release and download refusal.
5. **Release configuration — Node globals missing in lint.** Newly added `scripts/release-manifest.mjs` produced two `no-undef` errors for `process` and `console`. Fixed with explicit Node imports; independent full lint rerun passed.
6. **Significant P3 - busy export lost keyboard focus.** Independent browser QA found that pressing Enter on Export SVG moved `activeElement` to BODY because the button became natively disabled while busy. Export buttons now retain DOM focus and expose `aria-disabled={busy}`; their group exposes `aria-busy`. Source review confirmed both keyboard and pointer handlers still enter the shared synchronous `pending.current` guard before state or resource mutation. No forced focus restoration was introduced. The browser suite verifies focus retention for both SVG and PNG; see its actual execution result.

No unresolved P1/P2 or significant P3 source defect remains in this review. Publication is still gated on the integrator's final build, the independent browser regression suite, CI and live artifact verification.

## Review boundaries

The audio tests use a controlled fake AudioContext to establish cancellation and cleanup behavior. They do not establish listening quality, loudness on a particular device, or every browser's Web Audio behavior. Poster unit tests establish safe generation and cleanup; actual PNG decoding/download dimensions are browser tests. Source review is not a penetration test. No claim of field Core Web Vitals, screen-reader certification, real-device Safari/Firefox coverage, or comprehensive security assurance is made.

Reviewed implementation: `src/App.tsx`, `src/programme.ts`, `src/Artwork.tsx`, `src/PosterStudio.tsx`, `src/poster.ts`, `src/SoundToggle.tsx`, `src/audio.ts`, `src/styles.css`, and `src/interaction.css`. Reviewed release material: package/lockfile, TypeScript/ESLint/Vite/Playwright configuration, workflow, manifest script, README, MIT license, and Anton OFL notice.
