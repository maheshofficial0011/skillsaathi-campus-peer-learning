import { supabase } from './supabase';
import type { HelpRequestWithProfiles, HelpRequestUrgency } from '../types';

/**
 * Fetch all help requests with their associated creator and helper profiles.
 * Sorts by created_at in descending order.
 */
export const getHelpRequests = async (): Promise<HelpRequestWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        creator_profile:profiles!help_requests_created_by_fkey(full_name, department, year_of_study),
        helper_profile:profiles!help_requests_accepted_by_fkey(full_name, department, year_of_study)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HelpRequestWithProfiles[];
  } catch (err) {
    console.error('Error fetching help requests:', err);
    return [];
  }
};

/**
 * Fetch help requests created by or accepted by a specific user.
 */
export const getMyHelpRequests = async (userId: string): Promise<HelpRequestWithProfiles[]> => {
  try {
    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        creator_profile:profiles!help_requests_created_by_fkey(full_name, department, year_of_study),
        helper_profile:profiles!help_requests_accepted_by_fkey(full_name, department, year_of_study)
      `)
      .or(`created_by.eq.${userId},accepted_by.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HelpRequestWithProfiles[];
  } catch (err) {
    console.error('Error fetching my help requests:', err);
    return [];
  }
};

interface CreateRequestInput {
  title: string;
  description: string;
  required_skills: string[];
  category: string;
  urgency: HelpRequestUrgency;
  deadline: string | null;
  created_by: string;
}

/**
 * Insert a new help request.
 */
export const createHelpRequest = async (input: CreateRequestInput): Promise<HelpRequestWithProfiles | null> => {
  try {
    const { data, error } = await supabase
      .from('help_requests')
      .insert({
        title: input.title,
        description: input.description,
        required_skills: input.required_skills,
        category: input.category,
        urgency: input.urgency,
        deadline: input.deadline || null,
        created_by: input.created_by,
        status: 'open',
      })
      .select(`
        *,
        creator_profile:profiles!help_requests_created_by_fkey(full_name, department, year_of_study),
        helper_profile:profiles!help_requests_accepted_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as HelpRequestWithProfiles;
  } catch (err) {
    console.error('Error creating help request:', err);
    throw err;
  }
};

/**
 * Accept an open help request.
 * Sets status to 'accepted' and accepted_by to the helper's ID.
 */
export const acceptHelpRequest = async (requestId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('help_requests')
      .update({
        status: 'accepted',
        accepted_by: userId,
      })
      .eq('id', requestId)
      .eq('status', 'open'); // Ensure it is still open when updating

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error accepting help request:', err);
    throw err;
  }
};

/**
 * Mark an accepted help request as solved.
 * Sets status to 'solved' and solved_at to the current time.
 */
export const markHelpRequestSolved = async (requestId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('help_requests')
      .update({
        status: 'solved',
        solved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('accepted_by', userId)
      .eq('status', 'accepted');

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error marking help request solved:', err);
    throw err;
  }
};

/**
 * Close/cancel a help request.
 * Sets status to 'closed'.
 */
export const closeHelpRequest = async (requestId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('help_requests')
      .update({
        status: 'closed',
      })
      .eq('id', requestId)
      .eq('created_by', userId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error closing help request:', err);
    throw err;
  }
};

/**
 * Permanently delete a help request.
 * Safe to call only when status is 'open' or 'closed' and there is no feedback.
 * The RLS DELETE policy on help_requests enforces creator-only + open/closed restriction server-side.
 */
export const deleteHelpRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('help_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting help request:', err);
    throw err;
  }
};

