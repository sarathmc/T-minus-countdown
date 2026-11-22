#!/usr/bin/env bash
set -Eeuo pipefail

: "${AWS_REGION:=ap-south-1}"
: "${T_MINUS_SECRET_ID:?T_MINUS_SECRET_ID is required}"
: "${T_MINUS_ENV_FILE:=/opt/t-minus/.env.production}"

umask 077
secret="$(aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$T_MINUS_SECRET_ID" \
  --query SecretString \
  --output text)"

[[ -n "$secret" && "$secret" != "None" ]] || { echo "SecretString is empty." >&2; exit 1; }
printf '%s\n' "$secret" > "$T_MINUS_ENV_FILE"
chmod 600 "$T_MINUS_ENV_FILE"
grep -Eq '^DATABASE_URL=.+$' "$T_MINUS_ENV_FILE"
grep -Eq '^SUPABASE_URL=.+$' "$T_MINUS_ENV_FILE"
grep -Eq '^SUPABASE_ANON_KEY=.+$' "$T_MINUS_ENV_FILE"
grep -Eq '^API_URL=.+$' "$T_MINUS_ENV_FILE"
grep -Eq '^VAPID_PRIVATE_KEY=.+$' "$T_MINUS_ENV_FILE"
echo "Loaded required runtime configuration without printing secret values."
