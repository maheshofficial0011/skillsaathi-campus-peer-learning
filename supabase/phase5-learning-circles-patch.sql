-- ====================================================================
-- PHASE 5: LEARNING CIRCLES PATCH (v2 — Fixed Order + RLS Helpers)
-- ====================================================================
-- Changes from v1:
--   1. ALL 4 tables created first, before any policies.
--   2. RLS enabled on all 4 tables after creation, before policies.
--   3. SECURITY DEFINER helper functions created to break RLS recursion.
--   4. All policies recreated using helper functions (no recursive EXISTS).
--   5. Triggers created last, after all tables exist.
-- ====================================================================


-- ====================================================================
-- SECTION 1: CREATE ALL TABLES
-- ====================================================================

-- 1a. learning_circles
CREATE TABLE IF NOT EXISTS public.learning_circles (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  category       TEXT        NOT NULL,
  department     TEXT,
  difficulty_level TEXT      NOT NULL DEFAULT 'Beginner',
  meeting_mode   TEXT        NOT NULL DEFAULT 'Hybrid',
  meeting_schedule TEXT,
  location_or_link TEXT,
  max_members    INTEGER     NOT NULL DEFAULT 20,
  is_public      BOOLEAN     NOT NULL DEFAULT true,
  created_by     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_lc_difficulty   CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Mixed')),
  CONSTRAINT chk_lc_meeting_mode CHECK (meeting_mode IN ('Online', 'In-Person', 'Hybrid')),
  CONSTRAINT chk_lc_status       CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT chk_lc_max_members  CHECK (max_members BETWEEN 2 AND 100)
);

-- 1b. learning_circle_members
CREATE TABLE IF NOT EXISTS public.learning_circle_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID        NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.profiles(id)         ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_circle_member UNIQUE (circle_id, user_id),
  CONSTRAINT chk_lcm_role         CHECK (role IN ('owner', 'member'))
);

-- 1c. learning_circle_resources
CREATE TABLE IF NOT EXISTS public.learning_circle_resources (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id     UUID        NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  shared_by     UUID        NOT NULL REFERENCES public.profiles(id)         ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  resource_type TEXT        NOT NULL DEFAULT 'Link',
  url           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_lcr_type CHECK (resource_type IN ('Link', 'PDF', 'Video', 'Notes', 'Book', 'Other'))
);

-- 1d. learning_circle_posts
CREATE TABLE IF NOT EXISTS public.learning_circle_posts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID        NOT NULL REFERENCES public.learning_circles(id) ON DELETE CASCADE,
  created_by UUID        NOT NULL REFERENCES public.profiles(id)         ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  post_type  TEXT        NOT NULL DEFAULT 'Update',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_lcp_type CHECK (post_type IN ('Update', 'Question', 'Plan', 'Announcement'))
);


-- ====================================================================
-- SECTION 2: OPTIONAL INDEXES (performance, non-blocking)
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_lcm_circle_id  ON public.learning_circle_members (circle_id);
CREATE INDEX IF NOT EXISTS idx_lcm_user_id    ON public.learning_circle_members (user_id);
CREATE INDEX IF NOT EXISTS idx_lcr_circle_id  ON public.learning_circle_resources (circle_id);
CREATE INDEX IF NOT EXISTS idx_lcp_circle_id  ON public.learning_circle_posts (circle_id);
CREATE INDEX IF NOT EXISTS idx_lc_status      ON public.learning_circles (status);
CREATE INDEX IF NOT EXISTS idx_lc_created_by  ON public.learning_circles (created_by);


-- ====================================================================
-- SECTION 3: ENABLE RLS ON ALL 4 TABLES
-- ====================================================================

ALTER TABLE public.learning_circles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_circle_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_circle_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_circle_posts     ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- SECTION 4: SECURITY DEFINER HELPER FUNCTIONS
-- These bypass RLS when called, preventing infinite recursion.
-- They only return boolean values — no private data is exposed.
-- ====================================================================

-- Helper 1: Is user a member (any role) of this circle?
-- Queries learning_circle_members directly without triggering RLS
-- because SECURITY DEFINER runs as the function owner (postgres).
CREATE OR REPLACE FUNCTION public.is_learning_circle_member(
  circle_uuid UUID,
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
    FROM public.learning_circle_members
    WHERE circle_id = circle_uuid
      AND user_id   = user_uuid
  );
$$;

-- Helper 2: Is user the owner of this circle?
-- Checks both learning_circles.created_by and the 'owner' role in members.
CREATE OR REPLACE FUNCTION public.is_learning_circle_owner(
  circle_uuid UUID,
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
    FROM public.learning_circles
    WHERE id         = circle_uuid
      AND created_by = user_uuid
  )
  OR EXISTS (
    SELECT 1
    FROM public.learning_circle_members
    WHERE circle_id = circle_uuid
      AND user_id   = user_uuid
      AND role      = 'owner'
  );
$$;

-- Helper 3: Can user access this circle?
-- A circle is accessible if it is public, the user created it,
-- or the user is a member.  Uses is_learning_circle_member internally
-- which is safe because SECURITY DEFINER skips the member RLS policy.
CREATE OR REPLACE FUNCTION public.can_access_learning_circle(
  circle_uuid UUID,
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
    FROM public.learning_circles
    WHERE id = circle_uuid
      AND (
        is_public  = true
        OR created_by = user_uuid
        OR public.is_learning_circle_member(circle_uuid, user_uuid)
      )
  );
$$;


-- ====================================================================
-- SECTION 5: DROP EXISTING POLICIES (safe — IF EXISTS)
-- ====================================================================

-- learning_circles policies
DROP POLICY IF EXISTS "Allow members and creators to read learning circles"        ON public.learning_circles;
DROP POLICY IF EXISTS "Allow authenticated users to create learning circles"        ON public.learning_circles;
DROP POLICY IF EXISTS "Allow circle owners/creators to update their own circles"    ON public.learning_circles;
DROP POLICY IF EXISTS "Allow circle owners/creators to delete their own circles"    ON public.learning_circles;
-- v2 names (in case patch is applied again)
DROP POLICY IF EXISTS "lc_select"  ON public.learning_circles;
DROP POLICY IF EXISTS "lc_insert"  ON public.learning_circles;
DROP POLICY IF EXISTS "lc_update"  ON public.learning_circles;
DROP POLICY IF EXISTS "lc_delete"  ON public.learning_circles;

-- learning_circle_members policies
DROP POLICY IF EXISTS "Allow circle access members to read membership"              ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow authenticated users to join circles as members"        ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow circle owners to update memberships"                   ON public.learning_circle_members;
DROP POLICY IF EXISTS "Allow members to leave and circle owners to remove members"  ON public.learning_circle_members;
DROP POLICY IF EXISTS "lcm_select"  ON public.learning_circle_members;
DROP POLICY IF EXISTS "lcm_insert"  ON public.learning_circle_members;
DROP POLICY IF EXISTS "lcm_update"  ON public.learning_circle_members;
DROP POLICY IF EXISTS "lcm_delete"  ON public.learning_circle_members;

-- learning_circle_resources policies
DROP POLICY IF EXISTS "Allow circle members to read resources"                      ON public.learning_circle_resources;
DROP POLICY IF EXISTS "Allow circle members to add resources"                       ON public.learning_circle_resources;
DROP POLICY IF EXISTS "Allow resource creators to update resources"                 ON public.learning_circle_resources;
DROP POLICY IF EXISTS "Allow resource creators or circle owners to delete resources" ON public.learning_circle_resources;
DROP POLICY IF EXISTS "lcr_select"  ON public.learning_circle_resources;
DROP POLICY IF EXISTS "lcr_insert"  ON public.learning_circle_resources;
DROP POLICY IF EXISTS "lcr_update"  ON public.learning_circle_resources;
DROP POLICY IF EXISTS "lcr_delete"  ON public.learning_circle_resources;

-- learning_circle_posts policies
DROP POLICY IF EXISTS "Allow circle members to read posts"                          ON public.learning_circle_posts;
DROP POLICY IF EXISTS "Allow circle members to add posts"                           ON public.learning_circle_posts;
DROP POLICY IF EXISTS "Allow post authors to update posts"                          ON public.learning_circle_posts;
DROP POLICY IF EXISTS "Allow post authors or circle owners to delete posts"         ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_select"  ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_insert"  ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_update"  ON public.learning_circle_posts;
DROP POLICY IF EXISTS "lcp_delete"  ON public.learning_circle_posts;


-- ====================================================================
-- SECTION 6: CREATE POLICIES USING HELPER FUNCTIONS
-- No recursive subqueries — all checks delegate to SECURITY DEFINER fns.
-- ====================================================================

-- ── learning_circles ─────────────────────────────────────────────────

-- SELECT: public circles OR circles the user created OR circles they're a member of
CREATE POLICY "lc_select"
  ON public.learning_circles FOR SELECT
  TO authenticated
  USING ( public.can_access_learning_circle(id, auth.uid()) );

-- INSERT: user must set themselves as creator
CREATE POLICY "lc_insert"
  ON public.learning_circles FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = created_by );

-- UPDATE: only the creator (or owner-role member) can update
CREATE POLICY "lc_update"
  ON public.learning_circles FOR UPDATE
  TO authenticated
  USING ( public.is_learning_circle_owner(id, auth.uid()) OR created_by = auth.uid() )
  WITH CHECK ( public.is_learning_circle_owner(id, auth.uid()) OR created_by = auth.uid() );

-- DELETE: only the creator (or owner-role member) can delete
CREATE POLICY "lc_delete"
  ON public.learning_circles FOR DELETE
  TO authenticated
  USING ( public.is_learning_circle_owner(id, auth.uid()) OR created_by = auth.uid() );


-- ── learning_circle_members ───────────────────────────────────────────

-- SELECT: user can read the membership list if they can access the circle.
--   Uses can_access_learning_circle (SECURITY DEFINER) — NO SELF-RECURSION.
CREATE POLICY "lcm_select"
  ON public.learning_circle_members FOR SELECT
  TO authenticated
  USING ( public.can_access_learning_circle(circle_id, auth.uid()) );

-- INSERT: two allowed cases:
--   (a) Normal member join: user inserts themselves as 'member' into an active public circle.
--   (b) Owner bootstrap: after creating a circle, the creator inserts themselves as 'owner'.
--       The circle must exist and created_by must match auth.uid().
CREATE POLICY "lcm_insert"
  ON public.learning_circle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Case (a): joining as member
    (
      auth.uid() = user_id
      AND role = 'member'
      AND EXISTS (
        SELECT 1 FROM public.learning_circles c
        WHERE c.id = circle_id
          AND c.status = 'active'
          AND (c.is_public = true OR c.created_by = auth.uid())
      )
    )
    OR
    -- Case (b): owner bootstrap insert after circle creation
    (
      auth.uid() = user_id
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM public.learning_circles c
        WHERE c.id = circle_id
          AND c.created_by = auth.uid()
      )
    )
  );

-- UPDATE: only circle owners may update membership rows (e.g. role changes)
CREATE POLICY "lcm_update"
  ON public.learning_circle_members FOR UPDATE
  TO authenticated
  USING ( public.is_learning_circle_owner(circle_id, auth.uid()) );

-- DELETE: member can remove themselves (if role = 'member'), owner can remove anyone
CREATE POLICY "lcm_delete"
  ON public.learning_circle_members FOR DELETE
  TO authenticated
  USING (
    ( user_id = auth.uid() AND role = 'member' )
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );


-- ── learning_circle_resources ─────────────────────────────────────────

-- SELECT: accessible to members or owners
CREATE POLICY "lcr_select"
  ON public.learning_circle_resources FOR SELECT
  TO authenticated
  USING (
    public.is_learning_circle_member(circle_id, auth.uid())
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- INSERT: uploader must be auth user, circle must be active, user must be member/owner
CREATE POLICY "lcr_insert"
  ON public.learning_circle_resources FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.status = 'active'
    )
    AND (
      public.is_learning_circle_member(circle_id, auth.uid())
      OR public.is_learning_circle_owner(circle_id, auth.uid())
    )
  );

-- UPDATE: uploader or circle owner
CREATE POLICY "lcr_update"
  ON public.learning_circle_resources FOR UPDATE
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  )
  WITH CHECK (
    shared_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- DELETE: uploader or circle owner
CREATE POLICY "lcr_delete"
  ON public.learning_circle_resources FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );


-- ── learning_circle_posts ─────────────────────────────────────────────

-- SELECT: accessible to members or owners
CREATE POLICY "lcp_select"
  ON public.learning_circle_posts FOR SELECT
  TO authenticated
  USING (
    public.is_learning_circle_member(circle_id, auth.uid())
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- INSERT: author must be auth user, circle must be active, user must be member/owner
CREATE POLICY "lcp_insert"
  ON public.learning_circle_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.learning_circles c
      WHERE c.id = circle_id AND c.status = 'active'
    )
    AND (
      public.is_learning_circle_member(circle_id, auth.uid())
      OR public.is_learning_circle_owner(circle_id, auth.uid())
    )
  );

-- UPDATE: post author or circle owner
CREATE POLICY "lcp_update"
  ON public.learning_circle_posts FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );

-- DELETE: post author or circle owner
CREATE POLICY "lcp_delete"
  ON public.learning_circle_posts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_learning_circle_owner(circle_id, auth.uid())
  );


-- ====================================================================
-- SECTION 7: handle_updated_at TRIGGERS
-- Created last — all tables now guaranteed to exist.
-- ====================================================================

DROP TRIGGER IF EXISTS on_learning_circle_updated          ON public.learning_circles;
CREATE TRIGGER on_learning_circle_updated
  BEFORE UPDATE ON public.learning_circles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_learning_circle_resource_updated ON public.learning_circle_resources;
CREATE TRIGGER on_learning_circle_resource_updated
  BEFORE UPDATE ON public.learning_circle_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_learning_circle_post_updated     ON public.learning_circle_posts;
CREATE TRIGGER on_learning_circle_post_updated
  BEFORE UPDATE ON public.learning_circle_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- END OF PHASE 5 PATCH (v2)
-- ====================================================================
