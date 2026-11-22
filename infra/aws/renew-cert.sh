#!/usr/bin/env bash
set -Eeuo pipefail

certbot renew --quiet --deploy-hook 'docker exec t-minus-frontend nginx -s reload'
