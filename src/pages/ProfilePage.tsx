import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, upsertCurrentProfile } from '../lib/profiles';
import { getReviewsReceived, getDoubtContributionStats } from '../lib/profileStats';
import { getSeniorMentorStats, getSeniorFeedbackReceivedWithProfiles } from '../lib/seniorConnect';
import type { SeniorMentorStats } from '../lib/seniorConnect';
import type { Profile, YearOfStudy, SeniorGuidanceFeedbackWithProfiles } from '../types';
import type { ReviewItem, DoubtContributionStats } from '../lib/profileStats';
import { DEPARTMENTS } from '../lib/departments';
import { PublicProfileModal } from '../components/profile/PublicProfileModal';
import { useToast } from '../hooks/useToast';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

interface ProfilePageProps {
  userId?: string;
  userEmail?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userId, userEmail }) => {
  const toast = useToast();
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
  const [customDepartment, setCustomDepartment] = useState('');
  const [editYearOfStudy, setEditYearOfStudy] = useState<YearOfStudy>('1st Year');
  const [editSection, setEditSection] = useState('');
  const [editSkillsKnown, setEditSkillsKnown] = useState('');
  const [editSkillsWanted, setEditSkillsWanted] = useState('');
  const [editAvailability, setEditAvailability] = useState('');
  const [editHelpMode, setEditHelpMode] = useState<string>('Online');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactOther, setEditContactOther] = useState('');
  const [editSharePhone, setEditSharePhone] = useState(false);
  const [editShareWhatsapp, setEditShareWhatsapp] = useState(false);
  const [editShareEmail, setEditShareEmail] = useState(false);
  const [editShareOther, setEditShareOther] = useState(false);
  const [editShareContactGlobal, setEditShareContactGlobal] = useState(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [mentorStats, setMentorStats] = useState<SeniorMentorStats | null>(null);
  const [seniorFeedback, setSeniorFeedback] = useState<SeniorGuidanceFeedbackWithProfiles[]>([]);

  const [showAllPeerReviews, setShowAllPeerReviews] = useState(false);
  const [showAllMentorReviews, setShowAllMentorReviews] = useState(false);

  const sortedPeerReviews = useMemo(() => {
    return [...recentReviews].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.helpful !== a.helpful) return (b.helpful ? 1 : 0) - (a.helpful ? 1 : 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [recentReviews]);

  const displayedPeerReviews = useMemo(() => {
    return showAllPeerReviews ? sortedPeerReviews : sortedPeerReviews.slice(0, 3);
  }, [sortedPeerReviews, showAllPeerReviews]);

  const sortedMentorReviews = useMemo(() => {
    return [...seniorFeedback].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.helpful !== a.helpful) return (b.helpful ? 1 : 0) - (a.helpful ? 1 : 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [seniorFeedback]);

  const displayedMentorReviews = useMemo(() => {
    return showAllMentorReviews ? sortedMentorReviews : sortedMentorReviews.slice(0, 3);
  }, [sortedMentorReviews, showAllMentorReviews]);

  const completeness = useMemo(() => {
    if (!profile) return { percent: 0, missing: [] as { name: string; label: string }[] };
    const missingList: { name: string; label: string }[] = [];
    let filled = 0;

    // 1. Full Name
    if (profile.full_name && profile.full_name.trim() && profile.full_name !== 'Campus Scholar' && profile.full_name !== 'New User') {
      filled++;
    } else {
      missingList.push({ name: 'full_name', label: 'Add your real full name' });
    }

    // 2. Department
    if (profile.department && profile.department.trim()) {
      filled++;
    } else {
      missingList.push({ name: 'department', label: 'Select your department' });
    }

    // 3. Year of study
    if (profile.year_of_study) {
      filled++;
    } else {
      missingList.push({ name: 'year_of_study', label: 'Select your year of study' });
    }

    // 4. Skills known
    if (profile.skills_known && profile.skills_known.length > 0) {
      filled++;
    } else {
      missingList.push({ name: 'skills_known', label: 'List skills you can help with' });
    }

    // 5. Skills wanted
    if (profile.skills_wanted && profile.skills_wanted.length > 0) {
      filled++;
    } else {
      missingList.push({ name: 'skills_wanted', label: 'List skills you want to learn' });
    }

    // 6. Availability
    if (profile.availability && profile.availability.trim()) {
      filled++;
    } else {
      missingList.push({ name: 'availability', label: 'Provide availability details' });
    }

    // 7. Preferred Meeting Mode
    if (profile.help_mode && profile.help_mode.trim()) {
      filled++;
    } else {
      missingList.push({ name: 'help_mode', label: 'Set preferred meeting mode (Online/In-person)' });
    }

    const percent = Math.round((filled / 7) * 100);
    return { percent, missing: missingList };
  }, [profile]);

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

        if (data.is_senior_mentor) {
          const ms = await getSeniorMentorStats(userId);
          setMentorStats(ms);
          const fb = await getSeniorFeedbackReceivedWithProfiles(userId);
          setSeniorFeedback(fb);
        }
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
    
    const isStandard = DEPARTMENTS.filter((d) => d.toLowerCase() !== 'other').includes(profile.department);
    if (isStandard) {
      setEditDepartment(profile.department);
      setCustomDepartment('');
    } else {
      setEditDepartment('Other');
      setCustomDepartment(profile.department || '');
    }

    setEditYearOfStudy(profile.year_of_study as YearOfStudy);
    setEditSection(profile.section || '');
    setEditSkillsKnown(profile.skills_known.join(', '));
    setEditSkillsWanted(profile.skills_wanted.join(', '));
    setEditAvailability(profile.availability || '');
    setEditHelpMode(profile.help_mode || 'Online');
    setEditPhone(profile.contact_phone || '');
    setEditWhatsapp(profile.contact_whatsapp || '');
    setEditContactEmail(profile.contact_email || '');
    setEditContactOther(profile.contact_other || '');
    setEditSharePhone(!!profile.share_phone_after_accept);
    setEditShareWhatsapp(!!profile.share_whatsapp_after_accept);
    setEditShareEmail(!!profile.share_email_after_accept);
    setEditShareOther(!!profile.share_other_contact_after_accept);
    setEditShareContactGlobal(!!profile.share_contact_after_accept);
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

    let finalDept = editDepartment.trim();
    if (finalDept.toLowerCase() === 'other') {
      const trimmedCustom = customDepartment.trim();
      if (!trimmedCustom) {
        setEditError('Please specify your custom department.');
        toast.error('Validation Error', 'Please specify your custom department.');
        return;
      }
      finalDept = trimmedCustom;
    }

    if (!finalDept) {
      setEditError('Please enter a valid department.');
      return;
    }

    const cleanPhone = editPhone.trim();
    const cleanWhatsapp = editWhatsapp.trim();
    const cleanEmail = editContactEmail.trim();
    const cleanOther = editContactOther.trim();

    // Validations:
    if (editSharePhone && !cleanPhone) {
      setEditError('Phone number cannot be empty if sharing is enabled.');
      toast.error('Validation Warning', 'Please enter a phone number or disable sharing for it.');
      return;
    }
    if (editShareWhatsapp && !cleanWhatsapp) {
      setEditError('WhatsApp number/link cannot be empty if sharing is enabled.');
      toast.error('Validation Warning', 'Please enter a WhatsApp link/number or disable sharing for it.');
      return;
    }
    if (editShareEmail && !cleanEmail) {
      setEditError('Contact email cannot be empty if sharing is enabled.');
      toast.error('Validation Warning', 'Please enter a contact email or disable sharing for it.');
      return;
    }
    if (editShareOther && !cleanOther) {
      setEditError('Other contact details cannot be empty if sharing is enabled.');
      toast.error('Validation Warning', 'Please specify other contact info or disable sharing.');
      return;
    }

    // Email format validation (if provided)
    if (cleanEmail && !cleanEmail.includes('@')) {
      setEditError('Please enter a valid email address.');
      toast.error('Validation Warning', 'Contact email format is invalid.');
      return;
    }

    // If globally sharing or any sharing checkbox is enabled but all contact fields are blank
    const anySharingEnabled = editSharePhone || editShareWhatsapp || editShareEmail || editShareOther || editShareContactGlobal;
    const allFieldsBlank = !cleanPhone && !cleanWhatsapp && !cleanEmail && !cleanOther;
    if (anySharingEnabled && allFieldsBlank) {
      setEditError('Add at least one contact detail or disable sharing.');
      toast.error('Validation Warning', 'Add at least one contact detail or disable sharing.');
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
        department: finalDept,
        year_of_study: editYearOfStudy,
        section: editSection.trim() || null,
        skills_known: skillsKnownArr,
        skills_wanted: skillsWantedArr,
        availability: editAvailability.trim() || null,
        help_mode: editHelpMode || null,
        contact_phone: cleanPhone || null,
        contact_whatsapp: cleanWhatsapp || null,
        contact_email: cleanEmail || null,
        contact_other: cleanOther || null,
        share_phone_after_accept: editSharePhone,
        share_whatsapp_after_accept: editShareWhatsapp,
        share_email_after_accept: editShareEmail,
        share_other_contact_after_accept: editShareOther,
        share_contact_after_accept: editShareContactGlobal,
        trust_score: profile.trust_score,
        badge_level: profile.badge_level,
        is_senior_mentor: profile.is_senior_mentor,
        mentor_topics: profile.mentor_topics,
        mentor_bio: profile.mentor_bio,
      });
      if (updated) {
        setEditSuccess('Profile changes saved successfully!');
        setProfile(updated);
        toast.success('Profile Saved', 'Your changes have been updated successfully.');
        setTimeout(() => { setIsEditing(false); loadProfile(); }, 800);
      } else {
        setEditError('Failed to save profile changes.');
        toast.error('Save Failed', 'Could not save profile changes.');
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during save.';
      setEditError(errMsg);
      toast.error('Save Failed', errMsg);
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
    return <LoadingState label="Loading your profile from Supabase..." minHeight="min-h-[40vh]" />;
  }

  if (errorMsg) {
    return <ErrorState title="Error Loading Profile" message={errorMsg} onRetry={loadProfile} minHeight="min-h-[40vh]" />;
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-5 shadow-sm">
        <EmptyState
          icon="⚠️"
          title="No Profile Found"
          message="Your auth account is active, but we couldn't fetch a corresponding row in the public profiles table."
          actionLabel="Create Default Profile Row"
          onAction={handleCreatePlaceholderProfile}
          minHeight="min-h-[200px]"
        />
        <div className="pt-2 flex justify-center">
          <button onClick={loadProfile}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-sm transition shadow-sm">
            Refresh Profile
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

                {editDepartment.toLowerCase() === 'other' && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Enter your department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      placeholder="e.g. Cyber Security, Mechatronics"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-xs font-semibold"
                    />
                  </div>
                )}
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

            {/* ========== PRIVATE CONTACT SHARING SECTION ========== */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🔒</span> Private Contact Sharing Settings
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 space-y-1">
                  <span className="block">🔒 Only visible after an accepted/completed connection.</span>
                  <span className="block">✓ Only contact methods enabled by the user are shown.</span>
                  <span className="block">🚫 Private contact is never shown on public profiles.</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Contact Phone Number (Optional)</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 text-xs font-semibold bg-white"
                    placeholder="e.g. +91 98765 43210" />
                  <label className="flex items-center gap-2 select-none text-[11px] font-bold text-slate-600 cursor-pointer pt-0.5">
                    <input type="checkbox" checked={editSharePhone} onChange={(e) => setEditSharePhone(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                    <span>Share phone after accepted request</span>
                  </label>
                </div>

                {/* WhatsApp */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">WhatsApp Link or Number (Optional)</label>
                  <input type="text" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 text-xs font-semibold bg-white"
                    placeholder="e.g. wa.me/919876543210" />
                  <label className="flex items-center gap-2 select-none text-[11px] font-bold text-slate-600 cursor-pointer pt-0.5">
                    <input type="checkbox" checked={editShareWhatsapp} onChange={(e) => setEditShareWhatsapp(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                    <span>Share WhatsApp after accepted request</span>
                  </label>
                </div>

                {/* Contact Email */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Contact Email (Optional)</label>
                  <input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 text-xs font-semibold bg-white"
                    placeholder="e.g. contact@email.com" />
                  <label className="flex items-center gap-2 select-none text-[11px] font-bold text-slate-600 cursor-pointer pt-0.5">
                    <input type="checkbox" checked={editShareEmail} onChange={(e) => setEditShareEmail(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                    <span>Share email after accepted request</span>
                  </label>
                </div>

                {/* Other Handle */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Other Handle/Discord/Telegram (Optional)</label>
                  <input type="text" value={editContactOther} onChange={(e) => setEditContactOther(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 text-xs font-semibold bg-white"
                    placeholder="e.g. Discord: username#1234" />
                  <label className="flex items-center gap-2 select-none text-[11px] font-bold text-slate-600 cursor-pointer pt-0.5">
                    <input type="checkbox" checked={editShareOther} onChange={(e) => setEditShareOther(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" />
                    <span>Share other contact after accepted request</span>
                  </label>
                </div>
              </div>

              {/* Global opt-in compatibility checkbox */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-3">
                <input type="checkbox" id="global-share-contact" checked={editShareContactGlobal} onChange={(e) => setEditShareContactGlobal(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0" />
                <label htmlFor="global-share-contact" className="text-xs font-bold text-indigo-800 leading-normal select-none cursor-pointer">
                  Opt-in: Share my enabled contact details automatically with approved request peers.
                </label>
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

          {/* Profile Completeness Indicator Card */}
          <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  🎯 Profile Completeness: {completeness.percent}%
                </h3>
                <p className="text-xs text-slate-500">
                  Completing your profile improves matching with campus peers for learning.
                </p>
              </div>
              {completeness.percent === 100 ? (
                <span className="self-start sm:self-auto px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 flex items-center gap-1">
                  ✓ 100% Complete
                </span>
              ) : (
                <button
                  onClick={handleStartEditing}
                  className="self-start sm:self-auto px-3 py-1.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-755 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95"
                >
                  Edit Profile to Complete
                </button>
              )}
            </div>

            {/* Progress bar wrapper */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>

            {completeness.missing.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining items to improve your recommendation matches:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {completeness.missing.map((item) => (
                    <li key={item.name} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                <span>🎉</span> All parameters complete! Peers can now easily search and match with you.
              </p>
            )}
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Peer Help Reviews ({recentReviews.length})
              </p>
              {displayedPeerReviews.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                  <p className="text-2xl">⭐</p>
                  <p className="text-sm font-semibold text-slate-600">No peer help reviews yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    No peer help reviews yet. Help peers to build your trust score.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedPeerReviews.map((rev) => (
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
                  {sortedPeerReviews.length > 3 && (
                    <div className="flex justify-center mt-3 pt-1">
                      <button
                        onClick={() => setShowAllPeerReviews(!showAllPeerReviews)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none flex items-center gap-1 transition-colors"
                      >
                        {showAllPeerReviews ? 'Show fewer reviews' : 'Show more reviews'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* ============================================ */}

          {/* ========== SENIOR MENTOR IMPACT SECTION ========== */}
          {profile.is_senior_mentor && (() => {
            const avgGuidanceRating = seniorFeedback.length > 0
              ? Number((seniorFeedback.reduce((acc, f) => acc + f.rating, 0) / seniorFeedback.length).toFixed(1))
              : null;
            return (
              <div className="p-6 bg-violet-50/50 rounded-2xl border border-violet-200 shadow-sm space-y-6">
                <div className="border-b border-violet-200 pb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-violet-900 flex items-center gap-2">
                      <span>🎓</span> Senior Mentor Impact
                    </h3>
                    <p className="text-xs text-violet-600 mt-0.5">Based on professional guidance requests received and completed</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {profile.mentor_status && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        profile.mentor_status === 'accepting'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : profile.mentor_status === 'busy'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {profile.mentor_status === 'accepting'
                          ? '● Accepting'
                          : profile.mentor_status === 'busy'
                          ? '● Busy'
                          : '● Unavailable'}
                      </span>
                    )}
                    <span className="text-xs text-violet-500 font-medium bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">Active Mentor</span>
                  </div>
                </div>

                {/* Stats Grid */}
                {mentorStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm">
                        <p className="text-2xl font-extrabold text-violet-700">{mentorStats.completedCount}</p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Completed</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm">
                        <p className="text-2xl font-extrabold text-violet-700">{mentorStats.acceptedCount}</p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Accepted</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm">
                        <p className="text-2xl font-extrabold text-violet-700">{mentorStats.pendingCount}</p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Pending</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm">
                        <p className="text-2xl font-extrabold text-violet-700">{mentorStats.declinedCount}</p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Declined</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm col-span-2 md:col-span-1">
                        <p className="text-2xl font-extrabold text-violet-700">{mentorStats.completionRate}%</p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Completion Rate</p>
                      </div>
                    </div>

                    {/* Ratings Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm">
                        <p className="text-2xl font-extrabold text-amber-600">
                          {avgGuidanceRating !== null ? `⭐ ${avgGuidanceRating}` : '—'}
                        </p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Average Mentor Rating</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-violet-100 text-center shadow-sm">
                        <p className="text-2xl font-extrabold text-violet-700">{seniorFeedback.length}</p>
                        <p className="text-[11px] font-bold text-violet-500 mt-1">Guidance Reviews Received</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-violet-500 italic">Loading mentor impact statistics…</p>
                )}

              {/* Bio & Details */}
              <div className="space-y-4 pt-2">
                {profile.mentor_bio && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-violet-800">Biography / Core Advice</p>
                    <p className="text-xs text-violet-700 bg-white p-3 rounded-lg border border-violet-100 leading-relaxed">{profile.mentor_bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-violet-800">Topics of Expertise</p>
                    {profile.mentor_topics && profile.mentor_topics.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {profile.mentor_topics.map((t) => (
                          <span key={t} className="px-2.5 py-1 bg-violet-100 border border-violet-200 text-violet-700 text-[10px] font-bold rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-violet-400 italic">No topics selected.</p>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-violet-800">
                    {profile.availability && (
                      <p>
                        <span className="font-bold">⏰ Available Hours:</span> {profile.availability}
                      </p>
                    )}
                    {profile.help_mode && (
                      <p>
                        <span className="font-bold">📍 Preferred Mode:</span> {profile.help_mode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Best Mentor Reviews Summary (Capped to top 3) */}
              <div className="pt-4 border-t border-violet-200 space-y-3">
                <p className="text-xs font-bold text-violet-800 uppercase tracking-wider block">
                  ⭐ Top Received Mentor Reviews ({seniorFeedback.length})
                </p>
                {displayedMentorReviews.length === 0 ? (
                  <div className="p-4 bg-white/50 rounded-xl border border-dashed border-violet-200 text-center space-y-1">
                    <p className="text-sm font-semibold text-violet-600">No senior guidance reviews yet</p>
                    <p className="text-[11px] text-slate-400">Guide juniors to receive reviews.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {displayedMentorReviews.map((rev) => {
                        const requestTopic = rev.guidance_request?.topic || '';
                        return (
                          <div key={rev.id} className="p-3 bg-white rounded-xl border border-violet-100 space-y-1.5 text-xs text-left shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-violet-800">Anonymous Junior</span>
                              <span className="text-[10px] text-slate-400">
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
                                rev.helpful ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                {rev.helpful ? '👍 Helpful Session' : '👎 Not Helpful'}
                              </span>
                            </div>
                            {requestTopic && (
                              <p className="text-[11px] text-slate-500">For Topic: <span className="font-semibold">{requestTopic}</span></p>
                            )}
                            {rev.comment && (
                              <p className="text-xs text-slate-700 italic leading-relaxed">"{rev.comment}"</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {sortedMentorReviews.length > 3 && (
                      <div className="flex flex-col gap-2 items-center justify-center pt-2">
                        <button
                          onClick={() => setShowAllMentorReviews(!showAllMentorReviews)}
                          className="text-xs font-semibold text-violet-700 hover:text-violet-900 focus:outline-none flex items-center gap-1 transition-colors"
                        >
                          {showAllMentorReviews ? 'Show fewer reviews' : 'Show more reviews'}
                        </button>
                        <p className="text-[10px] text-violet-500 italic">
                          💡 View all received mentor reviews in Senior Connect dashboard.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

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
