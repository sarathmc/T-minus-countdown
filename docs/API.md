# T-Minus API (backend scaffold)

The NestJS service lives in `backend/`; it is a separate Node 20+ workspace. API prefix is `/api`, with interactive OpenAPI UI at `/api/docs` when running the service.

## Authentication

The API currently accepts Supabase access tokens signed by an asymmetric key exposed by Supabase's JWKS endpoint. It checks signature, issuer, `authenticated` audience, expiry, and non-empty subject. The verified token subject is the only user identity used for ownership; request bodies cannot specify an owner. Configure a Supabase project using ES256/RS256 signing keys. Legacy HS256 tokens are intentionally not accepted because the API does not keep a shared JWT secret.

Registration, login and password-reset flows use Supabase Auth; the API provides only `GET /api/auth/profile` for a verified identity. Angular auth uses the public Supabase Auth REST API directly, not backend registration endpoints.

The Angular account UI uses Supabase Auth REST endpoints when `window.__T_MINUS_CONFIG__` is provided by the host (see `docs/DEPLOYMENT.md`). Session state is in memory; the refresh token is retained in `sessionStorage` to restore within the browser tab, and neither passwords nor session tokens are placed in localStorage. Registration may require email confirmation depending on the Supabase project configuration. No live Supabase credentials are configured by default.

## Endpoints

Except `GET /api/health`, routes require `Authorization: Bearer <Supabase access token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Process liveness |
| GET | `/api/health/readiness` | API and database readiness |
| GET | `/api/auth/profile` | Current authenticated profile |
| GET / POST | `/api/countdowns` | List / create owned countdowns |
| PATCH / DELETE | `/api/countdowns/:id` | Update with optional `If-Match` timestamp / delete |
| GET / POST | `/api/milestones` | List / create owned milestones |
| PATCH / DELETE | `/api/milestones/:id` | Update / delete milestone |
| GET / POST | `/api/reminders` | List / create owned reminders |
| PATCH / DELETE | `/api/reminders/:id` | Update / delete reminder |
| GET | `/api/sync/:entity/:id` | Retrieve one owned record or its tombstone for conflict inspection |
| POST | `/api/sync` | Authenticated transactional upload and incremental download with per-operation results |
| POST / GET | `/api/push/subscriptions` | Register or list the current user's browser push subscriptions |
| DELETE | `/api/push/subscriptions/:id` | Remove one owned browser push subscription |

DTOs reject unknown fields and validate IDs, enums, dates, strings, and booleans. Rate limit defaults to 100 requests per minute. Configure `FRONTEND_ORIGINS` as a comma-separated origin allowlist.

## Sync contract

Every request requires a unique `Idempotency-Key` header (1–128 characters) scoped to the authenticated user. Request shape:

```json
{
  "lastSyncedAt": "2026-11-19T02:00:00.000Z",
  "changes": [{
    "entity": "countdown",
    "id": "c0a80101-0000-4000-8000-000000000002",
    "operation": "upsert",
    "payload": { "id": "c0a80101-0000-4000-8000-000000000002", "title": "Exam", "targetDate": "2027-01-15T12:00:00.000Z", "timeZone": "UTC", "category": "work", "status": "active", "milestones": [] }
  }]
}
```

For a create, omit `baseRevision` and `baseUpdatedAt`; updates and deletes should include the exact prior server `revision` (an integer starting at 1). `baseUpdatedAt` remains accepted for clients migrating from the timestamp-only contract. Every successful write gets a server timestamp and increments `revision`; client timestamps are never canonical. Payload ownership fields are never trusted. Countdown payloads may include up to 100 milestones; milestone and reminder records otherwise synchronize as individual changes. The JSON body defaults to 256 KB and each batch is limited to 500 changes. One request runs as a serializable PostgreSQL transaction: a request error rolls back all writes, while an optimistic conflict is an operation result and does not block unrelated operations in that batch.

The response contains `serverTime`, `results[]`, changed `countdowns`, `milestones`, `reminders`, and ownership-scoped `deletions`. Successful results have `status` `created`, `updated`, or `deleted`; conflicts have `status: "conflict"` and a code such as `VERSION_CONFLICT`, plus the current remote record where available. Clients must preserve local conflict operations and must not automatically retry them. Example conflict:

```json
{ "results": [{ "id": "c0a80101-0000-4000-8000-000000000002", "entity": "countdown", "status": "conflict", "code": "VERSION_CONFLICT", "revision": 4, "current": { "revision": 4, "updatedAt": "2026-11-19T02:01:00.000Z" } }] }
```

An identical key and request replays the stored response without reapplying writes; reusing the key for a different request returns HTTP 409 `IDEMPOTENCY_KEY_REUSED`. Concurrent same-key attempts are serialized by PostgreSQL; serialization/unique failures must be retried using the same key. `sync_requests` and `deleted_records` are retained indefinitely for now; no cleanup worker or retention duration is configured. Tombstones prevent resurrection and are returned in incremental downloads. Deleted rows are physically removed after the tombstone is recorded; deletion is idempotent and user-scoped. A cleanup job must retain tombstones for longer than the maximum offline-client interval before deleting them.

The Angular outbox recognizes `results[]`, sends `baseRevision`, preserves conflicts separately from transient failures, and saves successful server revisions for subsequent updates. HTTP 409 conflicts are parked and are not automatically retried; transient errors remain pending with backoff. This protocol is unit-tested with mocked Prisma transaction clients only; it has **not** been verified against a real PostgreSQL/Supabase instance. Do not claim production cloud sync or verified RLS isolation until database integration tests are run.

Conflict inspection uses `GET /api/sync/{entity}/{id}` and returns either `{ deleted: false, record }` or `{ deleted: true, tombstone }`. The Angular database version 4 migration adds the `sync-conflicts` store. Keep-local and manual resolutions create a fresh idempotency key and rebase on the remote revision; keep-remote applies a retrieved countdown or tombstone locally. A keep-local decision after remote deletion sends `allowRestore: true`, which explicitly removes that user's tombstone in the same transaction; ordinary upserts can never resurrect tombstoned records. Conflicts remain durable until explicitly resolved.

Push subscriptions are authenticated and owner-scoped. Registration accepts `{ endpoint, p256dh, auth }`, deduplicates by endpoint, and never returns encryption keys after registration. Future reminder deliveries are represented by durable `push_deliveries` rows, unique per reminder/subscription, with queued/retry/failed/delivered states and idempotency keys. Invalid 404/410 push responses remove the subscription. VAPID private keys are server-only; the current repository has no deployed worker or verified browser-closed delivery.

The separate worker exposes unauthenticated infrastructure endpoints on its private health port: `GET /health` and `GET /metrics`. Protect that port with network policy or platform-private networking; it must not be exposed as a public application API.

## Database

Prisma models and SQL migration are under `backend/prisma/`. Tables include user profiles, countdowns, milestones, reminders/preferences, notification subscriptions, wallpaper preferences, sync metadata and deletion tombstones. The migration assumes Supabase's managed `auth.users` schema exists, installs a profile-creation trigger, and enables forced RLS policies using the transaction-local `request.jwt.claim.sub` value set from the verified token. See `docs/DEPLOYMENT.md` before applying it.

No live integration tests have been run against Supabase or PostgreSQL. Web Push registration/delivery, subscription cleanup/history, scheduled queues, reminder preferences endpoints, wallpaper preference endpoints, and real database migration/RLS verification remain incomplete.

The Angular sync outbox submits queued changes to `/api/sync` with durable per-operation idempotency keys and exponential retry metadata. Guest countdowns are copied to the queue without deleting local records. The account flow and cloud endpoint remain unverified together against provisioned infrastructure; choosing the remote version is not yet supported by the client conflict UI.