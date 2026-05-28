-- ============================================================
-- PHASE 4: SECURE CONTACT PRIVACY & TRUSTED MEETING LINKS PATCH
-- Safe to run on existing Supabase project.
-- Does NOT drop tables, does NOT delete data.
-- ============================================================

-- ────────────────────────────────────────
-- 1. Extend profiles Table with Private Contact Fields
-- ────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_other TEXT,
  ADD COLUMN IF NOT EXISTS share_phone_after_accept BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_whatsapp_after_accept BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_email_after_accept BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_other_contact_after_accept BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_contact_after_accept BOOLEAN NOT NULL DEFAULT false;

-- ────────────────────────────────────────
-- 2. Extend senior_guidance_requests with Session Columns
-- ────────────────────────────────────────
ALTER TABLE public.senior_guidance_requests
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS meeting_password TEXT,
  ADD COLUMN IF NOT EXISTS meeting_location TEXT,
  ADD COLUMN IF NOT EXISTS meeting_platform TEXT;

-- ────────────────────────────────────────
-- 3. Secure Contact Gating RPC Function (Senior Connect)
-- ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_shared_contact(target_user_id UUID, request_id UUID)
RETURNS TABLE (
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_email TEXT,
  contact_other TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verify target_user_id is the other participant and status is accepted or completed
  IF EXISTS (
    SELECT 1 FROM public.senior_guidance_requests
    WHERE id = request_id
      AND status IN ('accepted', 'completed')
      AND (
        (requester_id = auth.uid() AND senior_id = target_user_id)
        OR (senior_id = auth.uid() AND requester_id = target_user_id)
      )
  ) THEN
    RETURN QUERY
    SELECT
      CASE WHEN share_phone_after_accept THEN p.contact_phone ELSE NULL END,
      CASE WHEN share_whatsapp_after_accept THEN p.contact_whatsapp ELSE NULL END,
      CASE WHEN share_email_after_accept THEN p.contact_email ELSE NULL END,
      CASE WHEN share_other_contact_after_accept THEN p.contact_other ELSE NULL END
    FROM public.profiles p
    WHERE p.id = target_user_id;
  END IF;
END;
$$;

-- ────────────────────────────────────────
-- 4. Secure Contact Gating RPC Function (Help Requests)
-- ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_shared_help_contact(target_user_id UUID, request_id UUID)
RETURNS TABLE (
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_email TEXT,
  contact_other TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verify target_user_id is the other participant and status is accepted, solved, or closed
  IF EXISTS (
    SELECT 1 FROM public.help_requests
    WHERE id = request_id
      AND status IN ('accepted', 'solved', 'closed')
      AND accepted_by IS NOT NULL
      AND (
        (created_by = auth.uid() AND accepted_by = target_user_id)
        OR (accepted_by = auth.uid() AND created_by = target_user_id)
      )
  ) THEN
    RETURN QUERY
    SELECT
      CASE WHEN share_phone_after_accept THEN p.contact_phone ELSE NULL END,
      CASE WHEN share_whatsapp_after_accept THEN p.contact_whatsapp ELSE NULL END,
      CASE WHEN share_email_after_accept THEN p.contact_email ELSE NULL END,
      CASE WHEN share_other_contact_after_accept THEN p.contact_other ELSE NULL END
    FROM public.profiles p
    WHERE p.id = target_user_id;
  END IF;
END;
$$;
