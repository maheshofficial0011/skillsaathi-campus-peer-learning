-- ==========================================
-- PHASE 3: DOUBTS MODULE SQL PATCH
-- Safe to run on an existing Supabase project.
-- Does NOT drop tables or delete existing data.
-- ==========================================

-- ──────────────────────────────────────────
-- 1. Create doubt_posts table
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doubt_posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'General',
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  is_anonymous     BOOLEAN     NOT NULL DEFAULT false,
  status           TEXT        NOT NULL DEFAULT 'open',
  created_by       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  solved_answer_id UUID        NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_doubt_status CHECK (status IN ('open', 'answered', 'solved', 'closed'))
);

-- ──────────────────────────────────────────
-- 2. Create doubt_answers table
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doubt_answers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id    UUID        NOT NULL REFERENCES public.doubt_posts(id) ON DELETE CASCADE,
  answer_text TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_accepted BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- 3. Add deferred FK from doubt_posts -> doubt_answers
--    (safe: only adds the constraint if it does not already exist)
-- ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'doubt_posts_solved_answer_id_fkey'
  ) THEN
    ALTER TABLE public.doubt_posts
      ADD CONSTRAINT doubt_posts_solved_answer_id_fkey
      FOREIGN KEY (solved_answer_id)
      REFERENCES public.doubt_answers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────
-- 4. updated_at triggers (safe: DROP IF EXISTS first)
-- ──────────────────────────────────────────
DROP TRIGGER IF EXISTS on_doubt_post_updated ON public.doubt_posts;
CREATE TRIGGER on_doubt_post_updated
  BEFORE UPDATE ON public.doubt_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_doubt_answer_updated ON public.doubt_answers;
CREATE TRIGGER on_doubt_answer_updated
  BEFORE UPDATE ON public.doubt_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ──────────────────────────────────────────
-- 5. Enable Row Level Security
-- ──────────────────────────────────────────
ALTER TABLE public.doubt_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_answers ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────
-- 6. RLS Policies for doubt_posts
-- ──────────────────────────────────────────

-- 6a. Authenticated users can read all doubt posts
DROP POLICY IF EXISTS "Authenticated users can read doubt posts" ON public.doubt_posts;
CREATE POLICY "Authenticated users can read doubt posts"
  ON public.doubt_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- 6b. Authenticated users can create doubts (created_by must be self)
DROP POLICY IF EXISTS "Authenticated users can create doubt posts" ON public.doubt_posts;
CREATE POLICY "Authenticated users can create doubt posts"
  ON public.doubt_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 6c. Doubt creator can update their own doubt (edit title/desc/category/tags/status)
DROP POLICY IF EXISTS "Doubt creator can update their own doubt" ON public.doubt_posts;
CREATE POLICY "Doubt creator can update their own doubt"
  ON public.doubt_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ──────────────────────────────────────────
-- 7. RLS Policies for doubt_answers
-- ──────────────────────────────────────────

-- 7a. Authenticated users can read all answers
DROP POLICY IF EXISTS "Authenticated users can read doubt answers" ON public.doubt_answers;
CREATE POLICY "Authenticated users can read doubt answers"
  ON public.doubt_answers
  FOR SELECT
  TO authenticated
  USING (true);

-- 7b. Authenticated users can answer open/answered doubts (not closed/solved)
DROP POLICY IF EXISTS "Authenticated users can answer open doubts" ON public.doubt_answers;
CREATE POLICY "Authenticated users can answer open doubts"
  ON public.doubt_answers
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

-- 7c. Users can update their own answers while doubt is still open/answered
DROP POLICY IF EXISTS "Users can update their own answers" ON public.doubt_answers;
CREATE POLICY "Users can update their own answers"
  ON public.doubt_answers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.status IN ('open', 'answered')
    )
  )
  WITH CHECK (auth.uid() = created_by);

-- 7d. Doubt creator can mark one answer as accepted (is_accepted = true)
DROP POLICY IF EXISTS "Doubt creator can accept an answer" ON public.doubt_answers;
CREATE POLICY "Doubt creator can accept an answer"
  ON public.doubt_answers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.created_by = auth.uid()
        AND dp.status IN ('open', 'answered')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doubt_posts dp
      WHERE dp.id = doubt_id
        AND dp.created_by = auth.uid()
    )
  );
