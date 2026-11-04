/* CertiFlow: data loading, column detection and validation (Rules 1, 7, 8) */
(function (CF) {
  'use strict';

  /** Read an uploaded File into { sheets: { [name]: string[][] }, order: [names] } */
  async function readFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (['csv', 'tsv', 'txt'].includes(ext)) {
      const text = await file.text();
      return { sheets: { Data: CF.parseCSV(text) }, order: ['Data'] };
    }
    if (!window.XLSX) throw new Error('Excel library failed to load. Use CSV or check the vendor folder.');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheets = {};
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: false });
      sheets[name] = rows.map((r) => r.map(cellToString));
    }
    return { sheets, order: wb.SheetNames };
  }

  function cellToString(v) {
    if (v instanceof Date) return CF.formatDate(v);
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v ?? '');
  }

  /** Turn a 2D array into headers + record objects. */
  function buildRecords(rows, headerRow = 1) {
    const hIdx = Math.max(0, headerRow - 1);
    const rawHeaders = (rows[hIdx] || []).map((h) => String(h).trim());
    // make headers unique & non-empty
    const seen = {};
    const headers = rawHeaders.map((h, i) => {
      let name = h || `Column ${i + 1}`;
      if (seen[name]) name = `${name} (${++seen[name]})`; else seen[name] = 1;
      return name;
    });
    const records = [];
    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      if (row.every((c) => String(c ?? '').trim() === '')) continue; // skip blank lines
      const values = {};
      headers.forEach((h, i) => { values[h] = String(row[i] ?? ''); });
      records.push({
        key: 'r' + r + '_' + CF.randomId(4),
        rowNum: r + 1,
        values,
        excluded: false,
        validation: { status: 'valid', issues: [], email: '', emailSource: '' },
        delivery: newDelivery(),
      });
    }
    return { headers, records };
  }

  function newDelivery() {
    return { status: 'Pending', attempts: 0, error: '', sentAt: '', messageId: '', filename: '', certId: '', fingerprint: '', blob: null, recipient: '' };
  }

  // --------- column auto-detection ---------
  const PATTERNS = {
    name: [/^(student\s*|full\s*|participant\s*|candidate\s*)?name$/i, /student.*name|full.*name|participant|candidate|^name/i],
    id: [/^(student\s*)?id$/i, /student\s*id|roll|reg(istration)?\b|enrol|usn|admission|\bid\b/i],
    email: [/^(student|college|official|institute|university)\s*e-?mail/i, /^e-?mail(\s*address)?$/i, /(?<!personal.*)e-?mail/i],
    email2: [/personal\s*e-?mail/i, /(alternate|secondary|alt|other|private).*e-?mail/i],
    event: [/^event(\s*name)?$/i, /event|workshop|hackathon|program|competition|seminar|course/i],
    achievement: [/achievement|award|position|rank|prize|result|role/i],
    date: [/^date$/i, /date|issued|held/i],
    type: [/certificate\s*type|cert.*type/i, /^type$|category/i],
  };

  function detect(headers, kind, exclude = []) {
    for (const re of PATTERNS[kind] || []) {
      const h = headers.find((x) => re.test(x) && !exclude.includes(x));
      if (h) return h;
    }
    return '';
  }

  function autoDetect(headers) {
    const name = detect(headers, 'name', []);
    const email = detect(headers, 'email', []);
    const email2 = detect(headers, 'email2', [email]);
    const event = detect(headers, 'event', [name]);
    const id = detect(headers, 'id', [name, email, email2]);
    const achievement = detect(headers, 'achievement', [name, event]);
    const date = detect(headers, 'date', []);
    const type = detect(headers, 'type', [event]);
    return { name, id, email, email2: email2 === email ? '' : email2, event, achievement, date, type };
  }

  // --------- validation ---------
  const EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
  const TYPO_DOMAINS = {
    'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
    'gmail.cm': 'gmail.com', 'gnail.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
    'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com',
  };
  const isEmail = (s) => EMAIL_RE.test(String(s || '').trim());

  /**
   * Validate all records in place.
   * cfg: { colName, colId, colEvent, colEmail, colEmail2, fallbackWhen, required[], dupKey, trim, titleCase, lowerEmail }
   */
  function validate(records, cfg) {
    const dupMap = new Map();   // dupKey -> first rowNum
    const emailMap = new Map(); // resolved email -> { id, name, rowNum }

    for (const rec of records) {
      const v = rec.values;
      const issues = [];
      const add = (field, msg, level = 'e') => issues.push({ field, msg, level });

      // ---- normalization (auto-fixes) ----
      for (const k of Object.keys(v)) {
        if (cfg.trim) v[k] = String(v[k]).replace(/[ \s]+/g, ' ').trim();
      }
      if (cfg.colName && cfg.titleCase && v[cfg.colName]) v[cfg.colName] = CF.titleCase(v[cfg.colName]);
      for (const c of [cfg.colEmail, cfg.colEmail2]) if (c && cfg.lowerEmail && v[c]) v[c] = v[c].toLowerCase();

      // ---- name ----
      if (!cfg.colName) add('', 'No student name column selected');
      else {
        const name = v[cfg.colName] || '';
        if (!name) add(cfg.colName, 'Missing student name');
        else if (name.replace(/[^\p{L}]/gu, '').length < 2) add(cfg.colName, 'Name is too short');
        else {
          if (/\d/.test(name)) add(cfg.colName, 'Name contains digits', 'w');
          else if (/[^\p{L}\p{M}\s.'\-]/u.test(name)) add(cfg.colName, 'Name contains unusual characters', 'w');
          if (name === name.toUpperCase() && name.length > 3 && !cfg.titleCase) add(cfg.colName, 'Name is ALL CAPS (enable Title-Case?)', 'w');
        }
      }

      // ---- email selection (Rule 7) ----
      let email = '', source = '';
      const p = cfg.colEmail ? (v[cfg.colEmail] || '') : '';
      const s = cfg.colEmail2 ? (v[cfg.colEmail2] || '') : '';
      if (!cfg.colEmail && !cfg.colEmail2) add('', 'No email column selected');
      else {
        const pOk = isEmail(p);
        if (pOk) { email = p; source = 'preferred'; }
        else {
          const canFallback = cfg.colEmail2 && cfg.fallbackWhen !== 'never' && (cfg.fallbackWhen === 'invalid' || !p);
          if (canFallback && isEmail(s)) {
            email = s; source = 'fallback';
            add(cfg.colEmail, p ? `Preferred email invalid ("${p}"), using fallback` : 'Preferred email missing, using fallback', 'w');
          } else if (p) add(cfg.colEmail, `Invalid email address "${p}"`);
          else if (cfg.colEmail) add(cfg.colEmail, 'Missing email address');
          else if (s && !isEmail(s)) add(cfg.colEmail2, `Invalid email address "${s}"`);
          else add(cfg.colEmail2, 'Missing email address');
        }
        if (email) {
          const dom = email.split('@')[1].toLowerCase();
          if (TYPO_DOMAINS[dom]) add(source === 'fallback' ? cfg.colEmail2 : cfg.colEmail, `Possible typo: did you mean @${TYPO_DOMAINS[dom]}?`, 'w');
        }
      }

      // ---- required fields ----
      for (const col of cfg.required || []) {
        if (col === cfg.colName || col === cfg.colEmail || col === cfg.colEmail2) continue; // handled above
        if (!String(v[col] ?? '').trim()) add(col, `Missing required field "${col}"`);
      }

      // ---- duplicates (Rule 8 / 13) ----
      if (!rec.excluded) {
        const parts = { id: cfg.colId ? v[cfg.colId] : '', event: cfg.colEvent ? v[cfg.colEvent] : '', email, name: cfg.colName ? v[cfg.colName] : '' };
        const keyFields = cfg.dupKey.split('+');
        if (keyFields.every((f) => String(parts[f] || '').trim())) {
          const dk = keyFields.map((f) => String(parts[f]).toLowerCase().trim()).join('|');
          if (dupMap.has(dk)) add(cfg.colId || cfg.colEmail, `Duplicate of row ${dupMap.get(dk)} (${keyFields.join(' + ')})`);
          else dupMap.set(dk, rec.rowNum);
        }
        // Same email used by different students → risk of wrong delivery (Rule 6)
        if (email) {
          const who = (parts.id || parts.name || '').toLowerCase();
          const prev = emailMap.get(email.toLowerCase());
          if (prev && prev.who && who && prev.who !== who) add(source === 'fallback' ? cfg.colEmail2 : cfg.colEmail, `Email also belongs to a different student on row ${prev.rowNum}`, 'w');
          else if (!prev) emailMap.set(email.toLowerCase(), { who, rowNum: rec.rowNum });
        }
      }

      const hasErr = issues.some((i) => i.level === 'e');
      const hasWarn = issues.some((i) => i.level === 'w');
      rec.validation = {
        status: rec.excluded ? 'excluded' : hasErr ? 'error' : hasWarn ? 'warning' : 'valid',
        issues, email, emailSource: source,
      };
    }
    return summarize(records);
  }

  function summarize(records) {
    const s = { total: records.length, valid: 0, warning: 0, error: 0, excluded: 0, eligible: 0 };
    for (const r of records) { s[r.validation.status]++; }
    s.eligible = s.valid + s.warning;
    return s;
  }

  const isEligible = (r) => r.validation.status === 'valid' || r.validation.status === 'warning';

  CF.data = { readFile, buildRecords, autoDetect, validate, summarize, isEligible, isEmail, newDelivery };
})(window.CF);
