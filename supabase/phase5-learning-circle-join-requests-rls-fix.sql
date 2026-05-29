-- ====================================================================
-- PHASE 5.2: LEARNING CIRCLE JOIN REQUESTS MEMBERSHIP RLS POLICY FIX
-- ====================================================================

-- Drop any previous INSERT policies on learning_circle_members to avoid conflicts
DROP POLICY IF EXISTS "lcm_insert" ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow authenticated users to join circles as members" ON public.learning_circle_members;

-- Create the updated, safe, three-case INSERT policy
CREATE POLICY "lcm_insert"
ON public.learning_circle_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Case A: Normal user self-join/member creation (optional/legacy check, direct join disabled in UI)
  (
    user_id = auth.uid()
    AND role = 'member'
    AND EXISTS (
      SELECT 1
      FROM public.learning_circles c
      WHERE c.id = circle_id
        AND c.status = 'active'
    )
  )
  OR
  -- Case B: Circle owner accepts a join request and inserts the requester
  (
    role = 'member'
    AND public.is_learning_circle_owner(circle_id, auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.learning_circle_join_requests r
      WHERE r.circle_id = circle_id
        AND r.requester_id = user_id
        AND r.status = 'accepted'
    )
  )
  OR
  -- Case C: Circle creator bootstrap owner row during creation
  (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (
      SELECT 1
      FROM public.learning_circles c
      WHERE c.id = circle_id
        AND c.created_by = auth.uid()
    )
  )
);
