// PDF typesetter for category MCQ exports.
// Direct port of the Python TypesettingEngine: two-column A4, measure → manifest → render,
// auto-shrink 8.5 → 7pt to fit a single column, 10-item look-ahead packing,
// green fill behind the correct option. DejaVu Sans embedded with full Unicode coverage.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All page geometry kept in millimetres (matches the Python original) and converted at draw time.
const MM_PER_PT     = 0.3527777778;
const PT_PER_MM     = 1 / MM_PER_PT;

const PAGE_W_MM     = 210;
const PAGE_H_MM     = 297;
const L_MARGIN      = 10;
const R_MARGIN      = 10;
const TOP_MARGIN    = 14;
const BOT_MARGIN    = 8;
const COL_GAP       = 5;
const COL_W         = (PAGE_W_MM - L_MARGIN - R_MARGIN - COL_GAP) / 2;
const AVAIL_H       = PAGE_H_MM - TOP_MARGIN - BOT_MARGIN;
const GRID_STEP     = 1;
const LINE_HEIGHT   = 1.25;
const LOOK_AHEAD    = 10;

const COLOR_INK     = rgb(15 / 255, 25 / 255, 40 / 255);
const COLOR_DEFAULT = rgb(55 / 255, 70 / 255, 85 / 255);
const COLOR_CORRECT = rgb(10 / 255, 100 / 255, 40 / 255);
const COLOR_FILL    = rgb(193 / 255, 240 / 255, 208 / 255);
const COLOR_HEADER  = rgb(15 / 255, 20 / 255, 30 / 255);
const COLOR_META    = rgb(90 / 255, 105 / 255, 120 / 255);
const COLOR_RULE    = rgb(185 / 255, 195 / 255, 210 / 255);
const COLOR_RULE_LT = rgb(220 / 255, 230 / 255, 240 / 255);
const COLOR_SECTION_RULE = rgb(60 / 255, 65 / 255, 80 / 255);

let _fontCache = null;
function loadFonts() {
  if (_fontCache) return _fontCache;
  _fontCache = {
    regular: fs.readFileSync(path.join(__dirname, 'fonts', 'DejaVuSans.ttf')),
    bold:    fs.readFileSync(path.join(__dirname, 'fonts', 'DejaVuSans-Bold.ttf')),
  };
  return _fontCache;
}

// Strip a leading "A. " / "B) " / "c:" / "d -" prefix so options render without doubled labels.
function stripPrefix(text) {
  return String(text || '').trim().replace(/^[A-Da-d][.\)\:\-]\s*/, '');
}

function detectCorrect(rawAnswer, options) {
  const ans = String(rawAnswer || '').trim().toUpperCase();
  if (!ans) return '';
  for (const letter of 'ABCD') {
    if (ans === letter || ans.includes(`OPTION ${letter}`)) return letter;
  }
  const m = ans.match(/^([A-D])[\s.\)\:\-]/);
  if (m) return m[1];
  for (const opt of options) {
    if (opt.text.toUpperCase() === ans) return opt.letter;
  }
  return '';
}

// A row may come from either /api/questions (correct_key, text) or a raw Supabase RPC
// (correct_ans, question). Normalise into a single shape the engine can consume.
function buildItem(row, idx) {
  const questionText = row.question ?? row.text ?? '';
  const rawOpts = [
    { letter: 'A', text: stripPrefix(row.option_a) },
    { letter: 'B', text: stripPrefix(row.option_b) },
    { letter: 'C', text: stripPrefix(row.option_c) },
    { letter: 'D', text: stripPrefix(row.option_d) },
  ].filter(o => o.text);
  const correctSource = row.correct_ans ?? row.correct_key ?? '';
  const correct = detectCorrect(correctSource, rawOpts);
  return { index: idx + 1, question: questionText, options: rawOpts, correct };
}

// Per-font character-width cache. pdf-lib's widthOfTextAtSize re-decodes the glyph run on
// each call; for our greedy wrap we measure tens of thousands of substrings, so we instead
// memoise width-at-1pt per code point and multiply. Ignores kerning, but for wrap decisions
// the rounding error is well within the column-width safety margin.
function makeMeasurer(font) {
  const cache = new Map();
  const widthAtUnit = (ch) => {
    let w = cache.get(ch);
    if (w === undefined) {
      w = font.widthOfTextAtSize(ch, 1);
      cache.set(ch, w);
    }
    return w;
  };
  return (text, sizePt) => {
    let total = 0;
    for (const ch of text) total += widthAtUnit(ch);
    return total * sizePt;
  };
}

const _measurers = new WeakMap();
function measurerFor(font) {
  let m = _measurers.get(font);
  if (!m) { m = makeMeasurer(font); _measurers.set(font, m); }
  return m;
}

// Greedy word-wrap that mirrors fpdf's multi_cell within `widthMm`. Compares in points
// throughout, only converting the column width once.
function wrapText(text, font, sizePt, widthMm) {
  const widthPt = widthMm * PT_PER_MM;
  const measure = measurerFor(font);
  const src = String(text || '');
  // Fast-path: most options (and many questions) fit on one line — skip the
  // word loop entirely. Drops generation time noticeably on large books.
  if (!src.includes('\n') && measure(src, sizePt) <= widthPt) return [src];
  const lines = [];
  const paragraphs = src.split(/\r?\n/);
  for (const para of paragraphs) {
    if (!para.length) { lines.push(''); continue; }
    const words = para.split(/(\s+)/); // keep whitespace tokens for accurate widths
    let current = '';
    for (const word of words) {
      const candidate = current + word;
      const w = measure(candidate, sizePt);
      if (w <= widthPt || current.length === 0) {
        current = candidate;
      } else {
        lines.push(current.replace(/\s+$/, ''));
        current = word.replace(/^\s+/, '');
      }
    }
    if (current.length) lines.push(current.replace(/\s+$/, ''));
  }
  // hard-break absurdly long unbreakable tokens so they don't overflow the column
  const safe = [];
  for (const line of lines) {
    if (measure(line, sizePt) <= widthPt) { safe.push(line); continue; }
    let buf = '';
    for (const ch of line) {
      const test = buf + ch;
      if (measure(test, sizePt) <= widthPt) buf = test;
      else { safe.push(buf); buf = ch; }
    }
    if (buf.length) safe.push(buf);
  }
  return safe;
}

function blockHeightMm(font, sizePt, lines) {
  const lineHeightMm = sizePt * MM_PER_PT * LINE_HEIGHT;
  return lines.length * lineHeightMm;
}

// Generate a single PDF. Accepts EITHER `rows` (one continuous list, single
// header label) OR `sections: [{ title, rows }]` (multiple subjects with inline
// dividers between them — used for the exam "complete book" download).
export async function generateCategoryPdf({ categoryLabel, rows, sections }) {
  const { regular, bold } = loadFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${categoryLabel} — MCQ Practice`);
  doc.setProducer('Studora');
  doc.setCreator('Studora MCQ Bank');

  const fontRegular = await doc.embedFont(regular, { subset: true });
  const fontBold    = await doc.embedFont(bold,    { subset: true });

  // Build flat item list. In sections mode, prepend each section's rows with
  // a 'section' marker — the layout engine treats it like any other item but
  // renders a dividing rule + subject title instead of an MCQ.
  const items = [];
  let nextId = 1;
  if (sections && sections.length) {
    for (const sec of sections) {
      if (!sec.rows?.length) continue;
      items.push({ kind: 'section', index: nextId++, title: sec.title || 'Subject', count: sec.rows.length });
      let local = 0;
      for (const row of sec.rows) {
        const item = buildItem(row, local++);
        item.kind = 'mcq';
        item.index = nextId++; // unique manifest id; display number resets per section below
        item.displayIdx = local;
        items.push(item);
      }
    }
  } else {
    for (let i = 0; i < (rows || []).length; i++) {
      const item = buildItem(rows[i], i);
      item.kind = 'mcq';
      item.index = nextId++;
      item.displayIdx = i + 1;
      items.push(item);
    }
  }

  const totalMcqs = items.filter(it => it.kind === 'mcq').length;

  // Section-header sizing — fixed small footprint so it barely costs space.
  const SECTION_TITLE_SIZE = 10;
  const SECTION_SUB_SIZE   = 7.5;
  const SECTION_TOTAL_H    = 9.5;  // mm

  // Step 1: figure out font size + wrapping per item so total height fits one column.
  const metricsCache = new Map();
  function metricsFor(item) {
    if (metricsCache.has(item.index)) return metricsCache.get(item.index);
    if (item.kind === 'section') {
      const m = { kind: 'section', totalH: SECTION_TOTAL_H };
      metricsCache.set(item.index, m);
      return m;
    }
    let f = 8.5;
    let qLines, rowHeights, totalH, optLines;
    while (true) {
      qLines = wrapText(`${item.displayIdx}. ${item.question}`, fontBold, f, COL_W);
      const hQ = blockHeightMm(fontBold, f, qLines);

      const optW = (COL_W - 2.0) / 2;
      const optSize = f - 0.5;
      rowHeights = [];
      optLines = [];
      for (let i = 0; i < item.options.length; i += 2) {
        const left = item.options[i];
        const right = item.options[i + 1];
        const leftFont = left.letter === item.correct ? fontBold : fontRegular;
        const rightFont = right && right.letter === item.correct ? fontBold : fontRegular;
        const ll = wrapText(`${left.letter}. ${left.text}`, leftFont, optSize, optW);
        const rl = right ? wrapText(`${right.letter}. ${right.text}`, rightFont, optSize, optW) : [];
        optLines.push({ left: ll, right: rl });
        const hL = blockHeightMm(leftFont, optSize, ll);
        const hR = right ? blockHeightMm(rightFont, optSize, rl) : 0;
        const minRow = optSize * MM_PER_PT * LINE_HEIGHT;
        rowHeights.push(Math.max(hL, hR, minRow));
      }
      totalH = hQ + 1.2 + rowHeights.reduce((s, h) => s + h, 0) + rowHeights.length * 0.4 + 2.5;
      if (totalH <= AVAIL_H || f <= 7.0) break;
      f -= 0.5;
    }
    const m = {
      kind: 'mcq',
      fSize: f,
      hQ: blockHeightMm(fontBold, f, qLines),
      qLines,
      rowHeights,
      optLines,
      totalH,
      optW: (COL_W - 2.0) / 2,
    };
    metricsCache.set(item.index, m);
    return m;
  }

  // Step 2: emit a manifest of draw instructions, paginated and column-packed.
  /** @type {Map<number, Array<object>>} */
  const pages = new Map();
  const addInstr = (page, instr) => {
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page).push(instr);
  };

  function place(item, m, page, col, y) {
    y = Math.ceil(y / GRID_STEP) * GRID_STEP;
    const cx = L_MARGIN + col * (COL_W + COL_GAP);

    if (item.kind === 'section') {
      // Top rule + subject label — compact "chapter break" inside a column.
      addInstr(page, {
        kind: 'rect', x: cx, y: y + 0.2, w: COL_W, h: 0.3, color: COLOR_SECTION_RULE,
      });
      addInstr(page, {
        kind: 'text', x: cx, y: y + 1.5,
        lines: [item.title], font: fontBold,
        size: SECTION_TITLE_SIZE, color: COLOR_INK,
        lineHeight: SECTION_TITLE_SIZE * MM_PER_PT * LINE_HEIGHT,
      });
      addInstr(page, {
        kind: 'text', x: cx, y: y + 5.5,
        lines: [`Subject · ${item.count.toLocaleString()} MCQs`],
        font: fontRegular, size: SECTION_SUB_SIZE, color: COLOR_META,
        lineHeight: SECTION_SUB_SIZE * MM_PER_PT * LINE_HEIGHT,
      });
      return y + m.totalH;
    }

    addInstr(page, {
      kind: 'text', x: cx, y, lines: m.qLines, font: fontBold,
      size: m.fSize, color: COLOR_INK, lineHeight: m.fSize * MM_PER_PT * LINE_HEIGHT,
    });
    let yCursor = y + m.hQ + 1.2;

    for (let i = 0; i < item.options.length; i += 2) {
      const rh = m.rowHeights[i / 2];
      const wrap = m.optLines[i / 2];
      for (const side of [0, 1]) {
        const optIdx = i + side;
        if (optIdx >= item.options.length) continue;
        const opt = item.options[optIdx];
        const ox = cx + side * (m.optW + 2.0);
        const isCorrect = opt.letter === item.correct;
        const optSize = m.fSize - 0.5;
        const lines = side === 0 ? wrap.left : wrap.right;

        if (isCorrect) {
          addInstr(page, { kind: 'rect', x: ox, y: yCursor, w: m.optW, h: rh, color: COLOR_FILL });
        }
        addInstr(page, {
          kind: 'text', x: ox, y: yCursor, lines,
          font: isCorrect ? fontBold : fontRegular,
          size: optSize,
          color: isCorrect ? COLOR_CORRECT : COLOR_DEFAULT,
          lineHeight: optSize * MM_PER_PT * LINE_HEIGHT,
        });
      }
      yCursor += rh + 0.4;
    }
    return yCursor + 2.2;
  }

  // Greedy column-fill with look-ahead packing. Section headers are sticky to
  // their first MCQ — if a header would orphan at the bottom of a column, defer
  // it so it lands at the top of the next column with its content.
  let y = TOP_MARGIN;
  let col = 0;
  let page = 1;
  const placed = new Set();
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (placed.has(item.index)) { i++; continue; }
    const m = metricsFor(item);
    const bottom = PAGE_H_MM - BOT_MARGIN;

    // Sticky rule: a section header needs room for itself + the next MCQ.
    let neededH = m.totalH;
    if (item.kind === 'section') {
      const next = items[i + 1];
      if (next && next.kind === 'mcq' && !placed.has(next.index)) {
        neededH += metricsFor(next).totalH + 1;
      }
    }

    if (y + neededH <= bottom) {
      y = place(item, m, page, col, y);
      placed.add(item.index);
      i++;
    } else {
      // Try look-ahead packing — but only with MCQs, never pull a section header out of order.
      for (let j = i + 1; j < Math.min(i + 1 + LOOK_AHEAD, items.length); j++) {
        const cand = items[j];
        if (placed.has(cand.index)) continue;
        if (cand.kind === 'section') break; // don't reorder across sections
        const cm = metricsFor(cand);
        if (y + cm.totalH <= bottom) {
          y = place(cand, cm, page, col, y);
          placed.add(cand.index);
        }
      }
      if (col === 0) { col = 1; y = TOP_MARGIN; }
      else { page++; col = 0; y = TOP_MARGIN; }
    }
  }

  // Step 3: paint. PDF coordinates have origin at bottom-left so we flip Y per draw.
  const sortedPages = [...pages.keys()].sort((a, b) => a - b);
  for (const pageNo of sortedPages) {
    const pg = doc.addPage([PAGE_W_MM * PT_PER_MM, PAGE_H_MM * PT_PER_MM]);
    const pageHeightPt = pg.getHeight();

    // Header
    pg.drawText(`${categoryLabel} - MCQ Practice`, {
      x: 10 * PT_PER_MM,
      y: pageHeightPt - 9 * PT_PER_MM,
      size: 11, font: fontBold, color: COLOR_HEADER,
    });
    const headerRight = `Page ${pageNo} | Total: ${totalMcqs}`;
    const headerRightWidth = measurerFor(fontRegular)(headerRight, 7.5);
    pg.drawText(headerRight, {
      x: (PAGE_W_MM - R_MARGIN) * PT_PER_MM - headerRightWidth,
      y: pageHeightPt - 9 * PT_PER_MM,
      size: 7.5, font: fontRegular, color: COLOR_META,
    });
    pg.drawLine({
      start: { x: 10 * PT_PER_MM, y: pageHeightPt - 11 * PT_PER_MM },
      end:   { x: 200 * PT_PER_MM, y: pageHeightPt - 11 * PT_PER_MM },
      thickness: 0.3, color: COLOR_RULE,
    });

    for (const instr of pages.get(pageNo)) {
      if (instr.kind === 'rect') {
        pg.drawRectangle({
          x: instr.x * PT_PER_MM,
          y: pageHeightPt - (instr.y + instr.h) * PT_PER_MM,
          width: instr.w * PT_PER_MM,
          height: instr.h * PT_PER_MM,
          color: instr.color,
        });
      } else {
        const { x, y, lines, font, size, color, lineHeight } = instr;
        for (let k = 0; k < lines.length; k++) {
          const lineY = y + (k + 1) * lineHeight - lineHeight * 0.25;
          pg.drawText(lines[k], {
            x: x * PT_PER_MM,
            y: pageHeightPt - lineY * PT_PER_MM,
            size, font, color,
          });
        }
      }
    }

    // Column divider
    const midX = (L_MARGIN + COL_W + COL_GAP / 2) * PT_PER_MM;
    pg.drawLine({
      start: { x: midX, y: pageHeightPt - TOP_MARGIN * PT_PER_MM },
      end:   { x: midX, y: BOT_MARGIN * PT_PER_MM },
      thickness: 0.1, color: COLOR_RULE_LT,
    });
  }

  return doc.save();
}
