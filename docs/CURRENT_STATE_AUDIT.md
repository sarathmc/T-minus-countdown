### Current State Audit — T-Minus Countdown v0.1.0

This document is an honest, factual inventory of what exists in the repository today, produced before any rewrite work. It is Phase 1 of the master prompt's 10-phase plan.

#### What the repository actually contains

- `index.html` (34 lines) — a single static page with inline markup for three "views" (home, planner, wallpaper), toggled via `hash` routing and `classList.toggle('hidden', ...)`.
- `src/app.js` (31 lines, no build step, no framework) — all application logic: storage, rendering, countdown math, milestone generation, canvas-based wallpaper drawing, and DOM event wiring. Functions are long one-liners with string-concatenated HTML (`innerHTML` templates), no module boundaries, no types.
- `src/styles.css` — hand-written CSS for the shell above.
- `public/sw.js`, `sw.js` (duplicated at both root and `public/`) — a minimal service worker.
- `public/manifest.webmanifest`, `manifest.webmanifest` (also duplicated at root and `public/`) — PWA manifest.
- `public/icon.svg`, `icon.svg` (duplicated again).
- `supabase/schema.sql` — a SQL file defining tables, but there is no Supabase client integration anywhere in `app.js`; it is unused/aspirational.
- `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` — prior planning notes, not reflecting the actual code (they describe an Angular/NestJS architecture that was never built).
- No `package.json`, no `node_modules`, no build tool, no `tsconfig`, no Angular, no NestJS, no backend server, no test runner, no CI config, no lockfile.

#### Functional assessment

What works (client-side only, backed by `localStorage`):
- Create a countdown (title, description, target date/time, milestone preset).
- Auto-generated milestones from 3 fixed presets (`standard`, `compact`, `light`), computed as `targetDate - N days`.
- Mark milestones done/not done; add a custom milestone via `prompt()` dialogs.
- Delete a countdown (`confirm()` dialog).
- Live countdown digits updated via `setInterval(..., 1000)` that re-renders the *entire* list every second.
- A canvas-based "wallpaper" generator with 3 fixed palettes, downloadable as PNG (fixed 900×1600 canvas only — no 16:9 desktop layout).
- Service worker registration for basic offline caching.

What does not work / is not implemented at all:
- No authentication, no backend, no database connectivity (despite `supabase/schema.sql` existing).
- No edit or duplicate countdown, no pause/archive, no categories, no timezone selection (`targetDate` is parsed with the browser's local timezone implicitly; DST and timezone differences are not handled explicitly).
- No reminders/notifications of any kind (no `Notification.requestPermission()`, no scheduling).
- No milestone editing of dates/descriptions beyond custom-add; no duplicate-prevention logic beyond presets being static arrays.
- No desktop 9:16/16:9 wallpaper layout toggle, no typography options, no custom background upload.
- No tests of any kind (unit or e2e), no linting config, no TypeScript.
- No routing beyond hash-based view toggling (not deep-linkable per countdown).

#### Engineering quality issues

- **Architecture**: everything lives in one 31-line file with multi-statement one-liners; there is no separation between rendering, state, persistence, and domain logic. This is unmaintainable and untestable as-is.
- **Duplicated files**: `sw.js`, `manifest.webmanifest`, and `icon.svg` each exist both at the project root and under `public/`, with no build step that would explain the duplication — this is dead/confusing duplication.
- **Unused dependencies/artifacts**: `supabase/schema.sql` is present but nothing in the client talks to Supabase; it's a disconnected artifact from an earlier planning pass.
- **Security**: all data lives in unauthenticated `localStorage`; there is no backend to secure, but also no real persistence/sync story.
- **Accessibility**: destructive actions use native `confirm()`/`prompt()` (acceptable for keyboard/screen readers, but not a designed experience); countdown digits update every second without `aria-live` regions, which will spam screen readers if ever made accessible-first.
- **Performance**: the 1-second `setInterval` re-renders the full list (including re-sorting milestones, rebuilding all HTML strings) on every tick for every visible countdown — wasteful but acceptable at the current tiny scale; would not scale to many countdowns.
- **Non-functional controls**: none observed — the existing small surface area of buttons all do something, which is good, but the surface area itself is far below the brief's requirements.

#### Conclusion

The existing project is a working **proof-of-concept prototype** (static HTML/CSS/vanilla JS, local-only storage) that implements a small slice of the brief: creating a countdown, fixed milestone presets, and a single-format wallpaper export. It does not contain any Angular, NestJS, PostgreSQL, Supabase, PWA-service-worker-strategy, authentication, reminders, or testing infrastructure described in the master prompt, despite `docs/ARCHITECTURE.md` describing such a stack. The gap between the brief (a full Angular 19 + NestJS + Supabase production PWA with auth, reminders, and E2E tests) and the current repository (31 lines of vanilla JS) is the entire scope of sections 2–13 of the brief — see `IMPLEMENTATION_PLAN.md` for a realistic, phased path from here to there, and a note on what is feasible to deliver incrementally versus in a single pass.
