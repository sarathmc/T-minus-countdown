# Phase 9A Dependency Audit

Audit date: 2026-11-19. Commands used: `npm audit --omit=dev --json` in `backend/` and the Angular root. No `npm audit fix --force` was used.

## Backend production audit

The previous backend production snapshot reported 14 advisories. Compatible overrides reduced the current production report to **6 advisories: 3 high and 3 moderate**. The remaining framework/Prisma items require coordinated major upgrades or are toolchain-only in practice.

| Package | Current installed | Previous vulnerable range | Current status | Exposure/remediation |
|---|---:|---|---|---|
| `@nestjs/common` | 10.4.22 | 10.4.16–10.4.22 | Remediated transitively | `file-type` is overridden to 21.3.2; direct Nest major upgrade remains future work. |
| `@nestjs/config` | 3.3.0 | 1.1.6–4.0.3 | Remediated transitively | `lodash` is overridden to 4.18.1; framework 12 upgrade is the upstream fix. |
| `@nestjs/core` | 10.4.22 | <=11.1.17 | **Remaining moderate** | Requires coordinated Nest 12 upgrade; no blind major upgrade attempted. |
| `@nestjs/platform-express` | 10.4.22 | <=11.1.14 | **Remaining moderate** | Requires coordinated Nest 12 upgrade; parser/multipart dependencies are patched by overrides. |
| `@nestjs/swagger` | 8.1.1 | <=11.2.6 | **Remaining moderate** | Requires Swagger/Nest major upgrade; Swagger is exposed only as the local API documentation surface. |
| `@prisma/config` | 6.19.3 | 6.13.0-dev.1–7.10.0 | **Remaining high** | Prisma configuration/tooling dependency; no compatible patched version reported. |
| `body-parser` | 1.20.9 override | <=1.20.8 | Remediated | Patched without changing Nest or Express majors. JSON body size remains capped at 256 KB. |
| `deepmerge-ts` | 7.1.5 | <8.0.0 | **Remaining high** | Prisma toolchain dependency; upgrading to 8 requires a Prisma major compatibility review. |
| `file-type` | 21.3.2 override | 13.0.0–21.3.1 | Remediated | Compatible override under `@nestjs/common`; no file-upload feature is exposed. |
| `js-yaml` | 4.3.2 override | 4.0.0–4.3.1 | Remediated for runtime | Swagger/runtime copy is patched; a separate dev-only 3.x copy remains in Jest tooling. |
| `lodash` | 4.18.1 override | 4.0.0–4.17.23 | Remediated | Patched compatible override under Nest config/Swagger and their shared tree. |
| `multer` | 2.5.0 override | <=2.4.0 | Remediated | Multipart uploads are not used by this API; patched compatible override applied. |
| `prisma` | 6.19.3 | 6.13.0-dev.1–7.10.0 | **Remaining high** | Prisma CLI/toolchain; production API uses `@prisma/client`, but migration/build environments remain exposed. |
| `qs` | 6.16.1 override | <=6.16.0 | Remediated | Patched parser override under Express/body-parser. |

The full backend audit still reports development advisories. The current backend production summary is **0 critical, 3 high, 3 moderate, 0 low**.

## Frontend production audit

The Angular root currently reports **8 production advisories: 5 high and 3 moderate**, all affecting Angular 19.2.25 packages. npm reports Angular 22.3.0 as the fix, which is a coordinated major upgrade. No major Angular upgrade was applied because it requires a migration and full UI/PWA regression plan.

Affected production packages: `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`, `@angular/router`, and `@angular/service-worker`.

The application is client-rendered and no unsafe Angular HTML bypass was found. Service-worker redirect/header behavior and the advisories’ exploitability against this deployment still require live browser verification.

## Lockfile and policy

The reviewed overrides are recorded in `backend/package.json` and `backend/package-lock.json`. They do not remove authentication, RLS, validation, rate limiting, CORS, transaction, or push-security controls. Remaining major upgrades are tracked as explicit blockers rather than forced automatically.
