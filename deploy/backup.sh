#!/usr/bin/env bash
set -euo pipefail
umask 077
mkdir -p /srv/sgsit/backups
out="/srv/sgsit/backups/sgsit-$(date -u +%Y%m%dT%H%M%SZ).dump"
runuser -u postgres -- pg_dump -Fc sgsit > "$out"
sha256sum "$out" > "$out.sha256"
# Keep a short rotation; an encrypted off-host backup is a production prerequisite.
find /srv/sgsit/backups -name 'sgsit-*.dump*' -mtime +7 -delete
