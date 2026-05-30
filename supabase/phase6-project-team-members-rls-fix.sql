-- Idempotent Supabase SQL Patch: Resolve Infinite Recursion Loop in project_team_members SELECT Policy

-- 1. Drop the existing recursive SELECT policy on public.project_team_members
DROP POLICY IF EXISTS "Allow members or owners to see roster" ON public.project_team_members;

-- 2. Create the new non-recursive SELECT policy
-- This policy avoids infinite recursion by checking the project owner from project_posts
-- and checking active members using project_applications table status = 'accepted'
CREATE POLICY "Allow members or owners to see roster"
  ON public.project_team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Case A: The user is requesting their own row in the roster
    user_id = auth.uid() OR
    
    -- Case B: The user is the creator (owner) of the project
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    ) OR
    
    -- Case C: The user is an accepted member of the project team
    -- (Checks if the user has an accepted application for this project, avoiding recursive query of project_team_members)
    EXISTS (
      SELECT 1 FROM public.project_applications a
      WHERE a.project_id = project_id AND a.applicant_id = auth.uid() AND a.status = 'accepted'
    )
  );

-- Also verify project_roles RLS is active and robust
DROP POLICY IF EXISTS "Allow authenticated read project roles" ON public.project_roles;
CREATE POLICY "Allow authenticated read project roles"
  ON public.project_roles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow owner to manage project roles" ON public.project_roles;
CREATE POLICY "Allow owner to manage project roles"
  ON public.project_roles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.project_posts p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  ));
