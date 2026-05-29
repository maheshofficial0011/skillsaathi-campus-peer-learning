-- ====================================================================
-- PHASE 5.1: LEARNING CIRCLE RESOURCE FILES PATCH
-- ====================================================================

-- 1. Extend public.learning_circle_resources with file metadata columns
ALTER TABLE public.learning_circle_resources 
  ADD COLUMN IF NOT EXISTS file_path         TEXT,
  ADD COLUMN IF NOT EXISTS file_name         TEXT,
  ADD COLUMN IF NOT EXISTS file_mime_type    TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes   BIGINT,
  ADD COLUMN IF NOT EXISTS storage_bucket    TEXT DEFAULT 'learning-circle-resources';

-- 2. Create the private Supabase Storage bucket 'learning-circle-resources'
-- Gated securely (public = false) so files cannot be accessed via public links.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learning-circle-resources', 
  'learning-circle-resources', 
  false, 
  10485760, -- 10 MB in bytes
  ARRAY[
    'application/pdf',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE 
SET public = false, 
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[];

-- 3. Create path helper to securely parse and validate circle UUID from storage path
-- Pattern: learning-circles/{circle_id}/{resource_id}/{filename}
CREATE OR REPLACE FUNCTION public.extract_circle_id_from_path(path_name text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  parts text[];
BEGIN
  parts := regexp_split_to_array(path_name, '/');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'learning-circles' THEN
    RETURN parts[2]::uuid;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 4. Enable RLS on storage.objects if not already enabled (done by default by Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent conflicts during re-application
DROP POLICY IF EXISTS "lc_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "lc_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "lc_storage_delete" ON storage.objects;

-- 6. Create SELECT Storage Policy
-- Only circle members/owners can download/read circle resource files
CREATE POLICY "lc_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'learning-circle-resources'
    AND public.can_access_learning_circle(
      public.extract_circle_id_from_path(name),
      auth.uid()
    )
  );

-- 7. Create INSERT Storage Policy
-- Only circle members/owners can upload resource files to the circle path
CREATE POLICY "lc_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'learning-circle-resources'
    AND public.can_access_learning_circle(
      public.extract_circle_id_from_path(name),
      auth.uid()
    )
  );

-- 8. Create DELETE Storage Policy
-- Only the uploader of the storage object OR the circle owner can delete the resource file
CREATE POLICY "lc_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'learning-circle-resources'
    AND (
      owner = auth.uid()
      OR public.is_learning_circle_owner(
        public.extract_circle_id_from_path(name),
        auth.uid()
      )
    )
  );
