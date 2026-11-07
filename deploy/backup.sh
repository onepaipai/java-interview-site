#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
chmod 700 backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
folder="backups/$stamp"
mkdir -m 700 "$folder"
# Pause writes to keep the SQL and uploads snapshot consistent.
docker compose stop backend
trap 'docker compose start backend >/dev/null' EXIT
docker compose exec -T db sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump -u root --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF interview' > "$folder/database.sql"
docker compose run --rm -T --no-deps --user 0 --entrypoint tar backend -czf - -C /app/data uploads > "$folder/uploads.tar.gz"
test -s "$folder/database.sql"
test -s "$folder/uploads.tar.gz"
(cd "$folder" && sha256sum database.sql uploads.tar.gz > SHA256SUMS)
chmod 600 "$folder"/*
echo "Backup saved: $folder. Copy this directory to off-server storage."
