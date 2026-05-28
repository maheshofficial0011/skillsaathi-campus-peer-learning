import { supabase } from './supabase';
import type {
  SeniorMentorProfile,
  SeniorGuidanceRequestWithProfiles,
  SeniorGuidanceStatus,
  GuidanceMode,
} from '../types';

// ──────────────────────────────────────────
// MENTOR TOPICS CONSTANT
// ──────────────────────────────────────────
export const MENTOR_TOPICS: string[] = [
  'Placement Preparation',
  'Resume Review',
  'Interview Guidance',
  'Internship Guidance',
  'Project Guidance',
  'Hackathon Guidance',
  'Higher Studies',
  'Exam Preparation',
  'Department Guidance',
  'College Life',
  'Communication Skills',
  'Career Roadmap',
  'Other',
];

export const GUIDANCE_MODES: GuidanceMode[] = ['Online', 'In-Person', 'Hybrid'];

// ──────────────────────────────────────────
// MENTOR PROFILE QUERIES
// ──────────────────────────────────────────

/**
 * Fetch all senior mentor profiles (is_senior_mentor = true).
 */
export const getSeniorMentors = async (): Promise<SeniorMentorProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, year_of_study, section, mentor_topics, mentor_bio, availability, help_mode, trust_score, badge_level, skills_known')
      .eq('is_senior_mentor', true)
      .order('trust_score', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorMentorProfile[];
  } catch (err) {
    console.error('getSeniorMentors error:', err);
    return [];
  }
};

/**
 * Fetch a single senior mentor profile by userId.
 */
export const getSeniorMentorById = async (userId: string): Promise<SeniorMentorProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, year_of_study, section, mentor_topics, mentor_bio, availability, help_mode, trust_score, badge_level, skills_known')
      .eq('id', userId)
      .eq('is_senior_mentor', true)
      .single();

    if (error) throw error;
    return data as SeniorMentorProfile;
  } catch (err) {
    console.error('getSeniorMentorById error:', err);
    return null;
  }
};

/**
 * Update own senior mentor profile fields.
 * Only updates mentor-related fields; does NOT touch trust_score, badge_level, etc.
 */
export const updateSeniorMentorProfile = async (
  userId: string,
  input: {
    is_senior_mentor: boolean;
    mentor_topics: string[];
    mentor_bio: string;
    availability: string;
    help_mode: string;
  }
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_senior_mentor: input.is_senior_mentor,
        mentor_topics: input.mentor_topics,
        mentor_bio: input.mentor_bio.trim() || null,
        availability: input.availability.trim() || null,
        help_mode: input.help_mode || 'Hybrid',
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (err) {
    console.error('updateSeniorMentorProfile error:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// GUIDANCE REQUEST QUERIES
// ──────────────────────────────────────────

const GUIDANCE_SELECT = `
  *,
  requester_profile:profiles!senior_guidance_requests_requester_id_fkey(
    full_name, department, year_of_study, section
  ),
  senior_profile:profiles!senior_guidance_requests_senior_id_fkey(
    full_name, department, year_of_study, is_senior_mentor,
    mentor_topics, mentor_bio, availability, help_mode, trust_score, badge_level
  )
`;

/**
 * Create a new guidance request.
 */
export const createGuidanceRequest = async (input: {
  requester_id: string;
  senior_id: string;
  topic: string;
  message: string;
  preferred_mode: GuidanceMode;
  preferred_time?: string;
}): Promise<SeniorGuidanceRequestWithProfiles> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .insert({
        requester_id: input.requester_id,
        senior_id: input.senior_id,
        topic: input.topic.trim(),
        message: input.message.trim(),
        preferred_mode: input.preferred_mode,
        preferred_time: input.preferred_time?.trim() || null,
        status: 'pending',
      })
      .select(GUIDANCE_SELECT)
      .single();

    if (error) throw error;
    return data as SeniorGuidanceRequestWithProfiles;
  } catch (err) {
    console.error('createGuidanceRequest error:', err);
    throw err;
  }
};

/**
 * Fetch all guidance requests sent by the user (requester_id = userId).
 */
export const getMyGuidanceRequests = async (
  userId: string
): Promise<SeniorGuidanceRequestWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select(GUIDANCE_SELECT)
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorGuidanceRequestWithProfiles[];
  } catch (err) {
    console.error('getMyGuidanceRequests error:', err);
    return [];
  }
};

/**
 * Fetch all incoming guidance requests for a senior (senior_id = userId).
 */
export const getSeniorIncomingRequests = async (
  userId: string
): Promise<SeniorGuidanceRequestWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select(GUIDANCE_SELECT)
      .eq('senior_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SeniorGuidanceRequestWithProfiles[];
  } catch (err) {
    console.error('getSeniorIncomingRequests error:', err);
    return [];
  }
};

/**
 * Update the status of a guidance request.
 * Used by both requester (cancel) and senior (accept/decline/complete).
 */
export const updateGuidanceRequestStatus = async (
  requestId: string,
  status: SeniorGuidanceStatus,
  responseMessage?: string
): Promise<SeniorGuidanceRequestWithProfiles> => {
  try {
    const payload: Record<string, unknown> = { status };
    if (responseMessage !== undefined) {
      payload.response_message = responseMessage.trim() || null;
    }
    if (status === 'completed') {
      payload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .update(payload)
      .eq('id', requestId)
      .select(GUIDANCE_SELECT)
      .single();

    if (error) throw error;
    return data as SeniorGuidanceRequestWithProfiles;
  } catch (err) {
    console.error('updateGuidanceRequestStatus error:', err);
    throw err;
  }
};

/**
 * Fetch a single guidance request by its ID.
 */
export const getGuidanceRequestById = async (
  requestId: string
): Promise<SeniorGuidanceRequestWithProfiles | null> => {
  try {
    const { data, error } = await supabase
      .from('senior_guidance_requests')
      .select(GUIDANCE_SELECT)
      .eq('id', requestId)
      .single();

    if (error) throw error;
    return data as SeniorGuidanceRequestWithProfiles;
  } catch (err) {
    console.error('getGuidanceRequestById error:', err);
    return null;
  }
};
