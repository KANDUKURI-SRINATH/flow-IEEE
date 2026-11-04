/* CertiFlow: certificate template engine (Rules 3, 4, 14) */
(function (CF) {
  'use strict';

  const BASE_W = 1754;           // A4 landscape @150 dpi
  const BASE_H = 1240;
  const imgCache = new Map();

  const SERIF = "Georgia, 'Times New Roman', serif";
  const SANS = "'Segoe UI', Arial, sans-serif";
  const SCRIPT = "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive";
  const PALATINO = "'Palatino Linotype', 'Book Antiqua', Palatino, serif";

  const STYLES = {
    classic: { title: '#7a5a12', accent: '#b8892d', name: '#1d2a4d', text: '#3b3b3b', muted: '#7d7461', titleFont: PALATINO, nameFont: SCRIPT },
    modern: { title: '#1e3a8a', accent: '#0ea5e9', name: '#0f172a', text: '#334155', muted: '#64748b', titleFont: SANS, nameFont: SERIF },
    elegant: { title: '#e6c770', accent: '#d4af37', name: '#fff8e6', text: '#e7efe9', muted: '#a9c4b8', titleFont: SERIF, nameFont: SCRIPT },
    custom: { title: '#1f2937', accent: '#b8892d', name: '#111827', text: '#374151', muted: '#6b7280', titleFont: SERIF, nameFont: SCRIPT },
  };

  function defaultElements(design) {
    const s = STYLES[design] || STYLES.classic;
    const T = (o) => Object.assign({ type: 'text', x: 0.5, align: 'center', font: SERIF, size: 28, color: s.text, bold: false, italic: false, upper: false, fit: false, maxW: 0.8, spacing: 0 }, o);
    return [
      T({ id: 'org', label: 'Organization', text: '{{ORGANIZATION}}', y: 0.115, size: 30, bold: true, upper: true, spacing: 4, font: SANS, color: s.muted }),
      T({ id: 'title', label: 'Title', text: 'Certificate', y: 0.215, size: 104, bold: true, upper: true, spacing: 10, font: s.titleFont, color: s.title }),
      T({ id: 'subtitle', label: 'Certificate type', text: 'of {{CERTIFICATE_TYPE}}', y: 0.29, size: 36, upper: true, spacing: 8, font: s.titleFont, color: s.accent }),
      T({ id: 'presented', label: 'Presented line', text: 'This certificate is proudly presented to', y: 0.385, size: 30, italic: true }),
      T({ id: 'name', label: 'Student name', text: '{{NAME}}', y: 0.485, size: 100, font: s.nameFont, color: s.name, fit: true, maxW: 0.68 }),
      T({ id: 'body', label: 'Achievement text', text: 'for {{ACHIEVEMENT}} in {{EVENT}}, held on {{DATE}}.', y: 0.62, size: 32, maxW: 0.7 }),
      T({ id: 'sid', label: 'Student ID', text: 'Student ID: {{ID}}', y: 0.695, size: 24, font: SANS, color: s.muted }),
      T({ id: 'sig1', label: 'Signature 1', text: 'Event Coordinator', x: 0.22, y: 0.865, size: 24, bold: true, font: SANS, maxW: 0.24 }),
      T({ id: 'sig2', label: 'Signature 2', text: 'Head of Department', x: 0.78, y: 0.865, size: 24, bold: true, font: SANS, maxW: 0.24 }),
      T({ id: 'certno', label: 'Certificate number', text: 'Certificate No: {{CERT_ID}}', y: 0.94, size: 18, font: SANS, color: s.muted }),
    ];
  }

  function defaultTemplate(design = 'classic') {
    return { version: 1, design, bg: null, elements: defaultElements(design) };
  }

  // ---------------- background designs ----------------
  function seal(ctx, cx, cy, r, color, inner, text) {
    ctx.save();
    ctx.beginPath();
    const spikes = 28;
    for (let i = 0; i <= spikes * 2; i++) {
      const a = (Math.PI * i) / spikes;
      const rr = i % 2 ? r * 0.9 : r;
      ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2); ctx.fillStyle = inner; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r * 0.64, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color; ctx.font = `bold ${r * 0.5}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 2);
    ctx.restore();
  }

  function cornerFlourish(ctx, x, y, sx, sy, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 90); ctx.quadraticCurveTo(0, 0, 90, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 70); ctx.quadraticCurveTo(18, 18, 70, 18); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(34, 26); ctx.lineTo(44, 34); ctx.lineTo(34, 44); ctx.lineTo(24, 34); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  const DESIGNS = {
    classic(ctx, W, H) {
      const s = STYLES.classic;
      const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, '#fffdf7'); g.addColorStop(1, '#f6eedb');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = s.accent; ctx.lineWidth = 16; ctx.strokeRect(34, 34, W - 68, H - 68);
      ctx.lineWidth = 3; ctx.strokeRect(62, 62, W - 124, H - 124);
      cornerFlourish(ctx, 80, 80, 1, 1, s.accent);
      cornerFlourish(ctx, W - 80, 80, -1, 1, s.accent);
      cornerFlourish(ctx, 80, H - 80, 1, -1, s.accent);
      cornerFlourish(ctx, W - 80, H - 80, -1, -1, s.accent);
      ctx.strokeStyle = s.accent; ctx.lineWidth = 2;
      line(ctx, W * 0.3, H * 0.545, W * 0.7, H * 0.545);
      line(ctx, W * 0.12, H * 0.835, W * 0.32, H * 0.835);
      line(ctx, W * 0.68, H * 0.835, W * 0.88, H * 0.835);
      seal(ctx, W * 0.5, H * 0.835, 88, s.accent, '#fff8e7', '★');
    },
    modern(ctx, W, H) {
      const s = STYLES.modern;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = s.title;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.32, 0); ctx.lineTo(0, H * 0.42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.accent;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.2, 0); ctx.lineTo(0, H * 0.26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.title;
      ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W * 0.8, H); ctx.lineTo(W, H * 0.68); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.accent;
      ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W * 0.88, H); ctx.lineTo(W, H * 0.8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 4; ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.strokeStyle = s.accent; ctx.lineWidth = 4;
      line(ctx, W * 0.42, H * 0.545, W * 0.58, H * 0.545);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
      line(ctx, W * 0.12, H * 0.835, W * 0.32, H * 0.835);
      line(ctx, W * 0.68, H * 0.835, W * 0.88, H * 0.835);
      seal(ctx, W * 0.5, H * 0.835, 80, s.accent, '#f0f9ff', '✓');
    },
    elegant(ctx, W, H) {
      const s = STYLES.elegant;
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0f3d33'); g.addColorStop(1, '#0a2a23');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = s.accent; ctx.lineWidth = 6; ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.lineWidth = 2; ctx.strokeRect(58, 58, W - 116, H - 116);
      ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = s.accent; ctx.lineWidth = 2;
      for (let r = 120; r < 900; r += 60) { ctx.beginPath(); ctx.arc(W / 2, H * 0.5, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      cornerFlourish(ctx, 76, 76, 1, 1, s.accent);
      cornerFlourish(ctx, W - 76, 76, -1, 1, s.accent);
      cornerFlourish(ctx, 76, H - 76, 1, -1, s.accent);
      cornerFlourish(ctx, W - 76, H - 76, -1, -1, s.accent);
      ctx.strokeStyle = s.accent; ctx.lineWidth = 2;
      line(ctx, W * 0.3, H * 0.545, W * 0.7, H * 0.545);
      line(ctx, W * 0.12, H * 0.835, W * 0.32, H * 0.835);
      line(ctx, W * 0.68, H * 0.835, W * 0.88, H * 0.835);
      seal(ctx, W * 0.5, H * 0.835, 88, s.accent, '#0f3d33', '❖');
    },
  };
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  // ---------------- images ----------------
  async function prepare(tpl) {
    const srcs = [];
    if (tpl.bg) srcs.push(tpl.bg);
    for (const el of tpl.elements) if (el.type === 'image' && el.src) srcs.push(el.src);
    await Promise.all(srcs.map(async (src) => { if (!imgCache.has(src)) imgCache.set(src, await CF.loadImage(src)); }));
  }

  function canvasSize(tpl) {
    if (tpl.design === 'custom' && tpl.bg && imgCache.has(tpl.bg)) {
      const img = imgCache.get(tpl.bg);
      return { W: BASE_W, H: Math.round(BASE_W * img.naturalHeight / img.naturalWidth) };
    }
    return { W: BASE_W, H: BASE_H };
  }

  // ---------------- text ----------------
  function fontString(el, size) {
    return `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${Math.round(size)}px ${el.font}`;
  }

  function wrapLines(ctx, text, maxWidth) {
    const out = [];
    for (const para of String(text).split(/\n/)) {
      const words = para.split(/\s+/).filter(Boolean);
      let lineTxt = '';
      for (const w of words) {
        const test = lineTxt ? lineTxt + ' ' + w : w;
        if (ctx.measureText(test).width > maxWidth && lineTxt) { out.push(lineTxt); lineTxt = w; }
        else lineTxt = test;
      }
      out.push(lineTxt);
    }
    return out;
  }

  /**
   * Render a certificate.
   * lookup(KEY) → value for a placeholder (or undefined to leave {{KEY}} visible)
   * returns hit boxes for the editor.
   */
  function render(canvas, tpl, lookup, opts = {}) {
    const { W, H } = canvasSize(tpl);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    if (tpl.design === 'custom') {
      if (tpl.bg && imgCache.has(tpl.bg)) ctx.drawImage(imgCache.get(tpl.bg), 0, 0, W, H);
      else {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#9ca3af'; ctx.font = `28px ${SANS}`; ctx.textAlign = 'center';
        ctx.fillText('Upload a template image (PNG/JPG) to use as the background', W / 2, H / 2);
      }
    } else (DESIGNS[tpl.design] || DESIGNS.classic)(ctx, W, H);

    const boxes = [];
    for (const el of tpl.elements) {
      if (el.type === 'image') {
        const img = el.src && imgCache.get(el.src);
        if (!img) continue;
        const w = el.maxW * W, h = w * img.naturalHeight / img.naturalWidth;
        const x0 = el.x * W - w / 2, y0 = el.y * H - h / 2;
        ctx.drawImage(img, x0, y0, w, h);
        boxes.push({ id: el.id, x0, y0, x1: x0 + w, y1: y0 + h });
        continue;
      }
      let text = CF.fillPlaceholders(el.text, lookup);
      if (el.upper) text = text.toUpperCase();
      const maxWidth = el.maxW * W;
      let size = el.size;
      ctx.font = fontString(el, size);
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${el.spacing || 0}px`;
      let lines;
      if (el.fit) {
        while (ctx.measureText(text).width > maxWidth && size > el.size * 0.4) { size -= 2; ctx.font = fontString(el, size); }
        lines = ctx.measureText(text).width > maxWidth ? wrapLines(ctx, text, maxWidth) : [text];
      } else lines = wrapLines(ctx, text, maxWidth);

      const lh = size * 1.25;
      const x = el.x * W;
      const yTop = el.y * H - ((lines.length - 1) * lh) / 2;
      ctx.fillStyle = el.color;
      ctx.textAlign = el.align;
      ctx.textBaseline = 'middle';
      let maxLineW = 0;
      lines.forEach((ln, i) => { ctx.fillText(ln, x, yTop + i * lh); maxLineW = Math.max(maxLineW, ctx.measureText(ln).width); });
      const bw = Math.max(maxLineW, 40);
      const x0 = el.align === 'center' ? x - bw / 2 : el.align === 'right' ? x - bw : x;
      boxes.push({ id: el.id, x0: x0 - 8, y0: yTop - lh / 2 - 4, x1: x0 + bw + 8, y1: yTop + (lines.length - 0.5) * lh + 4 });
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    if (opts.selectedId) {
      const b = boxes.find((bx) => bx.id === opts.selectedId);
      if (b) {
        ctx.setLineDash([10, 6]); ctx.lineWidth = 3; ctx.strokeStyle = '#4f46e5';
        ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.setLineDash([]);
      }
    }
    if (opts.centerGuide) {
      ctx.strokeStyle = 'rgba(236,72,153,.8)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
      line(ctx, W / 2, 0, W / 2, H); ctx.setLineDash([]);
    }
    ctx.restore();
    return boxes;
  }

  /** Render to a PDF Blob. meta: { title, certId, recordKey, author } */
  function toPDF(canvas, meta = {}) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error('PDF library failed to load');
    const W = canvas.width, H = canvas.height;
    const landscape = W >= H;
    const pw = landscape ? 841.89 : 595.28;
    const ph = pw * H / W;
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: [pw, ph], compress: true });
    doc.setProperties({
      title: meta.title || 'Certificate',
      subject: `Certificate ${meta.certId || ''}`.trim(),
      author: meta.author || 'CertiFlow',
      keywords: `${meta.certId || ''} ${meta.recordKey || ''}`.trim(),
      creator: 'CertiFlow Certificate Automation',
    });
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
    return doc.output('blob');
  }

  CF.tpl = { BASE_W, BASE_H, STYLES, defaultTemplate, defaultElements, prepare, render, toPDF, imgCache };
})(window.CF);
