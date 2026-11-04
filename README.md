# CertiFlow: Student Portal, Admin Approval & Automated Communication

A complete registration → verification → approval → certificate → communication platform.

- **Student portal** (`/`): registration form, live duplicate detection, CAPTCHA, e-mail OTP / link verification, status tracking, certificate download.
- **Admin dashboard** (`/admin/`): secure login with roles, red pending indicators, live notifications, star / approve / reject, automatic certificates, AI e-mail composer with per-component selection, communication history, audit log.
- **Bulk tool** (`/bulk/`): the original CSV/Excel certificate tool, now behind the admin login.

Built with HTML, CSS and vanilla JavaScript on the front end; Node.js + Express, SQLite (`node:sqlite`), pdfkit, ExcelJS, nodemailer and the Anthropic SDK on the back end.

## Quick start

Requires **Node.js 22.13+** (uses the built-in SQLite module).

```bash
npm install
npm start
```

1. Open **http://localhost:3000/admin/** and create the first admin. This only works from the server machine itself, and the first account becomes the superadmin.
2. In **Events & media**, create an event so students can register (or run `npm run seed:demo` to load 3 events and 7 sample verified registrations).
3. Open **http://localhost:3000/** and register as a student.
4. With no SMTP configured, e-mails (including the verification code) are saved locally. Read them at **http://localhost:3000/dev/mailbox** (localhost only, disabled in production).

Copy `.env.example` to `.env` to configure SMTP, the organisation name/logo, the public URL and the AI key.

## The workflow

```
Student                                      Admin
───────                                      ─────
1 open portal, fill form
2 live duplicate check (e-mail, student ID)
3 server validation + CAPTCHA + honeypot +
  rate limits + risk scoring
4 verification e-mail (OTP + secure link)
  └─ stored ONLY in email_verifications
5 student verifies
6 official records created (students +       7 🔔 live notification, red "Pending"
  registrations) in one transaction           8 review details, risk flags
                                              9 ⭐ star = prioritise (still pending)
                                             10 Approve → certificate PDF generated (once)
                                             11 AI prepares delivery e-mail (draft only)
                                             12 admin selects subject/body/attachments
                                             13 explicit Send + confirm → delivered, logged
14 status page shows Approved + download
```

## Excel import and export (admin → "📊 Excel import / export")

**Read students from Excel.** Upload an `.xlsx` or `.csv` file (max 5 MB / 5,000 rows; a template is downloadable on the page).
- Columns are detected automatically (name, e-mail, phone, college, student ID, event, participation) and can be remapped. Hyperlinked e-mail cells and multi-sheet workbooks are supported.
- Every row is checked before anything is saved: missing or invalid fields, duplicates inside the file, and e-mails / student IDs already in the database. Rows with errors are shown and skipped. A default event and institution can fill gaps.
- Two ways to add the valid rows:
  - **Verify by e-mail (default):** each student gets a verification e-mail. Rows stay temporary until they verify, then appear as *Pending approval*. This keeps the "unverified data is not official" rule.
  - **Trusted import (superadmin only):** for official institution lists. Rows are added as verified, marked *Verified via admin import*, audit-logged, and each student gets their private status link.
- Imported registrations are **never auto-approved**. They show a 📥 Excel badge and go through the normal star / approve / reject workflow. Every import is recorded in the `imports` table.

**Push approved students into Excel.** After every approval (and after certificate e-mails are delivered), the server rewrites `data/exports/approved_registrations.xlsx`. It holds one row per approved student with the certificate ID, source, who approved it and delivery status, plus a summary sheet. If the file is open in Excel, the update is retried automatically once it is closed. The same page offers downloads of approved / all / pending registrations, filterable by event. Cells are protected against spreadsheet formula injection.

## Business rules and where they are enforced

| Rule | Enforcement |
|---|---|
| Duplicate identifiers rejected | `UNIQUE COLLATE NOCASE` on `students.email` and `students.registration_number`; server re-checks on submit; the verify step inserts in a `BEGIN IMMEDIATE` transaction, so simultaneous submissions produce exactly one record (tested with concurrent requests). The live check in the form is only a convenience. |
| Unverified ≠ official | Submissions live in `email_verifications` (temporary, expiring, single open row per e-mail). `students`/`registrations` rows are created only after OTP/link verification. |
| Starred ≠ approved | `is_starred` is a separate column changed only by the star endpoint, which never touches `approval_status`. Certificates are only created in `approve()`. |
| Only approved → certificate | `approve()` does a guarded `UPDATE … WHERE approval_status='pending'` and `INSERT OR IGNORE` into `certificates` (`UNIQUE registration_id`). Triple-clicking Approve yields one approval, one certificate ID and one PDF (tested). |
| AI drafts, admin decides | The AI endpoint only returns a draft. Sending requires `confirm: true`, a reviewer role, a CSRF token and an idempotency key; the UI shows a confirmation dialog. |
| Relevant attachments only | The AI chooses only from a server-built catalog and must justify each item. A certificate is never pre-selected unless the purpose is certificate delivery (hard guard in code). Each student's certificate is attached only to their own e-mail; recipients without an approved certificate are skipped. |
| Traceability | `audit_logs` (logins, approvals, rejections, stars, drafts, sends, downloads), `email_logs` (every attempt, per recipient), `email_batches`, `notifications`. |

## Security

- Admin passwords: scrypt with per-user salt; sessions are random tokens stored as HMAC hashes, in `HttpOnly; SameSite=Strict` cookies (`Secure` when `PUBLIC_URL` is https).
- CSRF token required on every admin write, plus an Origin check.
- Roles: **viewer** (read only), **reviewer** (approve, reject, star, compose, send), **superadmin** (+ manage admins).
- Parameterised SQL everywhere; server-side sanitisation (Unicode normalisation, control/invisible characters stripped, length limits); HTML is escaped on output; strict Content-Security-Policy.
- OTPs and link tokens are HMAC-hashed, expire after 15 minutes, are single use and limited to 5 attempts. Verification links are confirmed by a POST from the page, so mail scanners that prefetch links cannot verify for the student.
- Anti-bot: self-hosted CAPTCHA (digits drawn as paths, server-side answers, single use), honeypot field, minimum fill time, IP / e-mail / burst rate limits.
- Fake-registration signals: disposable domains, random-looking names, digit-heavy addresses, very fast forms, many registrations from one network, reused phone numbers. These produce a risk score shown to admins; they never auto-approve or auto-reject.
- Uploaded media: type allow-list, magic-byte check, random stored names, 8 MB limit.
- Student status pages use a private token in the URL fragment (never sent to servers or logs); "Find my registration" rotates it.
- E-mail duplicate protection: idempotency keys, certificate re-send blocked unless "authorised re-send" is ticked, and identical e-mails to the same person within 24h are skipped.

## AI e-mail drafting

Set `ANTHROPIC_API_KEY` to use Claude (`claude-opus-5-5` by default, `AI_MODEL` to change). The request uses structured JSON output, so the subject, body, purpose, attachment decisions and missing details are always well-formed. Server-side refusal fallback is enabled. Without a key, or if the API is unavailable, a built-in template drafter classifies the instruction and drafts the e-mail, and the composer says which one was used.

## Database

The schema is in [`server/db.js`](server/db.js) (created automatically in `data/app.db`):
`admins`, `admin_sessions`, `events`, `imports`, `students`, `registrations`, `email_verifications`, `certificates`, `media`, `email_drafts`, `email_batches`, `email_logs`, `notifications`, `registration_attempts`, `audit_logs`, with foreign keys, CHECK constraints for valid states, UNIQUE constraints and indexes.

## Project structure

```
server.js                 Express app: security headers, routers, static sites, dev mailbox
server/config.js          .env loading, secrets
server/db.js              SQLite schema + transaction helper
server/security.js        hashing, sessions, CSRF, roles, rate limits, sanitisation, audit
server/captcha.js         self-hosted CAPTCHA
server/risk.js            suspicious-registration scoring
server/mailer.js          SMTP or local outbox
server/certificates.js    PDF certificate generation (pdfkit)
server/excel.js           Excel reading (ExcelJS), validation, exports, auto-updated approved file
server/verification.js    temporary registrations + verification e-mails (portal and import)
server/workflow.js        star / approve / reject / certificate / draft preparation
server/ai.js              Claude drafting + template fallback, attachment guards
server/events.js          live notifications (Server-Sent Events)
server/routes/portal.js   student API
server/routes/admin.js    admin API
server/routes/excel.js    Excel import / export API
public/portal/            student pages (index.html, status.html)
public/admin/             admin dashboard
public/bulk/              original bulk CSV tool
scripts/seed-demo.js      demo data
```

## Production notes

- Set `NODE_ENV=production`, an https `PUBLIC_URL`, real SMTP settings and a strong `APP_SECRET`; put the app behind a TLS reverse proxy with `TRUST_PROXY=1`.
- SMS phone verification is not included. Phone numbers are format-validated and reuse is flagged. An SMS provider can be added at the verification step.
- For stronger bot protection at scale, the CAPTCHA module can be swapped for a hosted service (Turnstile / reCAPTCHA) in `server/captcha.js`.
- Back up `data/` (database, certificates, uploads).
