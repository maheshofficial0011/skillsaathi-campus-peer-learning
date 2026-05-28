-- ==========================================
-- PHASE 3 ACCEPT ANSWER FIX PATCH
-- Fixes: doubt creator can accept answers on solved doubts (multiple accepted answers).
-- Root cause: previous RLS USING clause blocked UPDATE when status = 'solved'.
-- Safe to run on existing Supabase project. Does NOT drop data.
-- ==========================================

-- Fix: allow doubt creator to accept answers when doubt is open, answered, OR solved.
-- This enables multiple accepted answers on the same doubt.
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

-- Verify: the updated policy is in place
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'doubt_answers'
  AND policyname = 'Doubt creator can accept an answer';
