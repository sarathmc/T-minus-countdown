#!/usr/bin/env bash
set -Eeuo pipefail

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${DOMAIN:?DOMAIN is required}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL is required}"
: "${AWS_REGION:=ap-south-1}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
: "${T_MINUS_SECRET_ID:?T_MINUS_SECRET_ID is required}"

root=/opt/t-minus
compose_file="$root/docker-compose.production.yml"
env_file="$root/.env.production"
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export T_MINUS_ENV_FILE="$env_file"

install -m 0644 "$(dirname "$0")/docker-compose.production.yml" "$compose_file"
install -m 0644 "$(dirname "$0")/nginx.production.conf" "$root/nginx.production.template.conf"

if [[ ! -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  certbot certonly --standalone --non-interactive --agree-tos --email "$CERTBOT_EMAIL" -d "$DOMAIN"
fi

"$root/load-secrets.sh"
envsubst '${DOMAIN}' < "$root/nginx.production.template.conf" > "$root/nginx.conf"
chmod 0644 "$root/nginx.conf"
set -a
. "$env_file"
set +a
cat > "$root/config.js" <<EOF
window.__T_MINUS_CONFIG__ = {
  supabaseUrl: ${SUPABASE_URL@Q},
  supabaseAnonKey: ${SUPABASE_ANON_KEY@Q},
  apiUrl: ${API_URL@Q},
  vapidPublicKey: ${VAPID_PUBLIC_KEY@Q}
};
EOF
chmod 0644 "$root/config.js"

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$ECR_REGISTRY"
docker compose -f "$compose_file" pull
docker compose -f "$compose_file" up -d --no-build
"$root/verify-deployment.sh"
