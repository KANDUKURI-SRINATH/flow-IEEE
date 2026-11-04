/* CertiFlow: email transports + resilient batch queue (Rules 10, 11, 12) */
(function (CF) {
  'use strict';

  class SendError extends Error {
    constructor(message, retryable = false) { super(message); this.retryable = retryable; }
  }

  const transports = {
    simulation: {
      label: 'Simulation',
      async send(msg, settings) {
        await CF.sleep(250 + Math.random() * 650);
        if (/bounce|invalid|noreply@/i.test(msg.to)) throw new SendError('550 5.1.1 Recipient mailbox unavailable (simulated)', false);
        if (Math.random() * 100 < (settings.simFail || 0)) throw new SendError('421 4.7.0 Temporary server error, try again later (simulated)', true);
        if (!msg.attachment || !msg.attachment.size) throw new SendError('Attachment missing', false);
        return { messageId: `<sim-${CF.randomId(6)}@certiflow.local>` };
      },
    },

    smtp: {
      label: 'SMTP relay',
      async send(msg, settings) {
        const base64 = await CF.blobToBase64(msg.attachment);
        let res;
        try {
          res = await fetch(apiUrl(settings.serverUrl, '/api/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': settings.token || '' },
            body: JSON.stringify({
              to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
              recordKey: msg.recordKey, certId: msg.certId,
              attachment: { filename: msg.filename, base64, contentType: 'application/pdf', certId: msg.attachmentCertId },
            }),
          });
        } catch (e) {
          throw new SendError(`Cannot reach relay server (${e.message})`, true);
        }
        let data = {};
        try { data = await res.json(); } catch { /* ignore */ }
        if (!res.ok || !data.ok) {
          const retry = data.retryable ?? (res.status >= 500 || res.status === 429);
          throw new SendError(data.error || `HTTP ${res.status}`, res.status === 401 ? false : retry);
        }
        return { messageId: data.messageId || '' };
      },
    },
  };

  function apiUrl(base, path) {
    const b = (base || '').trim().replace(/\/+$/, '');
    if (b) return b + path;
    if (location.protocol.startsWith('http')) return path;
    return 'http://localhost:3000' + path;
  }

  async function health(serverUrl) {
    const r = await fetch(apiUrl(serverUrl, '/api/health'));
    return r.json();
  }
  async function verify(serverUrl, token) {
    const r = await fetch(apiUrl(serverUrl, '/api/verify'), { method: 'POST', headers: { 'X-Admin-Token': token || '' } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }

  /**
   * Run items through `worker` with limited concurrency, pacing and automatic retries.
   * A failing item never stops the batch (Rule 12).
   * ctl: { paused, stopped } mutable control flags
   */
  async function runQueue(items, worker, { concurrency = 3, delay = 0, retries = 2, ctl, onStart, onDone }) {
    let idx = 0;
    async function lane() {
      while (true) {
        if (ctl.stopped) return;
        while (ctl.paused && !ctl.stopped) await CF.sleep(200);
        if (ctl.stopped) return;
        const item = items[idx++];
        if (!item) return;
        onStart && onStart(item);
        let attempt = 0, lastErr = null, result = null;
        while (attempt <= retries) {
          attempt++;
          try { result = await worker(item, attempt); lastErr = null; break; }
          catch (e) {
            lastErr = e;
            if (!e.retryable || attempt > retries || ctl.stopped) break;
            await CF.sleep(600 * 2 ** (attempt - 1)); // exponential backoff
          }
        }
        onDone && onDone(item, lastErr, result, attempt);
        if (delay) await CF.sleep(delay);
      }
    }
    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
  }

  CF.mail = { transports, health, verify, runQueue, SendError, apiUrl };
})(window.CF);
