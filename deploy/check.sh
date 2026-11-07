#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose config --quiet
docker compose ps
address=$(docker compose port web 80)
curl --fail --silent "http://$address/api/health"
echo
