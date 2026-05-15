# MCQBank — Secure Production Architecture

## Security Architecture

```
BEFORE (Insecure):
  Browser ──────────────────────────────────────► Supabase
              (anon key visible in DevTools)

AFTER (This project):
  Browser ──► /api/questions ──► Supabase
              ↑
              Your server holds ALL secrets in
              environment variables. Browser never
              sees any key. Ever.
```

### What the browser sees in DevTools:
```
GET /api/categories          ← Your own domain
GET /api/questions?...       ← No key. No Supabase URL.
GET /api/search?q=...        ← Just clean parameters
```

### What nobody can do now:
- ❌ Cannot find Supabase URL (not in any JS file)
- ❌ Cannot find any API key (server env only)
- ❌ Cannot query Supabase directly (service key never leaves server)
- ❌ Cannot bulk-dump data (rate limiting: 60 req/min per IP)
- ❌ Cannot query from another site (CORS + origin validation)
- ❌ Cannot inject SQL (all inputs validated and typed before DB call)
- ❌ Cannot access admins table (RLS + we never expose it)
- ❌ Cannot exceed pagination (max 100 per page enforced server-side)

---

## Project Structure

```
mcqbank-secure/
├── lib/                         ← Shared server-only helpers (not exposed)
│   ├── middleware.js            ← Rate limiting, CORS, origin check, withGuards()
│   └── supabase.js              ← Shared service-role client
├── api/
│   ├── categories.js            ← GET /api/categories
│   ├── exams.js                 ← GET /api/exams
│   ├── exam-categories.js       ← GET /api/exam-categories?exam_id=N
│   ├── questions.js             ← GET /api/questions?category_id=N&...
│   ├── quiz.js                  ← GET /api/quiz?category_id=N
│   └── search.js                ← GET /api/search?q=...
├── public/
│   ├── index.html
│   └── assets/
│       ├── css/main.css
│       └── js/
│           ├── client.js        ← Hits /api/* only
│           └── app.js
├── .env.example                 ← Copy to .env, fill in secrets
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

---

## Deployment on Vercel (Free — Recommended)

### Step 1 — Get your Service Role Key

1. Go to https://supabase.com/dashboard/project/xwvvxhkfndchpbyyaych/settings/api
2. Under **Project API keys**, copy **service_role** (secret key)
3. Keep this key PRIVATE — never share it, never commit it

### Step 2 — Push to GitHub

```bash
cd mcqbank-secure
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com then:
git remote add origin https://github.com/YOUR_USERNAME/mcqbank.git
git push -u origin main
```

### Step 3 — Deploy on Vercel

1. Go to https://vercel.com → New Project → Import your GitHub repo
2. **Before deploying**, go to **Environment Variables** and add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xwvvxhkfndchpbyyaych.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `your_service_role_key` |
| `ALLOWED_ORIGINS` | `https://your-project.vercel.app` (update after first deploy) |

3. Click **Deploy**
4. After deploy, update `ALLOWED_ORIGINS` to your actual Vercel URL
5. Redeploy once

### Step 4 — Lock down Supabase

In your Supabase Dashboard → Settings → API:
- Under **Allowed CORS origins**, add ONLY your Vercel URL:
  ```
  https://mcqbank.vercel.app
  ```
- This means even if someone finds your Supabase URL, their browser
  requests will be blocked by Supabase's own CORS policy

---

## Rate Limits (configured in middleware.js)

| Endpoint | Limit |
|---|---|
| /api/categories | 60 req / min per IP |
| /api/exams | 60 req / min per IP |
| /api/exam-categories | 60 req / min per IP |
| /api/questions | 120 req / min per IP |
| /api/quiz | 30 req / min per IP |
| /api/search | 20 req / min per IP |

---

## Adding Google AdSense

Replace placeholder divs in `public/index.html`:

```html
<!-- Replace: -->
<div class="ad-placeholder ad-leaderboard">...</div>

<!-- With: -->
<ins class="adsbygoogle"
     style="display:block;width:100%;height:90px"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="XXXXXXXXXX"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

Add in `<head>`:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

---

## Custom Domain

In Vercel → your project → Settings → Domains → Add your domain.
Then update `ALLOWED_ORIGINS` env var to your custom domain and redeploy.

---

Built with Vercel Serverless Functions + Supabase + zero exposed credentials.
