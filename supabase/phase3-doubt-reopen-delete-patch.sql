-- ============================================================
-- Phase 3 Doubts: Reopen + Safe Delete Patch
-- ============================================================
-- Safe to run multiple times (DROP POLICY IF EXISTS before CREATE).
-- Does NOT drop any tables or delete any data.
-- ============================================================

-- ------------------------------------------------------------
-- 1. DELETE policy: creator can delete their own doubt
--    only when status is 'open' or 'closed'.
--    Note: doubt_answers cascade-delete if they exist, so the UI
--    must also block deletion when answer_count > 0.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Creator can delete own open or closed doubt" ON public.doubt_posts;

CREATE POLICY "Creator can delete own open or closed doubt"
  ON public.doubt_posts
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND status IN ('open', 'closed')
  );

-- ------------------------------------------------------------
-- 2. Ensure creator UPDATE policy exists (for reopen).
--    The existing policy should already cover this. We add it
--    safely in case the column-level check does not already allow
--    setting status back from 'closed'.
--    If the policy already exists with the same name, drop first.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Creator can update own doubt" ON public.doubt_posts;

CREATE POLICY "Creator can update own doubt"
  ON public.doubt_posts
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ------------------------------------------------------------
-- 3. CASCADE: ensure doubt_answers deletion cascades when
--    parent doubt_post is deleted. This should already be set
--    in the schema but we confirm it here as a note.
--    (No DDL change needed if FK already has ON DELETE CASCADE)
-- ------------------------------------------------------------

-- To verify cascade is set, run:
-- SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name,
--        rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'doubt_posts';
