-- Idempotent Supabase SQL Patch: Phase 6.1 Find Teammates / Project Mate Finder Core System

-- =========================================================================
-- 1. Create Project Posts Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.project_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'portfolio_project',
  difficulty_level TEXT NOT NULL DEFAULT 'Beginner',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_departments TEXT[] NOT NULL DEFAULT '{}',
  preferred_years TEXT[] NOT NULL DEFAULT '{}',
  work_mode TEXT NOT NULL DEFAULT 'Hybrid',
  expected_timeline TEXT,
  meeting_preference TEXT,
  max_team_size INTEGER NOT NULL DEFAULT 4,
  current_team_size INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'recruiting',
  is_beginner_friendly BOOLEAN NOT NULL DEFAULT false,
  is_hackathon BOOLEAN NOT NULL DEFAULT false,
  deadline DATE,
  -- Private collaboration fields (visible only to owner and accepted members):
  coordination_link TEXT,
  github_repo_url TEXT,
  shared_doc_url TEXT,
  private_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Database constraints
  CONSTRAINT chk_project_max_team_size CHECK (max_team_size >= 2 AND max_team_size <= 20),
  CONSTRAINT chk_project_current_team_size CHECK (current_team_size >= 1 AND current_team_size <= max_team_size),
  CONSTRAINT chk_project_status CHECK (status IN ('recruiting','in_progress','team_full','completed','paused','archived')),
  CONSTRAINT chk_project_difficulty CHECK (difficulty_level IN ('Beginner','Intermediate','Advanced')),
  CONSTRAINT chk_project_work_mode CHECK (work_mode IN ('Online','Offline','Hybrid','Campus only'))
);

-- =========================================================================
-- 2. Create Project Roles Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  description TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  slots_needed INTEGER NOT NULL DEFAULT 1,
  slots_filled INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_role_slots_needed CHECK (slots_needed >= 1 AND slots_needed <= 10),
  CONSTRAINT chk_role_slots_filled CHECK (slots_filled >= 0 AND slots_filled <= slots_needed),
  CONSTRAINT chk_role_priority CHECK (priority IN ('low','medium','high'))
);

-- =========================================================================
-- 3. Create Project Applications Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.project_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
  role_interest TEXT,
  message TEXT NOT NULL,
  skills_snapshot TEXT[] NOT NULL DEFAULT '{}',
  experience_summary TEXT,
  portfolio_url TEXT,
  availability TEXT,
  expected_contribution TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_response TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_app_status CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  CONSTRAINT chk_app_message CHECK (length(message) >= 10)
);

-- Single active pending application constraint per project + student
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_project_applicant 
ON public.project_applications (project_id, applicant_id) 
WHERE (status = 'pending');

-- =========================================================================
-- 4. Create Project Team Members Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.project_roles(id) ON DELETE SET NULL,
  role_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  left_at TIMESTAMPTZ,
  leave_reason TEXT,
  removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Active membership tracking constraint (max one active slot per team)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_project_member 
ON public.project_team_members (project_id, user_id) 
WHERE (left_at IS NULL);

-- =========================================================================
-- 5. Timestamps trigger updates
-- =========================================================================
CREATE OR REPLACE TRIGGER on_project_post_updated
  BEFORE UPDATE ON public.project_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_project_role_updated
  BEFORE UPDATE ON public.project_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_project_application_updated
  BEFORE UPDATE ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================================
-- 6. Enable RLS on All Tables
-- =========================================================================
ALTER TABLE public.project_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 7. Define RLS Policies
-- =========================================================================

-- Project Posts Policies
DROP POLICY IF EXISTS "Allow authenticated read project posts" ON public.project_posts;
CREATE POLICY "Allow authenticated read project posts"
  ON public.project_posts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert own project posts" ON public.project_posts;
CREATE POLICY "Allow authenticated insert own project posts"
  ON public.project_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Allow owner to update own project posts" ON public.project_posts;
CREATE POLICY "Allow owner to update own project posts"
  ON public.project_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Project Roles Policies
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

-- Project Applications Policies
DROP POLICY IF EXISTS "Allow applicant or project owner to view applications" ON public.project_applications;
CREATE POLICY "Allow applicant or project owner to view applications"
  ON public.project_applications
  FOR SELECT
  TO authenticated
  USING (
    applicant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow authenticated user to insert applications" ON public.project_applications;
CREATE POLICY "Allow authenticated user to insert applications"
  ON public.project_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    applicant_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow applicant or owner to update applications" ON public.project_applications;
CREATE POLICY "Allow applicant or owner to update applications"
  ON public.project_applications
  FOR UPDATE
  TO authenticated
  USING (
    applicant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    applicant_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- Project Team Members Policies
DROP POLICY IF EXISTS "Allow members or owners to see roster" ON public.project_team_members;
CREATE POLICY "Allow members or owners to see roster"
  ON public.project_team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.project_team_members m
      WHERE m.project_id = project_id AND m.user_id = auth.uid() AND m.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Allow owner to insert team members" ON public.project_team_members;
CREATE POLICY "Allow owner to insert team members"
  ON public.project_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow owner or member to update membership" ON public.project_team_members;
CREATE POLICY "Allow owner or member to update membership"
  ON public.project_team_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_posts p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );
