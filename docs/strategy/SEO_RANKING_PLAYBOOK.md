# Studora SEO Ranking Playbook

A practical, single-operator plan to take Studora (https://studora.vercel.app) from "freshly indexed, ranking nowhere" to consistent top-10 visibility on Google Pakistan for high-intent MCQ-prep queries. Written for a vanilla HTML/CSS/JS SPA with Edge middleware-powered per-route meta tags already shipping, a 104-URL sitemap, and JSON-LD Organization + WebSite schemas in place.

The brand voice is calm and notebook-like. Nothing in this playbook recommends clickbait, scraped past papers, fake "leaked" content, link schemes, or blackhat tactics. Every recommendation is doable by one operator over weeks.

---

## Table of Contents

1. [Long-tail keyword map for the 8 exam tracks](#1-long-tail-keyword-map)
2. [Content gap analysis vs the top 5 competitors](#2-content-gap-analysis)
3. [On-page SEO recommendations per page type](#3-on-page-seo-recommendations-per-page-type)
4. [Internal linking strategy: hub-and-spoke architecture](#4-internal-linking-strategy)
5. [Backlink acquisition plan: 20 sustainable tactics](#5-backlink-acquisition-plan)
6. [Pakistan-specific SEO factors](#6-pakistan-specific-seo-factors)
7. [30-60-90 day execution plan](#7-30-60-90-day-execution-plan)
8. [Cannibalization control](#8-cannibalization-control)
9. [Measurement and tooling](#9-measurement-and-tooling)

---

## 1. Long-tail keyword map

### Method notes

Difficulty (KD) is a 1–5 estimate based on Pakistani SERP competitiveness, the strength of incumbent pages, and the maturity of competitor domains (5 = pillar competitors only, 1 = easy long-tail). Intent is mapped to one of four types so each row points at the right page format:

- **Info** = informational (guides, breakdowns)
- **Nav** = navigational (people typing "studora", competitor names, "name + keyword")
- **Trans** = transactional (practice quiz, mock test, take test)
- **Comp** = comparison / commercial-investigation

The lists below are conservative: every query has been observed in SERP autocomplete, "People also ask", or in indexed competitor URL slugs during research. The exact monthly volumes vary by season (peak around exam dates), so prioritise by intent first, volume estimate second.

### 1.1 CSS (Central Superior Services)

| # | Query | Intent | Est. KD | Notes / SERP feature |
|---|-------|--------|---------|----------------------|
| 1 | css mcqs | Trans | 5 | cssmcqs.com owns this exact-match domain. Target with cluster, not head term. |
| 2 | css mpt past papers | Trans | 4 | Featured snippet opportunity (table of papers by year). |
| 3 | css mpt 2026 syllabus | Info | 3 | Hot in Q3–Q4 2026. Build a clean syllabus page early. |
| 4 | css preliminary test mcqs | Trans | 3 | Synonym of MPT; capture both. |
| 5 | css current affairs mcqs 2026 | Trans | 3 | Refresh monthly; date-stamped pages. |
| 6 | css pakistan affairs mcqs | Trans | 4 | Massive cluster on cssmcqs. Beat with structure + speed. |
| 7 | css islamic studies mcqs | Trans | 3 | Compulsory subject, persistent demand. |
| 8 | css general science and ability mcqs | Trans | 3 | "GSA" abbreviation also worth a satellite page. |
| 9 | css english essay past paper | Info | 3 | PAA-rich: "how to write css essay". |
| 10 | css precis and composition mcqs | Trans | 2 | Underserved; clean satellite page can win. |
| 11 | css compulsory subjects list | Info | 2 | Quick win: structured table, FAQ schema. |
| 12 | css optional subjects scoring | Comp | 2 | Long evergreen guide; pulls outbound links. |
| 13 | how to prepare for css in 6 months | Info | 3 | Calm, evidence-based guide. |
| 14 | fpsc css mpt date 2026 | Info | 2 | Refresh as date announced; news-style page. |
| 15 | css mpt sample paper | Trans | 2 | Direct quiz entry point. |
| 16 | css mcqs with answers pdf | Info | 4 | Offer HTML version + on-page PDF only if licence-clean. |
| 17 | css past papers solved | Trans | 4 | Pillar page anchoring the cluster. |
| 18 | css aspirants whatsapp group | Nav | 1 | Light-touch resource page; community signal. |
| 19 | css vs pms difference | Comp | 2 | Comparison page; ties two clusters together. |
| 20 | css mpt subjects weightage | Info | 2 | Table-based page, snippet-friendly. |
| 21 | css english precis solved | Trans | 3 | Long-tail; rare in MCQ format, niche win. |
| 22 | css daily mcq practice | Trans | 2 | Hooks the quiz-of-the-day product. |

### 1.2 PMS (Provincial Management Service – Punjab)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | pms past papers | Trans | 4 | PPSC owns gov; testpointpk strong; beat on UX. |
| 2 | pms punjab syllabus 2026 | Info | 3 | Refresh annually. |
| 3 | pms general knowledge mcqs | Trans | 3 | Compulsory section, perennial query. |
| 4 | pms pakistan studies mcqs | Trans | 3 | Cluster overlap with NTS/FPSC. |
| 5 | pms urdu essay past paper | Info | 2 | Underserved; can win in months. |
| 6 | pms english essay mcqs | Trans | 3 | Bridge to CSS audience. |
| 7 | pms islamic studies mcqs | Trans | 2 | Easy win with FAQ schema. |
| 8 | pms compulsory subjects mcqs | Trans | 2 | Pillar candidate. |
| 9 | pms optional subjects list | Info | 2 | Reference page with table. |
| 10 | ppsc pms test pattern | Info | 3 | High-intent navigational/info hybrid. |
| 11 | pms 2025 result | Nav | 4 | News page; refresh, do not chase short-term spike. |
| 12 | pms preparation in 3 months | Info | 2 | Calm step-by-step guide; matches brand voice. |
| 13 | pms vs css which is easier | Comp | 2 | Comparison piece that earns links. |
| 14 | pms general science mcqs | Trans | 3 | Reuse science satellite. |
| 15 | pms past papers solved pdf | Trans | 4 | HTML-first answer page. |
| 16 | pms current affairs mcqs 2026 | Trans | 3 | Monthly refresh. |
| 17 | pms eligibility criteria | Info | 2 | FAQ snippet candidate. |
| 18 | pms exam date 2026 | Info | 2 | Date-stamped news block; update as PPSC announces. |
| 19 | pms tehsildar past papers | Trans | 2 | Specific job vacancy queries. |
| 20 | pms mcqs with explanation | Trans | 3 | Reinforce Studora's "explanation per question" angle. |

### 1.3 MDCAT (Medical & Dental College Admission Test)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | mdcat mcqs | Trans | 5 | mcq360, premed, mdcatprep all strong. Cluster play only. |
| 2 | mdcat 2026 syllabus | Info | 4 | Refresh in line with PMDC announcement. |
| 3 | mdcat biology mcqs chapter wise | Trans | 4 | Build per-chapter satellite pages. |
| 4 | mdcat chemistry mcqs | Trans | 4 | Same template per subject. |
| 5 | mdcat physics mcqs | Trans | 4 | Same template per subject. |
| 6 | mdcat english mcqs | Trans | 3 | Lower competition, ideal first MDCAT win. |
| 7 | mdcat logical reasoning mcqs | Trans | 3 | Genuinely under-supplied in current SERP. |
| 8 | mdcat past papers solved | Trans | 4 | Pillar page. |
| 9 | mdcat aggregate calculator | Trans | 4 | Tool page; magnet for backlinks. Build a JS calculator. |
| 10 | mdcat merit calculator 2026 | Trans | 4 | Same calculator, alt H1. Treat one page as canonical. |
| 11 | mdcat preparation in 1 month | Info | 3 | Calm planning guide. |
| 12 | mdcat date 2026 | Info | 3 | News-style with last-updated date. |
| 13 | mdcat biology genetics mcqs | Trans | 2 | Highest-frequency topic per PMDC weightage. |
| 14 | mdcat cell biology mcqs | Trans | 2 | Same. |
| 15 | mdcat organic chemistry mcqs | Trans | 2 | Same. |
| 16 | mdcat mock test free | Trans | 3 | Conversion-heavy landing page. |
| 17 | mdcat negative marking rules | Info | 1 | Snippet-quality FAQ. |
| 18 | mdcat passing marks 2026 | Info | 2 | Refresh annually. |
| 19 | mdcat self preparation guide | Info | 2 | Long-form guide. |
| 20 | etea mdcat vs pmc mdcat | Comp | 2 | Bridges to ETEA cluster. |
| 21 | mdcat english grammar mcqs | Trans | 2 | Sub-chapter satellite. |
| 22 | mdcat vocabulary mcqs | Trans | 2 | Sub-chapter satellite. |
| 23 | pmdc mdcat retake policy | Info | 2 | Trust-building FAQ. |

### 1.4 PPSC (Punjab Public Service Commission)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | ppsc mcqs | Trans | 4 | Pillar page. |
| 2 | ppsc past papers solved | Trans | 4 | Pillar. |
| 3 | ppsc general knowledge mcqs | Trans | 3 | Cluster overlap with FPSC/NTS. |
| 4 | ppsc pakistan studies mcqs | Trans | 3 | Reuse subject satellite. |
| 5 | ppsc current affairs mcqs 2026 | Trans | 3 | Monthly refresh. |
| 6 | ppsc everyday science mcqs | Trans | 3 | Most-repeated questions angle. |
| 7 | ppsc computer mcqs | Trans | 3 | Healthy mid-volume. |
| 8 | ppsc english mcqs | Trans | 3 | Grammar focus. |
| 9 | ppsc math mcqs | Trans | 3 | Quant practice. |
| 10 | ppsc urdu mcqs | Trans | 3 | Lower competition than English. |
| 11 | ppsc tehsildar past papers | Trans | 3 | Job-specific cluster. |
| 12 | ppsc naib tehsildar mcqs | Trans | 3 | Job-specific cluster. |
| 13 | ppsc lecturer past papers | Trans | 3 | Multi-subject hub. |
| 14 | ppsc inspector legal mcqs | Trans | 2 | Niche, easy win. |
| 15 | ppsc syllabus 2026 | Info | 3 | Reference page. |
| 16 | ppsc test preparation guide | Info | 2 | Pillar-supporting guide. |
| 17 | ppsc one paper mcqs | Trans | 3 | Synonym for the MCQ-only screening test. |
| 18 | ppsc result 2026 | Nav | 4 | News page; refresh. |
| 19 | ppsc apply online | Nav | 5 | Owned by ppsc.gop.pk; do not target. |
| 20 | ppsc most repeated mcqs | Trans | 3 | Curated list page. |

### 1.5 FPSC (Federal Public Service Commission)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | fpsc mcqs | Trans | 4 | Pillar. |
| 2 | fpsc past papers solved | Trans | 4 | Pillar. |
| 3 | fpsc general knowledge mcqs | Trans | 3 | Shared cluster. |
| 4 | fpsc current affairs mcqs 2026 | Trans | 3 | Monthly refresh. |
| 5 | fpsc everyday science mcqs | Trans | 3 | Shared cluster. |
| 6 | fpsc english mcqs | Trans | 3 | Shared cluster. |
| 7 | fpsc islamic studies mcqs | Trans | 3 | Shared cluster. |
| 8 | fpsc computer mcqs | Trans | 3 | Shared cluster. |
| 9 | fpsc syllabus 2026 | Info | 2 | Reference. |
| 10 | fpsc test pattern | Info | 2 | Snippet-friendly. |
| 11 | fpsc assistant director past papers | Trans | 3 | Job-specific. |
| 12 | fpsc inspector inland revenue mcqs | Trans | 2 | Job-specific niche. |
| 13 | fpsc accounts officer mcqs | Trans | 2 | Job-specific. |
| 14 | fpsc lecturer past papers | Trans | 3 | Multi-subject hub. |
| 15 | fpsc nab inspector mcqs | Trans | 2 | Niche. |
| 16 | fpsc preparation books | Info | 2 | Roundup guide, link bait. |
| 17 | fpsc one paper mcqs | Trans | 3 | Synonym page. |
| 18 | fpsc result check online | Nav | 4 | News page. |
| 19 | fpsc vs ppsc difference | Comp | 1 | Easy win; comparison piece. |
| 20 | fpsc most repeated mcqs | Trans | 3 | Curated list. |

### 1.6 NTS (National Testing Service)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | nts mcqs | Trans | 4 | Pillar. |
| 2 | nat test preparation | Info | 3 | Pillar-supporting. |
| 3 | gat general preparation | Info | 3 | Pillar-supporting. |
| 4 | nts past papers solved | Trans | 4 | Pillar. |
| 5 | nat ie sample paper | Trans | 2 | Engineering NAT variant. |
| 6 | nat im sample paper | Trans | 2 | Medical NAT variant. |
| 7 | nat ics sample paper | Trans | 2 | CS NAT variant. |
| 8 | gat subject test preparation | Info | 2 | High-intent niche. |
| 9 | nts analytical reasoning mcqs | Trans | 3 | Section-specific. |
| 10 | nts quantitative mcqs | Trans | 3 | Section-specific. |
| 11 | nts verbal mcqs | Trans | 3 | Section-specific. |
| 12 | nts english mcqs synonyms antonyms | Trans | 3 | Long-tail. |
| 13 | nts general knowledge mcqs | Trans | 3 | Shared cluster. |
| 14 | nts test pattern 2026 | Info | 2 | Reference. |
| 15 | nts negative marking | Info | 1 | FAQ snippet. |
| 16 | nts result check by cnic | Nav | 5 | Owned by nts.org.pk; skip. |
| 17 | nts roll number slip download | Nav | 5 | Owned by nts.org.pk; skip. |
| 18 | gat general past papers | Trans | 3 | Pillar-supporting. |
| 19 | nts mcqs with answers | Trans | 3 | Synonym-cluster page. |
| 20 | how to prepare for nts in 1 month | Info | 2 | Guide. |

### 1.7 KPPSC (Khyber Pakhtunkhwa Public Service Commission)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | kppsc mcqs | Trans | 3 | Pillar. Less saturated than PPSC. |
| 2 | kppsc past papers solved | Trans | 3 | Pillar. |
| 3 | kppsc lecturer past papers | Trans | 3 | Multi-subject hub. |
| 4 | kppsc sst past papers | Trans | 2 | Senior subject teacher; niche. |
| 5 | kppsc tehsildar past papers | Trans | 2 | Job-specific. |
| 6 | kppsc inspector fia mcqs | Trans | 2 | Niche. |
| 7 | kppsc asi past papers | Trans | 2 | Police track. |
| 8 | kppsc general knowledge mcqs | Trans | 3 | Shared cluster. |
| 9 | kppsc pak studies mcqs | Trans | 3 | Shared cluster. |
| 10 | kppsc syllabus 2026 | Info | 2 | Reference. |
| 11 | kppsc test pattern | Info | 2 | Reference. |
| 12 | kppsc result 2026 | Nav | 4 | News page. |
| 13 | kppsc patwari mcqs | Trans | 2 | Niche. |
| 14 | kppsc police constable past papers | Trans | 2 | Niche. |
| 15 | kppsc lecturer biology past papers | Trans | 2 | Subject-specific lecturer page. |
| 16 | kppsc lecturer english past papers | Trans | 2 | Same. |
| 17 | kppsc lecturer islamiat past papers | Trans | 2 | Same. |
| 18 | kppsc current affairs mcqs 2026 | Trans | 3 | Monthly refresh. |
| 19 | kppsc most repeated mcqs | Trans | 2 | Curated. |
| 20 | kppsc apply online | Nav | 5 | Owned by kppsc.gov.pk; skip. |

### 1.8 ECAT (Engineering College Admission Test)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | ecat mcqs | Trans | 3 | Pillar. |
| 2 | ecat 2026 syllabus | Info | 3 | Refresh annually. |
| 3 | ecat mathematics mcqs | Trans | 3 | Subject satellite. |
| 4 | ecat physics mcqs | Trans | 3 | Subject satellite. |
| 5 | ecat chemistry mcqs | Trans | 3 | Subject satellite. |
| 6 | ecat english mcqs | Trans | 2 | 10-MCQ section, low competition. |
| 7 | ecat past papers solved | Trans | 3 | Pillar-supporting. |
| 8 | uet ecat preparation | Info | 3 | Lahore-flavoured page. |
| 9 | uet taxila ecat mcqs | Trans | 2 | Niche. |
| 10 | ecat mathematics functions and limits | Trans | 2 | Chapter-level satellite. |
| 11 | ecat physics vectors mcqs | Trans | 2 | Chapter-level satellite. |
| 12 | ecat negative marking | Info | 1 | FAQ snippet. |
| 13 | ecat merit calculator | Trans | 3 | Tool page; link magnet. |
| 14 | ecat mock test free | Trans | 3 | Conversion landing. |
| 15 | ecat date 2026 | Info | 2 | News page. |
| 16 | how to prepare for ecat in 2 months | Info | 2 | Guide. |
| 17 | ecat vs mdcat difference | Comp | 1 | Bridges clusters. |
| 18 | ecat sample paper pdf | Trans | 3 | HTML-first page, optional PDF. |
| 19 | ecat passing marks | Info | 2 | FAQ snippet. |
| 20 | ecat preparation books | Info | 2 | Roundup guide. |

### 1.9 ETEA (Educational Testing and Evaluation Agency, KPK)

| # | Query | Intent | Est. KD | Notes |
|---|-------|--------|---------|-------|
| 1 | etea mcqs | Trans | 3 | Pillar. |
| 2 | etea medical past papers | Trans | 3 | Pillar-supporting. |
| 3 | etea engineering past papers | Trans | 3 | Pillar-supporting. |
| 4 | etea biology mcqs | Trans | 2 | Subject satellite. |
| 5 | etea chemistry mcqs | Trans | 2 | Subject satellite. |
| 6 | etea physics mcqs | Trans | 2 | Subject satellite. |
| 7 | etea english mcqs | Trans | 2 | Subject satellite. |
| 8 | etea syllabus 2026 | Info | 2 | Reference. |
| 9 | etea test pattern | Info | 2 | FAQ snippet. |
| 10 | etea negative marking | Info | 1 | Snippet. |
| 11 | etea computer based test guide | Info | 2 | Niche guide; CBT angle. |
| 12 | etea mock test free | Trans | 2 | Conversion landing. |
| 13 | etea preparation books | Info | 2 | Roundup. |
| 14 | etea nursing past papers | Trans | 2 | Job-specific. |
| 15 | etea ppr (police) past papers | Trans | 2 | Niche. |

---

## 2. Content gap analysis

### Competitor inventory snapshot

| Competitor | Approx. content footprint | Primary strength | Primary weakness |
|------------|---------------------------|------------------|-------------------|
| cssmcqs.com | 5k+ pages; per-subject + per-year past-paper posts | Topical authority on CSS/PMS, deep past-paper archive | Cluttered UI, intrusive ads, slow on mobile |
| mymcqs.net | 3k+ pages; subject + monthly current affairs pages | Breadth across PSC/PMS/NTS, user-submitted MCQs | Generic templates, weak internal linking |
| examtonight.com | 30k+ MCQs with per-question permalinks | Forum + community submissions, app, scale | Thin individual permalinks, weak topical hubs |
| mcq360.com | ~23k MCQs, freemium | Modern UI, AI explanations, mistake book | Paywall, narrow exam coverage (MDCAT/ECAT) |
| premed.pk | 170k MCQs, video, flashcards | Brand strength in MDCAT, deep content | Single-vertical, login-gated, no SEO long-tail |

### Top 25 content gaps Studora should fill

Each gap names the missing page type, the cluster it slots into, and a one-line execution note. Priority follows impact/effort.

| # | Gap | Page type | Cluster | Execution note |
|---|-----|-----------|---------|----------------|
| 1 | MDCAT aggregate calculator | Interactive tool | MDCAT | Single-page JS calculator (matric/FSc/MDCAT inputs); link magnet. |
| 2 | ECAT merit calculator | Interactive tool | ECAT | Same template as #1, different formula. |
| 3 | CSS MPT 2026 syllabus breakdown | Long-form guide | CSS | Table-driven, snippet-ready, refreshed when FPSC publishes. |
| 4 | MDCAT chapter-wise high-frequency topics | Reference table | MDCAT | "Genetics 10–14 MCQs", "Cell Biology 8–12 MCQs", etc. |
| 5 | "How long to prepare for {exam}" planner | Guide × 8 exams | All | Calm, week-by-week, one per exam. |
| 6 | Exam date countdown widgets | Live data block | All | Per-exam page; "37 days to MDCAT 2026". |
| 7 | Subject deep-dive: Pakistan Affairs for CSS | Pillar | CSS | History → constitution → contemporary politics, all linkable. |
| 8 | Subject deep-dive: Everyday Science | Pillar | PPSC/FPSC/NTS | Shared satellite, links into multiple exams. |
| 9 | Current affairs monthly round-up | Recurring article | PPSC/FPSC/CSS/NTS | One post per month, "May 2026 current affairs MCQs". |
| 10 | "Most repeated MCQs" curated lists | Curated list × subject | All | Mining from past-paper frequency; easy snippets. |
| 11 | CSS vs PMS comparison | Comparison guide | CSS/PMS | Bridges two clusters, gathers backlinks. |
| 12 | ECAT vs MDCAT decision guide | Comparison guide | ECAT/MDCAT | For undecided FSc students. |
| 13 | FPSC vs PPSC vs KPPSC difference | Comparison guide | FPSC/PPSC/KPPSC | Bridges three clusters. |
| 14 | NAT subject test selector tool | Interactive | NTS | "I studied FSc Pre-Eng → take NAT-IE", with link to practice. |
| 15 | PMS optional subjects scoring guide | Long-form guide | PMS | Underserved; high search intent among aspirants. |
| 16 | CSS English Essay model outlines | Guide | CSS | Not MCQs but draws CSS audience into the site. |
| 17 | MDCAT negative marking explainer | Short FAQ page | MDCAT | Pure snippet play. |
| 18 | Per-exam glossary of acronyms | Reference | All | "MPT, GSA, NAT-IE, ETEA-CBT" defined in plain English. |
| 19 | "Books to read for {exam}" roundup | Roundup × 8 | All | Earns affiliate-style natural backlinks from blogs. |
| 20 | Daily MCQ archive with permalinks | Index page | All | Quiz-of-the-day already exists; expose the archive. |
| 21 | Topic-tagged MCQ archive | Index page | All | "All Genetics MCQs across MDCAT + ETEA". |
| 22 | Difficulty-tagged practice mode | Filter page | All | "Hard CSS Pakistan Affairs MCQs" type long-tails. |
| 23 | Subject pages in Urdu (top 8) | Translation | All | Captures Urdu-search queries; see Section 6. |
| 24 | Exam result + merit list landing pages | News page × 8 | All | Calm, factual, refresh after each announcement. |
| 25 | "Self-prep timeline" interactive | Tool | CSS/PMS/MDCAT | User inputs exam date → personalised week plan. |

Notes on what Studora should NOT chase:

- **PDF downloads of past papers**: legally murky, brand-misaligned. Render in HTML instead.
- **Job-application portals** ("apply online for PPSC"): owned by ppsc.gop.pk; do not compete.
- **Roll-number-slip pages**: owned by exam bodies; navigational losses guaranteed.
- **Result-by-CNIC pages**: same as above.
- **Per-question forum permalinks** (the examtonight model): produces 30k thin pages and tanks site quality scores.

---

## 3. On-page SEO recommendations per page type

Studora has four page types today. Each gets a fixed template so middleware and content can stay in lockstep.

### 3.1 Subject pages (e.g. `/subjects/biology`)

**Goal**: rank for `{subject} mcqs` head-cluster terms and act as the entry point for chapter-level long-tails.

- **H1**: `{Subject} MCQs` (single, exact-match, no brand suffix in H1).
- **H2 outline** (in order):
  1. Quick start: practice {subject} MCQs now (CTA into quiz mode).
  2. What this {subject} page covers (chapter list).
  3. Most-repeated {subject} questions across Pakistani exams.
  4. Which exams test {subject}? (links to the 3 most-relevant exam tracks).
  5. How to study {subject} for competitive exams (5–8 paragraphs of calm guidance).
  6. Frequently asked questions about {subject} MCQs (4–6 Q&As).
- **H3**: one per chapter listed under H2 #2.
- **Recommended word count**: 900–1,400. Long enough to demonstrate depth, short enough to maintain quality.
- **Internal linking pattern**:
  - 1 link up to the relevant exam pillar (or 3 if cross-exam subject).
  - 1 link down to each chapter satellite (when those exist).
  - 1 link across to one comparison/guide piece.
  - 1 link to quiz-of-the-day archive.
- **Schema**: `CollectionPage` + `BreadcrumbList` + `FAQPage` on the FAQ block.
- **Image alt-text**: hero image alt = `{Subject} MCQ practice on Studora`; never stuff with keywords. Avoid generic stock; prefer one diagram if it adds meaning.

### 3.2 Exam track pages (e.g. `/exams/css`)

**Goal**: rank for `{exam} mcqs`, `{exam} past papers solved`, `{exam} preparation` cluster.

- **H1**: `{Exam} Preparation` (e.g. "CSS Preparation"). Avoid duplicating subject H1 patterns.
- **H2 outline**:
  1. {Exam} at a glance (table: total marks, sections, negative marking, last conducted date).
  2. Start practising: top {exam} MCQ packs (3–6 CTA cards into specific quizzes).
  3. {Exam} syllabus and weightage 2026.
  4. {Exam} past papers (year-by-year HTML index, no PDFs needed).
  5. Subject-wise preparation: links to the subject pages most relevant for this exam.
  6. {Exam} preparation plan (3-week / 1-month / 3-month tabs).
  7. Frequently asked questions about {exam}.
- **H3**: one per syllabus section, one per past paper year.
- **Recommended word count**: 1,400–2,000. This is the pillar; depth signals authority.
- **Internal linking pattern**:
  - 8–12 links down to subject pages and chapter satellites.
  - 1 link to the comparison guide (e.g. CSS-vs-PMS).
  - 1 link to a tool page if relevant (MDCAT/ECAT pillars link to calculators).
  - 0 links up except the breadcrumb home link.
- **Schema**: `EducationalOccupationalProgram` for the exam itself + `BreadcrumbList` + `FAQPage` on FAQ block + `WebPage` with `lastReviewed` date.
- **Image alt-text**: structure diagrams labelled clearly ("CSS exam stages diagram") if used; otherwise no decorative images.

### 3.3 Quiz page (e.g. `/quiz?subject=biology&topic=genetics`)

**Goal**: rank for transactional `{subject} mcqs online`, `{topic} mcq test` terms; convert traffic to engagement.

- **H1**: `{Topic or subject} MCQs Practice` (e.g. "Genetics MCQs Practice").
- **H2 outline**:
  1. About this quiz (3–4 sentences: number of questions, source, difficulty).
  2. Take the quiz (the actual interactive component, above the fold on mobile).
  3. Topics covered in this quiz.
  4. Related quizzes (3–6 links to sibling quizzes).
  5. How this quiz fits into {exam} preparation (1–2 paragraphs linking up to relevant exam pillar).
- **H3**: one per topic in H2 #3 if needed; otherwise none.
- **Recommended word count**: 350–600 (kept lean so the quiz UI dominates).
- **Internal linking pattern**:
  - 1 link up to subject page.
  - 1 link up to exam pillar.
  - 3–6 sibling quiz links.
  - 1 link to quiz-of-the-day.
- **Schema**: `Quiz` (schema.org/Quiz). Include `hasPart` referencing each `Question` with `acceptedAnswer`. Only emit this if the answer key is on-page; do not mark up gated content.
- **Image alt-text**: per-question diagrams (e.g. genetics Punnett squares) labelled with the concept ("Punnett square for monohybrid cross"). Compress to <60KB.

### 3.4 Quiz of the day (`/quiz-of-the-day`)

**Goal**: rank for `daily mcq practice`, `mcq of the day pakistan`, and build a habit loop that compounds returning users.

- **H1**: `MCQ of the Day` (stable across days; do not date the H1).
- **H2 outline**:
  1. Today's question (the live MCQ).
  2. Previous questions this week (7-day rolling list with permalinks).
  3. Browse the archive by month.
  4. Subscribe via RSS / get notified (community signal).
  5. About the daily MCQ.
- **Permalinks**: each day's MCQ should live at `/mcq-of-the-day/YYYY-MM-DD` with a static, indexable page. The hub `/quiz-of-the-day` then 301s/302s to today's permalink — but prefer keeping `/quiz-of-the-day` as a canonical hub with `<link rel="canonical">` to itself and individual archived pages with their own canonicals.
- **Schema**: `Question` per day plus `WebPage` for the hub.
- **Image alt-text**: rarely needed; if used, label the question subject ("Pakistan Affairs map question").

---

## 4. Internal linking strategy

Today Studora is siloed: `home → subjects → category` and `home → exams → exam`. There is no cross-flow between subject content and exam tracks, which means link equity does not concentrate on the highest-intent pages (the exam pillars).

### Target architecture: weighted hub-and-spoke

```
                  [home]
                    |
        +-----------+-----------+
        |                       |
   [exam pillars] <----> [subject pages] <----> [chapter satellites]
        |                       |                       |
   [past-paper hubs]      [topic guides]            [quiz pages]
        |                       |                       |
        +--------> [tool pages / calculators] <---------+
                            |
                  [quiz-of-the-day archive]
```

### Concrete linking rules

1. **Every subject page links UP to the 3 exam tracks where that subject is most relevant.** Use natural anchor text, not exact-match.
   - Biology → MDCAT, ETEA Medical, NAT-IM.
   - Mathematics → ECAT, NAT-IE, NAT-ICS.
   - Pakistan Studies → CSS, PMS, PPSC.
   - Islamic Studies → CSS, PMS, FPSC.
   - Everyday Science → PPSC, FPSC, NTS.
   - Physics → MDCAT, ECAT, ETEA.
   - Chemistry → MDCAT, ECAT, ETEA.
   - English → CSS, NTS GAT, MDCAT.
   - Current Affairs → CSS, PMS, FPSC.
   - Computer → PPSC, FPSC, NTS-ICS.

2. **Every exam pillar links DOWN to 8–12 subject pages**, but only to subjects on its syllabus. Anchor: `{Subject} preparation for {Exam}`.

3. **Every exam pillar links LATERALLY to one comparison guide.** CSS pillar → CSS-vs-PMS; MDCAT pillar → MDCAT-vs-ECAT; FPSC pillar → FPSC-vs-PPSC.

4. **Every quiz page links UP twice** (once to its subject page, once to one exam pillar that uses the subject) and **laterally to 3–6 sibling quizzes**.

5. **Every tool page (calculators)** earns links from all matching exam pillars. The MDCAT calculator gets a link from the MDCAT pillar, the MDCAT past-papers page, and the MDCAT chapter satellites.

6. **Quiz of the day archive** is linked from the global footer (one persistent footer link) and from every exam pillar in its CTA card row.

7. **Comparison and guide pages** link laterally to both clusters they bridge. They should not become orphan hubs; treat them as content satellites that funnel equity into the exam pillars.

8. **Avoid sitewide nav-only links to exam pillars.** Contextual in-body links carry more weight than a header dropdown. Keep nav, but add 2–4 contextual links from every long-form page back to relevant pillars.

9. **Use descriptive, non-exact-match anchors.** "PPSC preparation guide" is better than "ppsc mcqs". A mix of anchor variants protects against over-optimisation flags.

10. **No more than 100 internal links per page.** This is rarely an issue but should be enforced on the archive pages where it can spike.

### Link equity audit cadence

- Monthly: pull a crawl (Screaming Frog free tier handles 500 URLs, which covers Studora today). Check internal PageRank/inlink count distribution.
- Target: top 8 exam pillars should each have at least 25 inbound internal links; subject pages at least 8; quiz pages at least 3.

---

## 5. Backlink acquisition plan

Twenty sustainable tactics for the Pakistani education niche. Each tactic names the target, the angle, and the rough monthly cadence the operator should aim for. None of these violate Google's link guidelines.

### Community and forum participation (organic, slow-burn)

1. **CSS Forum (cssforum.com.pk)** — long-standing CSS community. Create one profile, fill it out properly, then participate genuinely in MCQ-related threads. When relevant, share a Studora link to a specific subject page (e.g. Pakistan Affairs MCQs). Cadence: 4–6 high-value posts per month. The signature link should point to your homepage; avoid posting Studora links in every reply.

2. **Paradigm Shift Community Forum (paradigmshift.com.pk/community-forum/css-forum)** — active mid-2020s CSS/PMS forum. Same approach as #1.

3. **CSSPrepForum** — comment thoughtfully on syllabus and past-paper articles where Studora's chapter-tagged quizzes add value beyond the article. Cadence: 2–3 contextual comments per month.

4. **PakDef forums** — historically high domain authority. The CSS prep sub-forum has an active aspirants thread. Become a recognised participant first; share resources second.

5. **Reddit r/Pakistan, r/CSS, r/MDCAT, r/PakistaniStudents** — answer questions with a clear "I built a free MCQ practice tool, here is the relevant chapter" once a week at most. Reddit moderators detect drive-by promotion fast; participation must be genuine and the Studora mention must be the helpful answer, not bait.

6. **Quora Pakistan threads** — pick 30–50 evergreen questions (e.g. "How do I prepare for MDCAT in 1 month?"). Write substantive answers; link Studora as one of two or three resources, not as the sole answer. Quora links are nofollow but drive referral traffic and brand searches, which compound.

### Resource-page and roundup outreach

7. **University career-counselling pages** — many Pakistani universities (FAST, COMSATS, NUST, Punjab University career portals) link out to free prep resources. Email a one-paragraph pitch with a single specific link (e.g. "free MDCAT chapter-wise practice"). Target: 5 universities per month.

8. **High-school and intermediate college websites** — F.Sc colleges in Lahore, Karachi, Peshawar often link to MDCAT/ECAT resources for their students. Same outreach format. Target: 10 colleges per month.

9. **Pakistani education blogs (ilm.com.pk, eduvision.edu.pk, taleemguru.com, paklearningspot.com)** — pitch a single, original guest article in the style of one of their existing posts, with a single in-body link to a Studora subject page. Cadence: one pitch per week, expect 1 placement per month.

10. **Pakistan-specific resource roundups** — search `"best mcq websites pakistan"`, `"free css preparation websites"` and contact the page owners to request inclusion. Studora's clean UI and no-paywall positioning is a genuine value-add for these lists.

### Content-driven (assets that earn links passively)

11. **MDCAT aggregate calculator** (gap #1 in Section 2) — published as a free, embeddable tool. Reach out to MDCAT prep bloggers offering a copy-paste embed snippet. Calculators are reliable link magnets in this niche; mdcataggregatecalculator.online and others have built domains on this single page.

12. **"State of Pakistani competitive exams 2026" data report** — once a year, compile a short data study (pass rates, popular subjects, exam date timeline, syllabus changes). Pitch to education journalists at Dawn, Geo, ARY, Express Tribune education desks. Data-driven content earns press-quality links.

13. **Original chapter-wise difficulty analysis** — using Studora's own quiz data, publish "the 10 hardest MDCAT genetics questions of the year" or similar. Original data published with methodology earns links because there is nothing to copy.

14. **Free downloadable syllabus PDFs** (your own clean typesetting, not scraped) — host clean, ad-free HTML + a "save as PDF" button. Other sites will link because the PDF is uniquely usable.

15. **Glossary of exam acronyms** (gap #18) — an evergreen reference that bloggers cite when they need to define "MPT" or "NAT-ICS" in passing.

### Strategic exchanges (white-hat)

16. **Broken link reclamation** — use the Wayback Machine and Ahrefs free trial to find broken outbound links on Pakistani education sites pointing at defunct prep sites. Email the site owner with a working Studora replacement that genuinely fits. Expect ~5% reply rate; 1 link per 20 emails sent.

17. **Unlinked brand mention reclamation** — set up Google Alerts for "studora", "studora.vercel.app". When the brand is mentioned without a link (in a forum post, a blog roundup), politely request the link. Trivial to do, near-zero cost.

18. **Reciprocal student communities** — partner with a YouTube channel or Instagram page in the MDCAT/CSS prep niche. They link to Studora's chapter quizzes from their video descriptions; Studora links to their playlists from the relevant subject page. Reciprocal in moderation (a handful, not dozens) is fine and historically has not triggered penalties when the partnership is genuine.

### Discovery / branding (indirect link influence)

19. **HARO and Connectively-style journalist queries** — sign up for HARO-equivalent services (or watch the #journorequest hashtag on Twitter/X). Pakistani education journalists occasionally ask for expert quotes on exam-preparation trends. A one-paragraph quote can win a dofollow link from Dawn or The News.

20. **Wikipedia external-links sections** — long-tail and slow but real. The "Civil Services of Pakistan" and "Pakistan Medical and Dental Council" articles have external-links sections that legitimately reference prep resources. Submitting Studora as an "External link" only works once Studora has the genuine domain authority to merit inclusion (likely month 6+); follow Wikipedia's guidelines exactly, do not edit-war.

### Backlink quality targets (months 1–6)

| Tactic class | Links / month (target) | Avg target DA | Time investment |
|--------------|------------------------|---------------|-----------------|
| Forum/community | 4–6 (incl. nofollow) | 30+ | 2 hrs/week |
| Resource pages | 3–5 dofollow | 35+ | 3 hrs/week |
| Roundups / guest posts | 1–2 dofollow | 40+ | 2 hrs/week |
| Content asset earned | 2–4 dofollow | 30+ | one-off then passive |
| Mentions reclaimed | 1–3 dofollow | varies | 30 min/week |
| **Total** | **11–20 / month** | — | ~6–8 hrs/week |

Anything above 20/month from a single operator typically indicates corner-cutting. Stay patient.

---

## 6. Pakistan-specific SEO factors

### 6.1 Language: English, Urdu, and the bilingual reality

Studora is primarily English today. The single-largest Pakistan-specific lever is whether to add Urdu.

**Recommendation**: stay English-first for at least the first 6 months. Reason: the high-intent transactional searches (`css mcqs`, `mdcat mcqs`, `ppsc past papers solved`) are overwhelmingly typed in English even by Urdu-first users, because exam terminology is in English. The pages that benefit most from Urdu translation are the long-form guides (`how to prepare for css in 6 months`, `pms eligibility criteria`).

**When you add Urdu** (month 6+):

- Use proper `hreflang` annotations: `en-PK` and `ur-PK`, with an `x-default` pointing to the English version.
- Reciprocal `hreflang` tags must point both ways (`/guide/css-prep` ↔ `/ur/guide/css-prep`). Missing reciprocal tags is the #1 hreflang implementation bug.
- Do NOT machine-translate. Roman Urdu and Urdu script are not interchangeable; Google evaluates content quality regardless of language. Translate the top 5 pillar guides by hand.
- Add a visible language switcher near the top of the page (helps both UX and Google's understanding).

**Roman Urdu queries** (e.g. `css ki tayari kaise karen`) are common in autocomplete but very low conversion. Do not optimise pages for Roman Urdu primary keywords; mention naturally in body content only.

### 6.2 Google Pakistan ranking specifics

- **google.com.pk** is the dominant SERP for Pakistani users. Studora's organic visibility data in GSC will tilt heavily toward `pk` country targeting; verify this is set under GSC International Targeting (the legacy setting; many properties still use it).
- The `.vercel.app` subdomain cannot be country-targeted directly. **Buy a `.com` or `.pk` domain and migrate before the end of month 3.** Until then, Google treats studora.vercel.app as un-geo-targeted, which costs ranking on local queries. A `.pk` ccTLD gives the strongest local signal but is harder to abandon if you internationalise later; a `.com` with proper geo signals (GSC targeting, address schema with Pakistan, hosting near the region) is the safer middle path.
- Hosting region: Vercel's default edge network already serves Pakistan well. No action needed.

### 6.3 Mobile-first indexing for a 90%+ mobile audience

Pakistani prep users are overwhelmingly on mid-range Android devices on cellular connections. Mobile-first indexing means Google's primary view of Studora is the mobile rendering. Specific implications:

- **Above-the-fold mobile content matters most.** The H1 + first paragraph + primary CTA must render in the first 600px on a 360x740 mobile viewport.
- **Tap-target sizing**: quiz answer buttons should be at least 48x48 CSS pixels with 8px gaps. Tight buttons are the most common Lighthouse complaint on MCQ sites.
- **Avoid horizontal scroll**. Past-paper tables and syllabus tables on competitor sites overflow on mobile and Google flags them.
- **Compress images aggressively**. Target ≤60KB per image at 2x retina resolution. Use AVIF with WebP fallback.
- **Cellular-friendly font loading**: Studora self-hosts fonts already — confirm `font-display: swap` is set and no more than 2 font files load on first paint.
- **Largest Contentful Paint** budget on 4G mobile (the realistic Pakistani average): under 2.0s. Studora's current Lighthouse-friendly state should hold this; recheck monthly using GSC's Core Web Vitals report filtered to mobile.

### 6.4 Local search box ("MCQs near me")

This is a low-priority, cheap optimisation. The volume for `mcqs near me` is small, but:

- Add `LocalBusiness` schema? **No** — Studora is purely online; misusing LocalBusiness schema is a quality flag.
- Add city-level guides? **Yes, selectively.** Pages like "MDCAT preparation in Lahore" or "CSS coaching alternatives in Karachi" capture city + intent queries. Do not spin up 50 city pages; build 6–8 well-written city guides (Lahore, Karachi, Islamabad, Peshawar, Quetta, Multan, Faisalabad, Rawalpindi) that talk about local exam centres, FPSC/PPSC test venues, and Studora as the online alternative.
- Use `Organization` schema (already shipping) and ensure the `address` block includes `addressCountry: "PK"` even if no street address is provided.

### 6.5 Currency, dates, and trust signals

- Display dates in DD-MM-YYYY format alongside ISO; Pakistani users default to DMY.
- Display the exam-body source citation prominently ("Syllabus source: FPSC official syllabus, fpsc.gov.pk"). Outbound links to government sources are E-E-A-T positive in this niche, not a leak of equity.
- Author attribution: even if Studora is solo-operated, every long-form guide should have a visible "Written by Studora editorial" byline and a "Last updated YYYY-MM-DD" timestamp. Helpful Content Update penalises ghost-written, undated content.

---

## 7. 30-60-90 day execution plan

Sequenced for one operator working ~10 focused SEO hours per week on top of product work. Each week names ship-now actions and the rationale.

### Days 1–30: Foundation and quick wins

**Week 1 — Audit, baseline, and decide on domain**
- Day 1: Run Screaming Frog (free tier ≤500 URLs) on studora.vercel.app. Export the inlink count for every URL. Save baseline.
- Day 2: Export GSC Search Performance for the last 28 days at page-and-query granularity. This is the baseline for cannibalization checks in Section 8.
- Day 3: Decide on the production domain (`studora.com` or `studora.pk`). Buy it. Configure Vercel.
- Day 4: Set up Google Analytics 4 + GSC for the new domain. Verify ownership before migration.
- Day 5: Configure 301 redirects from `studora.vercel.app/*` to `studora.com/*` (or `.pk`). Submit change-of-address in GSC.

**Week 2 — Quick-win on-page fixes**
- Tighten title tags and meta descriptions on the 8 exam pillars using the keyword map in Section 1.1–1.8. Run the cannibalization check from Section 8 first.
- Add `FAQPage` schema to the 8 exam pillars. Pick 4–6 PAA-style questions per exam.
- Add `BreadcrumbList` schema sitewide.
- Add `Quiz` schema to one canonical quiz page as a proof-of-concept. Submit to Rich Results Test.
- Fix any mobile tap-target issues found in Lighthouse.

**Week 3 — Highest-ROI new content**
- Build the MDCAT aggregate calculator (gap #1). Pure JS, no backend. Publish at `/mdcat/aggregate-calculator`.
- Build the ECAT merit calculator (gap #2). Publish at `/ecat/merit-calculator`.
- Publish the CSS-vs-PMS comparison (gap #11). 1,500 words.
- Add quiz-of-the-day permalinks (`/mcq-of-the-day/YYYY-MM-DD`) and the archive index page.

**Week 4 — Internal linking sweep**
- Implement the 10 cross-link rules from Section 4 across all 47 subject pages and 50 exam tracks. This is the single highest-impact action of the month.
- Add the in-body comparison/guide links from each pillar.
- Verify navigation order: most important pillars (MDCAT, CSS, MDCAT calculator) above the fold in the main nav.
- Submit the updated sitemap.

### Days 31–60: Content depth and first backlinks

**Week 5 — Pillar depth**
- Rewrite the CSS pillar to the 1,400–2,000 word target with the H1/H2 structure from Section 3.2.
- Same for MDCAT pillar.

**Week 6 — Pillar depth, continued**
- Rewrite the PPSC and FPSC pillars to spec.
- Publish "How to prepare for CSS in 6 months" guide (Section 1.1 row 13).
- Publish "How to prepare for MDCAT in 1 month" guide (Section 1.3 row 11).

**Week 7 — Long-tail chapter coverage**
- Create 8 MDCAT chapter satellite pages (top-frequency topics from Section 1.3 rows 13–15 + 5 more).
- Create 5 CSS subject satellite pages.
- Each one follows the subject-page template from Section 3.1.

**Week 8 — First backlink push**
- Set up Google Alerts on "studora" (tactic #17).
- Create profiles and write 4 high-value posts on CSS Forum + Paradigm Shift Forum (tactics #1, #2).
- Email 5 universities and 5 colleges with the calculator-and-quiz pitch (tactics #7, #8).
- Pitch 1 guest article to ilm.com.pk or paklearningspot.com (tactic #9).

### Days 61–90: Scale and authority compounding

**Week 9 — Currents affairs cadence**
- Set up the monthly current-affairs round-up page template. Publish "May 2026 Pakistan current affairs MCQs" (gap #9).
- Refresh PMS, PPSC, FPSC, NTS pillars with the latest current-affairs section linking to it.

**Week 10 — Cross-exam comparison content**
- Publish ECAT-vs-MDCAT comparison.
- Publish FPSC-vs-PPSC-vs-KPPSC comparison.
- Publish "Most-repeated everyday science MCQs" curated list (gap #10).
- Publish glossary of exam acronyms (gap #18).

**Week 11 — Tool and data asset**
- Publish the NAT subject test selector tool (gap #14).
- Publish the first quarterly data report — "Most-attempted MDCAT chapters on Studora, Q1 2026" — small but original. Pitch to 3 education journalists (tactic #12).

**Week 12 — Measurement, iterate**
- Re-pull Screaming Frog crawl. Confirm internal link distribution targets from Section 4.
- Re-pull GSC. Identify the top 20 keywords now ranking positions 4–20 (low-hanging fruit). Plan 4 weeks of further on-page tweaks for those specifically.
- Audit cannibalization again (Section 8). Resolve any newly created conflicts.
- Set targets for days 91–180 based on what worked.

### Outcomes to expect (calibrated)

- **By day 30**: 5–15 keywords ranking in top 50. Some pages first-indexed. Domain authority effectively 0 still.
- **By day 60**: 30–60 keywords ranking in top 50; first few in top 20. First 3–6 dofollow backlinks. Branded search starts to appear in GSC.
- **By day 90**: 80–150 keywords ranking in top 50; 10–20 in top 20; 2–5 in top 10 for genuinely long-tail queries. 10–20 referring domains. First 1,000+ monthly organic sessions in good months.

This is what realistic ground-up SEO looks like in a competitive niche. Anyone promising top-3 for "css mcqs" in 90 days is selling you something.

---

## 8. Cannibalization control

This is the mandatory check that has to run **before** any title-tag, H1, or meta change in the playbook above. Skipping it is how you accidentally hand a ranking from one page to a less-deserving page.

### The recurring 15-minute audit

1. Open GSC Search Performance. Set the date range to the last 28 days.
2. Add filter: Query contains the target keyword cluster (e.g. `mdcat`).
3. Set dimensions to Page and Query.
4. Export. In a spreadsheet, find any query where 2+ Studora URLs both appear with impressions > 100 and positions both within the top 30.
5. For each conflict: pick the page that should own the query (usually the one with the highest clicks or the closest semantic match), then plan to de-emphasise the keyword in the losing page's title/H1/first paragraph.

### Rules baked into the recommendations above

- The CSS pillar owns `css mcqs` and `css preparation`. No CSS subject satellite uses `css mcqs` in its title.
- Subject satellite pages own `{subject} mcqs` (e.g. `biology mcqs`). The CSS pillar does not have "Biology MCQs" as a primary keyword anywhere.
- The chapter satellites (e.g. `mdcat genetics mcqs`) own that exact long-tail. The MDCAT pillar links to them but does not target the chapter keyword in its own title or H1.
- The MDCAT calculator page owns `mdcat aggregate calculator`. The MDCAT pillar mentions the calculator but does not use the phrase in its title or H1.
- Quiz-of-the-day archive owns `daily mcq practice`. Individual day permalinks own date-specific long-tails only.

### Title/H1 deconfliction examples

| Page | Primary keyword (in title and H1) | Secondary in body only |
|------|-----------------------------------|------------------------|
| `/exams/css` | CSS preparation | css mpt, css mcqs, css past papers |
| `/exams/css/mpt-syllabus-2026` | CSS MPT 2026 syllabus | css preliminary test |
| `/exams/css/past-papers` | CSS past papers solved | css mcqs solved |
| `/subjects/pakistan-affairs` | Pakistan Affairs MCQs | css pakistan affairs, pms pakistan affairs |
| `/exams/mdcat` | MDCAT preparation | mdcat mcqs, mdcat syllabus |
| `/exams/mdcat/biology` | MDCAT Biology MCQs | (do not repeat in pillar) |
| `/mdcat/aggregate-calculator` | MDCAT aggregate calculator | mdcat merit calculator |

If two rows ever share a primary keyword, stop and consolidate before publishing.

---

## 9. Measurement and tooling

### Free / cheap stack one operator can run

| Need | Tool | Cost | Purpose |
|------|------|------|---------|
| Crawl + on-page audit | Screaming Frog (free) | Free up to 500 URLs | Internal link counts, title/meta audits |
| Search analytics | Google Search Console | Free | Source of truth for queries, positions, CWV |
| User analytics | Google Analytics 4 | Free | Engagement, page value |
| Keyword discovery | Google autocomplete + Keywords Everywhere extension | Free–$10/mo | Long-tail mining |
| Rank tracking | A small Sheets-based tracker pulling GSC API | Free | Weekly position deltas on 30 priority keywords |
| Schema validation | Google Rich Results Test | Free | Quiz, FAQ, Breadcrumb sanity checks |
| Backlink monitoring | Ahrefs free Webmaster Tools | Free if you own the site | Referring domains |
| Mobile UX | PageSpeed Insights + Lighthouse (DevTools) | Free | CWV weekly checks |
| Alerts | Google Alerts on "studora" | Free | Brand mentions for reclamation |

### Weekly KPI dashboard (5-minute glance)

1. Total clicks (28d rolling) vs prior 28d.
2. Total impressions (28d rolling) vs prior 28d.
3. Average position on the 30 priority keywords.
4. Indexed-page count (GSC Pages → Indexed).
5. Number of referring domains (Ahrefs WMT).
6. Core Web Vitals mobile pass rate.

When any of these moves more than 15% week-on-week, dig in.

### Monthly review (60 minutes)

- Re-run the cannibalization audit (Section 8).
- Re-pull Screaming Frog and compare internal link distribution to targets.
- Identify the 10 keywords closest to crossing into the top 10 (positions 11–20) and queue up 1–2 tweaks each.
- Pick the next month's content priorities from the keyword map.

---

## Closing note on patience

The competitors named in this brief have 5–10 years of compounded authority. Studora cannot leap them in a quarter, and the playbook is honest about that. What it can do, with disciplined execution of the on-page templates, the hub-and-spoke linking, the calculator + tool assets, and a slow trickle of genuinely earned backlinks, is take 100–300 long-tail positions inside 90 days and stack them into a defensible mid-tier presence by month 6.

Calm. Notebook. No shortcuts.
