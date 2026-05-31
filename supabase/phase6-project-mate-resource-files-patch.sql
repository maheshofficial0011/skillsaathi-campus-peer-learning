-- Phase 6.3 – Project Mate Workspace – Resource Files Patch
-- Idempotent column additions for project_resources table
ALTER TABLE public.project_resources
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'project-resources',
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_recommended BOOLEAN DEFAULT FALSE;

-- Gated check constraint update
ALTER TABLE public.project_resources DROP CONSTRAINT IF EXISTS chk_resource_type;
ALTER TABLE public.project_resources ADD CONSTRAINT chk_resource_type CHECK (
  resource_type IN ('link', 'pdf', 'document', 'presentation', 'notes', 'image', 'dataset', 'code_repo', 'folder', 'other')
);

-- Insert bucket 'project-resources' into storage.buckets (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-resources', 
  'project-resources', 
  false, 
  20971520, -- 20 MB in bytes
  ARRAY[
    'application/pdf',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'text/csv',
    'application/json',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE 
SET public = false, 
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'text/csv',
      'application/json',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]::text[];

-- Standalone idempotent update for safety on existing bucket environments
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'text/csv',
      'application/json',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]::text[],
    file_size_limit = greatest(coalesce(file_size_limit, 0), 20971520)
WHERE id = 'project-resources';

-- Create path helper to securely parse and validate project UUID from storage path
-- Pattern: project-mates/{project_id}/{resource_id}/{filename}
CREATE OR REPLACE FUNCTION public.extract_project_id_from_path(path_name text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  parts text[];
BEGIN
  parts := regexp_split_to_array(path_name, '/');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'project-mates' THEN
    RETURN parts[2]::uuid;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Drop existing storage policies for project-resources to prevent conflicts
DROP POLICY IF EXISTS "pm_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "pm_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "pm_storage_delete" ON storage.objects;

-- Create SELECT Storage Policy
-- Only active project members or owners can download/read project resource files
CREATE POLICY "pm_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-resources'
    AND public.can_access_project_workspace(
      public.extract_project_id_from_path(name),
      auth.uid()
    )
  );

-- Create INSERT Storage Policy
-- Only active project members or owners can upload resource files to the project path
CREATE POLICY "pm_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-resources'
    AND public.can_access_project_workspace(
      public.extract_project_id_from_path(name),
      auth.uid()
    )
  );

-- Create DELETE Storage Policy
-- Only the uploader of the storage object OR the project owner can delete the resource file
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
