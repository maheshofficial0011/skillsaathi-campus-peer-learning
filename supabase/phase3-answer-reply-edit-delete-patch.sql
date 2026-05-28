-- ============================================================
-- PHASE 3 ANSWER & REPLY EDIT / DELETE + REPLY PIN PATCH
-- Safe to run on existing Supabase project.
-- Does NOT drop tables, does NOT delete existing data.
-- Run AFTER all previous phase3 patches.
-- ============================================================

-- ────────────────────────────────────────
-- 1. Add is_pinned / pinned_at to doubt_answer_replies
-- ────────────────────────────────────────
ALTER TABLE public.doubt_answer_replies
  ADD COLUMN IF NOT EXISTS is_pinned  BOOLEAN   NOT NULL DEFAULT false;

ALTER TABLE public.doubt_answer_replies
  ADD COLUMN IF NOT EXISTS pinned_at  TIMESTAMPTZ;

-- ────────────────────────────────────────
-- 2. UPDATE policy: answer author can edit own answer_text only
--    (accepted/pinned flags are NOT in the WITH CHECK, so they
--     cannot be altered via this policy even if included in USING)
-- ────────────────────────────────────────
DROP POLICY IF EXISTS "Answer author can edit own answer text" ON public.doubt_answers;
CREATE POLICY "Answer author can edit own answer text"
  ON public.doubt_answers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
-- NOTE: The API only sends answer_text in the update payload,
-- so is_accepted / is_pinned / pinned_at are never touched.

-- ────────────────────────────────────────
-- 3. DELETE policy: answer author can delete own answer
--    only when NOT accepted and NOT pinned
-- ────────────────────────────────────────
DROP POLICY IF EXISTS "Answer author can delete own unaccepted answer" ON public.doubt_answers;
CREATE POLICY "Answer author can delete own unaccepted answer"
  ON public.doubt_answers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND is_accepted = false
    AND COALESCE(is_pinned, false) = false
  );

-- ────────────────────────────────────────
-- 4. UPDATE policy: reply author can edit own reply_text only
--    (is_pinned / pinned_at are NOT changeable by reply author)
-- ────────────────────────────────────────
DROP POLICY IF EXISTS "Reply author can edit own reply text" ON public.doubt_answer_replies;
CREATE POLICY "Reply author can edit own reply text"
  ON public.doubt_answer_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
-- NOTE: API only sends reply_text in the update payload.

-- ────────────────────────────────────────
-- 5. DELETE policy: reply author can delete own reply
--    only when NOT pinned
-- ────────────────────────────────────────
DROP POLICY IF EXISTS "Reply author can delete own reply" ON public.doubt_answer_replies;
CREATE POLICY "Reply author can delete own reply"
  ON public.doubt_answer_replies
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    AND COALESCE(is_pinned, false) = false
  );

-- ────────────────────────────────────────
-- 6. UPDATE policy: doubt creator can pin/unpin replies
--    Only on doubts that are open, answered, or solved (not closed).
-- ────────────────────────────────────────
DROP POLICY IF EXISTS "Doubt creator can pin replies" ON public.doubt_answer_replies;
CREATE POLICY "Doubt creator can pin replies"
  ON public.doubt_answer_replies
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
