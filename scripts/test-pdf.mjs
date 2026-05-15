// Local smoke test for the PDF engine. Generates a sample PDF without hitting Supabase.
// Usage: node scripts/test-pdf.mjs   →   writes scripts/sample.pdf
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCategoryPdf } from '../lib/pdf-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = Array.from({ length: 60 }, (_, i) => ({
  question: `Sample question ${i + 1}: which of the following statements correctly describes the underlying concept being assessed in this MCQ?`,
  option_a: `First option for question ${i + 1}`,
  option_b: `Second option that is somewhat longer than the others to force wrapping inside the column`,
  option_c: `Third candidate answer ${i + 1}`,
  option_d: `Fourth one`,
  correct_ans: 'ABCD'[i % 4],
}));
// Sprinkle a Unicode case to confirm DejaVu coverage.
rows.push({
  question: 'Urdu/Unicode check — پاکستان کا قومی پھل کیا ہے؟',
  option_a: 'سیب',
  option_b: 'آم',
  option_c: 'کیلا',
  option_d: 'انگور',
  correct_ans: 'B',
});

const bytes = await generateCategoryPdf({
  categoryLabel: 'General Knowledge',
  rows,
});
const out = path.join(__dirname, 'sample.pdf');
fs.writeFileSync(out, bytes);
console.log(`wrote ${out} (${bytes.byteLength} bytes, ${rows.length} questions)`);
