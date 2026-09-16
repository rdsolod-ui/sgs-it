#!/usr/bin/env bash
# Run after both names resolve to this VPS. Never enables external AI or data collection.
set -euo pipefail
exec 9>/run/lock/sgsit-deploy.lock
flock -n 9
cd /srv/sgsit/current
for name in sgsit.ru www.sgsit.ru; do
  addresses=$(getent ahostsv4 "$name" | awk '{print $1}' | sort -u)
  [ "$addresses" = 159.194.219.112 ] || { echo "DNS is not ready for $name"; exit 1; }
done
certbot certonly --webroot -w /var/www/sgsit-acme --cert-name sgsit.ru \
  -d sgsit.ru -d www.sgsit.ru --non-interactive --agree-tos --register-unsafely-without-email
backup=/srv/sgsit/backups/domain-activate-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$backup"
cp -a /etc/sgsit/app.env "$backup/app.env"
config=/etc/nginx/sites-available/sgsit-domain-tls
[ ! -f "$config" ] || cp -a "$config" "$backup/tls.conf"
rollback() {
  cp -a "$backup/app.env" /etc/sgsit/app.env
  if [ -f "$backup/tls.conf" ]; then cp -a "$backup/tls.conf" "$config"; else rm -f /etc/nginx/sites-enabled/sgsit-domain-tls "$config"; fi
  systemctl restart sgsit
  nginx -t && systemctl reload nginx
}
trap rollback ERR
python3 - <<'PY'
from pathlib import Path
p=Path('/etc/sgsit/app.env');lines=p.read_text().splitlines()
updates={'NODE_ENV':'production','DEPLOYMENT_ENV':'production','APP_ORIGIN':'https://sgsit.ru'}
lines=[line for line in lines if line.split('=',1)[0] not in updates]
p.write_text('\n'.join(lines+[k+'='+v for k,v in updates.items()])+'\n')
p.chmod(0o600)
PY
cp deploy/nginx-domain-tls.conf "$config"
ln -sfn "$config" /etc/nginx/sites-enabled/sgsit-domain-tls
nginx -t
systemctl restart sgsit
for attempt in {1..30}; do if curl -fsS http://127.0.0.1:8787/api/health >/dev/null; then break; fi; sleep 1; done
curl -fsS http://127.0.0.1:8787/api/health
systemctl reload nginx
curl -fsS --resolve sgsit.ru:443:127.0.0.1 https://sgsit.ru/api/health
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/sgsit-nginx <<'HOOK'
#!/bin/sh
nginx -t && systemctl reload nginx
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/sgsit-nginx
systemctl enable --now certbot.timer
trap - ERR
printf '\nDOMAIN_ACTIVE https://sgsit.ru backup=%s\n' "$backup"
