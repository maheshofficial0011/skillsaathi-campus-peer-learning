-- Idempotent Supabase SQL Patch: Phase 6.2 Project Workspace Security Definered Helpers, Discussion Boards, Reactions, and Verified Resource Boards

-- ====================================================================
-- SECTION 1: SECURITY DEFINER HELPER FUNCTIONS
-- Bypasses RLS recursion by querying the tables directly as postgres superuser.
-- Returns booleans only, exposing no private database content.
-- ====================================================================

-- Helper 1: Check if user is an active team member of a project (left_at IS NULL)
CREATE OR REPLACE FUNCTION public.is_project_member(
  proj_uuid UUID,
  user_uuid   UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_team_members
    WHERE project_id = proj_uuid
      AND user_id   = user_uuid
      AND left_at IS NULL
  );
$$;

-- Helper 2: Check if user is the project owner
CREATE OR REPLACE FUNCTION public.is_project_owner(
  proj_uuid UUID,
  user_uuid   UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_posts
    WHERE id         = proj_uuid
      AND created_by = user_uuid
  );
$$;

-- Helper 3: Check if user has active private workspace access (owner or active member)
CREATE OR REPLACE FUNCTION public.can_access_project_workspace(
  proj_uuid UUID,
  user_uuid   UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_posts
    WHERE id = proj_uuid
      AND (
        created_by = user_uuid
        OR public.is_project_member(proj_uuid, user_uuid)
      )
  );
$$;


-- ====================================================================
-- SECTION 2: POLISH & SECURE EXISTING ROSTER SELECT POLICIES
-- ====================================================================

-- Drop and replace recursive policies
DROP POLICY IF EXISTS "Allow members or owners to see roster" ON public.project_team_members;
CREATE POLICY "Allow members or owners to see roster"
  ON public.project_team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.can_access_project_workspace(project_id, auth.uid())
  );


-- ====================================================================
-- SECTION 3: CREATE NEW TABLES
-- ====================================================================

-- 3a. project_discussion_posts
CREATE TABLE IF NOT EXISTS public.project_discussion_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'update',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_discussion_post_type CHECK (post_type IN ('update','question','announcement','task'))
);

-- 3b. project_discussion_replies
CREATE TABLE IF NOT EXISTS public.project_discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.project_discussion_posts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3c. project_discussion_reactions
CREATE TABLE IF NOT EXISTS public.project_discussion_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.project_discussion_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.project_discussion_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'helpful',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_reaction_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  CONSTRAINT chk_reaction_type CHECK (reaction_type = 'helpful')
);

-- Unique constraint indices for reactions
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_post_helpful_reaction 
ON public.project_discussion_reactions (post_id, user_id) 
WHERE (post_id IS NOT NULL AND reaction_type = 'helpful');

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_reply_helpful_reaction 
ON public.project_discussion_reactions (reply_id, user_id) 
WHERE (reply_id IS NOT NULL AND reaction_type = 'helpful');

-- 3d. project_resources
CREATE TABLE IF NOT EXISTS public.project_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.project_posts(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'link',
  url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_mime_type TEXT,
  file_size_bytes BIGINT,
  storage_bucket TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending_verification',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_resource_type CHECK (resource_type IN ('link', 'file')),
  CONSTRAINT chk_verification_status CHECK (verification_status IN ('pending_verification','verified','rejected'))
);


-- ====================================================================
-- SECTION 4: ENABLE RLS ON ALL NEW TABLES
-- ====================================================================
ALTER TABLE public.project_discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_discussion_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- SECTION 5: DEFINE RLS POLICIES FOR NEW TABLES
-- ====================================================================

-- ── project_discussion_posts ──────────────────────────────────────────

DROP POLICY IF EXISTS "pdp_select" ON public.project_discussion_posts;
CREATE POLICY "pdp_select"
  ON public.project_discussion_posts FOR SELECT
  TO authenticated
  USING ( public.can_access_project_workspace(project_id, auth.uid()) );

DROP POLICY IF EXISTS "pdp_insert" ON public.project_discussion_posts;
CREATE POLICY "pdp_insert"
  ON public.project_discussion_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    public.can_access_project_workspace(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "pdp_update" ON public.project_discussion_posts;
CREATE POLICY "pdp_update"
  ON public.project_discussion_posts FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "pdp_delete" ON public.project_discussion_posts;
CREATE POLICY "pdp_delete"
  ON public.project_discussion_posts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  );


-- ── project_discussion_replies ────────────────────────────────────────

DROP POLICY IF EXISTS "pdr_select" ON public.project_discussion_replies;
CREATE POLICY "pdr_select"
  ON public.project_discussion_replies FOR SELECT
  TO authenticated
  USING ( public.can_access_project_workspace(project_id, auth.uid()) );

DROP POLICY IF EXISTS "pdr_insert" ON public.project_discussion_replies;
CREATE POLICY "pdr_insert"
  ON public.project_discussion_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    public.can_access_project_workspace(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "pdr_update" ON public.project_discussion_replies;
CREATE POLICY "pdr_update"
  ON public.project_discussion_replies FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "pdr_delete" ON public.project_discussion_replies;
CREATE POLICY "pdr_delete"
  ON public.project_discussion_replies FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  );


-- ── project_discussion_reactions ─────────────────────────────────────

DROP POLICY IF EXISTS "pdrc_select" ON public.project_discussion_reactions;
CREATE POLICY "pdrc_select"
  ON public.project_discussion_reactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_discussion_posts p
      WHERE p.id = post_id AND public.can_access_project_workspace(p.project_id, auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.project_discussion_replies r
      WHERE r.id = reply_id AND public.can_access_project_workspace(r.project_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "pdrc_insert" ON public.project_discussion_reactions;
CREATE POLICY "pdrc_insert"
  ON public.project_discussion_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      (post_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.project_discussion_posts p WHERE p.id = post_id AND public.can_access_project_workspace(p.project_id, auth.uid()))) OR
      (reply_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.project_discussion_replies r WHERE r.id = reply_id AND public.can_access_project_workspace(r.project_id, auth.uid())))
    )
  );

DROP POLICY IF EXISTS "pdrc_delete" ON public.project_discussion_reactions;
CREATE POLICY "pdrc_delete"
  ON public.project_discussion_reactions FOR DELETE
  TO authenticated
  USING ( user_id = auth.uid() );


-- ── project_resources ────────────────────────────────────────────────

DROP POLICY IF EXISTS "pr_select" ON public.project_resources;
CREATE POLICY "pr_select"
  ON public.project_resources FOR SELECT
  TO authenticated
  USING (
    public.can_access_project_workspace(project_id, auth.uid()) AND (
      verification_status = 'verified' OR
      uploaded_by = auth.uid() OR
      public.is_project_owner(project_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "pr_insert" ON public.project_resources;
CREATE POLICY "pr_insert"
  ON public.project_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    public.can_access_project_workspace(project_id, auth.uid()) AND
    (
      (public.is_project_owner(project_id, auth.uid()) AND verification_status = 'verified') OR
      (NOT public.is_project_owner(project_id, auth.uid()) AND verification_status = 'pending_verification')
    )
  );

DROP POLICY IF EXISTS "pr_update" ON public.project_resources;
CREATE POLICY "pr_update"
  ON public.project_resources FOR UPDATE
  TO authenticated
  USING (
    public.can_access_project_workspace(project_id, auth.uid()) AND (
      uploaded_by = auth.uid() OR
      public.is_project_owner(project_id, auth.uid())
    )
  )
  WITH CHECK (
    public.can_access_project_workspace(project_id, auth.uid()) AND (
      uploaded_by = auth.uid() OR
      public.is_project_owner(project_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "pr_delete" ON public.project_resources;
CREATE POLICY "pr_delete"
  ON public.project_resources FOR DELETE
  TO authenticated
  USING (
    public.can_access_project_workspace(project_id, auth.uid()) AND (
      uploaded_by = auth.uid() OR
      public.is_project_owner(project_id, auth.uid())
    )
  );


-- ====================================================================
-- SECTION 6: UPDATE TIMESTAMPS TRIGGERS
-- ====================================================================

CREATE OR REPLACE TRIGGER on_project_discussion_post_updated
  BEFORE UPDATE ON public.project_discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_project_discussion_reply_updated
  BEFORE UPDATE ON public.project_discussion_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_project_resource_updated
  BEFORE UPDATE ON public.project_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
