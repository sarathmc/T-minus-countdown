#!/usr/bin/env bash
set -Eeuo pipefail

: "${T_MINUS_DOMAIN:?T_MINUS_DOMAIN is required}"
: "${T_MINUS_COMPOSE_FILE:=/opt/t-minus/docker-compose.production.yml}"

curl --fail --silent --show-error "https://${T_MINUS_DOMAIN}/api/health" >/dev/null
curl --fail --silent --show-error "https://${T_MINUS_DOMAIN}/api/health/readiness" >/dev/null
docker compose -f "$T_MINUS_COMPOSE_FILE" ps
docker inspect --format '{{.State.Health.Status}}' t-minus-api | grep -qx healthy
docker inspect --format '{{.State.Health.Status}}' t-minus-worker | grep -qx healthy
echo "Frontend/API/worker deployment checks passed."
