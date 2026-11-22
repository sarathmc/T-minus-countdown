### Implementation Plan — T-Minus Countdown Rebuild

This plan follows the master prompt's phased workflow (Phase 1–10). It is written after the audit in `CURRENT_STATE_AUDIT.md` and is meant to be honest about scope: the full brief describes a multi-week, multi-engineer deliverable (Angular 19 frontend, NestJS backend, PostgreSQL, Supabase auth, push-notification scheduling, full test suites, CI, deployment). A single automated session cannot responsibly claim to deliver all of that as "done" — this document says explicitly, phase by phase, what is realistic to build now versus what must be scheduled as follow-up work, so nothing is reported as complete when it isn't.

#### Phase 1 — Audit (this phase)
Status: **done**. See `CURRENT_STATE_AUDIT.md`.

#### Phase 2 — Architecture & project scaffolding
Scope: generate the Angular 19 standalone workspace (`ng new`, strict mode, ESLint, Prettier, routing, SCSS), the feature/core/shared/domain/infrastructure folder layout from the brief, and a minimal NestJS backend workspace. De-duplicate the root-level `sw.js` / `manifest.webmanifest` / `icon.svg` in favor of the `public/` copies (Angular's `angular.json` `assets` config serves from `public/`).
Realistic in one extended session: yes, scaffolding is mechanical.

#### Phase 3 — Responsive UI shell
Scope: dashboard shell, navigation, routed feature pages (`/dashboard`, `/countdowns`, `/countdowns/:id/milestones`, `/wallpaper-studio`, `/reminders`, `/settings`), shared design tokens (SCSS variables ported from `src/styles.css`), empty/loading/error states.
Realistic in one extended session: yes, for the shell; full visual polish for every state needs follow-up iteration.

#### Phase 4 — Countdown & milestone business logic
Scope: `Countdown` and `Milestone` domain models and interfaces, a pure, unit-testable `CountdownCalculator` (days/hours/min/sec, past-deadline, timezone via `Intl`/`Temporal`-style handling, DST-safe by always computing from epoch milliseconds rather than manual date arithmetic), a `MilestonePlanner` that generates the default T-60…T-0 set without duplicates and supports custom milestones, edit, delete, complete-tracking, and completion percentage. Port existing working logic from `src/app.js` rather than discarding it, since it already encodes the correct subtraction-based milestone rule.
Realistic in one extended session: yes, this is the highest-value, most self-contained slice and should be built with real unit tests (Vitest/Jasmine+Karma or Angular's default runner) covering the brief's explicit test list (calculations, timezones, DST, milestone generation, duplicates, completion).

#### Phase 5 — Wallpaper generation
Status: **implemented (local frontend)**. The lazy-loaded `/wallpaper-studio/:countdownId` standalone feature provides five templates, mobile/desktop formats, live customization preview, countdown selection, milestone checklist, and 1080×1920 / 1920×1080 PNG export through Canvas. Automated unit/component tests cover dimensions, PNG blob rendering, template/customization state, countdown binding, and missing/empty states. User-provided image backgrounds and persistence of wallpaper preferences are not included.

#### Phase 6 — Local persistence & PWA
Status: **implemented (local-only, production PWA)**. Countdown and milestone data persist via an IndexedDB repository behind a small repository contract, with validated migration from localStorage after successful database write and localStorage fallback on storage errors. Production builds use Angular's versioned service worker and cache shell assets eagerly and lazy route chunks when visited. Added online/offline status, update-ready prompt, and confirmed JSON import/export that merges without overwriting existing IDs. Browser offline behavior still requires deployment/host validation; no cloud sync, custom background assets, saved wallpaper preferences, or automated Playwright suite is included.

#### Phase 7 — Local reminders & notifications
Status: **implemented (best-effort local delivery)**. `/reminders` provides create/edit/delete/enable, countdown and milestone associations, deadline-relative presets and custom dates, explicit duplicate override, upcoming and delivery-history lists, and saved notification preferences. IndexedDB schema version 2 adds dedicated reminder/preference stores while preserving countdown data; validation, timezone/DST wall-clock conversion, CRUD, association, duplicate, permission-state, and IndexedDB upgrade/persistence tests are included. Notification permission is requested only after a click. Due reminders are checked every 30 seconds only while the app document is visible; browser-closed delivery is not supported. The daily reminder time is a saved preference, not an active recurring schedule.

#### Phase 8 — Backend, auth, PostgreSQL & reliable push
Status: **backend synchronization engine implemented; live verification incomplete**. Added strict NestJS/Prisma API, asymmetric Supabase JWKS bearer-token verification, guarded user-scoped resource endpoints, validation/rate limiting/CORS, OpenAPI, ownership/RLS migrations, and the 8.4A sync engine. Sync processes create/update/delete with serializable transactions, per-user idempotency response storage, server timestamps, integer record revisions with conditional writes, and deletion tombstones. Backend unit tests use mocked Prisma transaction clients; there has been no real PostgreSQL/Supabase migration, RLS isolation, concurrency, or rollback integration verification. The dependency audit found 28 advisories (14 high, 11 moderate, 3 low), documented in `docs/SECURITY_AUDIT.md`.

Phase 8.3/8.4A/8.4B/8.4D: Angular Auth and the IndexedDB outbox support durable conflict resolution and optional server push subscription registration. The backend includes owner-scoped subscription CRUD, VAPID configuration, durable `push_deliveries` rows with deduplication/retry/invalid-subscription cleanup, and a per-user delivery processor. No persistent worker, VAPID deployment, browser-closed delivery, or PostgreSQL/Supabase integration is verified. Guest data remains local and unchanged. Tombstones, idempotency rows, and delivery history currently have no cleanup worker.

#### Phase 9 — Testing, accessibility, performance
Scope: unit tests for all Phase 4 logic (and repositories), Playwright E2E for create-countdown → view-milestones → generate-wallpaper journeys, axe/manual WCAG 2.2 AA pass (focus states, ARIA live region for the countdown ticker instead of full re-render every second, reduced-motion media query), bundle/lazy-loading checks.
Realistic in one extended session: unit tests for core logic, yes; full E2E suite and formal accessibility audit need to run against a built app and remain follow-up work.

#### Phase 10 — Deployment & documentation
Scope: Cloudflare Pages config for the Angular build, environment-variable examples (`.env.example`, no real secrets), `README.md`, updated `ARCHITECTURE.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, API documentation for the NestJS endpoints.
Realistic in one extended session: documentation yes; an actually-verified live deployment needs the app and backend integrations to be configured first.

#### What this means for sequencing

Phases 8–10 require real external resources (a provisioned Supabase project and credentials, a reachable PostgreSQL instance, a push provider, and a deployment target) that this environment does not currently have configured. Rather than fabricate "it works" claims for those phases, the recommended order of actual delivery is:

1. Phase 2 (scaffold) → Phase 4 (business logic + unit tests, the brief's core requirement) → Phase 3 (UI shell around that logic) → Phase 6 (local persistence + PWA) → Phase 5 (wallpaper).
2. Phase 7 local reminders are implemented. Only once the above is built and passing its own tests, move to Phase 8 with real Supabase and push-provider configuration supplied by the project owner, then 9–10.

Each phase, when executed, will be reported with: files changed, commands actually run, and actual test output — never a claim of a passing test that wasn't executed.
