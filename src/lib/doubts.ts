import { supabase } from './supabase';
import type {
  DoubtPostWithProfile,
  DoubtAnswerWithProfile,
} from '../types';

// ──────────────────────────────────────────
// DOUBT CATEGORIES
// ──────────────────────────────────────────
export const DOUBT_CATEGORIES: string[] = [
  'General',
  'Programming',
  'Java',
  'Python',
  'Data Structures',
  'Algorithms',
  'Web Development',
  'React',
  'Database',
  'Supabase',
  'Mathematics',
  'Physics',
  'Chemistry',
  'English',
  'Communication Skills',
  'Placement Prep',
  'Project Help',
  'Assignment Help',
  'Exam Preparation',
  'Other',
];

// ──────────────────────────────────────────
// INPUT TYPES
// ──────────────────────────────────────────
export interface CreateDoubtInput {
  title: string;
  description: string;
  category: string;
  tags: string[];
  is_anonymous: boolean;
  created_by: string;
}

export interface UpdateDoubtInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface CreateAnswerInput {
  doubt_id: string;
  answer_text: string;
  created_by: string;
}

export interface UpdateAnswerInput {
  answer_text: string;
}

// ──────────────────────────────────────────
// DOUBT POST FUNCTIONS
// ──────────────────────────────────────────

/**
 * Fetch all doubt posts with creator profile.
 * Returns most-recent first. Anonymous posts have creator_profile intact
 * in the DB, but the UI is responsible for hiding the name.
 */
export const getDoubts = async (): Promise<DoubtPostWithProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DoubtPostWithProfile[];
  } catch (err) {
    console.error('Error fetching doubts:', err);
    return [];
  }
};

/**
 * Fetch a single doubt post with profile.
 */
export const getDoubtById = async (doubtId: string): Promise<DoubtPostWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .eq('id', doubtId)
      .maybeSingle();

    if (error) throw error;
    return data as DoubtPostWithProfile | null;
  } catch (err) {
    console.error('Error fetching doubt by id:', err);
    return null;
  }
};

/**
 * Create a new doubt post.
 */
export const createDoubt = async (input: CreateDoubtInput): Promise<DoubtPostWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .insert({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category.trim(),
        tags: input.tags,
        is_anonymous: input.is_anonymous,
        created_by: input.created_by,
        status: 'open',
      })
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtPostWithProfile;
  } catch (err) {
    console.error('Error creating doubt:', err);
    throw err;
  }
};

/**
 * Update a doubt post's editable fields (title, description, category, tags).
 */
export const updateDoubt = async (
  doubtId: string,
  input: UpdateDoubtInput
): Promise<DoubtPostWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_posts')
      .update({
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.description !== undefined && { description: input.description.trim() }),
        ...(input.category !== undefined && { category: input.category.trim() }),
        ...(input.tags !== undefined && { tags: input.tags }),
      })
      .eq('id', doubtId)
      .select(`
        *,
        creator_profile:profiles!doubt_posts_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtPostWithProfile;
  } catch (err) {
    console.error('Error updating doubt:', err);
    throw err;
  }
};

/**
 * Close a doubt (creator only, sets status to 'closed').
 */
export const closeDoubt = async (doubtId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doubt_posts')
      .update({ status: 'closed' })
      .eq('id', doubtId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error closing doubt:', err);
    throw err;
  }
};

/**
 * Mark a doubt as solved by accepting a specific answer.
 * Sets doubt status to 'solved', sets solved_answer_id, and sets is_accepted on the answer.
 * This is a two-step process to stay within RLS policies:
 *   1. Update the answer row to is_accepted = true (allowed by "Doubt creator can accept an answer").
 *   2. Update the doubt post to status='solved' and solved_answer_id (allowed by "Doubt creator can update their own doubt").
 */
export const markDoubtSolved = async (doubtId: string, answerId: string): Promise<boolean> => {
  try {
    // Step 1: Mark the answer as accepted
    const { error: answerError } = await supabase
      .from('doubt_answers')
      .update({ is_accepted: true })
      .eq('id', answerId)
      .eq('doubt_id', doubtId);

    if (answerError) throw answerError;

    // Step 2: Mark the doubt as solved with the accepted answer reference
    const { error: doubtError } = await supabase
      .from('doubt_posts')
      .update({ status: 'solved', solved_answer_id: answerId })
      .eq('id', doubtId);

    if (doubtError) throw doubtError;

    return true;
  } catch (err) {
    console.error('Error marking doubt solved:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// DOUBT ANSWER FUNCTIONS
// ──────────────────────────────────────────

/**
 * Fetch all answers for a given doubt, with answerer profile.
 * Accepted answer always sorts first, then chronologically.
 */
export const getAnswersForDoubt = async (doubtId: string): Promise<DoubtAnswerWithProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .eq('doubt_id', doubtId)
      .order('is_accepted', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DoubtAnswerWithProfile[];
  } catch (err) {
    console.error('Error fetching answers for doubt:', err);
    return [];
  }
};

/**
 * Post a new answer to a doubt.
 */
export const createAnswer = async (input: CreateAnswerInput): Promise<DoubtAnswerWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .insert({
        doubt_id: input.doubt_id,
        answer_text: input.answer_text.trim(),
        created_by: input.created_by,
      })
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;

    // After first answer, bump doubt status to 'answered' (if still open)
    await supabase
      .from('doubt_posts')
      .update({ status: 'answered' })
      .eq('id', input.doubt_id)
      .eq('status', 'open');

    return data as DoubtAnswerWithProfile;
  } catch (err) {
    console.error('Error creating answer:', err);
    throw err;
  }
};

/**
 * Update the text of an existing answer (owner only, doubt must be open/answered).
 */
export const updateAnswer = async (
  answerId: string,
  input: UpdateAnswerInput
): Promise<DoubtAnswerWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .update({ answer_text: input.answer_text.trim() })
      .eq('id', answerId)
      .select(`
        *,
        answerer_profile:profiles!doubt_answers_created_by_fkey(full_name, department, year_of_study)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerWithProfile;
  } catch (err) {
    console.error('Error updating answer:', err);
    throw err;
  }
};
