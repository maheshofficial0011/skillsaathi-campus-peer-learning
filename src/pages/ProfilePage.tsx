import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, upsertCurrentProfile } from '../lib/profiles';
import { getReviewsReceived, getDoubtContributionStats } from '../lib/profileStats';
import type { Profile, YearOfStudy } from '../types';
import type { ReviewItem, DoubtContributionStats } from '../lib/profileStats';
import { DEPARTMENTS } from '../lib/departments';
import { PublicProfileModal } from '../components/profile/PublicProfileModal';

interface ProfilePageProps {
  userId?: string;
  userEmail?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userId, userEmail }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [solvedRequestsCount, setSolvedRequestsCount] = useState<number>(0);
  const [feedbackAverage, setFeedbackAverage] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [viewReviewerProfileId, setViewReviewerProfileId] = useState<string | null>(null);
  const [doubtStats, setDoubtStats] = useState<DoubtContributionStats | null>(null);

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
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getCurrentProfile(userId);
      setProfile(data);

      if (data) {
        // Solved help requests count
        const { count, error: countError } = await supabase
          .from('help_requests')
          .select('*', { count: 'exact', head: true })
          .eq('accepted_by', userId)
          .eq('status', 'solved');
        if (!countError && count !== null) setSolvedRequestsCount(count);

        // Feedback reviews
        const reviews = await getReviewsReceived(userId);
        setRecentReviews(reviews);
        setReviewCount(reviews.length);
        if (reviews.length > 0) {
          const total = reviews.reduce((acc, r) => acc + r.rating, 0);
          setFeedbackAverage(Number((total / reviews.length).toFixed(1)));
        } else {
          setFeedbackAverage(null);
        }

        // Doubt contribution stats
        const ds = await getDoubtContributionStats(userId);
        setDoubtStats(ds);
      }
    } catch (err) {
      console.error('Error loading profile page data:', err);
      setErrorMsg('Failed to load profile from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [userId]);

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
    const skillsKnownArr = editSkillsKnown.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const skillsWantedArr = editSkillsWanted.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
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
        trust_score: profile.trust_score,
        badge_level: profile.badge_level,
        is_senior_mentor: profile.is_senior_mentor,
        mentor_topics: profile.mentor_topics,
        mentor_bio: profile.mentor_bio,
      });
      if (updated) {
        setEditSuccess('Profile changes saved successfully!');
        setProfile(updated);
        setTimeout(() => { setIsEditing(false); loadProfile(); }, 800);
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
        <button onClick={loadProfile}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition text-xs">
          Retry
        </button>
      </div>
    );
  }

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
          <button onClick={loadProfile}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition">
            Refresh Profile
          </button>
          <button onClick={handleCreatePlaceholderProfile}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm shadow transition">
            Create Default Profile Row
          </button>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'SS';
    return name.split(' ').filter((n) => n.length > 0).map((n) => n[0]).slice(0, 2).join('').toUpperCase();
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" required value={editFullName} onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                <input type="text" list="profile-departments-list" required value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="Select or type department"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium" />
                <datalist id="profile-departments-list">
                  {DEPARTMENTS.map((dept) => <option key={dept} value={dept} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Year of Study <span className="text-red-500">*</span></label>
                <select value={editYearOfStudy} onChange={(e) => setEditYearOfStudy(e.target.value as YearOfStudy)}
                  className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium">
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                <input type="text" value={editSection} onChange={(e) => setEditSection(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. Section B" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Availability Description</label>
                <input type="text" value={editAvailability} onChange={(e) => setEditAvailability(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. Weekends, Weekdays after 5 PM" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Help Mode</label>
                <select value={editHelpMode} onChange={(e) => setEditHelpMode(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium">
                  <option value="Online">Online</option>
                  <option value="In-Person">In-Person</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Skills I Know & Can Help With <span className="text-slate-400 font-normal">(Comma Separated)</span>
                </label>
                <textarea rows={2} value={editSkillsKnown} onChange={(e) => setEditSkillsKnown(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. React, TypeScript, Java, C++" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Skills I Want to Learn <span className="text-slate-400 font-normal">(Comma Separated)</span>
                </label>
                <textarea rows={2} value={editSkillsWanted} onChange={(e) => setEditSkillsWanted(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  placeholder="e.g. Docker, Python, Machine Learning" />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsEditing(false)} disabled={editLoading}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition">
                Cancel
              </button>
              <button type="submit" disabled={editLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-sm transition">
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
                <h2 className="text-2xl font-bold text-slate-900 truncate">{profile.full_name || 'Anonymous Student'}</h2>
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
              <button onClick={handleStartEditing}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm text-center">
                Edit Profile
              </button>
              <button onClick={loadProfile}
                className="w-full px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition text-center">
                Refresh Data
              </button>
            </div>
          </div>

          {/* Core Profile Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">🏫 Availability Status</h4>
              <p className="text-sm font-semibold text-slate-800">
                {profile.availability || 'No specific availability details posted yet.'}
              </p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">📍 Preferred Meeting Mode</h4>
              <p className="text-sm font-semibold text-slate-800">
                {profile.help_mode || 'No preference indicated yet.'}
              </p>
            </div>
          </div>

          {/* Skills Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

          {/* ========== PEER HELP REPUTATION SECTION ========== */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">🤝 Peer Help Reputation</h3>
                <p className="text-xs text-slate-400 mt-0.5">Based on peer help requests solved and feedback received</p>
              </div>
              <span className="text-xs text-slate-400 font-medium shrink-0">Help requests &amp; feedback</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                <p className="text-2xl font-extrabold text-indigo-700">{profile.trust_score}%</p>
                <p className="text-[11px] font-bold text-indigo-500 mt-1">Trust Score</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <p className="text-2xl font-extrabold text-emerald-700">{solvedRequestsCount}</p>
                <p className="text-[11px] font-bold text-emerald-500 mt-1">Solved</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                {feedbackAverage !== null ? (
                  <>
                    <p className="text-2xl font-extrabold text-amber-700">{feedbackAverage}</p>
                    <p className="text-[11px] font-bold text-amber-500 mt-1">Avg Rating</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-extrabold text-slate-300">—</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">No Ratings</p>
                  </>
                )}
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
                <p className="text-2xl font-extrabold text-purple-700">{reviewCount}</p>
                <p className="text-[11px] font-bold text-purple-500 mt-1">Reviews</p>
              </div>
            </div>

            {/* Badge Explanation */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Badge Levels (Peer Help)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { emoji: '🌱', label: 'Newcomer', desc: 'Getting started' },
                  { emoji: '🤝', label: 'Helpful Peer', desc: 'First few sessions' },
                  { emoji: '🏅', label: 'Trusted Helper', desc: 'Consistently helpful' },
                  { emoji: '🎓', label: 'Campus Mentor', desc: 'Highly trusted' },
                  { emoji: '🏆', label: 'Skill Champion', desc: 'Top-rated helper' },
                ].map((b) => (
                  <div key={b.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                      profile.badge_level === b.label
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold shadow-sm'
                        : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                    <span className="text-base">{b.emoji}</span>
                    <span className="font-semibold">{b.label}</span>
                    <span className="text-[10px] opacity-60">— {b.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reviews */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Help Reviews Received</p>
              {recentReviews.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                  <p className="text-2xl">⭐</p>
                  <p className="text-sm font-semibold text-slate-600">No reviews yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    No peer help reviews yet. Help peers to build your trust score.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReviews.slice(0, 5).map((rev) => (
                    <div key={rev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {rev.reviewer_name ? (
                          <button onClick={() => setViewReviewerProfileId(rev.reviewer_id)}
                            className="text-[11px] font-bold text-indigo-700 hover:underline focus:outline-none">
                            {rev.reviewer_name}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500">Campus Student</span>
                        )}
                        {(rev.reviewer_department || rev.reviewer_year) && (
                          <span className="text-[10px] text-slate-400">
                            {[rev.reviewer_department, rev.reviewer_year].filter(Boolean).join(' • ')}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={s <= rev.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
                          ))}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          rev.helpful
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {rev.helpful ? '👍 Helpful' : '👎 Not Helpful'}
                        </span>
                      </div>
                      {rev.request_title && (
                        <p className="text-[11px] text-slate-500">For: <span className="font-semibold">{rev.request_title}</span></p>
                      )}
                      {rev.comment && (
                        <p className="text-xs text-slate-700 italic leading-relaxed">"{rev.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* ============================================ */}

          {/* ========== DOUBT CONTRIBUTION SECTION ========== */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">❓ Doubt Contribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your activity in the Doubts Module — separate from peer help</p>
              </div>
              <span className="text-xs text-slate-400 font-medium shrink-0">Answers, ratings &amp; acceptance</span>
            </div>

            {!doubtStats || (doubtStats.doubtsAsked === 0 && doubtStats.doubtsAnswered === 0) ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                <p className="text-2xl">❓</p>
                <p className="text-sm font-semibold text-slate-600">No doubt activity yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Ask doubts or answer peers' doubts to build your doubt profile.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                    <p className="text-2xl font-extrabold text-indigo-700">{doubtStats.doubtsAsked}</p>
                    <p className="text-[11px] font-bold text-indigo-500 mt-1">Doubts Asked</p>
                  </div>
                  <div className="p-4 bg-violet-50 rounded-xl border border-violet-100 text-center">
                    <p className="text-2xl font-extrabold text-violet-700">{doubtStats.doubtsAnswered}</p>
                    <p className="text-[11px] font-bold text-violet-500 mt-1">Doubts Answered</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <p className="text-2xl font-extrabold text-emerald-700">{doubtStats.acceptedAnswers}</p>
                    <p className="text-[11px] font-bold text-emerald-500 mt-1">Accepted Answers</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                    {doubtStats.averageDoubtAnswerRating !== null ? (
                      <>
                        <p className="text-2xl font-extrabold text-amber-700">
                          {doubtStats.averageDoubtAnswerRating}<span className="text-sm font-bold">/10</span>
                        </p>
                        <p className="text-[11px] font-bold text-amber-500 mt-1">Avg Answer Rating</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-extrabold text-slate-300">—</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">No Ratings Yet</p>
                      </>
                    )}
                  </div>
                  <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 text-center">
                    <p className="text-2xl font-extrabold text-sky-700">{doubtStats.answerRatingsReceived}</p>
                    <p className="text-[11px] font-bold text-sky-500 mt-1">Ratings Received</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  💡 Doubt answer ratings use a <strong>1–10</strong> scale — separate from peer help ratings (1–5 stars)
                </p>
              </>
            )}
          </div>
          {/* ================================================ */}

          {/* Reviewer Public Profile Modal */}
          {viewReviewerProfileId && (
            <PublicProfileModal
              userId={viewReviewerProfileId}
              onClose={() => setViewReviewerProfileId(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
