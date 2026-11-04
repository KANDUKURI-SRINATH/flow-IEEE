/* CertiFlow: shared utilities (global namespace CF) */
window.CF = window.CF || {};

(function (CF) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Fast, deterministic 53-bit string hash (cyrb53). Used for certificate ids and fingerprints. */
  function hash53(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  const hashHex = (s) => hash53(s).toString(16).toUpperCase().padStart(14, '0');

  async function sha256Hex(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback (e.g. some browsers on file://): iterate the 53-bit hash
    let h = text;
    for (let i = 0; i < 5000; i++) h = hashHex(h + i);
    return h;
  }

  function randomId(len = 16) {
    const a = new Uint8Array(len);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.random() * 256));
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  function debounce(fn, ms = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /** Replace {{TOKENS}} using a lookup function. Unknown tokens are kept as-is. */
  function fillPlaceholders(text, lookup, escape = false) {
    return String(text ?? '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, key) => {
      const v = lookup(key.toUpperCase());
      if (v === undefined || v === null) return m;
      return escape ? escapeHtml(v) : String(v);
    });
  }
  function extractPlaceholders(text) {
    const out = new Set();
    String(text ?? '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, k) => out.add(k.toUpperCase()));
    return out;
  }

  function sanitizeFilename(name, max = 120) {
    let s = String(name ?? '')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[._]+|[._]+$/g, '');
    if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) s = '_' + s;
    return (s || 'certificate').slice(0, max);
  }

  function titleCase(s) {
    return String(s).toLowerCase().replace(/(^|[\s\-'.])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function formatDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return '';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** CSV parsing: RFC 4180 quotes, BOM, auto delimiter detection (, ; tab |) */
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const counts = [',', ';', '\t', '|'].map((d) => [d, firstLine.split(d).length]);
    const delim = counts.sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = []; let field = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function toCSV(rows) {
    return '﻿' + rows.map((r) => r.map((v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV/formula injection guard
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\r\n');
  }

  function download(filename, blobOrText, type = 'text/plain') {
    const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
    });
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });
  }

  function toast(msg, kind = '') {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`; el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3800);
    setTimeout(() => el.remove(), 4200);
  }

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem('cf.' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem('cf.' + key, JSON.stringify(val)); return true; } catch { return false; } },
    del(key) { localStorage.removeItem('cf.' + key); },
  };

  Object.assign(CF, {
    $, $$, escapeHtml, hash53, hashHex, sha256Hex, randomId, sleep, nextFrame, debounce,
    fillPlaceholders, extractPlaceholders, sanitizeFilename, titleCase, formatDate, MONTHS,
    parseCSV, toCSV, download, blobToBase64, fileToDataURL, loadImage, toast, store,
  });
})(window.CF);
