import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, upsertCurrentProfile } from '../lib/profiles';
import type { Profile, YearOfStudy } from '../types';

interface ProfilePageProps {
  userId?: string;
  userEmail?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userId, userEmail }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [solvedRequestsCount, setSolvedRequestsCount] = useState<number>(0);
  const [feedbackAverage, setFeedbackAverage] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editYearOfStudy, setEditYearOfStudy] = useState<YearOfStudy>('1st Year');
  const [editSection, setEditSection] = useState('');
  const [editSkillsKnown, setEditSkillsKnown] = useState('');
  const [editSkillsWanted, setEditSkillsWanted] = useState('');
  const [editAvailability, setEditAvailability] = useState('');
  const [editHelpMode, setEditHelpMode] = useState<string>('Online');
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch public profile
      const data = await getCurrentProfile(userId);
      setProfile(data);

      if (data) {
        // 2. Fetch solved help requests count (using head: true to only get count)
        const { count, error: countError } = await supabase
          .from('help_requests')
          .select('*', { count: 'exact', head: true })
          .eq('accepted_by', userId)
          .eq('status', 'solved');
          
        if (!countError && count !== null) {
          setSolvedRequestsCount(count);
        }

        // 3. Fetch feedback average rating
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('rating')
          .eq('receiver_id', userId);

        if (!feedbackError && feedbackData && feedbackData.length > 0) {
          const total = feedbackData.reduce((acc, curr) => acc + curr.rating, 0);
          setFeedbackAverage(Number((total / feedbackData.length).toFixed(1)));
        } else {
          setFeedbackAverage(null);
        }
      }
    } catch (err) {
      console.error('Error loading profile page data:', err);
      setErrorMsg('Failed to load profile from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleStartEditing = () => {
    if (!profile) return;
    setEditFullName(profile.full_name);
    setEditDepartment(profile.department);
    setEditYearOfStudy(profile.year_of_study as YearOfStudy);
    setEditSection(profile.section || '');
    setEditSkillsKnown(profile.skills_known.join(', '));
    setEditSkillsWanted(profile.skills_wanted.join(', '));
    setEditAvailability(profile.availability || '');
    setEditHelpMode(profile.help_mode || 'Online');
    
    setEditError(null);
    setEditSuccess(null);
    setIsEditing(true);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !profile) return;

    if (!editFullName.trim() || !editDepartment.trim()) {
      setEditError('Please fill in required fields: Full Name and Department.');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    setEditSuccess(null);

    // Split and clean skills tags
    const skillsKnownArr = editSkillsKnown
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const skillsWantedArr = editSkillsWanted
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const updated = await upsertCurrentProfile({
        id: userId,
        full_name: editFullName.trim(),
        department: editDepartment.trim(),
        year_of_study: editYearOfStudy,
        section: editSection.trim() || null,
        skills_known: skillsKnownArr,
        skills_wanted: skillsWantedArr,
        availability: editAvailability.trim() || null,
        help_mode: editHelpMode || null,
        
        // Preserve unedited Phase 1/2 fields
        trust_score: profile.trust_score,
        badge_level: profile.badge_level,
        is_senior_mentor: profile.is_senior_mentor,
        mentor_topics: profile.mentor_topics,
        mentor_bio: profile.mentor_bio,
      });

      if (updated) {
        setEditSuccess('Profile changes saved successfully!');
        setProfile(updated);
        
        // Delay exiting edit mode to let user see success alert
        setTimeout(() => {
          setIsEditing(false);
          loadProfile();
        }, 800);
      } else {
        setEditError('Failed to save profile changes.');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred during save.');
    } finally {
      setEditLoading(false);
    }
  };

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
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <button
          onClick={loadProfile}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition text-xs"
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
          <p className="text-sm text-slate-655 text-slate-600 max-w-sm mx-auto leading-relaxed">
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-250">
      
      {/* 1. EDIT MODE SCREEN */}
      {isEditing ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-900">Edit Peer Profile Settings</h3>
            <p className="text-xs text-slate-500 mt-0.5">Customize your learning identity and preferences visible to the campus.</p>
          </div>

          {/* Form Alert Banners */}
          {editError && (
            <div className="p-4 text-xs text-red-800 bg-red-50 rounded-lg border border-red-200" role="alert">
              <span className="font-semibold">Error:</span> {editError}
            </div>
          )}

          {editSuccess && (
            <div className="p-4 text-xs text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200" role="alert">
              <span className="font-semibold">Success:</span> {editSuccess}
            </div>
          )}

          <form onSubmit={handleSaveChanges} className="space-y-4">
            {/* Split Grid for Name and Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                />
              </div>
            </div>

            {/* Year of study and Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Year of Study <span className="text-red-500">*</span>
                </label>
                <select
                  value={editYearOfStudy}
                  onChange={(e) => setEditYearOfStudy(e.target.value as YearOfStudy)}
                  className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. Section B"
                />
              </div>
            </div>

            {/* Split Grid for Availability and Help Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Availability Description
                </label>
                <input
                  type="text"
                  value={editAvailability}
                  onChange={(e) => setEditAvailability(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. Weekends, Weekdays after 5 PM"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Preferred Help Mode
                </label>
                <select
                  value={editHelpMode}
                  onChange={(e) => setEditHelpMode(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                >
                  <option value="Online">Online</option>
                  <option value="In-Person">In-Person</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Textareas for skills tags */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Skills I Know & Can Help With <span className="text-slate-400 font-normal">(Comma Separated)</span>
                </label>
                <textarea
                  rows={2}
                  value={editSkillsKnown}
                  onChange={(e) => setEditSkillsKnown(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. React, TypeScript, Java, C++"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Skills I Want to Learn <span className="text-slate-400 font-normal">(Comma Separated)</span>
                </label>
                <textarea
                  rows={2}
                  value={editSkillsWanted}
                  onChange={(e) => setEditSkillsWanted(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. Docker, Python, Machine Learning"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={editLoading}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-sm transition"
              >
                {editLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 2. STATIC VIEW MODE SCREEN */
        <>
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
                <span>✅ Solved: <strong>{solvedRequestsCount}</strong> requests</span>
                {feedbackAverage !== null && (
                  <span>⭐ Rating: <strong>{feedbackAverage}</strong> / 5</span>
                )}
                {profile.is_senior_mentor && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ★ Senior Mentor
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={handleStartEditing}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm text-center"
              >
                Edit Profile
              </button>
              <button
                onClick={loadProfile}
                className="w-full px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition text-center"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Core Profile Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-450 text-slate-400 uppercase tracking-wide">🏫 Availability Status</h4>
              <p className="text-sm font-semibold text-slate-800">
                {profile.availability || 'No specific availability details posted yet.'}
              </p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-450 text-slate-400 uppercase tracking-wide">📍 Preferred Meeting Mode</h4>
              <p className="text-sm font-semibold text-slate-800">
                {profile.help_mode || 'No preference indicated yet.'}
              </p>
            </div>
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
        </>
      )}
    </div>
  );
};
