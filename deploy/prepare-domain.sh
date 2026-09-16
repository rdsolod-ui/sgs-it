#!/usr/bin/env bash
# Prepare HTTP validation; DNS and TLS activation are separate steps.
set -euo pipefail
exec 9>/run/lock/sgsit-deploy.lock
flock -n 9
cd /srv/sgsit/current
install -d -m 755 /var/www/sgsit-acme/.well-known/acme-challenge
if ! command -v certbot >/dev/null; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot
fi
config=/etc/nginx/sites-available/sgsit-domain-http
backup=/srv/sgsit/backups/domain-prepare-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$backup"
[ ! -f "$config" ] || cp -a "$config" "$backup/http.conf"
cp deploy/nginx-domain-http.conf "$config"
ln -sfn "$config" /etc/nginx/sites-enabled/sgsit-domain-http
if ! nginx -t; then
  if [ -f "$backup/http.conf" ]; then cp -a "$backup/http.conf" "$config"; else rm /etc/nginx/sites-enabled/sgsit-domain-http "$config"; fi
  exit 1
fi
systemctl reload nginx
probe="sgsit-$(date +%s)"
printf '%s' "$probe" > "/var/www/sgsit-acme/.well-known/acme-challenge/$probe"
test "$(curl -fsS -H 'Host: sgsit.ru' "http://127.0.0.1/.well-known/acme-challenge/$probe")" = "$probe"
rm "/var/www/sgsit-acme/.well-known/acme-challenge/$probe"
printf 'HTTP_VALIDATION_READY\n'
