# Deployment and local backend setup

## Requirements

- Node.js 20 or newer and npm.
- A provisioned Supabase project using asymmetric JWT signing keys (ES256/RS256).
- A PostgreSQL connection URL for that project's database. The migration references the managed `auth.users` table and is not a standalone PostgreSQL migration.
- No service-role key, database password, or VAPID private key belongs in frontend configuration or source control.

## Deployment architecture

For the AWS EC2/ECR/ALB/Secrets Manager design, IAM OIDC workflow, security groups, cost assumptions, rollback, and cloud verification checklist, see `docs/AWS_DEPLOYMENT_PHASE9E1.md`. No AWS resources are provisioned by this repository.

```text
Browser ──HTTPS──> Static Angular PWA (Cloudflare Pages, Netlify, or nginx)
                         │ HTTPS + bearer token
                         ▼
                   NestJS API (long-running service)
                         │ pooled PostgreSQL connection
                         ▼
                   Supabase PostgreSQL + forced RLS

Push worker (separate long-running service)
  └── same backend image, `npm run start:worker`
      └── durable push_deliveries claims + VAPID delivery
```

Cloudflare Pages/Netlify are suitable for the static PWA and provide HTTPS and SPA fallback. A sleeping free web service may host the API for development, but it cannot provide reliable synchronization latency or continuous push processing. The worker requires a continuously running process; static hosting, serverless request limits, and sleeping tiers are not sufficient. Paid always-on container hosting or a managed scheduler/queue is required for dependable delivery.

## Start the API

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env with your local PostgreSQL connection URL, Supabase URL, allowed frontend origins, and (optionally) JSON_BODY_LIMIT.
npm run prisma:generate
npm run prisma:migrate
npm run build
npm start
```

The API listens on port 3000 by default; health is `/api/health`, Swagger is `/api/docs`. Do not expose the database URL to a browser. Use managed secret configuration in production. Restrict CORS to deployed origins and terminate TLS at the hosting platform. Request bodies default to 256 KB; keep the limit aligned with the largest permitted sync batch. Set `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` only in backend secrets; expose only the public key through `window.__T_MINUS_CONFIG__.vapidPublicKey`.

Run browser regression checks with `npm run e2e` after `npx playwright install chromium`. These tests use mocked authentication/synchronization where infrastructure is unavailable and must not be treated as Supabase, PostgreSQL, RLS, or browser-closed push verification.

The Angular host can set `window.__T_MINUS_CONFIG__` before the application bundle loads, with `supabaseUrl`, the public Supabase anon key, and `apiUrl`. Never put a Supabase service-role key or private server secret in this object. Empty configuration is the safe default and leaves the application in guest-only mode.

**Do not treat this API as production-ready.** The sync protocol is implemented and covered by mocked transaction tests, but no real PostgreSQL/Supabase migration, RLS isolation, concurrency, or end-to-end account sync test has been performed. The frontend cannot yet apply the remote version of a conflict. The backend dependency tree has unresolved advisories; review `docs/SECURITY_AUDIT.md` and resolve high-severity production findings before exposure to untrusted traffic.

## Supabase migration considerations

Review `backend/prisma/migrations/20261119000000_initial/migration.sql` and `backend/prisma/migrations/20261120000000_sync_requests/migration.sql` before applying them to a real project. They create ownership tables, a profile trigger on `auth.users`, tombstone storage, per-user idempotency response storage, and integer record revisions, then force RLS. The connection role must be able to execute application queries under the defined policies, while the verified user claim must be set inside each database transaction. Validate this behavior in a disposable Supabase project and verify two-user isolation before production. Existing `supabase/schema.sql` is an earlier draft and is not a substitute for these migrations.

Angular remains local-first and uses IndexedDB. Auth UI and an outbox client exist, but real Supabase configuration and end-to-end cloud behavior have not been verified. Sync request contract, conflict inspection endpoint, IndexedDB version 4 conflict store, and resolution/UI limitations are documented in `docs/API.md`. Multiple browser tabs are not live-tested; deploy only after validating synchronization with the target browser and database.

## Build and deploy

Container commands:

```powershell
# Docker Desktop required; use only disposable credentials/configuration.
docker build -f Dockerfile.frontend -t t-minus-frontend .
docker build -f backend/Dockerfile -t t-minus-api ./backend
docker compose up --build
docker compose down
```

The Compose file expects external Supabase/PostgreSQL and VAPID environment variables; it does not create a local database or run migrations automatically. Run the migration release job first, then start API/worker containers. Frontend is available at port 8080, API at 3000, and the private worker health port at 3001.

Frontend:

```powershell
npm ci
npm run build
# Publish dist/t-minus-ng/browser as the static site.
```

Set `window.__T_MINUS_CONFIG__` at deploy time with the Supabase URL, publishable key, API URL, and VAPID public key. Do not put secrets in Angular source, `dist/`, manifests, or static host variables that become browser-visible.

API:

```powershell
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run build
npm start
```

The API exposes `/api/health` for liveness and `/api/health/readiness` for database readiness. Configure HTTPS termination, a strict `FRONTEND_ORIGINS` allowlist, managed `DATABASE_URL`, `SUPABASE_URL`, and VAPID secrets. `NODE_ENV=production` rejects missing database/auth/origin configuration and wildcard CORS.

Worker:

```powershell
cd backend
npm run prisma:generate
npm run build
npm run start:worker
```

The worker requires `PUSH_WORKER_USER_IDS`, VAPID secrets, and a non-bypass database connection. It exposes `/health` and `/metrics` on `PUSH_WORKER_PORT` (default 3001), atomically claims queued/retry jobs with a lease token, recovers expired claims after restart, caps retries, and removes 404/410 subscriptions. The configured user-ID list is a deployment limitation; a production-scale worker should obtain tenant work through a reviewed RLS-safe dispatcher rather than a static list.

Delivery is at-least-once. If a push provider accepts a notification and the worker crashes before recording `delivered`, the lease will expire and the notification may be sent again. The database prevents concurrent claims, but exactly-once external delivery cannot be guaranteed by this protocol.

## Phase 8.4C live verification

The repository currently has no configured Supabase project, database URL, browser publishable key, or live integration harness. Do not run the migration against production or claim RLS/authentication/concurrency verification from mocked tests. Use the dedicated-project procedure in `docs/INTEGRATION_VERIFICATION.md`.

## Database operations and recovery

Run migrations once per environment from a controlled release job using `npm run prisma:migrate`; never run them from the browser or API startup. Take a Supabase backup before migrations and validate restores in a separate project. Prisma migrations are forward-only here: rollback means restore a backup or write/review a compensating forward migration, not `migrate reset`.

Use Supabase connection pooling for API/worker instances and set a connection limit appropriate to the plan. Verify forced RLS, non-bypass roles, owner policies, migration repeatability, and two-user isolation before enabling real accounts. Alert on failed migrations and stop deployment rather than weakening RLS.

## Operational checks and alerts

Monitor:

- API `/api/health` failures and `/api/health/readiness` database failures.
- Worker `/health` failures, `/metrics` `queued`, `retrying`, `failed`, and stale `sending` counts.
- Sync conflict/409 rates, authentication 401 spikes, and request-throttling responses.
- Database connection saturation, migration failures, and backup/restore results.

Recovery: restart an unhealthy API/worker, verify readiness and claim recovery, investigate repeated failed deliveries, remove/rotate invalid VAPID keys only through secret management, and preserve queue rows until delivery state is understood.

## Phase 9D.2 container verification status

Verification was attempted on 2026-11-20. Docker Engine and Docker Compose were not installed in the execution environment (`docker` was not available), so no image build, container startup, network, Nginx, healthcheck, restart, or graceful-shutdown result is claimed. The Dockerfiles, Compose healthchecks, Nginx rules, and ignore files were inspected statically only.

The Phase 9D.2 preflight was repeated on 2026-11-20: Node.js was available, but Docker Engine, Docker Compose, `psql`, and all required integration environment variables were unavailable. No container, disposable database, or migration runtime result is claimed.

### Ubuntu preflight

On a disposable Ubuntu LTS host, install Docker from the official repository and PostgreSQL client tools:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg postgresql-client
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker version
docker compose version
psql --version
```

Run Docker commands as a dedicated deployment user with least privilege; do not add broad remote access or expose the Docker socket.

### Disposable PostgreSQL and runtime sequence

With Docker installed, use a disposable database only:

```bash
docker run --name t-minus-postgres --rm -d \
  -e POSTGRES_USER=tminus \
  -e POSTGRES_PASSWORD='disposable-only' \
  -e POSTGRES_DB=tminus \
  -p 127.0.0.1:5432:5432 postgres:16
export DATABASE_URL='postgresql://tminus:disposable-only@127.0.0.1:5432/tminus?schema=public'
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npx prisma validate
cd ..
docker compose config
docker compose build --no-cache
docker compose up -d
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/health/readiness
curl --fail http://localhost:3001/health
docker compose restart api worker frontend
docker compose ps
docker compose down
docker stop t-minus-postgres
```

This local PostgreSQL run can validate migration application and schema shape only; it cannot verify Supabase `auth.users`, Supabase JWTs, or RLS behavior.

The local commands to run on a Docker-enabled disposable environment are:

```powershell
$env:DATABASE_URL = '<disposable database URL>'
$env:SUPABASE_URL = 'https://<disposable-project>.supabase.co'
$env:VAPID_SUBJECT = 'mailto:notifications@example.invalid'
$env:VAPID_PUBLIC_KEY = '<disposable public key>'
$env:VAPID_PRIVATE_KEY = '<disposable private key>'
$env:PUSH_WORKER_USER_IDS = '<disposable user UUID>'
docker compose config
docker compose build --no-cache
docker compose up -d
Invoke-WebRequest http://localhost:3000/api/health
Invoke-WebRequest http://localhost:3000/api/health/readiness
Invoke-WebRequest http://localhost:3001/health
docker compose restart api worker frontend
docker compose down
```

Run migrations separately before starting the API against the disposable database. Do not copy these values into committed files or use production credentials.

## Not included yet

The persistent `push_deliveries` queue and independently runnable worker are included, but no deployed worker/cron, VAPID keys, database backup plan, or verified live deployment is available. Browser-closed delivery is therefore unverified. Sync request records, tombstones, and delivery history currently have indefinite retention. Local builds verify compilation only, not connectivity, RLS, HTTPS, backup recovery, or production performance.