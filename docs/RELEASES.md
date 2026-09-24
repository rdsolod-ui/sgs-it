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

## 2026-09-16 — modular brand, sharing and origin story

- Flat logo, SVG/ICO/PNG favicons and PWA/Apple icons use four modules around a blue core.
- Generated 1200×630 social card: “Где ваш бизнес теряет деньги?”; static Open Graph/Twitter tags, canonical, descriptive title, JSON-LD, robots and sitemap. No invented prices, ratings or company details.
- A 24-second introduction follows greeting → Python-inspired code → 8-bit modules → 16-bit core → the actual 3D mascot. It restarts on reload, supports pause/skip/Escape and stops progressing in a hidden tab. Reduced-motion users see a static introduction.
- Dedicated browser checks cover the story, reload, controls, mobile layout, assets and raw HTML metadata.

## 2026-09-16 — mobile safe areas

- Shared four-sided device insets, theme-matched edge backgrounds and a light/dark intro with a landscape composition.
- VisualViewport-aware chat and dialogs keep controls above the keyboard, including viewport panning; pinch zoom remains available.
- Cookie notice occupies its own row; phone/tablet inputs avoid focus zoom, and closing the intro no longer focuses a text field automatically.
- Chromium and WebKit geometry tests cover both themes and synthetic cutout/keyboard scenarios. Physical-device acceptance is documented separately in `MOBILE_VIEWPORT.md`.

## 2026-09-16 — production links in the project catalog

- SGS IT has separate website and admin links to https://sgsit.ru/ and https://sgsit.ru/admin.
- The card uses two keyboard-accessible anchors inside an article; the static preview remains available separately.
- The scoped card fragment lives in `deploy/catalog/sgs-it.html`; README lists current public endpoints. Application runtime is unchanged.


## 2026-09-24 — scenario sales dialogue and notification foundation on sgsit.ru

- Deployed commit `1b245d76b614ce541b0e411f0e5cbd6f679ad8ed` from successful [CI 35764219011](https://github.com/rdsolod-ui/sgs-it/actions/runs/35764219011): 193 checks, exact commit artifact, 62 manifest entries. Static preview was not redeployed.
- Added scenario qualification, confirmation/correction/skip paths, offer registry and server-owned CRM profile snapshots. Source snapshots, exports, notification outbox and monitoring are available in code; collection, attribution and real notification delivery remain disabled.
- Applied additive migrations 003 and 004 after restoring and checking a database backup. Existing lead data remained intact. Post-migration restoration and the previous runtime against the restored new schema passed; an atomic rollback script retains the additive schema.
- All 27 public files matched the CI artifact over HTTPS. Authenticated CRM API checks covered existing leads, new nullable fields, conversation journal, disabled empty notification queue and revocation of the temporary verification session.
- The initial external check caught restrictive directory permissions on the new static tree. Nginx traversal/read access was corrected and public checks repeated successfully. Environment configuration was unchanged; demo and collection gates were verified after publication.
- Live acceptance passed 13 HTTP/browser checks: full profile, confirmation, correction, closed collection, both themes at 320/390/768/1440, persistence after reload, CRM login screen and no uncaught browser errors. Synthetic sessions and usage were removed; physical devices were not tested.
- Private backup paths, installer scripts, browser evidence and rollback coordinates are recorded in local release evidence and project notes; no credentials enter the repository.
