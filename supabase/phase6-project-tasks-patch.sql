-- Phase 6.4 Project Task Assignment, Work Submission, Deadline Extension & Verification System Patch

-- ==========================================
-- 1. Create project_tasks table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.project_posts(id) on delete cascade,
    assigned_by uuid not null references public.profiles(id) on delete cascade,
    assigned_to uuid not null references public.profiles(id) on delete cascade,
    role_id uuid references public.project_roles(id) on delete set null,
    title text not null,
    objective text not null,
    instructions text,
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'submitted', 'verified', 'rejected', 'overdue', 'extension_requested', 'extended', 'cancelled')),
    due_at timestamptz not null,
    completed_at timestamptz,
    verified_at timestamptz,
    verified_by uuid references public.profiles(id) on delete set null,
    rejected_at timestamptz,
    rejection_reason text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ==========================================
-- 2. Create project_task_attachments table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_task_attachments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.project_tasks(id) on delete cascade,
    project_id uuid not null references public.project_posts(id) on delete cascade,
    uploaded_by uuid not null references public.profiles(id) on delete cascade,
    attachment_type text not null default 'link' check (attachment_type in ('link', 'pdf', 'document', 'presentation', 'image', 'video', 'folder', 'code_repo', 'other')),
    title text,
    url text,
    file_path text,
    file_name text,
    file_mime_type text,
    file_size_bytes bigint,
    storage_bucket text,
    created_at timestamptz default now()
);

-- ==========================================
-- 3. Create project_task_submissions table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_task_submissions (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.project_tasks(id) on delete cascade,
    project_id uuid not null references public.project_posts(id) on delete cascade,
    submitted_by uuid not null references public.profiles(id) on delete cascade,
    submission_note text,
    status text not null default 'pending_review' check (status in ('pending_review', 'verified', 'rejected', 'withdrawn')),
    submitted_at timestamptz default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references public.profiles(id) on delete set null,
    review_feedback text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ==========================================
-- 4. Create project_task_submission_files table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_task_submission_files (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references public.project_task_submissions(id) on delete cascade,
    task_id uuid not null references public.project_tasks(id) on delete cascade,
    project_id uuid not null references public.project_posts(id) on delete cascade,
    uploaded_by uuid not null references public.profiles(id) on delete cascade,
    file_type text not null default 'link' check (file_type in ('link', 'pdf', 'document', 'presentation', 'image', 'video', 'folder', 'code_repo', 'other')),
    title text,
    url text,
    file_path text,
    file_name text,
    file_mime_type text,
    file_size_bytes bigint,
    storage_bucket text,
    created_at timestamptz default now()
);

-- ==========================================
-- 5. Create project_task_extension_requests table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_task_extension_requests (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.project_tasks(id) on delete cascade,
    project_id uuid not null references public.project_posts(id) on delete cascade,
    requested_by uuid not null references public.profiles(id) on delete cascade,
    old_due_at timestamptz not null,
    requested_due_at timestamptz not null,
    reason text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
    reviewed_by uuid references public.profiles(id) on delete set null,
    reviewed_at timestamptz,
    review_note text,
    created_at timestamptz default now()
);

-- ==========================================
-- Row Level Security (RLS) Enable
-- ==========================================
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_extension_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Drop policies that depend on is_project_owner BEFORE dropping the function.
-- These policies belong to Phase 6.2 discussion/resource tables.
-- They will be faithfully recreated below after the function is refreshed.
-- DO NOT use CASCADE.
-- ==========================================

-- project_discussion_posts dependents
DROP POLICY IF EXISTS "pdp_update" ON public.project_discussion_posts;
DROP POLICY IF EXISTS "pdp_delete" ON public.project_discussion_posts;

-- project_discussion_replies dependents
DROP POLICY IF EXISTS "pdr_update" ON public.project_discussion_replies;
DROP POLICY IF EXISTS "pdr_delete" ON public.project_discussion_replies;

-- project_resources dependents
DROP POLICY IF EXISTS "pr_select" ON public.project_resources;
DROP POLICY IF EXISTS "pr_insert" ON public.project_resources;
DROP POLICY IF EXISTS "pr_update" ON public.project_resources;
DROP POLICY IF EXISTS "pr_delete" ON public.project_resources;

-- storage.objects dependent: pm_storage_delete (project-resources bucket, phase6-project-mate-resource-files-patch.sql)
DROP POLICY IF EXISTS "pm_storage_delete" ON storage.objects;

-- Now safe to drop and recreate the helper functions
DROP FUNCTION IF EXISTS public.is_active_project_member_or_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid, uuid);

-- ==========================================
-- Helper function: is_active_project_member_or_owner
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_active_project_member_or_owner(proj_id uuid, check_user_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    is_owner BOOLEAN;
    is_member BOOLEAN;
BEGIN
    -- Check if owner
    SELECT EXISTS (
        SELECT 1 FROM public.project_posts
        WHERE id = proj_id AND created_by = check_user_id
    ) INTO is_owner;
    
    IF is_owner THEN
        RETURN TRUE;
    END IF;

    -- Check if active member
    SELECT EXISTS (
        SELECT 1 FROM public.project_team_members
        WHERE project_id = proj_id AND user_id = check_user_id AND left_at IS NULL
    ) INTO is_member;
    
    RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Helper function: is_project_owner
-- Matches the canonical SQL-language version from phase6-project-mate-workspace-polish-patch.sql
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_project_owner(proj_uuid uuid, user_uuid uuid)
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

-- ==========================================
-- Recreate Phase 6.2 dependent policies (exact definitions from workspace-polish patch)
-- ==========================================

-- project_discussion_posts
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

CREATE POLICY "pdp_delete"
  ON public.project_discussion_posts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  );

-- project_discussion_replies
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

CREATE POLICY "pdr_delete"
  ON public.project_discussion_replies FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.is_project_owner(project_id, auth.uid())
  );

-- project_resources
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

CREATE POLICY "pr_delete"
  ON public.project_resources FOR DELETE
  TO authenticated
  USING (
    public.can_access_project_workspace(project_id, auth.uid()) AND (
      uploaded_by = auth.uid() OR
      public.is_project_owner(project_id, auth.uid())
    )
  );

-- storage.objects: recreate pm_storage_delete (exact definition from phase6-project-mate-resource-files-patch.sql)
-- Only the uploader of the storage object OR the project owner can delete the resource file.
CREATE POLICY "pm_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-resources'
    AND (
      owner = auth.uid()
      OR public.is_project_owner(
        public.extract_project_id_from_path(name),
        auth.uid()
      )
    )
  );

-- ==========================================
-- Policies for project_tasks
-- ==========================================
DROP POLICY IF EXISTS "Active members and owners can view project tasks" ON public.project_tasks;
CREATE POLICY "Active members and owners can view project tasks" ON public.project_tasks
    FOR SELECT USING (
        public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can insert project tasks" ON public.project_tasks;
CREATE POLICY "Owners can insert project tasks" ON public.project_tasks
    FOR INSERT WITH CHECK (
        public.is_project_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update any project task" ON public.project_tasks;
CREATE POLICY "Owners can update any project task" ON public.project_tasks
    FOR UPDATE USING (
        public.is_project_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can update their own task status" ON public.project_tasks;
CREATE POLICY "Assigned members can update their own task status" ON public.project_tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can delete project tasks" ON public.project_tasks;
CREATE POLICY "Owners can delete project tasks" ON public.project_tasks
    FOR DELETE USING (
        public.is_project_owner(project_id, auth.uid())
    );

-- ==========================================
-- Policies for project_task_attachments
-- ==========================================
DROP POLICY IF EXISTS "Active members and owners can view task attachments" ON public.project_task_attachments;
CREATE POLICY "Active members and owners can view task attachments" ON public.project_task_attachments
    FOR SELECT USING (
        public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can insert task attachments" ON public.project_task_attachments;
CREATE POLICY "Owners can insert task attachments" ON public.project_task_attachments
    FOR INSERT WITH CHECK (
        public.is_project_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update task attachments" ON public.project_task_attachments;
CREATE POLICY "Owners can update task attachments" ON public.project_task_attachments
    FOR UPDATE USING (
        public.is_project_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can delete task attachments" ON public.project_task_attachments;
CREATE POLICY "Owners can delete task attachments" ON public.project_task_attachments
    FOR DELETE USING (
        public.is_project_owner(project_id, auth.uid())
    );

-- ==========================================
-- Policies for project_task_submissions
-- ==========================================
DROP POLICY IF EXISTS "Active members and owners can view task submissions" ON public.project_task_submissions;
CREATE POLICY "Active members and owners can view task submissions" ON public.project_task_submissions
    FOR SELECT USING (
        public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can insert submissions" ON public.project_task_submissions;
CREATE POLICY "Assigned members can insert submissions" ON public.project_task_submissions
    FOR INSERT WITH CHECK (
        submitted_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can update their own submissions" ON public.project_task_submissions;
CREATE POLICY "Assigned members can update their own submissions" ON public.project_task_submissions
    FOR UPDATE USING (
        submitted_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update task submissions to verify/reject" ON public.project_task_submissions;
CREATE POLICY "Owners can update task submissions to verify/reject" ON public.project_task_submissions
    FOR UPDATE USING (
        public.is_project_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can delete their own submissions" ON public.project_task_submissions;
CREATE POLICY "Assigned members can delete their own submissions" ON public.project_task_submissions
    FOR DELETE USING (
        submitted_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

-- ==========================================
-- Policies for project_task_submission_files
-- ==========================================
DROP POLICY IF EXISTS "Active members and owners can view task submission files" ON public.project_task_submission_files;
CREATE POLICY "Active members and owners can view task submission files" ON public.project_task_submission_files
    FOR SELECT USING (
        public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can insert submission files" ON public.project_task_submission_files;
CREATE POLICY "Assigned members can insert submission files" ON public.project_task_submission_files
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can update their own submission files" ON public.project_task_submission_files;
CREATE POLICY "Assigned members can update their own submission files" ON public.project_task_submission_files
    FOR UPDATE USING (
        uploaded_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can delete their own submission files" ON public.project_task_submission_files;
CREATE POLICY "Assigned members can delete their own submission files" ON public.project_task_submission_files
    FOR DELETE USING (
        uploaded_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

-- ==========================================
-- Policies for project_task_extension_requests
-- ==========================================
DROP POLICY IF EXISTS "Active members and owners can view extension requests" ON public.project_task_extension_requests;
CREATE POLICY "Active members and owners can view extension requests" ON public.project_task_extension_requests
    FOR SELECT USING (
        public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can request extensions" ON public.project_task_extension_requests;
CREATE POLICY "Assigned members can request extensions" ON public.project_task_extension_requests
    FOR INSERT WITH CHECK (
        requested_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Assigned members can update their own extension requests" ON public.project_task_extension_requests;
CREATE POLICY "Assigned members can update their own extension requests" ON public.project_task_extension_requests
    FOR UPDATE USING (
        requested_by = auth.uid() AND public.is_active_project_member_or_owner(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update extension requests" ON public.project_task_extension_requests;
CREATE POLICY "Owners can update extension requests" ON public.project_task_extension_requests
    FOR UPDATE USING (
        public.is_project_owner(project_id, auth.uid())
    );

-- ==========================================
-- Storage Bucket: project-task-files
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-task-files', 'project-task-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Read: Active members and owners
DROP POLICY IF EXISTS "Active members can view task files" ON storage.objects;
CREATE POLICY "Active members can view task files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project-task-files' AND 
        public.is_active_project_member_or_owner(
            (string_to_array(name, '/'))[1]::uuid, 
            auth.uid()
        )
    );

-- Insert: Active members and owners (owners for attachments, members for submissions)
DROP POLICY IF EXISTS "Active members can upload task files" ON storage.objects;
CREATE POLICY "Active members can upload task files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-task-files' AND 
        public.is_active_project_member_or_owner(
            (string_to_array(name, '/'))[1]::uuid, 
            auth.uid()
        )
    );

-- Delete: File owner or project owner
DROP POLICY IF EXISTS "File owners and project owners can delete task files" ON storage.objects;
CREATE POLICY "File owners and project owners can delete task files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-task-files' AND 
        (
            auth.uid() = owner OR 
            public.is_project_owner(
                (string_to_array(name, '/'))[1]::uuid, 
                auth.uid()
            )
        )
    );
