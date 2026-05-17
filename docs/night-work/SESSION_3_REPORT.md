# Session 3 Report — Multi-Agent Hard-Mode Build

> Saved 2026-05-18. Read this first when picking up the next session.

---

## 🟢 Current production state

**https://studora.vercel.app** — live, stable, brand intact. Last deploy `studora-cq1tfc818-...vercel.app` is Ready in Production.

| | |
|---|---|
| PRs merged this session | 27 |
| Issues closed | 46 |
| Issues still open | 7 (all genuine future work, see below) |
| Agents dispatched | 14 across 4 waves |
| Functions on Vercel | 12 (Hobby plan limit) |

---

## What shipped (in chronological PR order)

| PR | Title | Type |
|---|---|---|
| #27 | Encode slug segments individually and harden the SEO middleware | Bug fix from Code Reviewer audit |
| #64 | Add a daily Question of the Day card to the home page | Feature |
| #65 | Streak freezes and a quiet weekly goal on the home card | Feature |
| #66 | Land seven critical accessibility fixes in one batch | A11y bug fixes |
| #68 | Add a Quick-Quiz Builder card to the home page | Feature |
| #69 | Bookmark folders for organising the saved shelf | Feature |
| #70 | Shareable result cards for finished quizzes (1200×630 PNG via @vercel/og) | Feature |
| #71 | Harden bookmark storage, rate-limit IP source, and SW cache writer | Security trio |
| #72 | Let the quiz page honour ?cat and ?n from the Quick-Quiz Builder | Follow-up bug |
| #73 | Self-host fonts to fix 0.4201 CLS and 1.2s FCP gap | Performance |
| #74 | Polish QOTD, quick-quiz, and personal-stats cards (paperclip, fold, swash) | Design |
| #75 | Give every visitor a private analytics page that reads only their own browser | Feature |
| #76 | Bug bash: cross-tab sync + rebind + recency + tab ARIA + sitemap fail-loud | Bug bash |
| #77 | Add topic mastery labels and onboarding-friendly weekly goal picker | Feature |
| #78 | Six first-paint wins: defer supabase, code-split routes, preload, SW key strip, critical CSS, squiggle SVG | Performance |
| #79 | Land four security improvements (CSP report-to, /api/report user_id, body allowlist, build-time SEO anchor check) | Security |
| #80 | Consolidate API: merge csp-report into report, results-page into share-card (14 → 12 functions for Hobby plan) | Infra |

---

## 4 waves of agents

### Wave 0 (review)
Five specialists ran in parallel: **Code Reviewer**, **Security Engineer**, **Accessibility Auditor**, **Performance Benchmarker**, **Trend Researcher**. Produced 32 audit findings filed as issues #19–#50 plus 13 engagement feature ideas as #51–#63.

### Wave 1 (build, contaminated)
Three Frontend Developers in parallel — but on the SHARED working tree. Their unstaged edits leaked into my own commit when I ran `git add -A` for an SW fix. Had to soft-reset and selectively unstage. Lesson saved to memory (`workflow_agents_first.md`): **always pass `isolation: "worktree"` to coding agents**.

### Wave 2 (build, isolated)
Three Frontend Developers in **isolated worktrees**. No contamination. PRs #68, #69, #70.

### Wave 3 (build, isolated)
Performance Benchmarker + Security Engineer + Frontend Developer + UI Designer in isolated worktrees. PRs #71, #73, #74, #75.

### Wave 4 (build, isolated)
Performance Benchmarker + Frontend Developer + Code Reviewer + Security Engineer in isolated worktrees. PRs #76, #77, #78, #79. Wave 4 perf PR conflicted with bug-bash PR and topic-mastery PR (overlapping main.js). Rebased manually.

### Wave 5 (consolidation)
Backend Architect agent merged 4 new functions into 2 to fit Vercel Hobby plan's 12-function cap. PR #80.

---

## What's deliberately NOT shipped (7 remaining open issues)

| # | Title | Blocker |
|---|---|---|
| 8  | Convert OG image SVG to PNG | Needs `rsvg-convert` install + format pick |
| 9  | Lighthouse 95+ baseline measurement | Want fresh per-page numbers post-PR #78 |
| 54 | Personal weekly progress email | Needs Resend / Postmark account credentials |
| 58 | Study-buddy private 1:1 pair | Engagement v2 — needs product call |
| 59 | Comeback nudge email | Depends on #54 |
| 61 | Daily-question discussion thread | Needs moderation budget commitment |
| 63 | Onboarding diagnostic quiz | Engagement v2 — needs 10-question pool tuned per exam track |

---

## Things only the human can do

1. **Revoke the leaked GitHub token** `ghp_AEbwy...` at https://github.com/settings/tokens. It's still active and cached in gh CLI keyring. Create a fresh one and `gh auth refresh`.
2. **Install the Vercel-GitHub integration** so PR merges to main auto-deploy. Today every deploy is a manual `vercel deploy --prod --yes` from a synced local main.
3. **Submit sitemap** to https://search.google.com/search-console and https://www.bing.com/webmasters. The 104-URL sitemap is at https://studora.vercel.app/sitemap.xml.
4. **Full Supabase data backup** via the dashboard. The schema dump exists at `/home/awais/mcqbank-backups/supabase-schema-20260516-045708.json` but the actual rows are not backed up (autonomous bulk-query was correctly blocked by the auto-mode classifier).

---

## Verification checklist (when you sit down to review)

- [ ] Open https://studora.vercel.app — hero loads with no font swap (CLS feels solid)
- [ ] Scroll the home page — QOTD card, Quick-Quiz card, "Today's notes" all stack cleanly
- [ ] Visit `/exams/css` → page title should be "CSS preparation — 30,165 MCQs on Studora"
- [ ] Visit `/analytics` → shows your local stats
- [ ] Visit `/mistakes` → empty for fresh visitor, populated after answering questions wrong
- [ ] Open DevTools Network → no `fonts.googleapis.com` requests
- [ ] Open DevTools Application → Service Workers → `studora-v2-…` registered + activated
- [ ] Tab through the nav → every link is focusable, hamburger appears below 1040px
- [ ] Pick a wrong answer on `/quiz` → check `/mistakes` shows it; pick the right one to clear it
- [ ] Set weekly goal → progress bar shows on home
- [ ] Bookmark a question → save it to a folder on `/bookmarks`

---

## Pitfalls to remember

- The leaked token is still cached in gh CLI. The classifier will block re-use after my own warning unless explicitly re-authorized.
- Force-push is soft-blocked by the classifier without explicit OK each time — even on a feature branch you just created.
- `vercel deploy --prod --yes` uploads from CWD, NOT from GitHub. Always sync local main first.
- gh merge does NOT auto-close issues referenced via `Closes #X` in PR BODY when the strategy is `--merge` (not `--squash`). Merge commits don't carry the PR body text. Close issues manually with `gh issue close N --comment "Shipped in #M …"`.
- Storage schema is at v4. Bumping it loses existing user streaks/bookmarks/mistakes (intentional clean-slate on schema change).
- Old `mcqbank.vercel.app` still serves its last deploy. Don't deploy to it.
