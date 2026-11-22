### T-Minus Countdown

A countdown-planning and lock-screen-wallpaper app: pick a deadline, get an automatic backwards-planning milestone checklist, and design a countdown wallpaper. This repository is mid-rebuild from a vanilla-JS prototype into an Angular 19 PWA — see `docs/CURRENT_STATE_AUDIT.md` and `docs/IMPLEMENTATION_PLAN.md` for exactly what is implemented versus planned, phase by phase, and `docs/ARCHITECTURE.md` for the target architecture.

#### Repository layout

- `src/app/domain/models` — framework-free TypeScript interfaces for `Countdown` and `Milestone`.
- `src/app/core/services` — business logic and state: `CountdownCalculatorService`, `MilestonePlannerService`, `CountdownFactoryService`, and `CountdownStoreService` (signals-based state with IndexedDB persistence). Each has unit tests.
- `src/app/core/services/countdown-repository.ts` — IndexedDB countdown persistence and record validation; legacy localStorage records are migrated after successful write.
- `src/app/core/services/reminder-repository.ts` — version-2 IndexedDB reminder and preference persistence; the database upgrade preserves the existing countdown store.
- `src/app/domain/models/reminder.model.ts` — validated reminder records, delivery statuses, preferences, and the deadline-relative presets.
- `src/app/core/services/reminder-store.service.ts` — signal state and persistence queue for reminders, associations, and preferences; `reminder-history.service.ts` owns delivered/expired history.
- `src/app/core/services/notification-permission.service.ts`, `browser-notification.service.ts`, and `browser-notification-delivery.service.ts` — user-triggered browser permission, foreground-only scheduling, and replaceable delivery adapter.
- `src/app/features/dashboard` — the dashboard: stats, upcoming deadlines, recently updated countdowns, empty state.
- `src/app/features/countdowns` — countdown list (filter/duplicate/pause/archive/delete), create/edit form (Reactive Forms), and detail page (live timer + milestone planner UI).
- `src/app/features/reminders` — reminder settings and management page at `/reminders`, with countdown/milestone association, custom times/timezones, deadline presets, upcoming/history lists, and browser notification controls.
- `src/app/features/wallpaper-studio` — lazy-loaded wallpaper editor with five templates, responsive live preview, format/color/type/layout controls, and high-resolution Canvas PNG export.
- `src/app/shared/components` — reusable UI: `EmptyStateComponent`, `ConfirmDialogComponent`, `ProgressBarComponent`, `CountdownTimerComponent` (accessible live ticker with a throttled `aria-live` announcement).
- `src/styles.scss` — global design tokens (color, spacing, typography) and shared button/card/badge/form classes used across all pages.
- `legacy/` — the original static HTML/CSS/vanilla-JS prototype, kept for reference and not served by the Angular build.
- `public/` — PWA manifest and app icon; Angular generates the production service worker and cache manifest.
- `supabase/schema.sql` — draft PostgreSQL schema for the planned Supabase-backed persistence (not yet wired up).
- `backend/` — separate NestJS/Prisma API scaffold with Supabase asymmetric-JWT verification, owner-scoped resource endpoints, RLS migration, and OpenAPI docs.
- `docs/` — audit, implementation plan, architecture, API/deployment guidance, and the Phase 8.2 security audit.

#### Development

```bash
npm install
npx ng serve      # dev server at http://localhost:4200
npx ng test        # unit tests (Karma + Jasmine, Chrome headless)
npx ng build       # production build, output in dist/
npm run e2e        # Chromium browser workflows (Playwright)
```

#### Current status

Implemented so far (Phases 1–7 local reminder scope in `docs/IMPLEMENTATION_PLAN.md`):

- Angular 19 strict-mode standalone workspace with lazy-loaded routes.
- Countdown and milestone domain/business logic, each with unit tests.
- A working, responsive UI: dashboard, countdown list with filters and destructive-action confirmations, a create/edit form with validation, and a countdown detail page with a live accessible timer and a full milestone planner (add/complete/delete, duplicate-date rejection, completion percentage).
- IndexedDB-backed local persistence with validated localStorage migration and localStorage fallback.
- Component and integration tests for the store and every feature page.
- Wallpaper studio with five distinct templates, 9:16 mobile and 16:9 desktop export, live countdown/milestone preview, customizable colors/type/scale/alignment/visibility, reset, and actual PNG downloads.
- Production PWA wiring with Angular Service Worker, app-shell/lazy-chunk caching, update-ready notification, online/offline status, JSON backup/restore (`/settings/backup`), and persisted wallpaper preferences.
- Local reminders: create/edit/delete/enable, preset scheduling, countdown and milestone associations, duplicate protection with explicit override, timezone/DST-aware wall-clock conversion, IndexedDB persistence/preferences, and delivered/expired history.
- Playwright Chromium E2E coverage for guest countdowns, milestones, reminders, wallpaper export, accessibility smoke checks, and mocked authentication/synchronization recovery. See `docs/E2E.md`.
- Automated axe accessibility checks and responsive Chromium coverage are documented in `docs/QUALITY_AUDIT_PHASE9C.md`; manual WCAG and production-host performance verification remain required.
- Browser notifications request permission only from an explicit click; due reminders are checked every 30 seconds only while the app document is visible, and notification clicks navigate to their countdown.

Not yet implemented — scoped as follow-up phases in `docs/IMPLEMENTATION_PLAN.md`:

- PWA install prompt/installation was not tested; real-browser offline reload was verified for the dashboard and a previously visited countdown-detail route. Playwright coverage remains pending. Wallpaper user-image backgrounds and saved design presets are not implemented.
- Backend integration is an **implemented but live-unverified synchronization engine**: API auth guard, health/profile/countdown/milestone/reminder endpoints, schema/migrations, transactional create/update/delete sync, idempotency, revisions, conflicts, and tombstones exist. Complete conflict resolution UI, live DB/RLS/auth tests, and operational cloud synchronization remain unverified. Provisioned Supabase/PostgreSQL credentials are unavailable here.
- Phase 8.3/8.4A/8.4B adds a configurable Supabase Auth REST client/account screen and IndexedDB sync outbox with durable conflict inspection/resolution. Auth credentials are not persisted to localStorage (refresh token is session-scoped); guest records are preserved during queue preparation. The backend sync engine accepts authenticated create/update/delete batches with idempotency keys, server revisions, conflict inspection, transactional rollback, and ownership-scoped tombstones. Live Supabase credentials, multi-tab coordination, and a provisioned PostgreSQL test environment are still required for end-to-end verification.
- Backend dependency audit (2026-11-19): 28 advisories (14 high, 11 moderate, 3 low; 0 critical); 14 remain in the production dependency tree. No forced major upgrade was attempted. See `docs/SECURITY_AUDIT.md` before considering deployment.
- Server-push foundations now include owner-scoped subscription APIs, VAPID configuration, and a durable delivery queue, but reliable closed-browser delivery still requires a deployed persistent worker and real VAPID/browser testing. Recurring daily notification delivery, Playwright end-to-end tests, and a formal accessibility audit remain future work.

Backend setup and current API coverage: `docs/DEPLOYMENT.md` and `docs/API.md`. The local Angular app remains usable without the backend and continues to store countdowns in IndexedDB.
