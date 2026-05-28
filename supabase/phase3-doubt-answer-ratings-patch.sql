-- ==========================================
-- PHASE 3 IMPROVEMENT PATCH
-- Fixes: doubt status auto-update, answer ratings, answer replies
-- Safe to run on an existing Supabase project.
-- Does NOT drop tables or delete existing data.
-- ==========================================

-- ──────────────────────────────────────────
-- FIX 1: Auto-update doubt status to 'answered' on first answer post
-- Uses SECURITY DEFINER so any authenticated user's answer triggers it,
-- bypassing the "creator-only" RLS on doubt_posts UPDATE.
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_doubt_first_answer()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.doubt_posts
  SET status = 'answered'
  WHERE id = NEW.doubt_id
    AND status = 'open';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_doubt_answer_posted ON public.doubt_answers;
CREATE TRIGGER on_doubt_answer_posted
  AFTER INSERT ON public.doubt_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_doubt_first_answer();

-- ──────────────────────────────────────────
-- NEW TABLE: public.doubt_answer_ratings
-- Allows the doubt creator to rate each answerer 1-10.
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doubt_answer_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id   UUID        NOT NULL REFERENCES public.doubt_answers(id) ON DELETE CASCADE,
  doubt_id    UUID        NOT NULL REFERENCES public.doubt_posts(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_answer_rating UNIQUE (answer_id, created_by),
  CONSTRAINT no_self_rating CHECK (created_by != receiver_id)
);

ALTER TABLE public.doubt_answer_ratings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS on_doubt_answer_rating_updated ON public.doubt_answer_ratings;
CREATE TRIGGER on_doubt_answer_rating_updated
  BEFORE UPDATE ON public.doubt_answer_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS: anyone authenticated can read ratings
DROP POLICY IF EXISTS "Authenticated users can read answer ratings" ON public.doubt_answer_ratings;
CREATE POLICY "Authenticated users can read answer ratings"
  ON public.doubt_answer_ratings
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: only the doubt creator can submit a rating, not for their own answers
DROP POLICY IF EXISTS "Doubt creator can rate answers" ON public.doubt_answer_ratings;
CREATE POLICY "Doubt creator can rate answers"
  ON public.doubt_answer_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND created_by != receiver_id
    AND EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.created_by = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.doubt_answers da
      WHERE da.id = answer_id
        AND da.created_by = receiver_id
        AND da.doubt_id = doubt_id
    )
  );

-- RLS: rating creator can update their own rating
DROP POLICY IF EXISTS "Rating creator can update their rating" ON public.doubt_answer_ratings;
CREATE POLICY "Rating creator can update their rating"
  ON public.doubt_answer_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ──────────────────────────────────────────
-- NEW TABLE: public.doubt_answer_replies
-- Allows any authenticated user to post follow-up / cross-questions
-- under an existing answer, while doubt is open or answered.
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doubt_answer_replies (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id    UUID        NOT NULL REFERENCES public.doubt_answers(id) ON DELETE CASCADE,
  doubt_id     UUID        NOT NULL REFERENCES public.doubt_posts(id) ON DELETE CASCADE,
  reply_text   TEXT        NOT NULL,
  created_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.doubt_answer_replies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS on_doubt_answer_reply_updated ON public.doubt_answer_replies;
CREATE TRIGGER on_doubt_answer_reply_updated
  BEFORE UPDATE ON public.doubt_answer_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS: any authenticated user can read replies
DROP POLICY IF EXISTS "Authenticated users can read doubt replies" ON public.doubt_answer_replies;
CREATE POLICY "Authenticated users can read doubt replies"
  ON public.doubt_answer_replies
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: any authenticated user can post a reply on open or answered doubts
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
        AND dp.status IN ('open', 'answered')
    )
  );

-- RLS: reply creator can update their own reply
DROP POLICY IF EXISTS "Reply creator can update their own reply" ON public.doubt_answer_replies;
CREATE POLICY "Reply creator can update their own reply"
  ON public.doubt_answer_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
