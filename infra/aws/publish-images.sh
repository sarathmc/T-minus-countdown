#!/usr/bin/env bash
set -Eeuo pipefail

: "${AWS_REGION:=ap-south-1}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$registry"

docker build -f Dockerfile.frontend -t "$registry/t-minus/frontend:$IMAGE_TAG" .
docker build -f backend/Dockerfile -t "$registry/t-minus/api:$IMAGE_TAG" backend
docker tag "$registry/t-minus/api:$IMAGE_TAG" "$registry/t-minus/worker:$IMAGE_TAG"

docker push "$registry/t-minus/frontend:$IMAGE_TAG"
docker push "$registry/t-minus/api:$IMAGE_TAG"
docker push "$registry/t-minus/worker:$IMAGE_TAG"
echo "Published images with tag $IMAGE_TAG. Deploy by digest after review."
