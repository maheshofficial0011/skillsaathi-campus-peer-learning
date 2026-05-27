import { supabase } from './supabase';
import type { Feedback } from '../types';

interface SubmitFeedbackInput {
  request_id: string;
  created_by: string;
  receiver_id: string;
  rating: number;
  helpful: boolean;
  comment: string;
}

/**
 * Submit feedback for a solved help request.
 * Automatically recalculates and updates the receiver's trust score on the backend.
 */
export const submitFeedback = async (input: SubmitFeedbackInput): Promise<Feedback | null> => {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        request_id: input.request_id,
        created_by: input.created_by,
        receiver_id: input.receiver_id,
        rating: input.rating,
        helpful: input.helpful,
        comment: input.comment || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Feedback;
  } catch (err) {
    console.error('Error submitting feedback:', err);
    throw err;
  }
};

/**
 * Fetch feedback matching a specific help request ID.
 * Helps check if feedback has already been submitted for a request.
 */
export const getFeedbackForRequest = async (requestId: string): Promise<Feedback | null> => {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) throw error;
    return data as Feedback | null;
  } catch (err) {
    console.error('Error fetching feedback for request:', err);
    return null;
  }
};

/**
 * Fallback frontend utility to manually refresh / trigger a profile's trust score.
 */
export const updateTrustScore = async (receiverId: string): Promise<number | null> => {
  try {
    // 1. Fetch all ratings received by this user
    const { data, error } = await supabase
      .from('feedback')
      .select('rating')
      .eq('receiver_id', receiverId);

    if (error) throw error;

    if (!data || data.length === 0) return 0;

    // 2. Compute average rating
    const total = data.reduce((acc, curr) => acc + curr.rating, 0);
    const average = total / data.length;

    // 3. Convert to percentage (average / 5 * 100)
    const trustScore = Math.round((average / 5.0) * 100);

    // 4. Update profile row
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ trust_score: trustScore })
      .eq('id', receiverId);

    if (updateError) throw updateError;
    return trustScore;
  } catch (err) {
    console.error('Error updating trust score manually:', err);
    return null;
  }
};
