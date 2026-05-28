-- ==========================================
-- PHASE 3 DOUBT LIKES & PINS PATCH
-- Adds: answer likes, reply likes, is_pinned column.
-- Safe to run on existing Supabase project.
-- Does NOT drop tables, does NOT delete existing data.
-- Run AFTER phase3-doubts-patch.sql and phase3-doubt-answer-ratings-patch.sql.
-- ==========================================

-- ──────────────────────────────────────────
-- 1. Add pin columns to doubt_answers
-- ──────────────────────────────────────────
ALTER TABLE public.doubt_answers
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.doubt_answers
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- ──────────────────────────────────────────
-- 2. RLS policy: doubt creator can pin/unpin answers
--    (open, answered, or solved doubts only)
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Doubt creator can pin answers" ON public.doubt_answers;
CREATE POLICY "Doubt creator can pin answers"
  ON public.doubt_answers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.created_by = auth.uid()
        AND dp.status IN ('open', 'answered', 'solved')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.created_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- 3. Update reply INSERT policy to allow replies on SOLVED doubts
--    (previously only 'open' and 'answered' were permitted)
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can post replies on open doubts" ON public.doubt_answer_replies;
CREATE POLICY "Authenticated users can post replies on open doubts"
  ON public.doubt_answer_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.status IN ('open', 'answered', 'solved')
    )
  );

-- ──────────────────────────────────────────
-- 4. Create public.doubt_answer_likes
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doubt_answer_likes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id   UUID        NOT NULL REFERENCES public.doubt_answers(id) ON DELETE CASCADE,
  doubt_id    UUID        NOT NULL REFERENCES public.doubt_posts(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_answer_like UNIQUE (answer_id, created_by)
);

ALTER TABLE public.doubt_answer_likes ENABLE ROW LEVEL SECURITY;

-- RLS: any authenticated user can read answer likes
DROP POLICY IF EXISTS "Authenticated users can read answer likes" ON public.doubt_answer_likes;
CREATE POLICY "Authenticated users can read answer likes"
  ON public.doubt_answer_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: authenticated users can like any answer (duplicate prevented by UNIQUE constraint)
DROP POLICY IF EXISTS "Authenticated users can like answers" ON public.doubt_answer_likes;
CREATE POLICY "Authenticated users can like answers"
  ON public.doubt_answer_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS: users can only remove their own like
DROP POLICY IF EXISTS "Users can unlike their own answer like" ON public.doubt_answer_likes;
CREATE POLICY "Users can unlike their own answer like"
  ON public.doubt_answer_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- ──────────────────────────────────────────
-- 5. Create public.doubt_reply_likes
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doubt_reply_likes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id    UUID        NOT NULL REFERENCES public.doubt_answer_replies(id) ON DELETE CASCADE,
  doubt_id    UUID        NOT NULL REFERENCES public.doubt_posts(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_reply_like UNIQUE (reply_id, created_by)
);

ALTER TABLE public.doubt_reply_likes ENABLE ROW LEVEL SECURITY;

-- RLS: any authenticated user can read reply likes
DROP POLICY IF EXISTS "Authenticated users can read reply likes" ON public.doubt_reply_likes;
CREATE POLICY "Authenticated users can read reply likes"
  ON public.doubt_reply_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: authenticated users can like any reply
DROP POLICY IF EXISTS "Authenticated users can like replies" ON public.doubt_reply_likes;
CREATE POLICY "Authenticated users can like replies"
  ON public.doubt_reply_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS: users can only remove their own reply like
DROP POLICY IF EXISTS "Users can unlike their own reply like" ON public.doubt_reply_likes;
CREATE POLICY "Users can unlike their own reply like"
  ON public.doubt_reply_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
