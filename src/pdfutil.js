import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function sha(buf) {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Returns { buf, pages, hash } or { error: 'notpdf' | 'encrypted' | 'damaged' }
export async function inspect(file) {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return { error: 'notpdf' };
  const buf = await file.arrayBuffer();
  const head = new TextDecoder('latin1').decode(new Uint8Array(buf.slice(0, 1024)));
  if (!head.includes('%PDF-')) return { error: 'damaged' };
  try {
    const d = await PDFDocument.load(buf);
    return { buf, pages: d.getPageCount(), hash: await sha(buf) };
  } catch (e) {
    return { error: /encrypt/i.test(String(e)) ? 'encrypted' : 'damaged' };
  }
}

const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
const fit = (s, f, size, w) => {
  s = clean(s);
  if (f.widthOfTextAtSize(s, size) <= w) return s;
  while (s.length > 1 && f.widthOfTextAtSize(s + '...', size) > w) s = s.slice(0, -1);
  return s + '...';
};

export async function buildPackage(tender, items, withIndex) {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const FOOT = 34, W = 595.28, H = 841.89;
  const navy = rgb(0.04, 0.33, 0.55), ink = rgb(0.1, 0.15, 0.2);
  const lead = withIndex ? 2 : 1;
  let next = lead + 1;
  const rows = items.map((it) => { const r = { ...it, start: next }; next += it.file.pages; return r; });
  const total = next - 1;
  const text = (p, s, x, y, size = 11, f = font, color = ink) =>
    p.drawText(clean(s), { x, y, size, font: f, color });
  const banner = (p, title) => {
    p.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: navy });
    text(p, title, 50, H - 68, 26, bold, rgb(1, 1, 1));
  };

  // Cover
  let p = out.addPage([W, H]);
  banner(p, 'Tender Document Package');
  const info = [
    ['Tender ID', tender.tender_id], ['Tender title', tender.title],
    ['Procuring entity', tender.procuring_entity], ['Bidder', tender.bidder],
    ['Submission deadline', tender.submission_deadline],
    ['Package made on', (() => { const d = new Date(), z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; })()],
  ];
  let y = H - 160;
  info.forEach(([k, v]) => {
    text(p, k, 50, y, 11, bold, navy);
    text(p, fit(v, font, 12, W - 240), 190, y, 12);
    y -= 24;
  });
  y -= 14;
  text(p, 'Included documents (in order)', 50, y, 14, bold, navy);
  y -= 8; p.drawLine({ start: { x: 50, y }, end: { x: W - 50, y }, thickness: 1, color: navy });
  y -= 22;
  const gap = Math.max(11, Math.min(20, (y - 40) / Math.max(rows.length, 1)));
  rows.forEach((r, i) => {
    text(p, `${i + 1}.`, 56, y, 11, bold);
    text(p, fit(r.title, font, 11, W - 180), 82, y, 11);
    y -= gap;
  });

  // Index
  if (withIndex) {
    p = out.addPage([W, H]);
    banner(p, 'Index');
    y = H - 150;
    text(p, 'No.', 56, y, 11, bold, navy); text(p, 'Document', 100, y, 11, bold, navy);
    text(p, 'Pages', 400, y, 11, bold, navy); text(p, 'Starts on page', 460, y, 11, bold, navy);
    y -= 8; p.drawLine({ start: { x: 50, y }, end: { x: W - 50, y }, thickness: 1, color: navy });
    y -= 22;
    const gap2 = Math.max(11, Math.min(22, (y - 40) / Math.max(rows.length, 1)));
    rows.forEach((r, i) => {
      text(p, String(i + 1), 56, y); text(p, fit(r.title, font, 11, 280), 100, y);
      text(p, String(r.file.pages), 410, y); text(p, String(r.start), 490, y);
      y -= gap2;
    });
  }

  // Documents: each source page is placed above a footer strip so nothing is covered
  for (const r of rows) {
    const src = await PDFDocument.load(r.file.buf);
    const emb = await out.embedPdf(src, src.getPageIndices());
    emb.forEach((e) => {
      const pg = out.addPage([e.width, e.height + FOOT]);
      pg.drawPage(e, { x: 0, y: FOOT });
    });
  }

  // Footers
  const label = (i) => `${tender.tender_id} | Page ${i + 1} of ${total}`;
  out.getPages().forEach((pg, i) => {
    const { width } = pg.getSize();
    const s = clean(label(i));
    pg.drawText(s, { x: (width - font.widthOfTextAtSize(s, 10)) / 2, y: 12, size: 10, font, color: ink });
  });
  return out.save();
}