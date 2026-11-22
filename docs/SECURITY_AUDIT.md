# Security Audit — Phase 8.2

## Scope and method

Reviewed the NestJS authentication guard, resource controllers and DTOs, Prisma query ownership filters, PostgreSQL migration/RLS policies, and the backend dependency tree using `npm audit` and `npm audit --omit=dev`. This is a source/dependency review only; the Supabase project and PostgreSQL credentials are not configured, so deployed behavior and RLS isolation have not been tested.

## Dependency findings

Audit snapshot before Phase 9A remediation from `backend/package-lock.json` (2026-11-19): **28 advisories: 14 high, 11 moderate, 3 low; 0 critical**. Phase 9A applied compatible lockfile overrides. The current backend production audit is **6 advisories: 3 high, 3 moderate, 0 low; 0 critical**. Full package-by-package details are in `docs/DEPENDENCY_AUDIT_PHASE9A.md`.

| Severity | Affected packages |
| --- | --- |
| High (14) | `@nestjs/cli`, `@nestjs/config`, `@nestjs/platform-express`, `@nestjs/swagger`, `@prisma/config`, `body-parser`, `deepmerge-ts`, `glob`, `js-yaml`, `lodash`, `multer`, `picomatch`, `prisma`, `tmp` |
| Moderate (11) | `@angular-devkit/core`, `@angular-devkit/schematics`, `@angular-devkit/schematics-cli`, `@nestjs/common`, `@nestjs/core`, `@nestjs/schematics`, `@nestjs/testing`, `ajv`, `file-type`, `minimatch`, `qs` |
| Low (3) | `external-editor`, `inquirer`, `webpack` |

Direct dependencies with advisories: `@nestjs/cli`, `@nestjs/config`, `@nestjs/platform-express`, `@nestjs/swagger`, `@nestjs/common`, `@nestjs/core`, `@nestjs/schematics`, `@nestjs/testing`, and `prisma`. The remaining 19 affected package records are transitive dependencies (including request parsers and framework/tooling dependencies). The 28 figure is npm's total affected-package count, not the number of individual CVE/advisory notices; some package records list several advisories.

Several high-severity issues are in runtime dependencies, including `body-parser`, `multer`, `js-yaml`, and `lodash`; the omit-dev audit reports **14 advisories (10 high, 4 moderate)** for the production dependency tree. Multipart upload is not an implemented API feature, but the vulnerable parser is present in the Express adapter dependency tree. Other runtime findings include denial-of-service paths in request parsing and vulnerable transitive libraries.

The audit's suggested comprehensive remediations require a major Nest upgrade (v12) for some packages. No forced upgrade was applied: upgrading the framework, adapter, Swagger, CLI, and Prisma as a single breaking change without compatibility/integration tests would be unsafe. Re-run both audit commands after a planned compatible dependency update; production deployment should be blocked until high-severity runtime advisories are resolved or formally accepted with a documented mitigation.

## Application security review

### Positive controls observed

- `AuthGuard` requires a Bearer token and verifies signature, issuer, audience, and expiry through Supabase remote JWKS (`backend/src/auth/auth.guard.ts`). It does not derive identity from a supplied request user ID; the verified `sub` is attached to the request.
- Resource endpoints apply the guard at the controller level. DTO validation is globally configured with `whitelist`, `forbidNonWhitelisted`, and `transform`.
- Resource reads and mutations generally filter by the verified `userId`; relational creates check parent countdown ownership and milestone/countdown association.
- The SQL migration enables and forces RLS and adds owner policies for all application tables. The API sets the transaction-local `request.jwt.claim.sub` from the verified JWT before queries.
- CORS has an explicit configured origin allowlist, and a global rate limiter is registered.
- Conflict inspection is authenticated and ownership-scoped. Tombstone removal is only possible through an explicit `allowRestore` synchronization operation that remains inside the authenticated transaction; ordinary upserts cannot resurrect deleted records.
- Push subscription endpoints are authenticated and user-scoped; VAPID private keys are read only by the backend, subscription encryption keys are not returned by list responses, and push payloads contain IDs rather than reminder text.

### Gaps and risks

1. **Live sync behavior is unverified.** The sync engine now validates and applies create/update/delete operations transactionally, stores idempotent responses, uses integer revisions with conditional writes, and parks conflicts. These controls have only mocked Prisma coverage until a real PostgreSQL/Supabase environment is available.
2. **Conflict resolution UI is incomplete.** The Angular outbox preserves conflicts and does not retry HTTP 409 responses, but it cannot yet apply a selected remote version locally.
3. **RLS is unverified at runtime.** The API's PostgreSQL connection role must not have `BYPASSRLS`; table ownership/role configuration and Supabase's auth-user trigger must be tested in a provisioned project. The migration's policy claims are not evidence of actual cross-user isolation.
4. **Push worker deployment is not verified.** Durable delivery rows, lease claims, VAPID sender configuration, retries, expiration handling, and delivery history exist, but cloud worker execution and browser-closed delivery remain untested.
5. **Auth test coverage is narrow.** Existing tests check missing token and missing configuration, not valid/expired/wrong-issuer tokens, JWKS failures, or protected endpoint authorization.
6. **Validation and error handling need further work.** DTOs use string bounds but do not validate timezone identifiers; sync payload is broadly typed as `Record<string, unknown>`. A 256 KB JSON body limit and 500-change batch limit are now configured, but schema-level consistency still needs live exercise.
7. **Migration/data integrity needs live checks.** Cascades and tombstone retention (including user deletion) have not been exercised. Deleting a user intentionally cascades their tombstones; this means deletion history is not retained after account deletion.
8. **Cross-tab coordination is browser-dependent.** The outbox uses the Web Locks API when available and otherwise serializes only within one tab; multi-tab behavior still requires browser-level integration tests.
9. **Push worker deployment is unverified.** Durable delivery rows and retry/invalid-subscription handling exist, but no persistent worker, VAPID key set, or browser-closed delivery test is configured.

## Required pre-production actions

- Resolve or accept all high-severity runtime dependency advisories; avoid `npm audit fix --force` without a staged major-upgrade test plan.
- Complete live integration tests for authenticated Angular sessions, the IndexedDB outbox, schema-validated sync operations, idempotency, version preconditions, conflict payloads, rollback, and stable cursor semantics before enabling sync clients.
- Run migration, FK/cascade, RLS cross-user read/write, and tombstone tests against a provisioned Supabase PostgreSQL project using the actual API database role.
- Implement and exercise server-side Web Push scheduling before advertising reliable background reminders.
- Add request-size limits and comprehensive auth/resource/synchronization integration tests.

## Verification status

- Dependency tree: inspected; see counts above. `npm audit` exits non-zero because advisories remain.
- Source review: completed for current guard, controller/DTO, resource service, and initial SQL migration.
- Live database/RLS, JWT against real Supabase, cloud sync, and Web Push: **not verified** (no credentials or provisioned environment).