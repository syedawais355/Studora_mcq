// Static editorial copy + exam metadata.
// Source of truth for blurbs and exam tagline/seasoning.

export const BLURBS = {
  'general-knowledge':       'World capitals, currencies, landmarks, treaties — the canon of general awareness.',
  'pakistan-affairs':        'History from 1857 to today, constitutions, resolutions, leaders, geography.',
  'islamiat':                'Seerah, Fiqh, Tafseer, the five pillars — questions drawn from standard syllabi.',
  'english-grammar':         'Tenses, prepositions, idioms, analogies and reading comprehension.',
  'mathematics':             'Arithmetic, algebra, geometry, and data interpretation — exam-weighted.',
  'physics':                 'Mechanics, waves, electromagnetism, modern physics — 11th and 12th grade.',
  'chemistry':               'Organic, inorganic, physical — MDCAT-weighted with full explanations.',
  'biology':                 'Cell, genetics, ecology, human physiology — heavy focus on MDCAT syllabus.',
  'computer-science':        'Algorithms, databases, networks — ETEA-weighted for entrance tests.',
  'everyday-science':        'Applied science as it appears on PPSC, NTS, FPSC general papers.',
  'pakistan-current-affairs':'Updated daily. Politics, economy, appointments, treaties and events.',
  'pakistan-studies':        'For F.Sc, BS, MA entrance — distinct from Pak Affairs.',
  'urdu':                    'Shairi, muhawray, grammar, writing — for BPS and journalism papers.',
  'economics':               'Micro, macro, Pakistan economic indicators — current up to fiscal 25-26.',
  'pedagogy':                'Educational psychology, teaching methods and assessment — NTS educator posts.',
};

export const EXAM_META = {
  css:   { next: 'Feb 2027', pass: '3.2%',  level: 'BPS-17',     tagline: 'Federal · civil service' },
  pms:   { next: 'Sep 2026', pass: '4.1%',  level: 'BPS-17',     tagline: 'Provincial · elite cadre' },
  ppsc:  { next: 'Jul 2026', pass: '6.8%',  level: 'BPS-11–17',  tagline: 'Punjab · all posts' },
  fpsc:  { next: 'Aug 2026', pass: '5.2%',  level: 'BPS-14–17',  tagline: 'Federal · specialist' },
  nts:   { next: 'Monthly',  pass: 'n/a',   level: 'Various',    tagline: 'Aptitude · placement' },
  mdcat: { next: 'Sep 2026', pass: '23%',   level: 'Undergrad',  tagline: 'Medical · entrance' },
  ecat:  { next: 'Jul 2026', pass: '38%',   level: 'Undergrad',  tagline: 'Engineering · entrance' },
  etea:  { next: 'Jun 2026', pass: 'n/a',   level: 'Various',    tagline: 'KP · education authority' },
};

// Snapshot for "this week in Pakistan" — date in absolute YYYY-MM-DD form.
export const DAILY_NOTES = [
  { date: '2026-05-08', text: "Pakistan's FX reserves crossed US$ 16 billion for the first time since 2017." },
  { date: '2026-05-07', text: 'Imdad Ullah Bosal appointed as new Federal Finance Secretary.' },
  { date: '2026-05-06', text: 'Islamabad United won the HBL PSL XI final against Karachi Kings.' },
  { date: '2026-05-05', text: 'Senate passed the Constitutional Amendment Bill with two-thirds majority.' },
  { date: '2026-05-04', text: 'Pakistan ranked 112th on the 2026 Global Innovation Index, up 9 places.' },
];

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}
