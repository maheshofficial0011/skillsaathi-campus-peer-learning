import React, { useState, useEffect } from 'react';
import { getCurrentProfile, upsertCurrentProfile } from '../lib/profiles';
import type { Profile } from '../types';

interface ProfilePageProps {
  userId?: string;
  userEmail?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userId, userEmail }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getCurrentProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setErrorMsg('Failed to load profile from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleCreatePlaceholderProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const newProfile: Partial<Profile> & { id: string } = {
        id: userId,
        full_name: 'Campus Scholar',
        department: 'General Engineering',
        year_of_study: '1st Year',
        section: 'A',
        skills_known: ['Problem Solving', 'Peer Learning'],
        skills_wanted: ['Full Stack Development', 'Interview Prep'],
        trust_score: 100,
        badge_level: 'Newcomer',
      };
      
      const created = await upsertCurrentProfile(newProfile);
      if (created) {
        setProfile(created);
      } else {
        setErrorMsg('Failed to create profile. Please verify database trigger and connection.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during profile creation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Loading your profile from Supabase...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-md mx-auto p-6 bg-red-50 rounded-xl border border-red-200 text-center space-y-4">
        <h3 className="text-lg font-bold text-red-800">Error Loading Profile</h3>
        <p className="text-sm text-red-650 text-red-700">{errorMsg}</p>
        <button
          onClick={loadProfile}
          className="px-4 py-2 bg-indigo-650 text-white font-semibold rounded-lg shadow hover:bg-indigo-750 transition bg-indigo-600 hover:bg-indigo-700 text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  // Fallback if profile doesn't exist in DB yet
  if (!profile) {
    return (
      <div className="max-w-lg mx-auto p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-full border border-amber-200 flex items-center justify-center text-3xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">No Profile Found</h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            Your auth account is active, but we couldn't fetch a corresponding row in the public profiles table.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={loadProfile}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition"
          >
            Refresh Profile
          </button>
          <button
            onClick={handleCreatePlaceholderProfile}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm shadow transition"
          >
            Create Default Profile Row
          </button>
        </div>
      </div>
    );
  }

  // Get user initials for display
  const getInitials = (name: string) => {
    if (!name) return 'SS';
    return name
      .split(' ')
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Profile Header */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center text-3xl font-extrabold text-indigo-600 border-2 border-indigo-200 shrink-0">
          {getInitials(profile.full_name)}
        </div>
        
        <div className="text-center md:text-left space-y-1 flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 truncate">
              {profile.full_name || 'Anonymous Student'}
            </h2>
            <span className="self-center md:self-auto px-2.5 py-0.5 text-xs font-semibold text-indigo-800 bg-indigo-50 rounded-full border border-indigo-200 shrink-0">
              {profile.year_of_study || 'Year Unspecified'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {profile.department || 'General Studies'} {profile.section ? `• Sec ${profile.section}` : ''}
          </p>
          <p className="text-xs text-slate-400 truncate">{userEmail || 'Email unavailable'}</p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500 pt-2">
            <span>🏅 Badge: <strong>{profile.badge_level}</strong></span>
            <span>🤝 Trust Score: <strong>{profile.trust_score}%</strong></span>
            {profile.is_senior_mentor && (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ★ Senior Mentor
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={loadProfile}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors duration-150 shrink-0"
        >
          Refresh Data
        </button>
      </div>

      {/* Skills Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Skills I Know */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
            Skills I Know & Can Help With
          </h3>
          {profile.skills_known && profile.skills_known.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills_known.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                  ✓ {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No skills listed yet.</p>
          )}
        </div>

        {/* Skills I Want to Learn */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
            Skills I Want to Learn
          </h3>
          {profile.skills_wanted && profile.skills_wanted.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills_wanted.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-full">
                  🔍 {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No learning goals listed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
