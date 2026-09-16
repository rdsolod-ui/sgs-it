# Release procedure

Staging is bound to VPS loopback 127.0.0.1:8080 and reached over an SSH tunnel at http://127.0.0.1:55178. Public DNS is not changed by these scripts.

1. Build locally; run unit, integration and browser tests.
2. Package `dist`, `dist-server`, `server/schema.sql`, `package.json`, `package-lock.json`, `deploy` with SHA-256 manifest. No `.env`, source credentials, local database or node_modules.
3. Upload to a new `/srv/sgsit/releases/<id>` directory. Verify manifest and install production dependencies with npm ci.
4. Back up database and record prior `readlink /srv/sgsit/current`.
5. Run schema migration as system user sgsit. Switch `current` atomically, restart service, run `nginx -t`, check local health and browser through tunnel.
6. On failure switch current to recorded prior release and restart. For future schema changes use backward-compatible migrations or a separately tested database recovery.

Production activation requires DNS to point at the application VPS, valid TLS, operator requisites/contact and reviewed legal documents, retention/deletion process including backup handling, OpenAI eligibility and cross-border review, optional Telegram bot setup. Then use production origin and Secure cookies; never expose staging mode to the Internet.


## GitHub-first deployment

`deploy/from-github.sh <full-commit-sha> <ssh-alias>` downloads the immutable application artifact from a successful `Verify and package` run for that exact SHA, verifies archive paths and release metadata, transfers it over SSH and runs the guarded server installer. Requires authenticated `gh`, SSH and SCP locally. No SSH or OpenAI secrets are stored in GitHub.

The static preview artifact is independent of the full application. Deploy it only under `/sgs-it/`; its service worker scope and cache names are isolated from other projects in the catalog.

## Domain setup

After deploying a successful GitHub artifact, run `deploy/prepare-domain.sh` on the VPS to install the HTTP ACME endpoint. Set the apex and `www` DNS records to the application VPS while preserving mail and unrelated records. Then run `deploy/activate-domain.sh`: it checks DNS, obtains the certificate, configures the canonical HTTPS origin and secure cookies, binds Nginx to `/srv/sgsit/current/dist`, and enables certificate renewal with an Nginx reload hook.

This switches out of staging mode. `LEGAL_READY=false` continues to block public lead submission; the interface offers a local brief instead. OpenAI approval and bot settings are not changed. The previous environment and Nginx config are backed up privately; secrets never enter the repository. Audit requests allow up to 128 KiB through Nginx, with application-level validation still applied.
