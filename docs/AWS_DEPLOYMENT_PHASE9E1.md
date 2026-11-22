# AWS EC2 Deployment Preparation — Phase 9E.1

This is a deployment design and runbook only. No AWS account, paid resource, ECR repository, EC2 instance, DNS record, certificate, or deployment was created or verified.

## Target architecture

```text
Route 53 ──> ACM certificate ──> public Application Load Balancer
                                  ├── default: frontend target group
                                  └── /api/*: API target group

VPC, two Availability Zones
  public subnets: ALB
  private app subnets: EC2 Docker hosts / Auto Scaling groups
    ├── frontend container (Nginx, ECR frontend image)
    ├── API container (NestJS, ECR api image)
    └── worker container (ECR worker image, no public listener)

EC2 instance role ──> ECR pull, SSM, Secrets Manager read
API/worker ──HTTPS──> Supabase Auth/PostgreSQL and push provider
```

The frontend, API, and worker repositories are separate ECR repositories even though the API and worker currently share the backend image build. The worker port is private; only the ALB exposes 443. PostgreSQL and Supabase credentials are never sent to the frontend.

For a lower-cost staging environment, one private EC2 instance may run all three containers behind an ALB. This is not highly available. Production should use separate API and worker capacity or an ECS/EKS equivalent once workload warrants it.

## VPC and security groups

Create a dedicated VPC with two AZs, private application subnets, public ALB subnets, route tables, and controlled egress. Recommended groups:

| Group | Inbound | Outbound |
|---|---|---|
| `alb-sg` | TCP 443 from `0.0.0.0/0`; TCP 80 only for redirect | API/frontend target ports |
| `app-sg` | Frontend/API container ports only from `alb-sg`; no SSH | TCP 443 to AWS/Supabase endpoints |
| `worker-sg` | No inbound public access; worker health port private only | TCP 443 to AWS/Supabase/push endpoints |

Use SSM Session Manager instead of opening SSH. Do not expose port 3001, Docker, PostgreSQL, or the Supabase database to the internet. Use VPC endpoints for ECR/SSM where practical; otherwise private instances require controlled NAT egress. Restrict outbound access further after endpoint requirements are confirmed.

## ECR

Create:

- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/t-minus/frontend`
- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/t-minus/api`
- `${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/t-minus/worker`

Enable scan-on-push, encryption, lifecycle cleanup for unreferenced tags, and immutable production tags. Deploy by image digest, not `latest`. Retain the previous production digest for rollback.

## Secrets and configuration

Store runtime secrets in AWS Secrets Manager, for example:

- `t-minus/prod/api`: `DATABASE_URL`, `SUPABASE_URL`, `FRONTEND_ORIGINS`, `JSON_BODY_LIMIT`
- `t-minus/prod/vapid`: `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `t-minus/prod/worker`: `PUSH_WORKER_USER_IDS` only if the static user-list worker limitation is accepted

The secret payload must also contain `SUPABASE_ANON_KEY` (browser-publishable), `API_URL`, and `VAPID_PUBLIC_KEY` for the generated `/opt/t-minus/config.js`. That file contains public configuration only and is mounted into the frontend container; `DATABASE_URL` and `VAPID_PRIVATE_KEY` are never written there.

The EC2 instance role may read only these exact secret ARNs. The deployment role may not read secret values. SSM Run Command retrieves secrets on the host into a root-readable ephemeral file or container secret mechanism, removes it after container startup, and never prints it. The VAPID public key is the only push value copied into browser runtime configuration.

## DNS and HTTPS

1. Request an ACM certificate for the production frontend/API hostname(s) in the ALB region.
2. Validate the certificate with Route 53 DNS records.
3. Create Route 53 alias records to the ALB.
4. Configure an HTTPS listener and redirect HTTP to HTTPS.
5. Set `FRONTEND_ORIGINS` to the exact deployed frontend origin, without `*`.
6. Configure Supabase redirect URLs and allowed origins to match the HTTPS frontend.

The Nginx container keeps SPA fallback and hashed-asset caching. `index.html`, `ngsw.json`, `ngsw-worker.js`, and the manifest remain revalidatable.

## CI/CD and IAM OIDC

The repository should use a protected `main` environment and GitHub Actions OIDC, not long-lived AWS keys. Create:

- A GitHub deploy role trusted only for the repository and protected branch/environment.
- ECR push permissions limited to the three repository ARNs.
- `ssm:SendCommand` limited to the tagged deployment instance(s) and a named SSM document.
- No `secretsmanager:GetSecretValue` permission on the GitHub role.
- An EC2 instance role limited to ECR pull, SSM agent, CloudWatch logs/metrics, and exact production secret ARNs.

The workflow template is `.github/workflows/aws-deploy.yml`. It is manual (`workflow_dispatch`) and requires repository/environment variables `AWS_REGION`, `AWS_ACCOUNT_ID`, and `AWS_EC2_INSTANCE_ID`; it does not contain credentials and is not verified until an AWS account is configured.

The workflow invokes `/opt/t-minus/deploy.sh` through SSM. That host-side script is an operational installation artifact, not committed here; it must validate the requested image tag/digests, fetch the approved Secrets Manager values, run the AWS image Compose definition, wait for health checks, and retain the previous image manifest for rollback.

The prepared scripts under `infra/aws/` cover image publishing, EC2 bootstrap, secret loading, deployment, certificate renewal, verification, rollback, and CloudWatch agent configuration. Copy them to the host through the approved SSM/bootstrap process; do not place secret values in the repository.

## Deployment sequence

1. Run unit, Playwright, production-build, Prisma validation, and image-build checks.
2. Build frontend/API/worker images with an immutable Git SHA tag.
3. Push images to ECR and record digests.
4. Run Prisma migrations from a controlled release job against the disposable/target database after backup approval. Do not run migrations from API startup.
5. Use SSM to pull the approved digests, retrieve runtime secrets, and restart API/worker/frontend containers.
6. Wait for API `/api/health/readiness`, worker `/health`, and ALB target health.
7. Verify SPA deep links, API connectivity, logs, queue metrics, and alarms.
8. Record the deployment manifest: Git SHA, image digests, migration ID, operator, and timestamp.

## Rollback and recovery

- Application rollback: redeploy the previous known-good image digests through SSM.
- Migration rollback: do not use `prisma migrate reset`; restore a tested database backup or apply a reviewed compensating forward migration.
- Worker recovery: restart the worker; expired delivery leases are reclaimable. Expect at-least-once external delivery if a provider accepted a message before a crash.
- API recovery: inspect readiness/database connection errors, then restart or replace the instance.
- Secret rotation: create a new Secrets Manager version, restart affected containers, verify health, then revoke the old VAPID/database credential.
- Keep ECR previous digests and database backups until the release has passed its observation window.

## Verification checklist

| Check | Evidence required | Current status |
|---|---|---|
| ECR image build/push | Image digests and scan results | Not run; no AWS account |
| EC2/ALB startup | Target health and SSM command output | Not run |
| Frontend deep links/service worker | HTTPS browser test | Not run |
| API liveness/readiness | `/api/health`, `/api/health/readiness` | Local code only |
| Worker recovery | `/health`, lease/restart test | Unit-tested locally; cloud not run |
| Supabase/RLS/auth | Two-user integration evidence | Not verified |
| Real Web Push | Provider/browser evidence | Not verified |
| Backup restore/rollback | Disposable restore evidence | Not verified |

## Cost assumptions

Costs vary by region, OS, architecture, traffic, storage, NAT usage, and AWS pricing changes. Approximate planning only:

| Component | Staging assumption | Cost considerations |
|---|---|---|
| EC2 | One small Graviton/x86 instance | Instance-hours, EBS, public/private networking |
| ALB | One internet-facing ALB | Hourly charge plus LCU; often exceeds a tiny staging instance cost |
| NAT Gateway | One for private egress | Hourly plus data processing; a major low-traffic cost |
| ECR | Three small repositories | Storage and data transfer; lifecycle cleanup reduces cost |
| Route 53/ACM | One hosted zone/certificate | Route 53 hosted-zone/query charges; ACM public certificates generally no certificate charge |
| Secrets Manager | Several secrets | Per-secret monthly and API-call charges |
| CloudWatch/SSM | Basic logs/commands | Log ingestion/storage and metrics may incur charges; SSM itself may be low/no charge for basic features |

Supabase plan, database/storage limits, and push-provider limits are separate costs. Confirm current AWS pricing before approval. A single-instance staging setup is not HA and does not establish production readiness.
