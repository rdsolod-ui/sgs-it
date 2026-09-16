# Security

- Never commit API keys, passwords, cookies, database dumps, private SSH keys, or user conversations.
- Configure secrets on the application host. `.env.example` contains field names only.
- The public preview does not call the backend or collect leads. Keep preview assets and service-worker caches scoped to `/sgs-it/`.
- The server uses parameterized SQL, server-side limits, HttpOnly sessions, explicit origin checks and separate consent records.
- Production requires HTTPS, reviewed legal configuration, off-host backups, dependency review and account/region verification before enabling an external AI provider.
- Do not include credentials or personal data in public issues. Report a vulnerability through GitHub private vulnerability reporting when enabled.
