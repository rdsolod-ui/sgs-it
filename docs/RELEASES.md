# Releases

## 2026-09-16 — public development baseline

- Public source repository and GitHub Actions checks.
- Public, browser-only demonstration under `/sgs-it/` in the project catalog.
- Separate deployment packages for the full application and static preview.
- Source commit SHA and file checksums identify each deployed version.

## 2026-09-16 — brief and audit workflow

- Six-question brief builder: business, role, systems, problem, desired outcome and timing. Unknown answers remain explicit; the public preview offers a local TXT download.
- In the full application, the visitor can apply the brief to the lead form before separate consent and submission.
- CRM audit editor covers six analytics sections, source evidence, limitations, recommendations, priorities, accountable roles and outcome criteria.
- Draft / ready states, documented scope exclusions, version conflict protection and change history. Marking ready requires completed evidence; saving never sends the document to a customer.
- Authenticated HTML export with escaped data and A4 print styling for saving as PDF. Audit records follow the lead deletion lifecycle.
- GitHub CI now tests the full browser workflow in addition to API and static preview checks.

Runtime logs, backup locations and private operational reports are kept outside this repository.

## 2026-09-16 — domain deployment support

- Tracked HTTP validation and HTTPS Nginx configs for sgsit.ru/www.sgsit.ru, canonical redirects, secure production origin/cookies and automatic certificate renewal.
- Domain preparation and activation scripts retain private backups and rollback failed activation. DNS changes are performed separately in the domain owner's panel.
- The public interface displays a local brief instead of contact fields while collection is disabled. Nginx accepts the audit editor's validated request size.
