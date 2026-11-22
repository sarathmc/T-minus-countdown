# Architecture — T-Minus Countdown

## Product scope from the supplied brief
The source brief describes deadline planning, T-minus milestones, personalized countdown wallpapers, sharing, and reminders. Current local implementation status and limitations are documented in `README.md` and `docs/IMPLEMENTATION_PLAN.md`.

## Current deployment architecture

```text
Mobile / Desktop Browser
        │ HTTPS
        ▼
Static PWA (HTML + CSS + JavaScript modules)
        ├── Countdown UI + timer calculation
        ├── Milestone planner + completion state
        ├── Canvas wallpaper renderer + PNG export
        ├── Countdown / milestone IndexedDB repository (localStorage migration/fallback)
        ├── Reminder / preference IndexedDB repository (schema v2)
        ├── Reminder state + delivery history
        ├── Foreground reminder scheduler
        ├── Notification permission service
        ├── Browser notification delivery adapter
        └── Optional server push subscription client (VAPID public key only)
        └── Angular Service Worker (versioned app-shell + lazy asset cache)
```

The Angular app remains local-first: countdown and milestone records stay in IndexedDB and no private API responses or authentication data are cached. The account screen's IndexedDB outbox submits authenticated queued operations to the NestJS sync endpoint when configured; conflicts are parked, fetched through the owned-record inspection endpoint, and resolved explicitly. IndexedDB version 4 adds durable conflict metadata without changing countdown/reminder stores. This integration has only mock/unit verification and is not cloud-verified.

## Backend foundation (not live-verified)

```text
Angular PWA (still local-only)
  └── IndexedDB repositories

NestJS API (backend/)
  ├── Supabase asymmetric JWT JWKS guard → verified subject
  ├── Validated, throttled, CORS-restricted REST controllers
  ├── Prisma resource service (serializable subject-scoped sync transaction + RLS claim)
  └── Supabase PostgreSQL migration: ownership tables + forced RLS + tombstones + idempotency records
```

The sync endpoint applies countdown, milestone, and reminder creates/updates/deletes transactionally, stores per-user idempotency responses, checks `updatedAt` revisions, and returns remote records on conflict. Tombstones and idempotency responses have no cleanup policy yet. Frontend queue and backend tests are mocked; no real PostgreSQL/Supabase sync, migration, concurrent database, or RLS isolation test has run. The account UI cannot yet apply the remote side of a conflict. See `docs/API.md`, `docs/DEPLOYMENT.md`, and `docs/SECURITY_AUDIT.md` for protocol details and outstanding security findings.

## Target full architecture

```text
PWA Client
  ├── Presentation: Dashboard / Planner / Wallpaper Studio
  ├── Domain: Countdown / Milestone / Reminder rules
  ├── Data ports: CountdownRepository / ReminderRepository
  │      ├── IndexedDB adapters (current)
  │      ├── localStorage countdown migration / fallback
  │      └── Supabase adapter (planned)
  └── Notification services
         ├── Permission manager (current)
         ├── Foreground scheduler + browser delivery adapter (current)
         └── Server-scheduled Web Push (planned)
                 │
                 ▼
Supabase Auth + PostgreSQL + RLS
                 │
                 ▼
Future: transactional sync queue + scheduled Web Push worker
```

## Core entities

### Countdown
- `id`: UUID
- `title`: required, up to 64 characters
- `description`: optional short goal context
- `targetDate`: ISO-8601 timestamp
- `milestones`: ordered list

### Milestone
- `id`: UUID
- `title`: short action description
- `date`: ISO-8601 timestamp
- `days`: offset relative to the target date; zero means target day
- `done`: completion state

### Reminder
- `id`, `countdownId`, optional `milestoneId`, title/description, `scheduledAt` instant, IANA `timeZone`, reminder type, enabled state, delivery status, timestamps.
- Reminder preferences are stored separately and include notification opt-in, daily reminder preference/time, and timezone.

## Important behavior decisions
- The countdown is calculated from the target timestamp and current device clock; it is not a decrementing stored counter.
- T-minus dates are calculated by subtracting calendar days from the target date.
- Completed milestones are stored independently from their due dates.
- Wallpaper generation runs locally in Canvas and exports a PNG. This avoids an image-generation API cost in the free MVP.
- IndexedDB is the primary browser-local persistence adapter. Existing validated `t-minus.countdowns.v1` records are migrated only after successful IndexedDB storage; backup JSON provides explicit, user-controlled transfer, not cloud sync.
- IndexedDB schema version 3 includes dedicated `reminders`, `reminder-preferences`, and `sync-queue` stores without clearing existing countdown data. Reminder writes are validated and serialized; delivery history is recorded through reminder delivery status.
- Reminder permission is requested only after an explicit user action. The scheduler checks due records every 30 seconds while the document is visible; a browser notification click routes to its countdown. This is best-effort foreground delivery, not a background scheduler.
- Notification permission management, local scheduling/state, and browser delivery are separate services behind a replaceable delivery interface. A future backend can provide server-scheduled Web Push without claiming local timers are reliable when closed.
- The daily reminder time is currently a persisted preference only; recurring delivery requires a future scheduler and is not active in the local app.
- Angular Service Worker is enabled in production builds. Hashed app bundles are precached and lazy route chunks are cached on demand; install the app and visit routes once before expecting them offline.
- Network status indicates browser connectivity only; the client queue is a best-effort synchronization foundation and does not imply cloud synchronization is operational.
- Phase 8.3/8.4A adds configurable client-side Supabase Auth, an IndexedDB outbox, transactional backend sync, per-user idempotency records, optimistic revisions, and tombstones. Access tokens are memory-only; a refresh token is held in sessionStorage for tab-scoped restoration, never localStorage. Unit tests use mocked HTTP/Prisma; no successful live cloud synchronization or verified RLS isolation is claimed.
- Record revisions are integer, server-owned fields added by migration `20261121000000_record_revisions`; conditional updates/deletes prevent stale writes. The `push_deliveries` table is a durable per-reminder/per-subscription queue with retry state, deduplication, and invalid-subscription cleanup. A separate trusted worker must process due rows with user-scoped RLS context; no worker or browser-closed delivery is deployed here. Tombstones and idempotency responses remain indefinitely retained until an explicitly configured cleanup process is deployed. The browser outbox serializes one operation per record per tab, uses bounded jittered retries, and parks conflicts/expired-auth failures for explicit recovery. Cross-tab locking and live multi-device behavior remain unverified. The backend dependency audit (2026-11-19) reported 28 advisories (14 high, 11 moderate, 3 low); several require framework-major updates. Do not treat this scaffold as production-ready until high-severity runtime findings and live security tests are addressed; details are in `docs/SECURITY_AUDIT.md`.

## Free-tier deployment recommendation
- Static app: Cloudflare Pages (HTTPS, static hosting, CDN).
- Optional data/auth: Supabase Free project, subject to its current quotas and inactivity policies.
- Optional scheduled reminders: Supabase scheduled Edge Function or another free-tier scheduler, subject to quota and provider limits.

## Privacy and security
- Do not store sensitive personal data in the initial local-only app.
- For cloud sync, every row must be owned by `auth.uid()` and protected by RLS. `supabase/schema.sql` includes starter ownership policies.
- Keep service-role secrets server-side only. Never commit `.env` secrets.
