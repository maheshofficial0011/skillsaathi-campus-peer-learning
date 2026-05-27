import { supabase } from './supabase';
import type { Profile } from '../types';

/**
 * Fetch the public profile associated with a specific user ID.
 * @param userId - The unique UUID of the auth user
 * @returns The profile record if found, or null
 */
export const getCurrentProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PostgREST code for "No rows found"
        return null;
      }
      throw error;
    }

    return data as Profile;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
};

/**
 * Helper to update/upsert user profiles if needed in the future.
 */
export const upsertCurrentProfile = async (profile: Partial<Profile> & { id: string }): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  } catch (err) {
    console.error('Error upserting user profile:', err);
    return null;
  }
};
