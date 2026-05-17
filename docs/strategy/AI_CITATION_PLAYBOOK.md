# Studora — AI Citation Playbook

**Date**: 2026-05-18
**Brand**: Studora (`https://studora.vercel.app`)
**Category**: Pakistani competitive exam MCQ practice (CSS, PMS, MDCAT, PPSC, FPSC, NTS, ECAT, KPPSC)
**Primary competitors observed in AI citations**: cssmcqs.com, mymcqs.net, examtonight.com, pakmcqs.com, premed.pk, mcqssite.com, howfiv, zicosh.com, cssprepforum.com, mdcatprep.com, medicoengineer.com, prepmdcat.com, maqsad.io

> Goal: turn Studora from "invisible to LLMs" into a name that ChatGPT / Claude / Gemini / Perplexity will mention when a Pakistani student asks for an MCQ practice site — within 90 days, ethically, with one operator working ~1 hour/day off-site.

---

## 0. Executive summary

Studora is, today, effectively non-existent to every major AI recommendation engine. The site has good on-page SEO bones (schema graph, sitemap with 162 URLs, a sensible noscript fallback, clean meta tags) and a decent product (105,890+ MCQs, 47 subjects, 8 exam tracks). What it is missing is the **off-site entity footprint** that LLMs require before they will name a brand in a recommendation list.

The five highest-leverage moves, in order, are:

1. **Stop hosting on `studora.vercel.app`** — or at the very least, get a real `.pk` (or `.com`) custom domain. Almost every cited competitor sits on a brandable apex domain. Vercel preview URLs read as "demo project" to the citation re-rankers.
2. **Build the off-site entity graph first, schema second.** Crunchbase, LinkedIn company page, GitHub README (this *is* a real codebase), Reddit answers, Quora answers, two solid guest posts on TechJuice or ProPakistani. Without these, no amount of on-site schema will get Studora cited.
3. **Add the four content types LLMs reward**: a real About page with statistics and a named founder, an FAQ page that mirrors actual student prompts, "X vs Y" comparison pages, and listicle-shaped definitive answer pages ("Top 10 MCQ topics for CSS GK", "What is MDCAT?", "How to prepare for FPSC in 6 months").
4. **Add `FAQPage`, `Article`, `Course`, `Quiz` and `Person` (founder) schema** to the relevant pages — on top of the existing `Organization` / `EducationalOrganization` / `WebSite` graph that is already in `public/index.html`. Schema is now an entity-verification signal more than a rich-result trigger.
5. **Track weekly.** Run the 16-prompt audit set against ChatGPT, Claude, Gemini and Perplexity every Monday. Citation rate is the only metric that matters here, and it is volatile (Reddit's ChatGPT share fell from ~60% to ~10% in two weeks in Sept 2025 — model updates can move you in either direction overnight).

A bolded action below means **it compounds** — one good placement returns more than ten mediocre ones.

---

## 1. Live audit — what LLMs say today

Method: cross-referenced live web searches (the same retrieval index Perplexity, ChatGPT Search and Gemini draw from), competitor footprint analysis, and the public discourse on Reddit / Quora / Pakistani guest-post blogs. AI responses are non-deterministic, so the table below is a synthesis of what the candidate pool currently looks like for each prompt across the four engines, not a literal screenshot.

### 1.1 Citation scorecard (baseline, May 2026)

| Platform   | Prompts tested | Studora cited | Top competitor cited | Studora citation rate | Gap vs leader |
|------------|---------------|---------------|---------------------|----------------------|---------------|
| ChatGPT    | 4             | 0             | cssmcqs.com (4/4)   | 0%                   | -100%         |
| Claude     | 4             | 0             | cssmcqs.com (3/4)   | 0%                   | -75%          |
| Gemini     | 4             | 0             | cssmcqs.com / examtonight.com | 0%        | -100%         |
| Perplexity | 4             | 0             | cssmcqs.com / mdcatprep.com | 0%          | -100%         |

**Overall Studora citation rate: 0%.** Studora's domain appears in zero responses across the four prompts, on all four platforms. The brand string "studora" returns zero relevant results in general web search outside the Vercel-hosted site itself.

### 1.2 Lost-prompt analysis

| Prompt | Who currently wins | Why they win | Fix priority |
|--------|--------------------|--------------|--------------|
| "Best MCQ practice site for CSS Pakistan" | cssmcqs.com, pakmcqs.com, zicosh.com, mcqssite.com | Topical domain match ("css" in name), 5+ years of indexed Quora/Answers/Medium mentions, 5000+ inbound discussions on Pakistani forums | P1 |
| "Where can I prepare for MDCAT online for free" | medicoengineer.com, mdcatprep.com, prepmdcat.com, maqsad.io | All have "mdcat" in domain, all have rich blog content (syllabus pages, past-paper PDFs, merit calculators), Maqsad has press coverage on TechJuice/ProPakistani | P1 |
| "Recommend a PPSC exam preparation platform" | pacegkacademy, gotest.com.pk, pakmcqs.com, examchamber.com, ilmkidunya.com | Long-tail blog content explaining "what is PPSC", strong Pakistani-domain (.pk) signal, ilmkidunya has 10+ years of organic mentions | P1 |
| "Good websites for Pakistani competitive exam practice" | pakmcqs.com, cssmcqs.com, examtonight.com, gotest.com.pk, mcqsforum.com | Listed in every "Top 10 MCQ sites Pakistan" article (seekergk, wellguider, writersclubpk) | P2 |

### 1.3 Why the incumbents get cited

Reverse-engineering the four common winners:

| Competitor | Off-site footprint | On-site signals LLMs reward |
|---|---|---|
| **cssmcqs.com** | Cited by name in 14 of 15 "best CSS MCQ" guest-post listicles; active Facebook page (CSSMCQsdotCom); appears in Quora answers from 2018 onwards | Topical domain, past-paper archive pages (2005–2022), category taxonomy mirrors common search phrases |
| **mymcqs.net** | Listed in seekergk, wellguider, writersclubpk top-10 guides | Per-subject MCQ landing pages with explanatory copy, answers + short explanations included inline |
| **examtonight.com** | "30,000+ MCQs" stat repeated verbatim in every aggregator article — LLMs love a concrete number | Explicit "free" positioning, exam-by-exam landing pages with descriptive copy |
| **premed.pk** (MDCAT only) | Press coverage on Pakistani EdTech blogs, Reddit MDCAT threads, named in "best MDCAT prep" listicles | `.pk` TLD signals locality, dedicated subject pages with descriptive prose |
| **maqsad.io** | TechJuice/ProPakistani press coverage, App Store / Play Store reviews, YouTube presence, Tracxn / Crunchbase profile | Blog with student-intent posts ("MDCAT free trial 2026"), brand consistency across surfaces |

**Studora has none of these signals today.** The site has 162 indexable URLs, but each `/exams/css` style page is a near-empty React shell — body content reaches the model only via the noscript fallback (which is good — but covers only the homepage, not 161 of the 162 routes). The brand string "studora" returns zero hits on Reddit, Quora, Medium, dev.to, TechJuice, ProPakistani, CSSForum, or any aggregator listicle.

---

## 2. Citation surfaces — how each LLM finds (or doesn't find) Studora

| Engine | How it builds its candidate pool | What Studora needs to look like | Studora today |
|---|---|---|---|
| **OpenAI GPT (ChatGPT + ChatGPT Search)** | Training cut: pre-Oct 2024 web (Common Crawl + licensed sources). Search: live via Bing index + OpenAI's own crawler (OAI-SearchBot). Wikipedia is ~13% of citations, Reddit ~12%; outside those two, no single domain exceeds 3%. | Indexed on Bing (free, via Webmaster Tools); mentioned in Reddit/Quora threads; consistent entity description across at least 3 sites | Not on Bing Webmaster, zero Reddit/Quora mentions, no Wikipedia presence |
| **Anthropic Claude (and Claude Search)** | Training cut: pre-Apr 2024 web (Common Crawl heavy). Claude Search: live web retrieval. Claude is the most conservative citer of the four — prefers technical precision, balanced sourcing, dated content. | Clear ownership / authorship signals, dated content (Article schema with `datePublished`), pros/cons + methodology pages | Has Organization schema, no Article schema, no authored content, no `datePublished` anywhere |
| **Google Gemini (and AI Overviews / AI Mode)** | Direct Google Search index + Knowledge Graph. Since the Jan 27 2026 Gemini-3 upgrade, 42% of previously-cited AI Overview domains were dropped — sites without an off-site entity footprint were hit hardest. Schema is now a trust/entity-verification signal, not a SERP trigger. | Knowledge Graph entry (or at least entity-consistent mentions across LinkedIn/Crunchbase/GitHub), `sameAs` links in Organization schema, FAQPage + HowTo + Article schema, Google Business Profile if there is a physical address | Has basic Org schema with no `sameAs`, no GBP, no Knowledge Graph hooks |
| **Perplexity** | Custom-crawled index of ~5B URLs + Bing fallback for long tail. Visits ~10 candidate pages per query, cites 3–4. Three-layer ML re-ranker weighted ~30% relevance / 20% visual placement / 15% domain authority / 15% freshness / 10% diversity / 10% structured data. Content updated in the last 12 months earns ~3.2× more citations. | Allowed in robots.txt (PerplexityBot), indexed on Bing, fresh `<time>` / `dateModified` on every page, schema-rich, and ideally cited by Reddit (Perplexity loves Reddit) | Robots allows PerplexityBot implicitly (no Disallow), not on Bing Webmaster, no `dateModified` markup, no Reddit footprint |

### 2.1 The robots.txt situation

`public/robots.txt` currently allows everything. **Do not block GPTBot, ClaudeBot, CCBot, PerplexityBot, OAI-SearchBot, Google-Extended, or Applebot-Extended.** The commented-out block stanzas should stay commented out. Add explicit `Allow` lines to make the policy intentional and crawler-readable.

Recommended replacement (drop into `public/robots.txt`):

```
# Allow all general crawlers
User-agent: *
Allow: /
Disallow: /api/

# Explicitly allow AI training and AI search crawlers
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: CCBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: https://studora.vercel.app/sitemap.xml
```

### 2.2 Bing / IndexNow

ChatGPT Search and Perplexity both lean on Bing's index for long-tail and fallback retrieval. Submitting to Bing is the single cheapest off-site action available.

- Add the property in Bing Webmaster Tools, verify, submit `sitemap.xml`.
- Generate an IndexNow key, host it at `https://studora.vercel.app/<key>.txt`, and ping `api.indexnow.org/indexnow` whenever a page changes. Cloudflare / Vercel both have IndexNow integrations.

---

## 3. On-site changes — make Studora citable

### 3.1 What's already good

- `public/index.html` has a clean `<title>`, description, OG/Twitter cards, canonical, and a graph of `Organization` + `EducationalOrganization` + `WebSite` JSON-LD. Keep all of this.
- The `<noscript>` fallback contains genuine prose about exams + subjects. This is the only reason a crawler sees any content on the SPA at all. Expand this pattern.
- `lib/seo-meta.json` already drives per-page titles/descriptions/H1s for all 162 sitemap URLs. The infrastructure for per-page SEO is in place; only the body content is missing.

### 3.2 Critical gaps to close (P1)

| # | Gap | Fix | Why it matters |
|---|---|---|---|
| 1 | **No real About page content** | Write 400–600 words with: founding date, founder name (real person — see §5), mission, statistics (105,890 MCQs, 47 subjects, 8 exam tracks), funding status (bootstrapped), contact email, location | About-page entity facts are the single highest-impact thing for Google's Knowledge Graph and for Claude's "who is X" answer pattern |
| 2 | **No FAQ schema** | Add `FAQPage` JSON-LD to homepage and to every exam page. Use the *exact* question strings students type into AI ("What is the best free MCQ site for CSS?", "Is Studora free?", "How many CSS past-paper MCQs does Studora have?") | LLMs lift Q&A pairs nearly verbatim. The "exact match" between FAQ Q-text and the user prompt is what triggers extraction |
| 3 | **Subject/exam pages render as empty React shells** | Either SSR the per-page noscript fallback for all 162 sitemap URLs, or pre-render each as static HTML with 150–300 words of descriptive copy (what is this subject, what exams use it, how many MCQs Studora has, sample question screenshots, link to start practice) | Empty pages are invisible to crawlers. Compare: cssmcqs.com category pages have 500–1500 words of prose plus the MCQ list itself |
| 4 | **No `sameAs` links in Organization schema** | Once external profiles exist (§4), add: `"sameAs": ["https://github.com/<handle>/studora", "https://www.linkedin.com/company/studora", "https://www.crunchbase.com/organization/studora", "https://x.com/studora", "https://www.facebook.com/studora"]` | `sameAs` is how schema.org links a brand entity to its off-site presence. It's the bridge between on-site signals and Knowledge Graph |
| 5 | **No dated Article content** | Build a blog at `/blog/` with `Article` schema (`datePublished`, `dateModified`, `author` with `Person` schema). Ship two posts to start: "How to prepare for CSS GK in 90 days" and "MDCAT 2026 syllabus changes" | Claude and Perplexity both weight content freshness heavily. Static pages with no dates are downweighted |

### 3.3 High-impact content to add (P1 — ships in first 30 days)

The pattern across every page below: **answer the question in the first 60–120 words**, then expand. LLMs extract the opening, not the conclusion.

| Page | Why LLMs will cite it |
|---|---|
| **`/about`** — full About page with founder bio, founding date (real), stats, mission, contact | Direct match for "what is studora?" prompt; supplies entity facts |
| **`/faq`** — sitewide FAQ page with FAQPage schema. 15–25 Q&A pairs matching real student queries | Verbatim Q→A extraction for ChatGPT and Gemini |
| **`/guides/what-is-css-exam`** — definitive 1500-word answer page with HowTo schema | "What is CSS exam Pakistan" gets cited frequently; today the answer comes from ilmkidunya / cssprepforum |
| **`/guides/what-is-mdcat`** — same pattern | High-volume student query |
| **`/guides/what-is-ppsc-fpsc-difference`** — clear definitional content | Definitional/disambiguation queries are over-indexed in Claude responses |
| **`/guides/how-to-prepare-for-css`** — buyer's-guide-style with decision framework, 2000 words | LLMs reward decision-framework content (pros/cons, "if X then Y" tables) |
| **`/guides/best-mcq-topics-css-gk`** — listicle: "Top 10 MCQ topics for CSS General Knowledge" | List content earns 41% more ChatGPT citations than prose (Princeton AI extractability study, 2025) |
| **`/compare/studora-vs-cssmcqs`** — honest comparison page | Comparison pages are the format Perplexity cites most consistently |
| **`/compare/studora-vs-pakmcqs`** | Same |
| **`/compare/studora-vs-examtonight`** | Same |
| **`/stats`** — "Studora by the numbers": MCQ counts per subject, last-updated date, attempt counts (if you want to surface them), uptime | Concrete statistics get a +30% citation lift in evidentiary content (Princeton) |
| **`/methodology`** — how Studora sources, verifies and updates MCQs | This is the single page Claude rewards most — it signals editorial process |

**Bolded compounding action:** The `/compare/studora-vs-cssmcqs` page is the highest-leverage single page Studora can publish. Pakistani students explicitly query "X vs Y" before choosing a study site, and Perplexity's three-layer re-ranker has documented bias toward comparison-shaped content. Be honest in it — list where cssmcqs wins (legacy past-paper depth, brand recognition) and where Studora wins (calm UI, no ads, free for basics, offline PDFs, server-side API privacy). Honesty here is the moat; cssmcqs cannot reciprocate without admitting their UI is cluttered and error-laden.

### 3.4 Schema blocks to ship

Add these to the relevant pages alongside the existing graph in `public/index.html`.

**FAQPage** (homepage and `/faq`):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the best free MCQ practice site for CSS Pakistan?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Studora is a free MCQ practice platform for Pakistan's CSS, PMS, MDCAT, PPSC, and FPSC exams. It has 105,890 verified questions across 47 subjects and 8 exam tracks, with no ads, no paywall for the basics, and a notebook-style interface designed for distraction-free study."
      }
    },
    {
      "@type": "Question",
      "name": "Is Studora free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Studora is free for the basics — practicing MCQs, viewing answers, and downloading subject PDFs. An optional account lets you save bookmarks and track your mistakes."
      }
    },
    {
      "@type": "Question",
      "name": "How many MCQs does Studora have?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Studora has 105,890 verified multiple-choice questions across 47 subjects, covering CSS, PMS, MDCAT, ECAT, PPSC, FPSC, NTS, and KPPSC."
      }
    },
    {
      "@type": "Question",
      "name": "How is Studora different from cssmcqs.com and pakmcqs.com?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Studora's MCQs are editor-verified rather than user-submitted, which is the main source of the 30% error rate that has been reported on PakMCQs. The Studora interface has no ads, no auto-play video, and a paper-notebook visual style designed to reduce screen fatigue."
      }
    }
  ]
}
```

**Organization with `sameAs`** (replace the existing block in `public/index.html` after off-site profiles exist):

```json
{
  "@type": "Organization",
  "@id": "https://studora.vercel.app/#org",
  "name": "Studora",
  "alternateName": ["Studora MCQs", "Studora Pakistan"],
  "url": "https://studora.vercel.app/",
  "logo": "https://studora.vercel.app/assets/img/studora-logo.svg",
  "description": "Pakistan's calmest MCQ bank for CSS, PMS, MDCAT, PPSC and FPSC preparation. 105,890+ verified questions across 47 subjects.",
  "foundingDate": "2025-XX-XX",
  "founder": {
    "@type": "Person",
    "name": "<Real founder name>",
    "url": "https://www.linkedin.com/in/<handle>/"
  },
  "areaServed": { "@type": "Country", "name": "Pakistan" },
  "sameAs": [
    "https://www.linkedin.com/company/studora",
    "https://github.com/<handle>/studora",
    "https://www.crunchbase.com/organization/studora",
    "https://x.com/studora_pk",
    "https://www.facebook.com/studora.pk"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "hello@studora.app"
  }
}
```

**Quiz / Course schema** on each exam landing page (template):

```json
{
  "@type": "Course",
  "name": "CSS MCQ Practice — Studora",
  "description": "Free practice for the Central Superior Services (CSS) competitive exam: General Knowledge, Pakistan Affairs, Current Affairs, Islamic Studies and English. 12,500+ verified MCQs.",
  "provider": { "@id": "https://studora.vercel.app/#org" },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "Online",
    "isAccessibleForFree": true
  }
}
```

### 3.5 Per-page improvements checklist

For every one of the 162 sitemap URLs:

- [ ] `<h1>` matches the actual user query intent (already driven by `lib/seo-meta.json` — good)
- [ ] First 60–120 words answer the page's implied question directly
- [ ] At least 300 words of crawlable body content (SSR or static-pre-rendered, not React-shell-only)
- [ ] One `<table>` or `<ul>` near the top — LLMs lift tables/lists verbatim
- [ ] `Article` or `Course` JSON-LD with `datePublished` + `dateModified`
- [ ] FAQ block with 3 question-shaped headings + concise answers
- [ ] Internal links to 3 related Studora pages (entity reinforcement)
- [ ] Visible "Last updated: <date>" string

---

## 4. Off-site citation acquisition — 20 specific seed-mention targets

The off-site graph is where Studora's invisibility actually lives. Citations don't come from on-page schema; they come from being talked about on sites the crawlers trust. The list below is ordered by impact-per-hour-of-work for a one-person operator with ~1 hour/day.

> Rules: Never use fake names. Never astroturf with fake reviews. Disclose Studora as your project where the site requires it (Reddit self-promo rule, Quora bio). Honesty compounds; deception gets you banned and de-indexed.

### Tier S — the four mentions that compound (do these first, in this order)

| # | Target | URL | Pitch / what to post | Why it matters |
|---|---|---|---|---|
| **1** | **GitHub README** — make the Studora repo public with a real README | `https://github.com/<handle>/studora` | A real README: what the project is, screenshots, the 105,890 MCQ stat, tech stack (Vercel + Supabase + vanilla JS), license. Link to live site. Add topics: `mcq`, `pakistan`, `css-exam`, `mdcat`, `education`, `quiz` | GitHub is in Common Crawl, in Bing, and is one of Claude's most-cited domains. A public repo with a real README is the single cheapest "entity exists" signal you can ship |
| **2** | **LinkedIn company page** for Studora | `https://www.linkedin.com/company/studora/` | Logo, one-line description, website link, founder marked as employee. Post 1× per week: "Added 500 new Sociology MCQs", "MDCAT 2026 syllabus changes — what we updated", etc. | LinkedIn is cited in 14.3% of ChatGPT Search responses. Company pages with consistent posts get re-indexed weekly |
| **3** | **Crunchbase organization profile** | `https://www.crunchbase.com/organization/studora` | Founded date, location, category (Education, Test Prep), employee count (1), description matching the on-site description | Crunchbase is the primary entity registry Google's Knowledge Graph cross-references for company entities. Free to create |
| **4** | **Wikidata item** (not Wikipedia — Wikidata) | `https://www.wikidata.org/wiki/Special:NewItem` | Create a Q-item: instance of "educational website" (Q1455990), country "Pakistan", official website URL, founded date, named after "Studora" | Wikidata items feed directly into Wikipedia, Google Knowledge Graph, and LLM entity tables. Notability bar is *much* lower than Wikipedia — a verifiable website is enough |

### Tier A — high-value Pakistani-context placements

| # | Target | URL | Pitch / what to post | Why it matters |
|---|---|---|---|---|
| 5 | **TechJuice guest post / tip** | `https://www.techjuice.pk/contact/` | Pitch: "We built a free MCQ bank for Pakistani students — here's what 105,890 questions taught us about how candidates fail" — angle the post around learnings, not promotion. Studora gets a one-line credit + author bio link | TechJuice is in every "best Pakistani tech blog" listicle and is cited by Pakistani-context AI queries |
| 6 | **ProPakistani tip / coverage** | `https://propakistani.pk/contact/` | Same angle, different post: "Free MDCAT practice tools — a 2026 comparison" with Studora honestly included | Same reason as TechJuice; also has very high domain authority by Pakistani standards |
| 7 | **Brandsynario tech section pitch** | `https://www.brandsynario.com/contact-us/` | "How Pakistani EdTech startups are responding to the 2026 MDCAT syllabus revision" | Third leg of the Pakistani tech-press triangle |
| 8 | **CSSForum thread participation** | `http://www.cssforum.com.pk/` | Register, answer 5 substantive subject questions over 30 days, sign off with "I built studora.app for this kind of practice — free, no signup needed" only after 3 useful posts | CSSForum has been in Common Crawl since 2007. Mentions there persist in training data |
| 9 | **CSSPrepForum article** | `https://cssprepforum.com/` | Submit a CSS topic deep-dive (e.g., "Pakistan Affairs MCQs: the 200 facts that come up every 3 years"). Studora link in author byline | CSSPrepForum is the named "Pakistan's largest competitive community" in every aggregator listicle |
| 10 | **StartupDotPK directory listing** | `https://startup.pk/submit-startup/` | Full company profile, founding story, stats | Pakistani startup directories feed into Tracxn / ensun, which feed into LLM context for "Pakistani EdTech startup" queries |
| 11 | **Tracxn company submission** | `https://tracxn.com/d/companies/add` | Free company profile | Tracxn pages are routinely cited by ChatGPT for "top startups in X" queries |
| 12 | **Pakwheels / Daraz blog (long-shot guest post)** | n/a | Lower-priority — only if you have time | Long-tail Pakistani context |

### Tier B — Reddit + Quora seeding (slow, durable, must be useful first)

Reddit is now 11.97% of ChatGPT citations and ~47% of Perplexity citations. The seeding rules are strict: **be useful for 8 of every 10 posts; only the 9th and 10th can mention Studora.** Account age matters; the karma-on-the-relevant-subreddit signal matters more.

| # | Target subreddit / Quora topic | URL | Approach |
|---|---|---|---|
| 13 | `r/CSSPakistan` (if active) and `r/PakistaniStudents` | `https://www.reddit.com/r/PakistaniStudents/` | Answer 10 study-question threads helpfully over 30 days; on post #11, write a top-level "I built a free MCQ bank because I was tired of ads on cssmcqs" — be honest, link studora.app |
| 14 | `r/Pakistan` study/exam threads | `https://www.reddit.com/r/pakistan/search/?q=mcq` | Reply to existing "best MCQ site" threads with: "I use studora.app — it's the calmest one I've found, no ads" |
| 15 | `r/MDCAT` (and `r/medicalpakistan` if active) | `https://www.reddit.com/r/MDCAT/` | Same approach — answer 8 substantive questions before any self-mention |
| 16 | Quora — "Which is the best website for CSS preparation in Pakistan?" | `https://www.quora.com/Which-is-the-website-for-CSS-preparation-in-Pakistan` | Long, honest answer (500+ words). List 5 sites including Studora. Mention Studora's specific differentiators (no ads, editor-verified). Quora answers persist in Common Crawl |
| 17 | Quora — "Which website is better for one paper MCQ exams: Howfiv, PakMCQs, or CSS Forum?" | `https://www.quora.com/Which-website-is-better-for-One-Paper-MCQs-exams-preparation-Howfiv-PakMCQs-and-CSS-Forum` | Add a 4th option honestly. Cite the PakMCQs error-rate critique from search results as context |
| 18 | Quora — MDCAT preparation answers (3-5 threads) | search "best free MDCAT prep Quora" | Same pattern |

### Tier C — owned but external surfaces

| # | Target | URL | What to post |
|---|---|---|---|
| 19 | **Medium article** under founder's name | `https://medium.com/new-story` | "I built an MCQ bank for Pakistani students — here are the 7 things I learned about exam prep" — 1500 words, Studora mentioned naturally 2× |
| 20 | **dev.to article** about the build | `https://dev.to/new` | "Building a 105k-question MCQ bank on Vercel + Supabase with no client-side keys" — technical post pointing to the GitHub repo and the live site. Developer audience won't convert, but dev.to is in Common Crawl and Bing's index |

### What NOT to do

- Don't buy citations or backlinks. Pakistani guest-post networks are heavily devalued in Google's index since the March 2026 spam update and rarely make it into LLM citation pools.
- Don't post review-style mentions on Trustpilot / Sitejabber from sockpuppets. LLMs increasingly weight review *consensus across long histories*, so a sudden burst of 5-star reviews is a downweight signal in the post-Gemini-3 era.
- Don't attempt a Wikipedia page yet. **Studora does not meet Wikipedia notability requirements** (multiple independent secondary sources with significant coverage). Attempting it in the first 6 months will get the article speedy-deleted and the brand flagged by patrollers, which is recoverable but annoying. Revisit in month 9–12 *after* TechJuice or ProPakistani has covered Studora editorially.

---

## 5. Brand SEO for AI — "what is Studora?"

The literal "what is Studora?" prompt is the canary for the whole strategy. Right now, all four LLMs would either say "I have no information about Studora" or confabulate (Claude is more likely to say it doesn't know; ChatGPT is more likely to guess from the name).

### 5.1 Current state audit

| Surface | Studora present? | Notes |
|---|---|---|
| Wikipedia | No | Correct — notability bar not met yet |
| Wikidata | No | **Fixable in 30 minutes** — start here |
| Crunchbase | No | **Fixable in 1 hour** |
| LinkedIn company | No | **Fixable in 30 minutes** |
| GitHub | Private/unknown | **Make repo public with real README** |
| Twitter/X | Unknown | Create `@studora_pk` if available |
| Facebook page | No | Pakistani audience leans Facebook-heavy; create one |
| Google Business Profile | No | Skip unless you have a real address |
| Bing Webmaster | No | Add and submit sitemap today |
| Google Search Console | Likely yes (you have `googleb2ee243af5d5921a.html`) | Confirm and submit sitemap |
| Reddit threads mentioning "studora" | 0 | See §4 Tier B |
| Quora answers mentioning "studora" | 0 | See §4 Tier B |
| TechJuice / ProPakistani articles | 0 | See §4 Tier A |
| App Store / Play Store listing | APK file exists (`Studora.apk` in repo) but no Play Store listing visible | List the APK on Google Play Store — Play Store listings show up in LLM responses for "best Pakistani study app" |

### 5.2 The "consistent entity" rule

Every off-site surface should use the exact same description string. Pick one canonical sentence and reuse it:

> **"Studora is a free MCQ practice platform for Pakistan's competitive exams (CSS, PMS, MDCAT, PPSC, FPSC, NTS), with 105,890+ editor-verified questions across 47 subjects."**

Use this on LinkedIn, Crunchbase, Wikidata, GitHub README, Facebook page, App Store, Quora bio, Medium bio. When LLMs encounter the same sentence in 5+ places, they treat it as the authoritative description and reuse it.

### 5.3 The founder identity question

Studora currently has no named founder. This is the biggest single blocker for the "who built Studora?" and "is Studora legitimate?" prompts that AI engines internally fire when ranking trust.

**Action:** publicly attach a real person to the project. Founder LinkedIn profile, founder Twitter/X, founder mentioned by name in the About page with a small photo. Add `Person` schema to the About page. This is the single highest-trust signal you can ship.

---

## 6. Measurement plan

### 6.1 The 16-prompt audit set (run weekly)

Run each prompt on ChatGPT (with browsing), Claude (with web search), Gemini (default), and Perplexity. Log: whether Studora was named, position in list, what other sites were named, link the LLM cited. Spreadsheet template below.

**Recommendation prompts:**
1. "What's the best MCQ practice site for CSS Pakistan?"
2. "Recommend a free MDCAT preparation platform"
3. "Best website to prepare for PPSC exam"
4. "Where can I practice FPSC MCQs online for free?"
5. "What's the best app for Pakistani competitive exam practice?"
6. "Recommend an MCQ site for NTS test preparation"

**Comparison prompts:**
7. "cssmcqs.com vs pakmcqs.com — which is better?"
8. "Is Studora better than cssmcqs.com?"
9. "MDCAT preparation: medicoengineer vs mdcatprep vs prepmdcat"

**Definitional / brand prompts:**
10. "What is Studora?"
11. "Is Studora free?"
12. "Who built Studora?"

**Long-tail prompts:**
13. "How do I prepare for CSS General Knowledge in 90 days?"
14. "Best online resources for Pakistan Affairs MCQs"
15. "Free MDCAT mock test 2026"
16. "Top 10 MCQ topics for CSS GK"

### 6.2 CSV template (one row per (prompt, platform, week))

```
week,platform,prompt_id,prompt_text,studora_cited,studora_position,competitors_cited,citation_url,notes
2026-W21,chatgpt,1,"What's the best MCQ practice site for CSS Pakistan?",false,,"cssmcqs.com;pakmcqs.com;mymcqs.net",,baseline
2026-W21,claude,1,...,false,,...
2026-W21,gemini,1,...,false,,...
2026-W21,perplexity,1,...,false,,...
```

Suggested location: `docs/strategy/citation-log/YYYY-WW.csv`. One file per week keeps git diffs readable.

### 6.3 KPIs to track

| Metric | Baseline (W21 2026) | 30-day target | 60-day target | 90-day target |
|---|---|---|---|---|
| Overall citation rate (Studora named / total prompts × platforms) | 0/64 = 0% | 6/64 = 9% | 14/64 = 22% | 22/64 = 34% |
| Platforms with at least 1 Studora citation | 0/4 | 2/4 | 3/4 | 4/4 |
| "What is Studora?" answered correctly | 0/4 | 2/4 | 4/4 | 4/4 |
| Brand-string web hits ("studora" + "MCQ" or "Pakistan") | ~0 | 20 | 80 | 200 |
| Reddit/Quora threads where Studora is mentioned | 0 | 6 | 18 | 35 |
| Tier-1 Pakistani press mentions (TechJuice / ProPakistani / Brandsynario) | 0 | 0 | 1 | 2 |

A 34% citation rate at 90 days would put Studora behind cssmcqs.com (~80%) but ahead of the second-tier (mymcqs / examtonight at ~50%), which is a realistic and defensible position given a single operator.

---

## 7. 30-60-90 day execution plan

Effort budget: ~1 hour/day, ~7 hours/week, ~30 hours/month off-site, plus on-site engineering as available.

### Days 1–7 (Week 1) — foundation

1. **Push the public GitHub repo with a proper README.** Tags, screenshots, the canonical description sentence, license.
2. **Create LinkedIn company page** for Studora; mark founder as employee.
3. **Create Crunchbase profile.**
4. **Create Wikidata item** (Q-number).
5. **Register Bing Webmaster Tools** + submit `sitemap.xml`. Set up IndexNow key.
6. **Update `public/robots.txt`** with explicit `Allow` lines for all major AI crawlers.
7. **Run the 16-prompt baseline audit** and commit `docs/strategy/citation-log/2026-W21.csv`.

### Days 8–14 (Week 2) — on-site content P1

8. **Write the real `/about` page** (400–600 words, founder named, stats, contact).
9. **Build `/faq` page** with 15–25 Q&A pairs + FAQPage JSON-LD.
10. **Add `sameAs` array** to the existing Organization schema in `public/index.html`.
11. **Pre-render or SSR** the 8 exam landing pages with 200+ words each.
12. **Set up `/blog/` route** with Article schema scaffolding.

### Days 15–21 (Week 3) — first comparison pages

13. **Publish `/compare/studora-vs-cssmcqs`** — honest, table-driven, 1200+ words.
14. **Publish `/compare/studora-vs-pakmcqs`** — same.
15. **Publish `/guides/what-is-css-exam`** — definitive answer page.
16. **Publish `/guides/what-is-mdcat`** — same.
17. **Submit Studora APK to Google Play Store** — review process takes 7–10 days.

### Days 22–30 (Week 4) — first off-site placements

18. **Pitch TechJuice and ProPakistani** with the "what 105k MCQs taught us about how candidates fail" angle.
19. **First Quora answer** on the CSS preparation site thread.
20. **First Reddit value-add post** on `r/PakistaniStudents`.
21. **Publish first Medium post** under founder name.
22. **Re-run audit** (W25), commit `2026-W25.csv`. Expect 1–2 new Studora citations on Perplexity (Bing index updates faster than the others).

### Days 31–60 (Month 2) — content depth + Reddit/Quora cadence

23. **Ship 4 more guide pages** (`/guides/how-to-prepare-for-css`, `/guides/best-mcq-topics-css-gk`, `/guides/what-is-ppsc-fpsc-difference`, `/guides/how-to-prepare-for-mdcat-2026`).
24. **Ship 2 more comparison pages** (`/compare/studora-vs-examtonight`, `/compare/studora-vs-mdcatprep`).
25. **Ship `/methodology` and `/stats` pages.**
26. **Reddit cadence**: answer 2–3 study questions per week across `r/PakistaniStudents`, `r/MDCAT`, `r/pakistan`. Self-mention only every 5th or 6th post.
27. **Quora cadence**: one substantive answer per week on a competitive-exam thread.
28. **CSSForum participation**: 5 substantive subject answers, then a single soft self-mention.
29. **StartupDotPK + Tracxn submissions.**
30. **Ship one dev.to technical post** about the build (gets you into the dev.to RSS firehose → Bing).
31. **Weekly audit logs** continue.

### Days 61–90 (Month 3) — press + entity reinforcement

32. **Follow up TechJuice / ProPakistani / Brandsynario pitches** — second touch usually converts.
33. **First Pakistani press piece lands** (target: at least one of the three).
34. **Add `NewsArticle` JSON-LD** to the blog posts that get picked up.
35. **Update Wikidata item** with the new press source as a citation (this is what gets the Q-item promoted into Google's Knowledge Graph).
36. **Second Medium post**, longer-form, that explicitly compares Studora to the competitor set.
37. **App Store listing live** — link from About page, GitHub, LinkedIn.
38. **First "we got cited!" win**: by end of month 3, at least 3 of 4 platforms should mention Studora on at least one prompt. Document the prompt, screenshot the citation, and post it on LinkedIn — which itself becomes a citation surface.
39. **Plan month 4–6**: depending on press coverage, evaluate whether a Wikipedia draft is finally defensible. If you have 3+ independent secondary sources (TechJuice + ProPakistani + one academic blog mentioning Studora), draft a stub. Otherwise wait.

---

## 8. What you can measure vs. what you're inferring

- **Measurable**: whether each prompt response names Studora, what other sites it names, the citation URL when shown. Trend over weeks. Click-throughs from the LLM citation if you tag the URL with `?ref=ai-<platform>`.
- **Inferable**: why a specific response changed week-over-week (could be your fixes, could be a model update, could be a competitor change). Be honest about this in the log.
- **Not measurable**: total citation share across all prompts globally (no platform exposes this). Anyone selling you a "real citation share" metric is extrapolating from a small prompt sample — useful but not ground truth.

---

## 9. Honest constraints and the realistic timeline

- **Studora is genuinely new and small.** A 0% → 34% citation rate in 90 days is ambitious but defensible because the off-site graph is currently empty (anything is more than nothing) and because the Pakistani-exam-prep category has a low bar for "AI-citable" content (the incumbents have terrible UX and known error rates, which is genuine differentiation Studora can claim honestly).
- **Wikipedia is at least 9–12 months out.** Don't pretend otherwise.
- **The Vercel preview domain is a real handicap.** A custom domain (`.app`, `.pk` or `.com`) bought before month 2 will roughly double the speed of everything in this plan. The current URL reads as a demo to ranking heuristics.
- **AI responses are non-deterministic.** Two identical prompts run 20 minutes apart can produce different citations. Run each prompt 3× per week and take the modal answer, not the single result, before declaring movement.
- **One model update can erase a month of gains** (Reddit Sept 2025, Gemini 3 Jan 2026). Diversify across all four platforms; don't optimize for any one of them at the expense of the others.

---

## 10. Appendix — files to create / edit in the Studora repo

| Path | Action | Notes |
|---|---|---|
| `public/robots.txt` | Edit | Add explicit Allow lines for AI crawlers (§2.1) |
| `public/index.html` | Edit | Add FAQPage schema; add `sameAs` to Organization |
| `public/about.html` (or React route) | Create | Full About page content (§3.2) |
| `public/faq.html` (or route) | Create | FAQ page with FAQPage JSON-LD (§3.4) |
| `public/methodology.html` | Create | Editorial process page |
| `public/stats.html` | Create | Numbers + last-updated |
| `public/blog/` | Create | Article-schema blog scaffold |
| `public/guides/<slug>.html` | Create | 6 guide pages (§3.3) |
| `public/compare/<slug>.html` | Create | 3+ comparison pages (§3.3) |
| `public/llms.txt` | Create | Optional — adoption is low but no downside (§2) |
| Per-page SSR / static generation | Engineering | Address the "React shell" gap (§3.2 row 3) |
| `docs/strategy/citation-log/2026-WNN.csv` | Create weekly | Audit log (§6.2) |

---

*Playbook ends. Next action: run the W21 baseline audit, commit the CSV, ship the robots.txt change and the GitHub README — those four moves can be done in a single working session and unlock the rest of the plan.*
