#!/usr/bin/env bash
set -euo pipefail
cd /srv/sgsit/current
bash deploy/backup.sh
backup=$(find /srv/sgsit/backups -name '*.dump' -type f | sort | tail -1)
sha256sum -c "$backup.sha256"
name="sgsit_restore_check_$(date +%s)"
runuser -u postgres -- createdb "$name"
trap 'runuser -u postgres -- dropdb "$name"' EXIT
runuser -u postgres -- pg_restore --no-owner --no-privileges --exit-on-error -d "$name" < "$backup"
original=$(runuser -u postgres -- psql -d sgsit -Atc 'SELECT count(*) FROM leads')
restored=$(runuser -u postgres -- psql -d "$name" -Atc 'SELECT count(*) FROM leads')
test "$original" = "$restored"
printf 'BACKUP_RESTORE_OK lead_rows=%s\n' "$restored"
audit_sql="SELECT count(*)::text || ':' || md5(coalesce(string_agg(md5(document::text) || version::text, ',' ORDER BY lead_id),'')) FROM lead_audits"
audit_original=$(runuser -u postgres -- psql -d sgsit -Atc "$audit_sql")
audit_restored=$(runuser -u postgres -- psql -d "$name" -Atc "$audit_sql")
test "$audit_original" = "$audit_restored"
printf 'AUDIT_RESTORE_OK rows=%s\n' "${audit_restored%%:*}"
