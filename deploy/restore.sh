#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
folder=$(realpath "${1:?Usage: bash deploy/restore.sh backups/TIMESTAMP}")
test -f "$folder/database.sql"
test -f "$folder/uploads.tar.gz"
test -f "$folder/SHA256SUMS"
# Verify the portable backup manifest.
(cd "$folder" && sha256sum --check SHA256SUMS)
echo "Restore overwrites the current database. Make a fresh backup first."
read -r -p 'Type RESTORE to continue: ' confirm
test "$confirm" = RESTORE
docker compose stop backend
trap 'status=$?; if [ "$status" -ne 0 ]; then echo "Restore failed. Backend remains stopped; inspect database and uploads before restarting." >&2; fi; exit "$status"' EXIT
docker compose exec -T db sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql -u root interview' < "$folder/database.sql"
docker compose run --rm -T --no-deps --user 0 --entrypoint tar backend -xzf - -C /app/data < "$folder/uploads.tar.gz"
docker compose run --rm -T --no-deps --user 0 --entrypoint chown backend -R 10001:10001 /app/data/uploads
docker compose start backend
echo 'Restore completed.'
