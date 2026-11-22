#!/usr/bin/env bash
set -Eeuo pipefail

: "${IMAGE_TAG:?Set the previously approved immutable image tag}"
: "${T_MINUS_COMPOSE_FILE:=/opt/t-minus/docker-compose.production.yml}"
: "${AWS_REGION:=ap-south-1}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker compose -f "$T_MINUS_COMPOSE_FILE" pull
docker compose -f "$T_MINUS_COMPOSE_FILE" up -d --no-build
/opt/t-minus/verify-deployment.sh
