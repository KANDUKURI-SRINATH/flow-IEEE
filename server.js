/**
 * CertiFlow server
 *   /            Student portal (register → verify e-mail → track status → download certificate)
 *   /admin/      Admin dashboard (approvals, star, certificates, AI e-mail composer, history, audit)
 *   /bulk/       Original CSV/Excel bulk certificate tool (admin sign-in required)
 *   /api/portal  Student API      /api/admin  Admin API (session + CSRF + roles)
 *
 * Run:  npm install  →  npm start  →  http://localhost:3000
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const config = require('./server/config');
require('./server/db');
const sec = require('./server/security');
const mailer = require('./server/mailer');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);

// ---------- security headers ----------
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "font-src 'self'", "connect-src 'self'", "frame-src 'self' blob: data:", "object-src 'none'", "base-uri 'none'",
  "form-action 'self'", "frame-ancestors 'self'",
].join('; ');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin',
  });
  if (!req.path.startsWith('/bulk')) res.set('Content-Security-Policy', CSP);
  next();
});

app.use('/api', express.json({ limit: '12mb' }), sec.sameOrigin);
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ---------- APIs ----------
app.use('/api/portal', require('./server/routes/portal'));
app.use('/api/admin', require('./server/routes/excel'));
app.use('/api/admin', require('./server/routes/admin'));
require('./server/excel').scheduleApprovedFile(1500); // make sure the approved Excel file exists and is current

// ---------- legacy relay for the bulk tool (token protected, unchanged contract) ----------
const legacyAuthorized = (req) => {
  if (!config.legacyAdminToken) return false;
  const a = crypto.createHash('sha256').update(String(req.get('X-Admin-Token') || '')).digest();
  const b = crypto.createHash('sha256').update(config.legacyAdminToken).digest();
  return crypto.timingSafeEqual(a, b);
};
app.get('/api/health', (req, res) => res.json({
  ok: true, server: 'certiflow', tokenConfigured: !!config.legacyAdminToken, smtpConfigured: config.mail.configured, nodemailerInstalled: true,
  from: config.mail.configured ? config.mail.from.replace(/(^.).*(@.*$)/, '$1***$2') : null,
}));
app.post('/api/verify', (req, res) => {
  if (!legacyAuthorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized: invalid or missing organizer token' });
  mailer.verify().then((r) => res.json({ ok: true, from: config.mail.from, mode: r.mode })).catch((e) => res.status(502).json({ ok: false, error: e.message }));
});
app.post('/api/send', sec.rateLimit('legacy-send', 120, 60e3), async (req, res) => {
  if (!legacyAuthorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized: invalid or missing organizer token' });
  const { to, subject, html, text, attachment, certId } = req.body || {};
  if (!to || !sec.isValidEmail(String(to).toLowerCase())) return res.status(400).json({ ok: false, error: `Invalid recipient: ${to}` });
  if (!subject || !html) return res.status(400).json({ ok: false, error: 'Subject and body are required' });
  if (!attachment || !attachment.filename || !attachment.base64) return res.status(400).json({ ok: false, error: 'Certificate attachment missing' });
  if (certId && attachment.certId && certId !== attachment.certId) return res.status(409).json({ ok: false, error: 'Certificate/recipient mismatch blocked' });
  try {
    const info = await mailer.send({
      to, subject: String(subject).slice(0, 300), html, text,
      attachments: [{ filename: path.basename(String(attachment.filename)), content: Buffer.from(attachment.base64, 'base64'), contentType: attachment.contentType || 'application/pdf' }],
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message, retryable: mailer.isTransient(e) });
  }
});
app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// ---------- development mailbox (only when no SMTP is configured, only from this machine) ----------
const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip);
app.get('/dev/mailbox', (req, res) => {
  if (mailer.mode !== 'outbox' || config.PRODUCTION || !isLocal(req)) return res.status(404).send('Not found');
  const items = mailer.listOutbox(40);
  const esc = sec.escapeHtml;
  res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.send(`<!doctype html><meta charset="utf-8"><title>Dev mailbox</title><meta http-equiv="refresh" content="5">
  <body style="font-family:Segoe UI,Arial,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#1f2937">
  <h2>Development mailbox</h2><p style="color:#6b7280">SMTP is not configured, so e-mails are saved to <code>data/outbox</code> instead of being sent. This page refreshes every 5 seconds and is only available on localhost.</p>
  ${items.map((m) => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin:10px 0">
    <div style="font-size:12px;color:#6b7280">${esc(m.at)} · to <b>${esc(m.to)}</b>${m.attachments.length ? ' · 📎 ' + m.attachments.map(esc).join(', ') : ''}</div>
    <div style="font-weight:600;margin:4px 0">${esc(m.subject)}</div>
    <pre style="white-space:pre-wrap;font-family:inherit;margin:0;color:#374151">${esc(m.text || '')}</pre>
    <a href="/dev/mailbox/${encodeURIComponent(m.id)}.eml">Download .eml</a></div>`).join('') || '<p>No e-mails yet.</p>'}</body>`);
});
app.get('/dev/mailbox/:id.eml', (req, res) => {
  if (mailer.mode !== 'outbox' || config.PRODUCTION || !isLocal(req)) return res.status(404).send('Not found');
  const f = path.join(config.DATA_DIR, 'outbox', `${path.basename(req.params.id)}.eml`);
  if (!fs.existsSync(f)) return res.status(404).send('Not found');
  res.set('Content-Type', 'message/rfc822').set('Content-Disposition', `attachment; filename="${path.basename(f)}"`);
  fs.createReadStream(f).pipe(res);
});

// ---------- static frontends ----------
const staticOpts = { index: 'index.html', extensions: ['html'], setHeaders: (res) => res.set('Cache-Control', 'no-cache') };
app.use('/bulk', (req, res, next) => (sec.loadSession(req) ? next() : res.redirect('/admin/?next=bulk')), express.static(path.join(config.PUBLIC_DIR, 'bulk'), staticOpts));
app.use('/admin', express.static(path.join(config.PUBLIC_DIR, 'admin'), staticOpts));
app.use('/shared', express.static(path.join(config.PUBLIC_DIR, 'shared'), staticOpts));
app.use('/', express.static(path.join(config.PUBLIC_DIR, 'portal'), staticOpts));
app.use((req, res) => res.status(404).send('Not found'));

// ---------- errors ----------
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'Request too large' });
  console.error(err);
  res.status(500).json({ ok: false, error: 'Internal error' });
});

app.listen(config.PORT, config.HOST, () => {
  const host = config.HOST === '0.0.0.0' ? 'localhost' : config.HOST;
  console.log(`\n  CertiFlow running\n    Student portal   http://${host}:${config.PORT}/\n    Admin dashboard  http://${host}:${config.PORT}/admin/\n    Bulk tool        http://${host}:${config.PORT}/bulk/`);
  console.log(`  Mail: ${mailer.mode === 'smtp' ? `SMTP (${config.mail.host})` : `outbox mode (no SMTP configured): see http://${host}:${config.PORT}/dev/mailbox`}`);
  console.log(`  AI:   ${config.ai.configured ? config.ai.model : 'template drafter (set ANTHROPIC_API_KEY to use Claude)'}\n`);
});
