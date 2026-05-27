-- ============================================================
-- Phase 2: Safe Delete Request RLS Patch
-- SkillSaathi Campus Peer Learning
-- ============================================================
-- Safe to re-run: uses DROP POLICY IF EXISTS before CREATE POLICY.
-- Does NOT drop tables, delete data, or remove existing policies.
-- ============================================================

-- Add DELETE RLS policy for help_requests.
-- Only the request creator can delete their own request.
-- Deletion is restricted to status IN ('open', 'closed').
-- Accepted and solved requests cannot be deleted via this policy.
-- Feedback rows referencing this request will be cascaded by the FK.

DROP POLICY IF EXISTS "Allow request creators to delete their own open or closed requests" ON public.help_requests;

CREATE POLICY "Allow request creators to delete their own open or closed requests"
ON public.help_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  AND status IN ('open', 'closed')
);

-- ============================================================
-- Verification:
-- After running this patch, navigate to:
--   Supabase Dashboard → Authentication → Policies → help_requests
-- You should see a new DELETE policy listed.
-- ============================================================
