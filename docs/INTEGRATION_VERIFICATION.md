# Phase 8.4C Integration Verification

This checklist is for a disposable Supabase project and two test accounts. It has not been executed in this repository because no Supabase URL, publishable key, or PostgreSQL credentials are configured.

## Safe setup

1. Create a dedicated Supabase project. Do not use production data.
2. Create two ordinary email/password users, User A and User B. Do not use a service-role key for API or RLS verification.
3. Copy `backend/.env.integration.example` to an untracked `.env` and fill `SUPABASE_URL` and `DATABASE_URL`. Keep database credentials server-side.
4. Configure the browser host with:

```js
window.__T_MINUS_CONFIG__ = {
  supabaseUrl: 'https://<project-ref>.supabase.co',
  supabaseAnonKey: '<publishable-or-anon-key>',
  apiUrl: 'http://localhost:3000'
};
```

The publishable/anon key is browser-safe; database passwords and service-role keys are not.

## Migration checks

```powershell
cd backend
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npx.cmd prisma migrate status
```

Verify in the Supabase SQL editor using a non-bypass test role or the project’s documented authenticated role:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name in ('countdowns','milestones','reminders')
  and column_name = 'revision';
select conname from pg_constraint
where conrelid = 'public.sync_requests'::regclass;
select relname, relrowsecurity, relforcerowsecurity
from pg_class where relname in
('users','countdowns','milestones','reminders','deleted_records','sync_requests');
```

Migrations are forward-only in this repository. Before testing rollback, take a disposable database backup and restore it to a separate project; do not invent or run down migrations against production.

## Authentication and ownership matrix

Run each request with the indicated bearer token and save sanitized status/body evidence:

| Check | User A | User B | Anonymous |
|---|---:|---:|---:|
| register/login/logout/session restore | pass/fail | pass/fail | n/a |
| list own countdowns | 200 | 200 | 401 |
| read other user’s record | 404/403 | 404/403 | 401 |
| update/delete other user’s record | 404/403 | 404/403 | 401 |
| inspect other user’s sync record/conflict | 404/403 | 404/403 | 401 |
| manipulate other user’s tombstone | 404/403 | 404/403 | 401 |

Also test an expired token, an invalid signature, wrong issuer/audience, refresh-token restoration after reload, and failed refresh. Never paste tokens into logs or this repository.

For direct RLS checks, use a database role that does not have `BYPASSRLS`, set the transaction-local subject exactly as the API does, and verify both reads and writes:

```sql
begin;
select set_config('request.jwt.claim.sub', '<user-a-uuid>', true);
select id, user_id from public.countdowns;
rollback;
```

Repeat with User B and attempt explicit User A IDs. A superuser/service-role result is not evidence of RLS isolation.

## Synchronization matrix

Capture the HTTP status, sanitized JSON response, and a database query result for each:

1. Authenticated create, update, and delete.
2. Same idempotency key repeated with the same body.
3. Same key reused with a different body (`409 IDEMPOTENCY_KEY_REUSED`).
4. Two simultaneous updates using the same base revision; exactly one must apply and the other must conflict.
5. Concurrent update/delete.
6. Invalid payload in a multi-operation batch; confirm the transaction rolls back all writes.
7. Offline outbox changes, browser reload, reconnect, and retry.
8. Conflict inspection through `GET /api/sync/:entity/:id`.
9. Keep-local, keep-remote, and manual resolution with fresh idempotency keys.
10. Delete propagation and ordinary upsert rejection against a tombstone.
11. Explicit `allowRestore` only after a user-selected keep-local resolution.
12. Multiple browser tabs and duplicate request delivery.

Inspect `countdowns.revision`, `sync_requests`, and `deleted_records` after every destructive or concurrent case. Remove test accounts and destroy the dedicated project after verification.

## Current repository verification status

- Mocked backend tests and Angular IndexedDB/HTTP tests are available and must be run before the live pass.
- No real migration, Supabase JWT, two-user RLS, PostgreSQL concurrency, or cloud synchronization result is verified.
- Dependency advisories remain documented in `docs/SECURITY_AUDIT.md`.
