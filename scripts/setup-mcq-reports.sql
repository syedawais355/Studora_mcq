-- One-time table setup for the MCQ report feature.
-- Run this in the Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (CREATE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.mcq_reports (
  id          BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN (
                'wrong_answer', 'typo', 'outdated', 'unclear', 'offensive', 'other'
              )),
  details     TEXT,
  ip_hash     TEXT,
  user_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for triaging by question
CREATE INDEX IF NOT EXISTS mcq_reports_qid_idx
  ON public.mcq_reports (question_id);

-- Dedupe — one anonymous report per (question, ip).
CREATE UNIQUE INDEX IF NOT EXISTS mcq_reports_qid_iphash_unique
  ON public.mcq_reports (question_id, ip_hash)
  WHERE ip_hash IS NOT NULL;

-- Lock the table down. Only the server (service_role) reads / writes; the
-- anon/authenticated keys never touch this table directly.
ALTER TABLE public.mcq_reports ENABLE ROW LEVEL SECURITY;
