-- ============================================================
-- Phase 3 Doubts: Safe Delete Patch
-- ============================================================
-- PURPOSE : Adds a DELETE row-level-security policy so that
--           only the creator can delete their own doubt, and
--           only when status is 'open' or 'closed'.
--
-- SAFETY  : Safe to run multiple times.
--           Uses DROP POLICY IF EXISTS before CREATE POLICY.
--           Does NOT drop any tables.
--           Does NOT delete or modify any data rows.
-- ============================================================

-- ------------------------------------------------------------
-- 1. DELETE policy: creator can delete own doubt only when
--    status is 'open' or 'closed'.
--
--    NOTE: The UI additionally enforces answer_count === 0
--    before showing the Delete button. The DB policy provides
--    a second layer of enforcement at the row level.
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
-- 2. UPDATE policy: ensure creator can update their own doubt.
--    This covers status transitions: open→answered, answered→solved,
--    open→closed, closed→open, closed→answered (reopen).
--    DROP first to avoid duplicate-policy error on re-run.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Creator can update own doubt" ON public.doubt_posts;

CREATE POLICY "Creator can update own doubt"
  ON public.doubt_posts
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- VERIFY (optional — run manually to confirm policies exist):
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'doubt_posts';
-- ============================================================
