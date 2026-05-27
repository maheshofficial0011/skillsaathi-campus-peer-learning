-- ==========================================================
-- Safe SQL Patch: Phase 2 feedback edit and trust score trigger updates
-- ==========================================================

-- 1. Drop old triggers if they exist
DROP TRIGGER IF EXISTS on_feedback_inserted ON public.feedback;
DROP TRIGGER IF EXISTS on_feedback_changed ON public.feedback;

-- 2. Apply updated trust score trigger that fires AFTER INSERT OR UPDATE
CREATE TRIGGER on_feedback_changed
  AFTER INSERT OR UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_receiver_trust_score();

-- 3. Drop old update policy if it exists
DROP POLICY IF EXISTS "Allow feedback creators to update their feedback" ON public.feedback;

-- 4. Create new RLS Update Policy on public.feedback
-- Authenticated users can only update reviews they created.
-- Policy restricts updates by checking auth.uid() equals created_by.
CREATE POLICY "Allow feedback creators to update their feedback"
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
