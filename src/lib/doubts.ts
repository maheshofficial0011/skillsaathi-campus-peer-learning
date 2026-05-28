import { supabase } from './supabase';
import type {
  DoubtPostWithProfile,
  DoubtAnswerWithProfile,
  DoubtAnswerRating,
  DoubtAnswerReplyWithProfile,
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

export interface RateAnswerInput {
  answer_id: string;
  doubt_id: string;
  created_by: string;
  receiver_id: string;
  rating: number;
  comment?: string;
}

export interface CreateReplyInput {
  answer_id: string;
  doubt_id: string;
  reply_text: string;
  created_by: string;
  is_anonymous: boolean;
}

// ──────────────────────────────────────────
// DOUBT POST FUNCTIONS
// ──────────────────────────────────────────

/**
 * Fetch all doubt posts with creator profile.
 * Returns most-recent first. Anonymous posts have creator_profile intact in DB
 * but the UI hides the name.
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
 * Update a doubt post's editable fields.
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
 * Supports multiple accepted answers — does NOT unset other answers.
 * Sets solved_answer_id only if not already set (preserves the first accepted answer).
 */
export const markDoubtSolved = async (doubtId: string, answerId: string): Promise<boolean> => {
  try {
    // Step 1: mark this specific answer as accepted (others untouched)
    const { error: answerError } = await supabase
      .from('doubt_answers')
      .update({ is_accepted: true })
      .eq('id', answerId)
      .eq('doubt_id', doubtId);

    if (answerError) throw answerError;

    // Step 2: set doubt to solved. Only update solved_answer_id if currently null.
    const { data: existingDoubt } = await supabase
      .from('doubt_posts')
      .select('solved_answer_id')
      .eq('id', doubtId)
      .single();

    const updatePayload: Record<string, unknown> = { status: 'solved' };
    if (!existingDoubt?.solved_answer_id) {
      updatePayload.solved_answer_id = answerId;
    }

    const { error: doubtError } = await supabase
      .from('doubt_posts')
      .update(updatePayload)
      .eq('id', doubtId);

    if (doubtError) throw doubtError;
    return true;
  } catch (err) {
    console.error('Error marking doubt solved:', err);
    throw err;
  }
};

/**
 * Reopen a closed doubt so students can answer again.
 * nextStatus should be 'answered' if answer_count > 0, otherwise 'open'.
 */
export const reopenDoubt = async (doubtId: string, nextStatus: 'open' | 'answered'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doubt_posts')
      .update({ status: nextStatus })
      .eq('id', doubtId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error reopening doubt:', err);
    throw err;
  }
};

/**
 * Permanently delete a doubt.
 * UI must guard: only allow when status is 'open' or 'closed' and answer_count === 0.
 * DB DELETE policy also enforces status IN ('open','closed').
 */
export const deleteDoubt = async (doubtId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('doubt_posts')
      .delete()
      .eq('id', doubtId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting doubt:', err);
    throw err;
  }
};

/**
 * Returns the set of doubt_ids that the given user has answered.
 * Used to populate the "Answered by Me" tab.
 */
export const getDoubtIdsAnsweredByUser = async (userId: string): Promise<Set<string>> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answers')
      .select('doubt_id')
      .eq('created_by', userId);

    if (error) throw error;
    return new Set((data || []).map((r: { doubt_id: string }) => r.doubt_id));
  } catch (err) {
    console.error('Error fetching answered doubt ids:', err);
    return new Set();
  }
};

// ──────────────────────────────────────────
// DOUBT ANSWER FUNCTIONS
// ──────────────────────────────────────────

/**
 * Fetch all answers for a given doubt, with answerer profile.
 * Accepted answer sorts first, then chronologically.
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
 * NOTE: DB trigger handle_doubt_first_answer() auto-updates doubt status to 'answered'
 * when status was 'open'. No client-side status update needed.
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
    return data as DoubtAnswerWithProfile;
  } catch (err) {
    console.error('Error creating answer:', err);
    throw err;
  }
};

/**
 * Update the text of an existing answer.
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

// ──────────────────────────────────────────
// ANSWER RATING FUNCTIONS (Phase 3 Improvement)
// ──────────────────────────────────────────

/**
 * Fetch all ratings for all answers belonging to a doubt.
 */
export const getRatingsForDoubt = async (doubtId: string): Promise<DoubtAnswerRating[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_ratings')
      .select('*')
      .eq('doubt_id', doubtId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DoubtAnswerRating[];
  } catch (err) {
    console.error('Error fetching answer ratings:', err);
    return [];
  }
};

/**
 * Submit a 1–10 rating from the doubt creator for one answer.
 */
export const rateDoubtAnswer = async (input: RateAnswerInput): Promise<DoubtAnswerRating | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_ratings')
      .insert({
        answer_id: input.answer_id,
        doubt_id: input.doubt_id,
        created_by: input.created_by,
        receiver_id: input.receiver_id,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as DoubtAnswerRating;
  } catch (err) {
    console.error('Error rating answer:', err);
    throw err;
  }
};

/**
 * Update an existing rating.
 */
export const updateDoubtAnswerRating = async (
  ratingId: string,
  input: { rating: number; comment?: string }
): Promise<DoubtAnswerRating | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_ratings')
      .update({
        rating: input.rating,
        comment: input.comment?.trim() || null,
      })
      .eq('id', ratingId)
      .select()
      .single();

    if (error) throw error;
    return data as DoubtAnswerRating;
  } catch (err) {
    console.error('Error updating answer rating:', err);
    throw err;
  }
};

// ──────────────────────────────────────────
// ANSWER REPLY FUNCTIONS (Phase 3 Improvement)
// ──────────────────────────────────────────

/**
 * Fetch all replies for all answers in a doubt (batched, not per-answer).
 */
export const getRepliesForDoubt = async (doubtId: string): Promise<DoubtAnswerReplyWithProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_replies')
      .select(`
        *,
        author_profile:profiles!doubt_answer_replies_created_by_fkey(full_name)
      `)
      .eq('doubt_id', doubtId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DoubtAnswerReplyWithProfile[];
  } catch (err) {
    console.error('Error fetching replies for doubt:', err);
    return [];
  }
};

/**
 * Post a follow-up / cross-question reply under an answer.
 */
export const createAnswerReply = async (input: CreateReplyInput): Promise<DoubtAnswerReplyWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_replies')
      .insert({
        answer_id: input.answer_id,
        doubt_id: input.doubt_id,
        reply_text: input.reply_text.trim(),
        created_by: input.created_by,
        is_anonymous: input.is_anonymous,
      })
      .select(`
        *,
        author_profile:profiles!doubt_answer_replies_created_by_fkey(full_name)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerReplyWithProfile;
  } catch (err) {
    console.error('Error creating reply:', err);
    throw err;
  }
};

/**
 * Update the text of an existing reply (owner only).
 */
export const updateAnswerReply = async (
  replyId: string,
  input: { reply_text: string }
): Promise<DoubtAnswerReplyWithProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('doubt_answer_replies')
      .update({ reply_text: input.reply_text.trim() })
      .eq('id', replyId)
      .select(`
        *,
        author_profile:profiles!doubt_answer_replies_created_by_fkey(full_name)
      `)
      .single();

    if (error) throw error;
    return data as DoubtAnswerReplyWithProfile;
  } catch (err) {
    console.error('Error updating reply:', err);
    throw err;
  }
};
