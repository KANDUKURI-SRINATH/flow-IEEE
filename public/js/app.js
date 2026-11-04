/* CertiFlow: application controller */
(function (CF) {
  'use strict';
  const { $, $$, escapeHtml, store, toast } = CF;

  // ======================================================================
  //  Defaults
  // ======================================================================
  const DEFAULT_SUBJECT = 'Congratulations {{NAME}}! Your certificate for {{EVENT}}';
  const DEFAULT_BODY = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:28px 28px 22px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:24px">Congratulations, {{NAME}}! 🎉</h1>
    <p style="margin:6px 0 0;opacity:.9">{{EVENT}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px 28px;border-radius:0 0 12px 12px">
    <p>Dear {{NAME}},</p>
    <p>We are delighted to recognise your <b>{{ACHIEVEMENT}}</b> in <b>{{EVENT}}</b>. Your effort and dedication truly stood out.</p>
    <p>Your <b>{{CERTIFICATE_TYPE}}</b> certificate is attached to this email as a PDF.</p>
    <table style="border-collapse:collapse;font-size:14px;margin:16px 0;background:#f8fafc;border-radius:8px">
      <tr><td style="padding:6px 14px;color:#6b7280">Certificate No.</td><td style="padding:6px 14px"><b>{{CERT_ID}}</b></td></tr>
      <tr><td style="padding:6px 14px;color:#6b7280">Student ID</td><td style="padding:6px 14px">{{ID}}</td></tr>
      <tr><td style="padding:6px 14px;color:#6b7280">Event date</td><td style="padding:6px 14px">{{DATE}}</td></tr>
    </table>
    <p>Keep learning and keep building. We look forward to seeing you at future events!</p>
    <p style="margin-bottom:0">Warm regards,<br><b>{{ORGANIZATION}}</b></p>
  </div>
  <p style="font-size:11px;color:#9ca3af;text-align:center">This certificate was issued to {{NAME}} ({{ID}}). If you received it by mistake, please let us know.</p>
</div>`;

  const DEMO = {
    NAME: 'Aarav Sharma', ID: 'CS2026001', EVENT: 'CodeSprint Hackathon 2026', ACHIEVEMENT: 'First Place',
    DATE: '15 October 2026', CERTIFICATE_TYPE: 'Achievement', CERT_ID: 'CF-3F9A27C1D4', EMAIL: 'student@example.org',
    ISSUE_DATE: CF.formatDate(new Date()), ORGANIZATION: 'Your Institution Name', ROW: '2',
  };

  const SYSTEM_VALUES = {
    CERT_ID: { label: 'Certificate No. (auto, unique)', fn: (r) => certIdFor(r) },
    ISSUE_DATE: { label: "Today's date", fn: () => CF.formatDate(new Date()) },
    EMAIL: { label: 'Selected recipient email', fn: (r) => r.validation.email },
    ROW: { label: 'Spreadsheet row number', fn: (r) => r.rowNum },
  };

  const STEP_INFO = {
    upload: ['Upload student data', 'Start by uploading a structured Excel (.xlsx/.xls) or CSV file.'],
    validate: ['Validate records', 'Missing names, invalid emails, duplicates and required fields are detected before anything is generated.'],
    template: ['Certificate template', 'Choose a built-in design or upload your own template image, then position the {{PLACEHOLDERS}}.'],
    map: ['Map fields', 'Link spreadsheet columns to the placeholders used in the certificate, email and file name.'],
    preview: ['Email & preview', 'Review representative certificates and emails exactly as students will receive them.'],
    run: ['Generate & send', 'Generate every certificate, then deliver each one only to its own student.'],
    report: ['Delivery status report', 'Track generated, sent, failed, pending and skipped certificates.'],
  };
  const STEP_ORDER = Object.keys(STEP_INFO);

  const SAMPLE_CSV = `Student Name,Student ID,Student Email,Personal Email,Event,Certificate Type,Achievement,Date
Aarav Sharma,CS2026001,aarav.sharma@students.example.org,aarav.s@example.com,CodeSprint Hackathon 2026,Achievement,First Place,2026-10-15
Diya Patel,CS2026002,diya.patel@students.example.org,diya.p@example.com,CodeSprint Hackathon 2026,Achievement,Second Place,2026-10-15
Vihaan Reddy,CS2026003,vihaan.reddy@students.example.org,,CodeSprint Hackathon 2026,Achievement,Third Place,2026-10-15
Ananya Iyer,CS2026004,ananya.iyer@students.example.org,ananya.i@example.com,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Kabir Singh,CS2026005,kabir.singh@students,kabir.s@example.com,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Ishaan Kumar,CS2026006,,ishaan.k@example.com,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Meera Nair,CS2026007,meera.nair@students.example.org,,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
,CS2026008,unknown.student@students.example.org,,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Rohan Gupta,CS2026009,rohan.bounce@students.example.org,,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Sara Khan,CS2026010,sara.khan@gmial.com,,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Aarav Sharma,CS2026001,aarav.sharma@students.example.org,aarav.s@example.com,CodeSprint Hackathon 2026,Achievement,First Place,2026-10-15
NIKHIL VERMA,CS2026011,nikhil.verma@students.example.org,,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Priya Menon,CS2026012,priya.menon@@students.example.org,priya@@example,CodeSprint Hackathon 2026,Participation,active participation,2026-10-15
Arjun Das,CS2026013,arjun.das@students.example.org,,AI & ML Workshop,Completion,successful completion,2026-09-20
Kavya Rao,CS2026014,kavya.rao@students.example.org,kavya.r@example.com,AI & ML Workshop,Completion,successful completion,2026-09-20
Siddharth Joshi,CS2026015,siddharth.joshi@students.example.org,,AI & ML Workshop,Completion,successful completion,2026-09-20
Neha Bhat,CS2026016,neha.bhat@students.example.org,,AI & ML Workshop,Excellence,Best Project Award,2026-09-20
Aditya Menon,CS2026017,aditya.menon@students.example.org,,AI & ML Workshop,Completion,successful completion,2026-09-20
Lakshmi Pillai,CS2026018,lakshmi.pillai@students.example.org,,AI & ML Workshop,Completion,successful completion,2026-09-20
Tanvi Desai,CS2026019,tanvi.desai@students.example.org,,Web Development Bootcamp,Completion,successful completion,2026-08-05
Harsh Malhotra,CS2026020,harsh.malhotra@students.example.org,,Web Development Bootcamp,Completion,successful completion,2026-08-05
Pooja Srinivasan,CS2026021,pooja.srinivasan@students.example.org,,Web Development Bootcamp,Excellence,Outstanding Performance,2026-08-05
Yash Agarwal,CS2026022,yash.agarwal@students.example.org,,Web Development Bootcamp,Completion,successful completion,2026-08-05
Riya Chatterjee,CS2026023,riya.chatterjee@students.example.org,,Web Development Bootcamp,Completion,successful completion,2026-08-05
Venkata Sai Karthik Subramanian Ramachandran,CS2026024,karthik.ram@students.example.org,,Web Development Bootcamp,Completion,successful completion,2026-08-05
`;

  // ======================================================================
  //  State
  // ======================================================================
  const S = {
    file: null,           // { name, sheets, order, sheet }
    headers: [],
    records: [],
    detected: {},
    cfg: Object.assign({ colName: '', colId: '', colEvent: '', colEmail: '', colEmail2: '', fallbackWhen: 'invalid', required: [], dupKey: 'id+event', trim: true, titleCase: false, lowerEmail: true }, store.get('cfg', {})),
    tpl: store.get('tpl', null) || CF.tpl.defaultTemplate('classic'),
    mapping: store.get('mapping', {}),
    namePattern: store.get('namePattern', '{{ID}}_{{NAME}}_{{EVENT}}'),
    mail: store.get('mail', { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY }),
    settings: Object.assign({ mode: 'simulation', serverUrl: '', simFail: 8, concurrency: 3, delay: 150, retries: 2, allowResend: false }, store.get('settings', {})),
    token: sessionStorage.getItem('cf.token') || '',
    ui: { step: 'upload', valFilter: 'all', valSearch: '', repFilter: 'all', repSearch: '', selEl: null, pv: 0 },
    run: { busy: false, ctl: null },
    tplHash: '',
  };
  const sentLog = store.get('sentLog', {});

  const save = {
    cfg: () => store.set('cfg', S.cfg),
    tpl: () => { S.tplHash = CF.hashHex(JSON.stringify(S.tpl)); if (!store.set('tpl', S.tpl)) toast('Template image is too large to remember after reload (it still works for this session).', 'warn'); },
    mapping: () => store.set('mapping', S.mapping),
    mail: () => store.set('mail', S.mail),
    settings: () => store.set('settings', S.settings),
    namePattern: () => store.set('namePattern', S.namePattern),
    sentLog: () => store.set('sentLog', sentLog),
  };
  S.tplHash = CF.hashHex(JSON.stringify(S.tpl));

  // ======================================================================
  //  Value helpers
  // ======================================================================
  function prettyValue(v) {
    const s = String(v ?? '');
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]00:00(?::00)?)?$/);
    if (m) return CF.formatDate(new Date(+m[1], +m[2] - 1, +m[3]));
    return s;
  }

  function valueFor(rec, key) {
    const m = S.mapping[key];
    if (!m) return undefined;
    if (m.kind === 'static') return m.value;
    if (!rec) return DEMO[key];
    if (m.kind === 'column') return m.value in rec.values ? prettyValue(rec.values[m.value]) : undefined;
    if (m.kind === 'system') { const sv = SYSTEM_VALUES[m.value]; return sv ? String(sv.fn(rec)) : undefined; }
    return undefined;
  }
  const lookupFor = (rec) => (key) => valueFor(rec, key);

  function certIdFor(rec) {
    const v = rec.values, c = S.cfg;
    const basis = [c.colId && v[c.colId], c.colEvent && v[c.colEvent], c.colName && v[c.colName], rec.validation.email].join('|').toLowerCase();
    return 'CF-' + CF.hashHex(basis).slice(-10);
  }

  function usedPlaceholders() {
    const map = new Map(); // key -> Set(where)
    const addFrom = (text, where) => CF.extractPlaceholders(text).forEach((k) => { if (!map.has(k)) map.set(k, new Set()); map.get(k).add(where); });
    S.tpl.elements.forEach((el) => el.type === 'text' && addFrom(el.text, 'Certificate'));
    addFrom(S.mail.subject, 'Email subject');
    addFrom(S.mail.body, 'Email body');
    addFrom(S.namePattern, 'File name');
    return map;
  }

  function fingerprint(rec) {
    const keys = [...usedPlaceholders().keys()].sort();
    return CF.hashHex(JSON.stringify([keys.map((k) => valueFor(rec, k)), rec.validation.email, S.namePattern, S.tplHash]));
  }

  function baseFilename(rec) {
    return CF.sanitizeFilename(CF.fillPlaceholders(S.namePattern, (k) => valueFor(rec, k) ?? ''));
  }

  const eligible = () => S.records.filter(CF.data.isEligible);

  function displayStatus(rec) {
    const d = rec.delivery.status;
    if (d === 'Sent' || d === 'Sending') return d;
    if (!CF.data.isEligible(rec)) return 'Skipped';
    return d;
  }
  function statusNote(rec) {
    if (rec.delivery.status !== 'Sent' && !CF.data.isEligible(rec)) {
      if (rec.validation.status === 'excluded') return 'Excluded by organizer';
      return 'Invalid data: ' + rec.validation.issues.filter((i) => i.level === 'e').map((i) => i.msg).join('; ');
    }
    return rec.delivery.error || '';
  }

  // ======================================================================
  //  Navigation
  // ======================================================================
  function go(step) {
    if (!STEP_INFO[step]) return;
    S.ui.step = step;
    $$('.step').forEach((b) => {
      const i = STEP_ORDER.indexOf(b.dataset.step), cur = STEP_ORDER.indexOf(step);
      b.classList.toggle('active', b.dataset.step === step);
      b.classList.toggle('done', i < cur && S.records.length > 0);
    });
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== step; });
    $('#pageTitle').textContent = STEP_INFO[step][0];
    $('#pageSub').textContent = STEP_INFO[step][1];
    ({ validate: renderValidate, template: renderTemplateStep, map: renderMap, preview: renderPreview, run: renderRun, report: renderReport }[step] || (() => {}))();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateKpis() {
    const s = CF.data.summarize(S.records);
    $('#kTotal').textContent = s.total;
    $('#kValid').textContent = s.eligible;
    $('#kInvalid').textContent = s.error;
    $('#kSent').textContent = S.records.filter((r) => r.delivery.status === 'Sent').length;
  }

  // ======================================================================
  //  STEP 1 · Upload
  // ======================================================================
  async function handleFile(file) {
    try {
      const parsed = await CF.data.readFile(file);
      S.file = { name: file.name, size: file.size, ...parsed, sheet: parsed.order[0] };
      loadSheet();
      toast(`Loaded ${S.records.length} records from ${file.name}`, 'ok');
    } catch (e) {
      console.error(e);
      toast('Could not read file: ' + e.message, 'err');
    }
  }

  function loadSheet() {
    const rows = S.file.sheets[S.file.sheet] || [];
    const headerRow = Math.max(1, +$('#headerRow').value || 1);
    const { headers, records } = CF.data.buildRecords(rows, headerRow);
    S.headers = headers;
    S.records = records;
    S.detected = CF.data.autoDetect(headers);

    // key columns: keep previous choice if still present, else auto-detect
    const keep = (cur, det) => (cur && headers.includes(cur) ? cur : det);
    S.cfg.colName = keep(S.cfg.colName, S.detected.name);
    S.cfg.colId = keep(S.cfg.colId, S.detected.id);
    S.cfg.colEvent = keep(S.cfg.colEvent, S.detected.event);
    S.cfg.colEmail = keep(S.cfg.colEmail, S.detected.email);
    S.cfg.colEmail2 = keep(S.cfg.colEmail2, S.detected.email2);
    S.cfg.required = (S.cfg.required || []).filter((c) => headers.includes(c));
    if (!S.cfg.required.length) S.cfg.required = [S.cfg.colName, S.cfg.colId, S.cfg.colEvent].filter(Boolean);
    if (!S.cfg.colId && S.cfg.dupKey.includes('id')) S.cfg.dupKey = 'email+event';
    save.cfg();
    ensureMapping(true);
    runValidation();
    renderUpload();
  }

  function renderUpload() {
    if (!S.file) return;
    $('#fileInfo').hidden = false;
    $('#fileName').textContent = S.file.name;
    $('#fileMeta').textContent = `${S.records.length} data rows · ${S.headers.length} columns${S.file.order.length > 1 ? ` · ${S.file.order.length} sheets` : ''}`;
    $('#sheetWrap').hidden = S.file.order.length < 2;
    $('#sheetSelect').innerHTML = S.file.order.map((n) => `<option ${n === S.file.sheet ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
    const det = S.detected;
    const roleOf = (h) => Object.entries({ Name: det.name, ID: det.id, Email: det.email, 'Alt email': det.email2, Event: det.event, Achievement: det.achievement, Date: det.date, Type: det.type }).filter(([, v]) => v === h).map(([k]) => k);
    $('#columnChips').innerHTML = S.headers.map((h) => {
      const r = roleOf(h);
      return `<span class="chip plain">${escapeHtml(h)}${r.length ? ` <b style="color:var(--primary)">→ ${r.join(', ')}</b>` : ''}</span>`;
    }).join('');
    const rows = S.records.slice(0, 8);
    $('#rawPreview').innerHTML = `<thead><tr><th>Row</th>${S.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.rowNum}</td>${S.headers.map((h) => `<td>${escapeHtml(r.values[h])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    updateKpis();
  }

  // ======================================================================
  //  STEP 2 · Validate
  // ======================================================================
  function runValidation() {
    CF.data.validate(S.records, S.cfg);
    // invalidate generated files whose content changed
    for (const r of S.records) {
      if (r.delivery.blob && r.delivery.status !== 'Sent' && r.delivery.fingerprint !== fingerprint(r)) {
        r.delivery.blob = null;
        if (r.delivery.status === 'Generated') r.delivery.status = 'Pending';
      }
    }
    updateKpis();
  }

  function fillColumnSelects() {
    const opts = (sel, allowNone = true) => (allowNone ? '<option value="">(none)</option>' : '') +
      S.headers.map((h) => `<option value="${escapeHtml(h)}" ${h === sel ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('');
    $('#colName').innerHTML = opts(S.cfg.colName);
    $('#colId').innerHTML = opts(S.cfg.colId);
    $('#colEvent').innerHTML = opts(S.cfg.colEvent);
    $('#colEmail').innerHTML = opts(S.cfg.colEmail);
    $('#colEmail2').innerHTML = opts(S.cfg.colEmail2);
    $('#fallbackWhen').value = S.cfg.fallbackWhen;
    $('#dupKey').value = S.cfg.dupKey;
    $('#optTrim').checked = S.cfg.trim;
    $('#optTitle').checked = S.cfg.titleCase;
    $('#optLowerEmail').checked = S.cfg.lowerEmail;
    $('#requiredCols').innerHTML = S.headers.map((h) => `<label><input type="checkbox" value="${escapeHtml(h)}" ${S.cfg.required.includes(h) ? 'checked' : ''}/>${escapeHtml(h)}</label>`).join('') || '<span class="muted tiny">Upload data first</span>';
  }

  function readValidateForm() {
    S.cfg.colName = $('#colName').value;
    S.cfg.colId = $('#colId').value;
    S.cfg.colEvent = $('#colEvent').value;
    S.cfg.colEmail = $('#colEmail').value;
    S.cfg.colEmail2 = $('#colEmail2').value;
    S.cfg.fallbackWhen = $('#fallbackWhen').value;
    S.cfg.dupKey = $('#dupKey').value;
    S.cfg.trim = $('#optTrim').checked;
    S.cfg.titleCase = $('#optTitle').checked;
    S.cfg.lowerEmail = $('#optLowerEmail').checked;
    S.cfg.required = $$('#requiredCols input:checked').map((i) => i.value);
    save.cfg();
  }

  function renderValidate() {
    fillColumnSelects();
    if (!S.records.length) {
      $('#valTable').innerHTML = '<tbody><tr><td class="muted">No data yet. Upload a file or load the sample data in step 1.</td></tr></tbody>';
      updateCounts({ total: 0, valid: 0, warning: 0, error: 0, excluded: 0 });
      return;
    }
    renderValTable();
  }

  function updateCounts(s) {
    $('#fAll').textContent = s.total; $('#fValid').textContent = s.valid; $('#fWarn').textContent = s.warning;
    $('#fErr').textContent = s.error; $('#fExcl').textContent = s.excluded;
  }

  function matchesSearch(rec, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return Object.values(rec.values).some((v) => String(v).toLowerCase().includes(q)) || String(rec.rowNum) === q;
  }

  const ROW_LIMIT = 500;
  function renderValTable() {
    const s = CF.data.summarize(S.records);
    updateCounts(s);
    const f = S.ui.valFilter;
    const list = S.records.filter((r) => (f === 'all' || r.validation.status === f) && matchesSearch(r, S.ui.valSearch));
    const shown = list.slice(0, ROW_LIMIT);
    const head = `<thead><tr><th>Use</th><th>Row</th><th>Status</th><th>Issues</th><th>Recipient</th>${S.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
    const body = shown.map((r) => `<tr data-key="${r.key}" class="${r.excluded ? 'row-excluded' : ''}">
        <td><input type="checkbox" class="use" ${r.excluded ? '' : 'checked'} title="Include this record"/></td>
        <td>${r.rowNum}</td>
        <td class="st"></td><td class="issues"></td><td class="rcpt"></td>
        ${S.headers.map((h) => `<td contenteditable="true" spellcheck="false" data-col="${escapeHtml(h)}">${escapeHtml(r.values[h])}</td>`).join('')}
      </tr>`).join('');
    const more = list.length > ROW_LIMIT ? `<tr><td colspan="${S.headers.length + 5}" class="muted">Showing ${ROW_LIMIT} of ${list.length} rows. Use search to narrow down.</td></tr>` : '';
    $('#valTable').innerHTML = head + '<tbody>' + (body || `<tr><td colspan="${S.headers.length + 5}" class="muted">No rows match.</td></tr>`) + more + '</tbody>';
    refreshValRows();
  }

  /** Update status/issue cells in place (keeps focus while editing). */
  function refreshValRows() {
    const byKey = new Map(S.records.map((r) => [r.key, r]));
    $$('#valTable tbody tr[data-key]').forEach((tr) => {
      const r = byKey.get(tr.dataset.key); if (!r) return;
      const v = r.validation;
      tr.classList.toggle('row-excluded', r.excluded);
      tr.querySelector('.st').innerHTML = `<span class="badge b-${v.status}">${v.status}</span>`;
      tr.querySelector('.issues').innerHTML = v.issues.map((i) => `<span class="issue ${i.level}">${escapeHtml(i.msg)}</span>`).join('') || '<span class="muted">-</span>';
      tr.querySelector('.rcpt').innerHTML = v.email ? `${escapeHtml(v.email)}${v.emailSource === 'fallback' ? ' <span class="tag">fallback</span>' : ''}` : '<span class="muted">-</span>';
      const errCols = new Set(v.issues.filter((i) => i.level === 'e').map((i) => i.field));
      const warnCols = new Set(v.issues.filter((i) => i.level === 'w').map((i) => i.field));
      tr.querySelectorAll('td[data-col]').forEach((td) => {
        td.classList.toggle('cell-err', errCols.has(td.dataset.col));
        td.classList.toggle('cell-warn', !errCols.has(td.dataset.col) && warnCols.has(td.dataset.col));
        if (document.activeElement !== td && td.textContent !== r.values[td.dataset.col]) td.textContent = r.values[td.dataset.col];
      });
    });
    updateCounts(CF.data.summarize(S.records));
  }

  function exportIssues() {
    const rows = [['Row', 'Status', 'Issues', ...S.headers]];
    S.records.filter((r) => r.validation.issues.length || r.excluded)
      .forEach((r) => rows.push([r.rowNum, r.validation.status, r.validation.issues.map((i) => i.msg).join(' | '), ...S.headers.map((h) => r.values[h])]));
    if (rows.length === 1) return toast('No issues to export.', 'ok');
    CF.download('validation_issues.csv', CF.toCSV(rows), 'text/csv');
  }

  // ======================================================================
  //  STEP 3 · Template editor
  // ======================================================================
  const tplCanvas = () => $('#tplCanvas');
  let tplBoxes = [];
  let drag = null;

  function sampleRecord() { return eligible()[0] || S.records[0] || null; }

  async function drawTemplate(centerGuide = false) {
    await CF.tpl.prepare(S.tpl);
    tplBoxes = CF.tpl.render(tplCanvas(), S.tpl, lookupFor(sampleRecord()), { selectedId: S.ui.selEl, centerGuide });
  }

  function renderTemplateStep() {
    $$('#designSeg button').forEach((b) => b.classList.toggle('on', b.dataset.design === S.tpl.design));
    renderElList();
    renderProps();
    drawTemplate();
  }

  function renderElList() {
    $('#elList').innerHTML = S.tpl.elements.map((el) => `<li data-id="${el.id}" class="${el.id === S.ui.selEl ? 'sel' : ''}">${el.type === 'image' ? '🖼 ' : ''}${escapeHtml(el.label || el.text || el.id)}${el.type === 'text' ? ` <span class="muted">· ${escapeHtml(el.text.slice(0, 40))}</span>` : ''}</li>`).join('');
  }

  const selectedEl = () => S.tpl.elements.find((e) => e.id === S.ui.selEl);

  function renderProps() {
    const el = selectedEl();
    $('#elProps').hidden = !el;
    if (!el) return;
    const isImg = el.type === 'image';
    ['#pText', '#pFont', '#pSize', '#pColor', '#pAlign', '#pSpacing'].forEach((id) => { $(id).closest('label').hidden = isImg; });
    ['#pBold', '#pItalic', '#pUpper', '#pFit'].forEach((id) => { $(id).closest('label').hidden = isImg; });
    $('#pChips').hidden = isImg;
    $('#pMaxW').previousSibling.textContent = isImg ? 'Width (%)' : 'Max width (%)';
    if (!isImg) {
      $('#pText').value = el.text;
      $('#pFont').value = el.font;
      if (!$('#pFont').value) { $('#pFont').append(new Option(el.font.split(',')[0], el.font)); $('#pFont').value = el.font; }
      $('#pSize').value = el.size;
      $('#pColor').value = el.color;
      $('#pAlign').value = el.align;
      $('#pSpacing').value = el.spacing || 0;
      $('#pBold').checked = !!el.bold; $('#pItalic').checked = !!el.italic; $('#pUpper').checked = !!el.upper; $('#pFit').checked = !!el.fit;
      const keys = ['NAME', 'ID', 'EVENT', 'ACHIEVEMENT', 'DATE', 'CERTIFICATE_TYPE', 'ORGANIZATION', 'CERT_ID', ...S.headers.map(headerToKey)];
      $('#pChips').innerHTML = [...new Set(keys)].map((k) => `<button class="chip" data-ins="{{${k}}}">{{${k}}}</button>`).join('');
    }
    $('#pMaxW').value = Math.round(el.maxW * 100);
  }

  function headerToKey(h) { return String(h).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  function onPropInput() {
    const el = selectedEl(); if (!el) return;
    if (el.type === 'text') {
      el.text = $('#pText').value;
      el.font = $('#pFont').value;
      el.size = Math.max(8, +$('#pSize').value || el.size);
      el.color = $('#pColor').value;
      el.align = $('#pAlign').value;
      el.spacing = +$('#pSpacing').value || 0;
      el.bold = $('#pBold').checked; el.italic = $('#pItalic').checked; el.upper = $('#pUpper').checked; el.fit = $('#pFit').checked;
    }
    el.maxW = Math.min(1, Math.max(0.03, (+$('#pMaxW').value || 50) / 100));
    save.tpl(); renderElList(); drawTemplate();
    ensureMapping(false);
  }

  function canvasPoint(e) {
    const c = tplCanvas(), rect = c.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * c.width / rect.width, y: (e.clientY - rect.top) * c.height / rect.height };
  }

  function bindTemplateEditor() {
    const c = tplCanvas();
    c.tabIndex = 0;
    c.addEventListener('pointerdown', (e) => {
      const p = canvasPoint(e);
      const hit = [...tplBoxes].reverse().find((b) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1);
      S.ui.selEl = hit ? hit.id : null;
      renderElList(); renderProps();
      if (hit) {
        const el = selectedEl();
        drag = { dx: p.x - el.x * c.width, dy: p.y - el.y * c.height };
        c.setPointerCapture(e.pointerId); c.classList.add('dragging');
      }
      drawTemplate();
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const el = selectedEl(); if (!el) return;
      const p = canvasPoint(e);
      let x = (p.x - drag.dx) / c.width, y = (p.y - drag.dy) / c.height;
      const snap = Math.abs(x - 0.5) < 0.008 && el.align === 'center';
      if (snap) x = 0.5;
      el.x = Math.min(1, Math.max(0, x)); el.y = Math.min(1, Math.max(0, y));
      drawTemplate(snap);
    });
    const end = () => { if (drag) { drag = null; c.classList.remove('dragging'); save.tpl(); drawTemplate(); } };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', (e) => {
      const el = selectedEl(); if (!el) return;
      const step = e.shiftKey ? 0.01 : 0.002;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) { e.preventDefault(); el.x += d[0]; el.y += d[1]; save.tpl(); drawTemplate(); }
      if (e.key === 'Delete') { $('#delEl').click(); }
    });

    $('#elList').addEventListener('click', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      S.ui.selEl = li.dataset.id; renderElList(); renderProps(); drawTemplate();
    });
    ['#pText', '#pFont', '#pSize', '#pColor', '#pAlign', '#pMaxW', '#pSpacing', '#pBold', '#pItalic', '#pUpper', '#pFit']
      .forEach((id) => $(id).addEventListener('input', onPropInput));
    $('#pChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ins]'); if (!b) return;
      const ta = $('#pText'); const pos = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, pos) + b.dataset.ins + ta.value.slice(ta.selectionEnd ?? pos);
      onPropInput(); ta.focus();
    });
    $('#centerEl').onclick = () => { const el = selectedEl(); if (el) { el.x = 0.5; if (el.type === 'text') el.align = 'center'; save.tpl(); renderProps(); drawTemplate(); } };
    $('#delEl').onclick = () => {
      if (!S.ui.selEl) return;
      S.tpl.elements = S.tpl.elements.filter((x) => x.id !== S.ui.selEl);
      S.ui.selEl = null; save.tpl(); renderTemplateStep(); ensureMapping(false);
    };
    $('#addText').onclick = () => {
      const id = 't' + CF.randomId(3);
      S.tpl.elements.push({ id, type: 'text', label: 'Custom text', text: 'New text {{NAME}}', x: 0.5, y: 0.75, align: 'center', font: "Georgia, 'Times New Roman', serif", size: 28, color: '#333333', bold: false, italic: false, upper: false, fit: false, maxW: 0.6, spacing: 0 });
      S.ui.selEl = id; save.tpl(); renderTemplateStep();
    };
    $('#resetTpl').onclick = () => {
      if (!confirm('Reset all elements to the default layout for this design?')) return;
      const bg = S.tpl.bg;
      S.tpl = CF.tpl.defaultTemplate(S.tpl.design); S.tpl.bg = bg; S.ui.selEl = null; save.tpl(); renderTemplateStep(); ensureMapping(false);
    };
    $('#designSeg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-design]'); if (!b) return;
      setDesign(b.dataset.design);
      if (b.dataset.design === 'custom' && !S.tpl.bg) $('#bgInput').click();
    });
    $('#bgInput').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      S.tpl.bg = await CF.fileToDataURL(f); setDesign('custom'); e.target.value = '';
      toast('Template image applied. Drag the text into position.', 'ok');
    };
    $('#logoInput').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const src = await CF.fileToDataURL(f);
      const existing = S.tpl.elements.find((x) => x.id === 'logo');
      if (existing) existing.src = src;
      else S.tpl.elements.push({ id: 'logo', type: 'image', label: 'Logo', src, x: 0.13, y: 0.17, maxW: 0.08 });
      S.ui.selEl = 'logo'; save.tpl(); renderTemplateStep(); e.target.value = '';
    };
    $('#exportTpl').onclick = () => CF.download('certificate_template.json', JSON.stringify({ template: S.tpl, mapping: S.mapping, mail: S.mail, namePattern: S.namePattern }, null, 2), 'application/json');
    $('#importTpl').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d.template || !Array.isArray(d.template.elements)) throw new Error('Not a CertiFlow template file');
        S.tpl = d.template; if (d.mapping) S.mapping = d.mapping; if (d.mail) S.mail = d.mail; if (d.namePattern) S.namePattern = d.namePattern;
        save.tpl(); save.mapping(); save.mail(); save.namePattern(); S.ui.selEl = null; renderTemplateStep();
        toast('Template imported', 'ok');
      } catch (err) { toast('Import failed: ' + err.message, 'err'); }
      e.target.value = '';
    };
  }

  function setDesign(design) {
    const old = S.tpl.elements;
    const fresh = CF.tpl.defaultElements(design);
    const merged = fresh.map((f) => {
      const o = old.find((x) => x.id === f.id);
      return o ? Object.assign(f, { text: o.text, x: o.x, y: o.y, size: o.size, align: o.align, maxW: o.maxW }) : f;
    });
    old.forEach((o) => { if (!fresh.some((f) => f.id === o.id)) merged.push(o); });
    S.tpl.design = design; S.tpl.elements = merged;
    save.tpl(); renderTemplateStep();
  }

  // ======================================================================
  //  STEP 4 · Mapping
  // ======================================================================
  function guessMapping(key) {
    const d = S.detected, c = S.cfg;
    const col = (h) => (h ? { kind: 'column', value: h } : null);
    const byKey = {
      NAME: col(c.colName), ID: col(c.colId), EVENT: col(c.colEvent), ACHIEVEMENT: col(d.achievement), DATE: col(d.date) || { kind: 'system', value: 'ISSUE_DATE' },
      CERTIFICATE_TYPE: col(d.type) || { kind: 'static', value: 'Participation' }, ORGANIZATION: { kind: 'static', value: 'Your Institution Name' },
      CERT_ID: { kind: 'system', value: 'CERT_ID' }, ISSUE_DATE: { kind: 'system', value: 'ISSUE_DATE' }, EMAIL: { kind: 'system', value: 'EMAIL' }, ROW: { kind: 'system', value: 'ROW' },
    };
    if (byKey[key]) return byKey[key];
    const h = S.headers.find((x) => headerToKey(x) === key);
    return h ? { kind: 'column', value: h } : null;
  }

  /** Fill in mapping for any placeholder without a valid mapping. */
  function ensureMapping(resetColumns) {
    for (const key of usedPlaceholders().keys()) {
      const m = S.mapping[key];
      const broken = !m || (m.kind === 'column' && S.headers.length && !S.headers.includes(m.value));
      if (broken || (resetColumns && m && m.kind === 'column')) {
        const g = guessMapping(key);
        if (g) S.mapping[key] = g; else if (broken) delete S.mapping[key];
      }
    }
    save.mapping();
  }

  /** Keep NAME / ID / EVENT placeholders pointing at the key columns chosen in step 2. */
  function syncKeyMappings() {
    const pairs = { NAME: S.cfg.colName, ID: S.cfg.colId, EVENT: S.cfg.colEvent };
    for (const [k, col] of Object.entries(pairs)) if (col) S.mapping[k] = { kind: 'column', value: col };
    save.mapping();
  }

  function renderMap() {
    ensureMapping(false);
    const used = usedPlaceholders();
    const sample = sampleRecord();
    const rows = [...used.entries()].sort().map(([key, where]) => {
      const m = S.mapping[key] || { kind: '', value: '' };
      const sel = (k, v) => (m.kind === k && m.value === v ? 'selected' : '');
      const options = `<option value="">— not mapped —</option>
        <optgroup label="Spreadsheet columns">${S.headers.map((h) => `<option value="column:${escapeHtml(h)}" ${sel('column', h)}>${escapeHtml(h)}</option>`).join('')}</optgroup>
        <optgroup label="System values">${Object.entries(SYSTEM_VALUES).map(([k, s]) => `<option value="system:${k}" ${sel('system', k)}>${escapeHtml(s.label)}</option>`).join('')}</optgroup>
        <optgroup label="Other"><option value="static:" ${m.kind === 'static' ? 'selected' : ''}>Fixed text (same for everyone)…</option></optgroup>`;
      const sv = valueFor(sample, key);
      return `<tr data-key="${key}">
        <td><code class="chip">{{${key}}}</code></td>
        <td class="muted tiny">${[...where].join(', ')}</td>
        <td><select class="mapSel">${options}</select></td>
        <td><input class="mapStatic" value="${m.kind === 'static' ? escapeHtml(m.value) : ''}" ${m.kind === 'static' ? '' : 'hidden'} placeholder="Fixed value"/></td>
        <td class="sample">${sv === undefined ? '<span class="badge b-error">unmapped</span>' : escapeHtml(sv) || '<span class="muted">(empty)</span>'}</td>
      </tr>`;
    }).join('');
    $('#mapTable').innerHTML = `<thead><tr><th style="width:170px">Placeholder</th><th style="width:170px">Used in</th><th>Source</th><th>Fixed value</th><th>Sample (${sample ? 'row ' + sample.rowNum : 'demo'})</th></tr></thead><tbody>${rows}</tbody>`;
    $('#namePattern').value = S.namePattern;
    updateMapWarnings();
    updateNameExample();
  }

  function updateMapWarnings() {
    const used = [...usedPlaceholders().keys()];
    const unmapped = used.filter((k) => !S.mapping[k]);
    const el = eligible();
    const empties = used.filter((k) => S.mapping[k] && S.mapping[k].kind === 'column')
      .map((k) => [k, el.filter((r) => !String(r.values[S.mapping[k].value] ?? '').trim()).length]).filter(([, n]) => n > 0);
    const msgs = [];
    if (unmapped.length) msgs.push(`Unmapped placeholders: ${unmapped.map((k) => `{{${k}}}`).join(', ')}. They will appear literally in certificates/emails.`);
    empties.forEach(([k, n]) => msgs.push(`${n} eligible record(s) have an empty value for {{${k}}}.`));
    $('#mapWarn').hidden = !msgs.length;
    $('#mapWarn').innerHTML = msgs.map(escapeHtml).join('<br>');
  }

  function updateNameExample() {
    const r = sampleRecord();
    $('#nameExample').value = r ? baseFilename(r) + '.pdf' : CF.sanitizeFilename(CF.fillPlaceholders(S.namePattern, (k) => DEMO[k] ?? '')) + '.pdf';
  }

  function bindMap() {
    $('#mapTable').addEventListener('change', (e) => {
      const tr = e.target.closest('tr[data-key]'); if (!tr) return;
      const key = tr.dataset.key;
      if (e.target.classList.contains('mapSel')) {
        const v = e.target.value;
        if (!v) delete S.mapping[key];
        else {
          const [kind, ...rest] = v.split(':');
          S.mapping[key] = { kind, value: kind === 'static' ? (S.mapping[key]?.kind === 'static' ? S.mapping[key].value : '') : rest.join(':') };
        }
      }
      save.mapping(); renderMap();
      if (e.target.classList.contains('mapSel') && S.mapping[key]?.kind === 'static') $(`#mapTable tr[data-key="${key}"] .mapStatic`).focus();
    });
    $('#mapTable').addEventListener('input', CF.debounce((e) => {
      if (!e.target.classList.contains('mapStatic')) return;
      const key = e.target.closest('tr').dataset.key;
      S.mapping[key] = { kind: 'static', value: e.target.value };
      save.mapping();
      e.target.closest('tr').querySelector('.sample').textContent = e.target.value;
      updateNameExample();
    }, 200));
    $('#namePattern').addEventListener('input', CF.debounce(() => {
      S.namePattern = $('#namePattern').value || '{{ID}}_{{NAME}}';
      save.namePattern(); ensureMapping(false); updateNameExample();
    }, 250));
  }

  // ======================================================================
  //  STEP 5 · Preview & email
  // ======================================================================
  function buildEmail(rec) {
    const lookup = lookupFor(rec);
    const subject = CF.fillPlaceholders(S.mail.subject, lookup).replace(/[\r\n]+/g, ' ');
    const html = CF.fillPlaceholders(S.mail.body, lookup, true);
    const text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*/g, '\n\n').trim();
    return { subject, html, text };
  }

  async function renderPreview() {
    const list = eligible();
    $('#mailSubject').value = S.mail.subject;
    if (document.activeElement !== $('#mailBody')) $('#mailBody').value = S.mail.body;
    const keys = [...new Set(['NAME', 'ID', 'EVENT', 'ACHIEVEMENT', 'DATE', 'CERTIFICATE_TYPE', 'CERT_ID', 'ORGANIZATION', ...Object.keys(S.mapping)])];
    $('#mailChips').innerHTML = keys.map((k) => `<button class="chip" data-ins="{{${k}}}">{{${k}}}</button>`).join('');
    $('#pvSelect').innerHTML = list.length
      ? list.map((r, i) => `<option value="${i}">Row ${r.rowNum} · ${escapeHtml(r.values[S.cfg.colName] || '?')} · ${escapeHtml(r.validation.email)}</option>`).join('')
      : '<option>No eligible records (showing demo values)</option>';
    S.ui.pv = Math.min(S.ui.pv, Math.max(0, list.length - 1));
    $('#pvSelect').value = String(S.ui.pv);
    await drawPreview();
  }

  async function drawPreview() {
    const list = eligible();
    const rec = list[S.ui.pv] || null;
    await CF.tpl.prepare(S.tpl);
    CF.tpl.render($('#pvCanvas'), S.tpl, lookupFor(rec));
    $('#pvCounter').textContent = list.length ? `${S.ui.pv + 1} of ${list.length} eligible` : '';
    const mail = rec ? buildEmail(rec) : { subject: CF.fillPlaceholders(S.mail.subject, (k) => DEMO[k]), html: CF.fillPlaceholders(S.mail.body, (k) => DEMO[k], true) };
    const file = rec ? baseFilename(rec) + '.pdf' : 'certificate.pdf';
    $('#pvTo').textContent = rec ? rec.validation.email : DEMO.EMAIL;
    $('#pvToNote').textContent = rec && rec.validation.emailSource === 'fallback' ? '(fallback email)' : '';
    $('#pvSubject').textContent = mail.subject;
    $('#pvAttach').textContent = file;
    $('#pvFile').textContent = rec ? `File: ${file} · Certificate No: ${certIdFor(rec)}` : 'Demo values shown. Upload data to preview real records.';
    $('#pvMail').srcdoc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:12px">${mail.html}</body></html>`;
  }

  function bindPreview() {
    $('#pvSelect').onchange = () => { S.ui.pv = +$('#pvSelect').value || 0; drawPreview(); };
    $('#pvPrev').onclick = () => { const n = eligible().length; if (!n) return; S.ui.pv = (S.ui.pv - 1 + n) % n; $('#pvSelect').value = S.ui.pv; drawPreview(); };
    $('#pvNext').onclick = () => { const n = eligible().length; if (!n) return; S.ui.pv = (S.ui.pv + 1) % n; $('#pvSelect').value = S.ui.pv; drawPreview(); };
    $('#pvRandom').onclick = () => { const n = eligible().length; if (!n) return; S.ui.pv = Math.floor(Math.random() * n); $('#pvSelect').value = S.ui.pv; drawPreview(); };
    const onMail = CF.debounce(() => {
      S.mail.subject = $('#mailSubject').value; S.mail.body = $('#mailBody').value;
      save.mail(); ensureMapping(false); drawPreview();
    }, 300);
    $('#mailSubject').addEventListener('input', onMail);
    $('#mailBody').addEventListener('input', onMail);
    $('#mailChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-ins]'); if (!b) return;
      const ta = $('#mailBody'); const pos = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, pos) + b.dataset.ins + ta.value.slice(ta.selectionEnd ?? pos);
      onMail(); ta.focus();
    });
    $('#resetMail').onclick = () => {
      if (!confirm('Replace the current email with the default template?')) return;
      S.mail = { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY }; save.mail(); $('#mailBody').value = DEFAULT_BODY; renderPreview();
    };
  }

  // ======================================================================
  //  STEP 6 · Generate & send
  // ======================================================================
  function log(msg, kind = '') {
    const box = $('#log');
    const d = document.createElement('div');
    d.className = kind;
    d.innerHTML = `<time>${new Date().toLocaleTimeString()}</time>${escapeHtml(msg)}`;
    box.appendChild(d);
    while (box.childElementCount > 2000) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
  }

  function renderRun() {
    const st = S.settings;
    $('#mode').value = st.mode;
    $('#serverUrl').value = st.serverUrl;
    $('#token').value = S.token;
    $('#simFail').value = st.simFail;
    $('#concurrency').value = st.concurrency;
    $('#delay').value = st.delay;
    $('#retries').value = st.retries;
    $('#allowResend').checked = st.allowResend;
    $('#smtpBox').hidden = st.mode !== 'smtp';
    $('#simBox').hidden = st.mode !== 'simulation';
    updateRunButtons();
    updateProgress();
  }

  function readRunSettings() {
    const st = S.settings;
    st.mode = $('#mode').value;
    st.serverUrl = $('#serverUrl').value.trim();
    st.simFail = Math.min(80, Math.max(0, +$('#simFail').value || 0));
    st.concurrency = Math.min(10, Math.max(1, +$('#concurrency').value || 1));
    st.delay = Math.max(0, +$('#delay').value || 0);
    st.retries = Math.min(5, Math.max(0, +$('#retries').value || 0));
    st.allowResend = $('#allowResend').checked;
    S.token = $('#token').value;
    sessionStorage.setItem('cf.token', S.token);
    save.settings();
    updateModePill();
    $('#smtpBox').hidden = st.mode !== 'smtp';
    $('#simBox').hidden = st.mode !== 'simulation';
  }

  function updateModePill() {
    const live = S.settings.mode === 'smtp';
    $('#modePill').textContent = live ? 'Mode: Real email (SMTP)' : 'Mode: Simulation';
    $('#modePill').classList.toggle('live', live);
  }

  function updateRunButtons() {
    const busy = S.run.busy;
    const el = eligible();
    const generated = el.filter((r) => r.delivery.blob).length;
    const failed = el.filter((r) => r.delivery.status === 'Failed').length;
    $('#btnGenerate').disabled = busy || !el.length;
    $('#btnZip').disabled = busy || !generated;
    $('#btnSend').disabled = busy || !el.length;
    $('#btnRetry').disabled = busy || !failed;
    $('#btnPause').disabled = !busy || !S.run.ctl;
    $('#btnStop').disabled = !busy || !S.run.ctl;
    $('#sendTest').disabled = busy;
    $('#btnPause').textContent = S.run.ctl && S.run.ctl.paused ? '▶ Resume' : '⏸ Pause';
  }

  function updateProgress() {
    const el = eligible();
    const gen = el.filter((r) => r.delivery.blob || r.delivery.status === 'Sent').length;
    const sent = el.filter((r) => r.delivery.status === 'Sent').length;
    const failed = el.filter((r) => r.delivery.status === 'Failed').length;
    $('#genText').textContent = `${gen} / ${el.length}`;
    $('#genBar').style.width = el.length ? (gen / el.length * 100) + '%' : 0;
    $('#sendText').textContent = `${sent} sent · ${failed} failed · ${el.length} total`;
    $('#sendBar').style.width = el.length ? (sent / el.length * 100) + '%' : 0;
    updateKpis();
  }

  const genCanvas = document.createElement('canvas');

  /** Generate (or regenerate) one record's certificate PDF. */
  function generateOne(rec, usedNames) {
    CF.tpl.render(genCanvas, S.tpl, lookupFor(rec));
    const certId = certIdFor(rec);
    const blob = CF.tpl.toPDF(genCanvas, {
      title: `Certificate - ${rec.values[S.cfg.colName] || ''}`,
      certId, recordKey: rec.key, author: valueFor(rec, 'ORGANIZATION') || 'CertiFlow',
    });
    let name = baseFilename(rec);
    if (usedNames) {
      let n = name, i = 2;
      while (usedNames.has(n.toLowerCase())) n = `${name}_${i++}`;
      usedNames.add(n.toLowerCase()); name = n;
    }
    const st = rec.delivery.status;
    const keep = st === 'Sent' || st === 'Sending' || st === 'Skipped';
    Object.assign(rec.delivery, {
      blob, certId, filename: name + '.pdf', fingerprint: fingerprint(rec),
      recipient: rec.validation.email,
      status: keep ? st : 'Generated',
      error: st === 'Skipped' ? rec.delivery.error : '',
    });
    return rec.delivery;
  }

  function checkMappingBeforeRun() {
    const unmapped = [...usedPlaceholders().keys()].filter((k) => !S.mapping[k]);
    if (unmapped.length) return confirm(`These placeholders are not mapped and will appear as-is:\n${unmapped.map((k) => '{{' + k + '}}').join(', ')}\n\nContinue anyway?`);
    return true;
  }

  async function generateAll({ silent = false } = {}) {
    const list = eligible();
    if (!list.length) { toast('No eligible records to generate.', 'warn'); return false; }
    if (!silent && !checkMappingBeforeRun()) return false;
    S.run.busy = true; updateRunButtons();
    await CF.tpl.prepare(S.tpl);
    const used = new Set();
    // reserve names of already-sent certificates
    list.forEach((r) => { if (r.delivery.status === 'Sent' && r.delivery.filename) used.add(r.delivery.filename.replace(/\.pdf$/i, '').toLowerCase()); });
    log(`Generating certificates for ${list.length} eligible students…`, 'info');
    const t0 = performance.now();
    let made = 0, reused = 0, errors = 0;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.delivery.status === 'Sent') continue;
      if (r.delivery.blob && r.delivery.fingerprint === fingerprint(r)) { used.add(r.delivery.filename.replace(/\.pdf$/i, '').toLowerCase()); reused++; continue; }
      try { generateOne(r, used); made++; }
      catch (e) { errors++; r.delivery.status = 'Failed'; r.delivery.error = 'Generation failed: ' + e.message; log(`Row ${r.rowNum}: generation failed (${e.message})`, 'err'); }
      if (i % 3 === 0) { updateProgress(); await CF.sleep(0); }
    }
    S.run.busy = false;
    updateProgress(); updateRunButtons();
    log(`Generated ${made} certificate(s)${reused ? `, ${reused} unchanged reused` : ''}${errors ? `, ${errors} failed` : ''} in ${((performance.now() - t0) / 1000).toFixed(1)}s.`, errors ? 'warn' : 'ok');
    if (!silent) toast(`Generated ${made + reused} certificates`, 'ok');
    return true;
  }

  async function downloadZip() {
    const list = eligible().filter((r) => r.delivery.blob);
    if (!list.length) return;
    if (!window.JSZip) return toast('ZIP library failed to load', 'err');
    const zip = new JSZip();
    const folder = zip.folder('certificates');
    list.forEach((r) => folder.file(r.delivery.filename, r.delivery.blob));
    zip.file('delivery_report.csv', reportCSV());
    log(`Packing ${list.length} certificates into a ZIP…`, 'info');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => { $('#genText').textContent = `zipping ${Math.round(m.percent)}%`; });
    const ev = CF.sanitizeFilename(eligible()[0]?.values[S.cfg.colEvent] || 'certificates', 40);
    CF.download(`${ev}_certificates_${new Date().toISOString().slice(0, 10)}.zip`, blob);
    updateProgress();
    log('ZIP downloaded.', 'ok');
  }

  const sentKey = (rec) => CF.hashHex((rec.validation.email || '').toLowerCase() + '|' + certIdFor(rec));

  async function preflight() {
    readRunSettings();
    if (S.settings.mode === 'smtp') {
      if (!S.token) { toast('Enter the organizer token for the relay server.', 'err'); return false; }
      try {
        const h = await CF.mail.health(S.settings.serverUrl);
        if (!h.smtpConfigured) { toast('Relay server is running but SMTP is not configured in .env', 'err'); return false; }
      } catch (e) { toast('Relay server is not reachable. Start it with "npm start".', 'err'); return false; }
    }
    return true;
  }

  async function sendAll({ onlyFailed = false, keys = null } = {}) {
    if (S.run.busy) return;
    if (!(await preflight())) return;
    let list = eligible();
    if (!list.length) return toast('No eligible records.', 'warn');
    if (!onlyFailed && !checkMappingBeforeRun()) return;

    // Duplicate-send prevention (Rule 13)
    const allow = S.settings.allowResend;
    let targets = [];
    let skippedPrev = 0;
    for (const r of list) {
      if (keys && !keys.has(r.key)) continue;
      if (onlyFailed && r.delivery.status !== 'Failed') continue;
      if (r.delivery.status === 'Sent' && !allow) continue;
      const prev = sentLog[sentKey(r)];
      if (prev && !allow && r.delivery.status !== 'Sent') {
        r.delivery.status = 'Skipped'; r.delivery.error = `Already sent on ${new Date(prev.at).toLocaleString()}. Enable authorized re-send to send again.`;
        skippedPrev++; continue;
      }
      targets.push(r);
    }
    if (skippedPrev) log(`${skippedPrev} student(s) skipped: certificate was already delivered in an earlier session.`, 'warn');
    if (!targets.length) { updateProgress(); renderReport(); return toast(allow ? 'Nothing to send.' : 'Everyone eligible has already been sent their certificate.', 'warn'); }

    const resends = targets.filter((r) => r.delivery.status === 'Sent' || sentLog[sentKey(r)]).length;
    const modeLabel = S.settings.mode === 'smtp' ? 'REAL emails via SMTP' : 'simulated emails';
    if (!confirm(`Send ${targets.length} ${modeLabel}?${resends ? `\n\n${resends} of them are authorized RE-SENDS.` : ''}\n\nEach student receives only their own certificate.`)) return;

    // Make sure every target has an up-to-date certificate
    const needGen = targets.some((r) => !r.delivery.blob || r.delivery.fingerprint !== fingerprint(r));
    if (needGen) { log('Some certificates are missing or outdated: generating first.', 'info'); await generateAll({ silent: true }); }
    targets = targets.filter((r) => r.delivery.status !== 'Failed' || r.delivery.blob);

    const transport = CF.mail.transports[S.settings.mode];
    const ctl = { paused: false, stopped: false };
    S.run = { busy: true, ctl };
    targets.forEach((r) => { if (r.delivery.status !== 'Sent') r.delivery.status = 'Generated'; });
    updateRunButtons();
    log(`Sending ${targets.length} email(s) via ${transport.label} (parallel ${S.settings.concurrency}, retries ${S.settings.retries})…`, 'info');
    window.onbeforeunload = () => 'Emails are still being sent.';
    let ok = 0, fail = 0;
    const throttledReport = CF.debounce(() => { if (S.ui.step === 'report') renderReport(); }, 300);

    await CF.mail.runQueue(targets, async (rec, attempt) => {
      // ---- Rule 6: verify certificate ↔ recipient mapping right before sending ----
      if (rec.delivery.fingerprint !== fingerprint(rec) || !rec.delivery.blob) generateOne(rec, null);
      const expectedCert = certIdFor(rec);
      const to = rec.validation.email;
      if (rec.delivery.certId !== expectedCert || rec.delivery.recipient !== to || !CF.data.isEmail(to)) {
        throw new CF.mail.SendError('Mapping check failed: certificate does not belong to this recipient. Blocked.', false);
      }
      rec.delivery.attempts++;
      if (attempt > 1) log(`Row ${rec.values[S.cfg.colName]}: retry ${attempt - 1}…`, 'warn');
      const mail = buildEmail(rec);
      return transport.send({
        to, subject: mail.subject, html: mail.html, text: mail.text,
        attachment: rec.delivery.blob, filename: rec.delivery.filename,
        certId: expectedCert, attachmentCertId: rec.delivery.certId, recordKey: rec.key,
      }, { ...S.settings, token: S.token });
    }, {
      concurrency: S.settings.concurrency, delay: S.settings.delay, retries: S.settings.retries, ctl,
      onStart: (rec) => { rec.delivery.status = 'Sending'; throttledReport(); },
      onDone: (rec, err, res) => {
        const name = rec.values[S.cfg.colName];
        if (err) {
          fail++;
          Object.assign(rec.delivery, { status: 'Failed', error: err.message });
          log(`✖ ${name} <${rec.validation.email}>: ${err.message}`, 'err');
        } else {
          ok++;
          Object.assign(rec.delivery, { status: 'Sent', error: '', sentAt: new Date().toISOString(), messageId: res.messageId || '' });
          sentLog[sentKey(rec)] = { at: Date.now(), certId: rec.delivery.certId };
          save.sentLog();
          log(`✔ ${name} <${rec.validation.email}> ← ${rec.delivery.filename}`, 'ok');
        }
        updateProgress(); throttledReport();
      },
    });

    // anything not processed because of Stop stays "Generated"
    targets.forEach((r) => { if (r.delivery.status === 'Sending') r.delivery.status = 'Generated'; });
    window.onbeforeunload = null;
    const stopped = ctl.stopped;
    S.run = { busy: false, ctl: null };
    updateProgress(); updateRunButtons(); renderReport();
    log(`${stopped ? 'Stopped' : 'Finished'}: ${ok} sent, ${fail} failed${stopped ? ', remaining left pending' : ''}.`, fail ? 'warn' : 'ok');
    toast(`${ok} sent · ${fail} failed`, fail ? 'warn' : 'ok');
  }

  async function sendTest() {
    const to = $('#testTo').value.trim();
    if (!CF.data.isEmail(to)) return toast('Enter a valid test email address.', 'err');
    const rec = eligible()[S.ui.pv] || eligible()[0];
    if (!rec) return toast('No eligible record to test with.', 'warn');
    if (!(await preflight())) return;
    await CF.tpl.prepare(S.tpl);
    CF.tpl.render(genCanvas, S.tpl, lookupFor(rec));
    const blob = CF.tpl.toPDF(genCanvas, { certId: certIdFor(rec), recordKey: rec.key });
    const mail = buildEmail(rec);
    log(`Sending TEST email for ${rec.values[S.cfg.colName]} to ${to}…`, 'info');
    try {
      await CF.mail.transports[S.settings.mode].send({
        to, subject: '[TEST] ' + mail.subject, html: mail.html, text: mail.text, attachment: blob,
        filename: baseFilename(rec) + '.pdf', certId: certIdFor(rec), attachmentCertId: certIdFor(rec), recordKey: rec.key,
      }, { ...S.settings, simFail: 0, token: S.token });
      log(`Test email sent to ${to}.`, 'ok'); toast('Test email sent', 'ok');
    } catch (e) { log(`Test failed: ${e.message}`, 'err'); toast('Test failed: ' + e.message, 'err'); }
  }

  function bindRun() {
    ['#mode', '#serverUrl', '#token', '#simFail', '#concurrency', '#delay', '#retries', '#allowResend'].forEach((id) => $(id).addEventListener('change', readRunSettings));
    $('#allowResend').addEventListener('change', (e) => {
      if (e.target.checked && !confirm('Allow re-sending certificates to students who already received them? Use this only for authorized corrections.')) { e.target.checked = false; readRunSettings(); }
    });
    $('#testConn').onclick = async () => {
      readRunSettings();
      $('#connStatus').textContent = 'Checking…';
      try {
        const h = await CF.mail.health(S.settings.serverUrl);
        if (!h.tokenConfigured) throw new Error('ADMIN_TOKEN not set in server .env');
        if (!h.smtpConfigured) throw new Error(h.nodemailerInstalled ? 'SMTP not configured in .env' : 'Run "npm install" on the server');
        const v = await CF.mail.verify(S.settings.serverUrl, S.token);
        $('#connStatus').innerHTML = `<span style="color:var(--green)">✔ Connected. Sending as ${escapeHtml(v.from)}</span>`;
      } catch (e) { $('#connStatus').innerHTML = `<span style="color:var(--red)">✖ ${escapeHtml(e.message)}</span>`; }
    };
    $('#btnGenerate').onclick = () => generateAll();
    $('#btnZip').onclick = downloadZip;
    $('#btnSend').onclick = () => sendAll();
    $('#btnRetry').onclick = () => sendAll({ onlyFailed: true });
    $('#btnPause').onclick = () => { const c = S.run.ctl; if (!c) return; c.paused = !c.paused; log(c.paused ? 'Paused.' : 'Resumed.', 'warn'); updateRunButtons(); };
    $('#btnStop').onclick = () => { const c = S.run.ctl; if (!c) return; c.stopped = true; c.paused = false; log('Stopping after in-flight emails finish…', 'warn'); };
    $('#sendTest').onclick = sendTest;
    $('#clearLog').onclick = () => { $('#log').innerHTML = ''; };
  }

  // ======================================================================
  //  STEP 7 · Report
  // ======================================================================
  const STATUS_COLORS = { Sent: '#16a34a', Generated: '#0284c7', Sending: '#d97706', Pending: '#a1a6c2', Failed: '#dc2626', Skipped: '#d6d8e4' };

  function reportRows() {
    return S.records.map((r) => ({
      rec: r, status: displayStatus(r), note: statusNote(r),
      name: r.values[S.cfg.colName] || '', id: r.values[S.cfg.colId] || '', event: r.values[S.cfg.colEvent] || '',
    }));
  }

  function renderReport() {
    const rows = reportRows();
    const count = (s) => rows.filter((x) => x.status === s).length;
    const sum = CF.data.summarize(S.records);
    const stats = [
      ['Total records', rows.length, 'var(--ink)'], ['Eligible', sum.eligible, 'var(--green)'], ['Invalid / excluded', sum.error + sum.excluded, 'var(--red)'],
      ['Generated', rows.filter((x) => x.rec.delivery.blob || x.status === 'Sent').length, 'var(--blue)'], ['Sent', count('Sent'), 'var(--green)'],
      ['Failed', count('Failed'), 'var(--red)'], ['Pending', count('Pending') + count('Generated') + count('Sending'), 'var(--amber)'], ['Skipped', count('Skipped'), 'var(--muted)'],
    ];
    $('#statGrid').innerHTML = stats.map(([l, v, c]) => `<div class="stat"><b style="color:${c}">${v}</b><span>${l}</span></div>`).join('');
    const total = rows.length || 1;
    const order = ['Sent', 'Generated', 'Sending', 'Pending', 'Failed', 'Skipped'];
    $('#stackBar').innerHTML = order.map((s) => `<div title="${s}: ${count(s)}" style="width:${count(s) / total * 100}%;background:${STATUS_COLORS[s]}"></div>`).join('');
    $('#stackLegend').innerHTML = order.map((s) => `<span><i style="background:${STATUS_COLORS[s]}"></i>${s} ${count(s)} (${Math.round(count(s) / total * 100)}%)</span>`).join('');

    const f = S.ui.repFilter;
    const list = rows.filter((x) => (f === 'all' || x.status === f) && matchesSearch(x.rec, S.ui.repSearch));
    const shown = list.slice(0, ROW_LIMIT);
    $('#repTable').innerHTML = `<thead><tr><th>Row</th><th>Student</th><th>ID</th><th>Event</th><th>Recipient</th><th>Certificate No.</th><th>File</th><th>Status</th><th>Attempts</th><th>Sent at</th><th>Details</th><th></th></tr></thead><tbody>${
      shown.map((x) => {
        const d = x.rec.delivery;
        return `<tr data-key="${x.rec.key}"><td>${x.rec.rowNum}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.id)}</td><td>${escapeHtml(x.event)}</td>
        <td>${escapeHtml(x.rec.validation.email)}${x.rec.validation.emailSource === 'fallback' ? ' <span class="tag">fallback</span>' : ''}</td>
        <td>${escapeHtml(d.certId || (CF.data.isEligible(x.rec) ? certIdFor(x.rec) : ''))}</td><td>${escapeHtml(d.filename)}</td>
        <td><span class="badge b-${x.status}">${x.status}</span></td><td>${d.attempts || ''}</td>
        <td>${d.sentAt ? new Date(d.sentAt).toLocaleString() : ''}</td><td class="issues">${escapeHtml(x.note)}</td>
        <td>${d.blob ? '<button class="btn btn-sm btn-ghost dl">⬇ PDF</button>' : ''}${x.status === 'Failed' ? ' <button class="btn btn-sm btn-warn retry1">Retry</button>' : ''}</td></tr>`;
      }).join('') || '<tr><td colspan="12" class="muted">No records.</td></tr>'
    }${list.length > ROW_LIMIT ? `<tr><td colspan="12" class="muted">Showing ${ROW_LIMIT} of ${list.length}. Use search or export CSV for the full report.</td></tr>` : ''}</tbody>`;
  }

  function reportCSV() {
    const rows = [['Row', 'Student Name', 'Student ID', 'Event', 'Recipient Email', 'Email Source', 'Certificate No', 'File Name', 'Status', 'Attempts', 'Sent At', 'Message ID', 'Details']];
    reportRows().forEach((x) => {
      const d = x.rec.delivery;
      rows.push([x.rec.rowNum, x.name, x.id, x.event, x.rec.validation.email, x.rec.validation.emailSource, d.certId, d.filename, x.status, d.attempts, d.sentAt, d.messageId, x.note]);
    });
    return CF.toCSV(rows);
  }

  function bindReport() {
    $('#repFilter').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#repFilter button').forEach((x) => x.classList.toggle('on', x === b));
      S.ui.repFilter = b.dataset.f; renderReport();
    });
    $('#repSearch').addEventListener('input', CF.debounce((e) => { S.ui.repSearch = e.target.value.trim(); renderReport(); }, 200));
    $('#exportReport').onclick = () => CF.download(`delivery_report_${new Date().toISOString().slice(0, 10)}.csv`, reportCSV(), 'text/csv');
    $('#printReport').onclick = () => window.print();
    $('#repTable').addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-key]'); if (!tr) return;
      const rec = S.records.find((r) => r.key === tr.dataset.key); if (!rec) return;
      if (e.target.classList.contains('dl')) CF.download(rec.delivery.filename, rec.delivery.blob);
      if (e.target.classList.contains('retry1')) {
        if (S.run.busy) return toast('A batch is running.', 'warn');
        await sendAll({ onlyFailed: true, keys: new Set([rec.key]) });
      }
    });
  }

  // ======================================================================
  //  Security: organizer lock (Rule 15)
  // ======================================================================
  let idleTimer;
  async function initLock() {
    const auth = store.get('auth', null);
    if (sessionStorage.getItem('cf.unlocked') === '1' && auth) return;
    const setup = !auth;
    $('#lock').hidden = false;
    $('#lockTitle').textContent = setup ? 'Create organizer passcode' : 'Organizer access';
    $('#lockHint').textContent = setup ? 'Only people with this passcode can generate or send certificates on this computer.' : 'Enter your organizer passcode to continue.';
    $('#lockPass2').hidden = !setup;
    $('#lockPass2').required = setup;
    $('#lockBtn').textContent = setup ? 'Create & unlock' : 'Unlock';
    setTimeout(() => $('#lockPass').focus(), 50);
    await new Promise((resolve) => {
      $('#lockForm').onsubmit = async (e) => {
        e.preventDefault();
        const p = $('#lockPass').value;
        const err = (m) => { $('#lockErr').hidden = false; $('#lockErr').textContent = m; };
        if (p.length < 4) return err('Passcode must be at least 4 characters.');
        if (setup) {
          if (p !== $('#lockPass2').value) return err('Passcodes do not match.');
          const salt = CF.randomId(12);
          store.set('auth', { salt, hash: await CF.sha256Hex(salt + p) });
        } else if ((await CF.sha256Hex(auth.salt + p)) !== auth.hash) {
          await CF.sleep(600); return err('Incorrect passcode.');
        }
        sessionStorage.setItem('cf.unlocked', '1');
        $('#lock').hidden = true; $('#lockPass').value = ''; $('#lockPass2').value = ''; $('#lockErr').hidden = true;
        resolve();
      };
    });
  }
  function lockNow() {
    if (S.run.busy) return toast('Cannot lock while a batch is running.', 'warn');
    sessionStorage.removeItem('cf.unlocked');
    initLock();
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!S.run.busy && store.get('auth', null)) { lockNow(); toast('Locked after 30 minutes of inactivity.', 'warn'); } }, 30 * 60 * 1000);
  }

  // ======================================================================
  //  Wiring
  // ======================================================================
  function bindGlobal() {
    $('#steps').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) go(b.dataset.step); });
    document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

    // upload
    const dz = $('#dropzone');
    $('#fileInput').onchange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; };
    ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
    $('#loadSample').onclick = () => handleFile(new File([SAMPLE_CSV], 'students_sample.csv', { type: 'text/csv' }));
    $('#sheetSelect').onchange = () => { S.file.sheet = $('#sheetSelect').value; loadSheet(); };
    $('#headerRow').onchange = () => { if (S.file) loadSheet(); };

    // validate
    ['#colName', '#colId', '#colEvent', '#colEmail', '#colEmail2', '#fallbackWhen', '#dupKey', '#optTrim', '#optTitle', '#optLowerEmail'].forEach((id) =>
      $(id).addEventListener('change', () => { readValidateForm(); syncKeyMappings(); runValidation(); renderValTable(); }));
    $('#requiredCols').addEventListener('change', () => { readValidateForm(); runValidation(); renderValTable(); });
    $('#runValidate').onclick = () => { readValidateForm(); runValidation(); renderValTable(); toast('Validation complete', 'ok'); };
    $('#valFilter').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#valFilter button').forEach((x) => x.classList.toggle('on', x === b));
      S.ui.valFilter = b.dataset.f; renderValTable();
    });
    $('#valSearch').addEventListener('input', CF.debounce((e) => { S.ui.valSearch = e.target.value.trim(); renderValTable(); }, 200));
    $('#exportIssues').onclick = exportIssues;
    $('#valTable').addEventListener('change', (e) => {
      if (!e.target.classList.contains('use')) return;
      const rec = S.records.find((r) => r.key === e.target.closest('tr').dataset.key);
      rec.excluded = !e.target.checked; runValidation(); refreshValRows();
    });
    $('#valTable').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.isContentEditable) { e.preventDefault(); e.target.blur(); } });
    $('#valTable').addEventListener('focusout', (e) => {
      const td = e.target; if (!td.dataset || !td.dataset.col) return;
      const rec = S.records.find((r) => r.key === td.closest('tr').dataset.key); if (!rec) return;
      const nv = td.textContent;
      if (nv === rec.values[td.dataset.col]) return;
      if (rec.delivery.status === 'Sent' && !confirm('This student already received a certificate. Change the data anyway? (You will need an authorized re-send.)')) { td.textContent = rec.values[td.dataset.col]; return; }
      rec.values[td.dataset.col] = nv;
      runValidation(); refreshValRows();
    });

    // sidebar
    $('#lockNow').onclick = lockNow;
    $('#wipeAll').onclick = () => {
      if (S.run.busy) return toast('Stop the running batch first.', 'warn');
      if (!confirm('Remove the loaded student data, generated certificates, saved settings, template, sent-history and passcode from this browser?')) return;
      Object.keys(localStorage).filter((k) => k.startsWith('cf.')).forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
      location.reload();
    };
    ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, resetIdle, { passive: true }));
  }

  async function init() {
    if (!window.jspdf) toast('PDF library missing: check public/vendor files.', 'err');
    bindGlobal(); bindTemplateEditor(); bindMap(); bindPreview(); bindRun(); bindReport();
    updateModePill();
    await initLock();
    resetIdle();
    go('upload');
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.CF);
