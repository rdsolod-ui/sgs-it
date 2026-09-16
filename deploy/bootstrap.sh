#!/usr/bin/env bash
set -euo pipefail
release="$1"
exec 9>/run/lock/sgsit-deploy.lock
flock -n 9
id sgsit >/dev/null 2>&1 || useradd --system --home /srv/sgsit --shell /usr/sbin/nologin sgsit
install -d -m 750 -o sgsit -g sgsit /srv/sgsit/shared
install -d -m 700 /etc/sgsit /srv/sgsit/backups
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_roles WHERE rolname='sgsit'" | grep -q 1; then runuser -u postgres -- createuser sgsit; fi
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_database WHERE datname='sgsit'" | grep -q 1; then runuser -u postgres -- createdb -O sgsit sgsit; fi
cd "$release"
sha256sum -c SHA256SUMS >/srv/sgsit/shared/manifest-check.log
npm ci --omit=dev --ignore-scripts --no-fund > /srv/sgsit/shared/install.log 2>&1
chown -R sgsit:sgsit "$release"
if [ ! -f /etc/sgsit/app.env ]; then
cat > /etc/sgsit/app.env <<'CONFIG'
NODE_ENV=production
DEPLOYMENT_ENV=staging
HOST=127.0.0.1
PORT=8787
APP_ORIGIN=http://127.0.0.1:55178
DATABASE_URL=postgresql:///sgsit?host=/var/run/postgresql
AI_MODE=demo
OPENAI_APPROVED=false
LEGAL_READY=false
AI_INPUT_TOKENS=700
AI_CONTEXT_TOKENS=6000
AI_OUTPUT_TOKENS=1200
AI_VISIBLE_TOKENS=450
AI_DAILY_USD=1
AI_TOTAL_USD=10
CHAT_RETENTION_DAYS=30
LEAD_RETENTION_DAYS=180
CONFIG
chmod 600 /etc/sgsit/app.env
fi
bash deploy/backup.sh
runuser -u sgsit -- env DATABASE_URL='postgresql:///sgsit?host=/var/run/postgresql' node dist-server/scripts/migrate.js
previous=$(readlink /srv/sgsit/current || true)
printf '%s\n' "$previous" > /srv/sgsit/shared/previous-release.txt
rollback() {
  if [ -n "$previous" ] && [ "$previous" != "$release" ]; then
    ln -sfn "$previous" /srv/sgsit/.current-rollback
    mv -Tf /srv/sgsit/.current-rollback /srv/sgsit/current
    systemctl restart sgsit || true
  fi
}
trap rollback ERR
ln -sfn "$release" /srv/sgsit/.current-next
mv -Tf /srv/sgsit/.current-next /srv/sgsit/current
cp deploy/sgsit.service deploy/sgsit-retention.service deploy/sgsit-retention.timer /etc/systemd/system/
cp deploy/nginx-staging.conf /etc/nginx/sites-available/sgsit-staging
if [ -L /etc/nginx/sites-enabled/default ]; then cp -a /etc/nginx/sites-available/default /etc/nginx/sites-available/default.pre-sgsit; rm /etc/nginx/sites-enabled/default; fi
ln -sfn /etc/nginx/sites-available/sgsit-staging /etc/nginx/sites-enabled/sgsit-staging
nginx -t
systemctl daemon-reload
systemctl enable sgsit sgsit-retention.timer >/dev/null
systemctl restart sgsit
systemctl start sgsit-retention.timer
systemctl reload nginx
for n in {1..30}; do if curl -fsS http://127.0.0.1:8080/api/health; then break; fi; sleep 1; done
curl -fsS http://127.0.0.1:8080/api/health
trap - ERR
printf '\nSTAGING_READY\n'
