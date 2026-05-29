import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import type {
  LearningCircleWithStats,
  LearningCircleMember,
  LearningCircleResource,
  LearningCirclePost,
  CircleDifficulty,
  CircleMeetingMode,
  CircleResourceType,
  CirclePostType,
  CircleStatus,
  LearningCircleJoinRequest,
  LearningCircleJoinRequestWithProfile,
  LearningCircleRoleInterest,
} from '../types';
import {
  getLearningCircles,
  getMyLearningCircles,
  createLearningCircle,
  updateLearningCircle,
  leaveLearningCircle,
  getCircleMembers,
  getCircleResources,
  addCircleResource,
  deleteCircleResource,
  uploadCircleResourceFile,
  getSignedResourceUrl,
  getCirclePosts,
  addCirclePost,
  deleteCirclePost,
  CIRCLE_CATEGORIES,
  CIRCLE_DIFFICULTIES,
  CIRCLE_MEETING_MODES,
  CIRCLE_RESOURCE_TYPES,
  CIRCLE_POST_TYPES,
  isValidHttpsUrl,
  isValidMeetingLinkOrLocation,
  requestToJoinCircle,
  getMyJoinRequests,
  getCircleJoinRequests,
  respondToJoinRequest,
  cancelJoinRequest,
  removeCircleMember,
  toggleResourcePin,
  toggleResourceLike,
} from '../lib/learningCircles';
import { PublicProfileModal } from '../components/profile/PublicProfileModal';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

const formatBytes = (bytes?: number | null): string => {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DIFFICULTY_COLOR: Record<CircleDifficulty, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-rose-50 text-rose-700 border-rose-200',
  Mixed: 'bg-violet-50 text-violet-700 border-violet-200',
};

const MODE_ICON: Record<CircleMeetingMode, string> = {
  Online: '🌐',
  'In-Person': '🏫',
  Hybrid: '🔀',
};

const POST_TYPE_COLOR: Record<CirclePostType, string> = {
  Update: 'bg-sky-50 text-sky-700 border-sky-200',
  Question: 'bg-amber-50 text-amber-700 border-amber-200',
  Plan: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Announcement: 'bg-rose-50 text-rose-700 border-rose-200',
};

const POST_TYPE_ICON: Record<CirclePostType, string> = {
  Update: '📢',
  Question: '❓',
  Plan: '📅',
  Announcement: '📣',
};

const RESOURCE_TYPE_ICON: Record<CircleResourceType, string> = {
  Link: '🔗',
  PDF: '📄',
  Video: '🎥',
  Notes: '📝',
  Book: '📚',
  Other: '📦',
};

// ─── CREATE CIRCLE MODAL ─────────────────────────────────────────────────────

interface CreateCircleModalProps {
  onClose: () => void;
  onCreated: (circle: LearningCircleWithStats) => void;
  userId: string;
}

const CreateCircleModal: React.FC<CreateCircleModalProps> = ({ onClose, onCreated, userId }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CIRCLE_CATEGORIES[0],
    department: '',
    difficulty_level: 'Beginner' as CircleDifficulty,
    meeting_mode: 'Online' as CircleMeetingMode,
    meeting_schedule: '',
    location_or_link: '',
    max_members: 20,
    is_public: true,
  });
  const [customCategory, setCustomCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    else if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters.';
    if (!form.description.trim()) e.description = 'Description is required.';
    else if (form.description.trim().length < 20) e.description = 'Description must be at least 20 characters.';
    if (form.max_members < 2 || form.max_members > 100) e.max_members = 'Max members must be between 2 and 100.';
    if (form.location_or_link && !isValidMeetingLinkOrLocation(form.location_or_link)) {
      e.location_or_link = 'If this is a URL, it must use https://. Plain text locations are also fine.';
    }
    if (form.category === 'Other') {
      const trimmed = customCategory.trim();
      if (!trimmed) {
        e.customCategory = 'Custom category is required.';
      } else if (trimmed.length < 2) {
        e.customCategory = 'Custom category must be at least 2 characters.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // Guard: must have a valid auth user ID before attempting any DB write
    if (!userId) {
      toast.error('Not signed in', 'Please sign in again before creating a circle.');
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      const categoryToSave = form.category === 'Other' ? customCategory.trim() : form.category;
      const circle = await createLearningCircle({
        ...form,
        category: categoryToSave,
      });
      const withStats: LearningCircleWithStats = {
        ...circle,
        creator_name: 'You',
        member_count: 1,
        my_role: 'owner',
      };
      toast.success('Circle Created! 🎉', `"${circle.title}" is now live.`);
      onCreated(withStats);
    } catch (err) {
      // createLearningCircle always throws new Error(...) so err.message is the real Supabase message
      const msg = err instanceof Error ? err.message : 'Could not create circle.';
      toast.error('Creation Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Start a Learning Circle</h2>
            <p className="text-sm text-slate-500 mt-0.5">Create a collaborative study group for your campus peers.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100" id="close-create-circle-modal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Circle Title <span className="text-rose-500">*</span></label>
            <input
              id="create-circle-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., React & Frontend Creators"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors.title ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-rose-500">*</span></label>
            <textarea
              id="create-circle-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What will this circle study? What's the vibe? Who should join?"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none ${errors.description ? 'border-rose-400' : 'border-slate-300'}`}
            />
            {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description}</p>}
          </div>

          {/* Category + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                id="create-circle-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {CIRCLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <select
                id="create-circle-difficulty"
                value={form.difficulty_level}
                onChange={(e) => setForm((f) => ({ ...f, difficulty_level: e.target.value as CircleDifficulty }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {CIRCLE_DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Custom Category Input if "Other" is selected */}
          {form.category === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Custom Category <span className="text-rose-500">*</span></label>
              <input
                id="create-circle-custom-category"
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g., Cloud Computing, Rust Programming"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors.customCategory ? 'border-rose-400' : 'border-slate-300'}`}
              />
              <p className="text-xs text-slate-400 mt-1">Add a custom topic/category for your circle.</p>
              {errors.customCategory && <p className="text-xs text-rose-500 mt-1">{errors.customCategory}</p>}
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              id="create-circle-department"
              type="text"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="e.g., Computer Science, Mechanical"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Meeting Mode + Max Members */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Mode</label>
              <select
                id="create-circle-mode"
                value={form.meeting_mode}
                onChange={(e) => setForm((f) => ({ ...f, meeting_mode: e.target.value as CircleMeetingMode }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {CIRCLE_MEETING_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Members</label>
              <input
                id="create-circle-max-members"
                type="number"
                min={2}
                max={100}
                value={form.max_members}
                onChange={(e) => setForm((f) => ({ ...f, max_members: parseInt(e.target.value) || 20 }))}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors.max_members ? 'border-rose-400' : 'border-slate-300'}`}
              />
              {errors.max_members && <p className="text-xs text-rose-500 mt-1">{errors.max_members}</p>}
            </div>
          </div>

          {/* Meeting Schedule */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Schedule <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              id="create-circle-schedule"
              type="text"
              value={form.meeting_schedule}
              onChange={(e) => setForm((f) => ({ ...f, meeting_schedule: e.target.value }))}
              placeholder="e.g., Every Saturday at 7 PM"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Location / Link */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Location or Link <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              id="create-circle-location"
              type="text"
              value={form.location_or_link}
              onChange={(e) => setForm((f) => ({ ...f, location_or_link: e.target.value }))}
              placeholder="Room 204, Block B — or — https://meet.google.com/..."
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${errors.location_or_link ? 'border-rose-400' : 'border-slate-300'}`}
            />
            <p className="text-xs text-slate-400 mt-1">Plain text offline locations are fine. If it's a URL, it must be https://.</p>
            {errors.location_or_link && <p className="text-xs text-rose-500 mt-1">{errors.location_or_link}</p>}
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <input
              id="create-circle-public"
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="create-circle-public" className="text-sm font-medium text-slate-700 cursor-pointer">
              Make this circle publicly visible
              <span className="block text-xs text-slate-400 font-normal">Anyone can discover and join. Uncheck to restrict visibility to invited members only.</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              id="cancel-create-circle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              id="submit-create-circle"
            >
              {loading ? 'Creating…' : '🚀 Create Circle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CircleCardProps {
  circle: LearningCircleWithStats;
  currentUserId: string;
  request: LearningCircleJoinRequest | null;
  onView: (circle: LearningCircleWithStats) => void;
  onRequestJoin: (circle: LearningCircleWithStats) => void;
  onCancelRequest: (requestId: string) => void;
  onLeave: (circle: LearningCircleWithStats) => void;
}

const CircleCard: React.FC<CircleCardProps> = ({ circle, currentUserId, request, onView, onRequestJoin, onCancelRequest, onLeave }) => {
  const isOwner = circle.my_role === 'owner' || circle.created_by === currentUserId;
  const isMember = circle.my_role === 'member';
  const isJoined = isOwner || isMember;
  const isFull = (circle.member_count ?? 0) >= circle.max_members;
  const isArchived = circle.status === 'archived';
  const isPaused = circle.status === 'paused';

  return (
    <div className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${isArchived ? 'opacity-60' : ''}`}>
      {/* Card top accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 opacity-70" />

      <div className="p-5 flex flex-col gap-3 flex-1 text-left">
        {/* Header row */}
        <div className="flex items-start gap-2 justify-between">
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${DIFFICULTY_COLOR[circle.difficulty_level]}`}>
              {circle.difficulty_level}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-medium text-slate-600 bg-slate-50 border-slate-200">
              {circle.category}
            </span>
            {isArchived && <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase text-slate-500 bg-slate-100 border-slate-200">Archived</span>}
            {isPaused && <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase text-amber-600 bg-amber-50 border-amber-200">Paused</span>}
          </div>
          {isOwner && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">👑 Owner</span>
          )}
          {isMember && (
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">✓ Joined</span>
          )}
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-2 group-hover:text-indigo-700 transition-colors">
            {circle.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{circle.description}</p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>{MODE_ICON[circle.meeting_mode]} {circle.meeting_mode}</span>
          <span>👥 {circle.member_count ?? 0}/{circle.max_members}</span>
          {circle.department && <span>🏛 {circle.department}</span>}
        </div>

        <p className="text-[11px] text-slate-400">By {circle.creator_name} · {formatDate(circle.created_at)}</p>

        {request?.status === 'rejected' && request.response_message && (
          <div className="text-[10px] text-rose-600 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 mt-1 leading-normal w-full text-left font-sans">
            <span className="font-bold block">❌ Owner Feedback:</span>
            <span className="italic">"{request.response_message}"</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2">
        <button
          onClick={() => onView(circle)}
          className="flex-1 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
          id={`view-circle-${circle.id}`}
        >
          {isOwner ? '⚙ Manage Workspace' : isJoined ? '📂 Open Workspace' : '👁 View Details'}
        </button>
        
        {!isJoined && !isArchived && !isPaused && (
          <>
            {request?.status === 'pending' ? (
              <button
                onClick={() => onCancelRequest(request.id)}
                className="flex-1 py-2 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                id={`cancel-request-${circle.id}`}
                title="Click to cancel pending request"
              >
                ⌛ Pending (Cancel)
              </button>
            ) : (
              <button
                onClick={() => onRequestJoin(circle)}
                disabled={isFull}
                className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                id={`request-join-circle-${circle.id}`}
              >
                {isFull ? 'Full' : request?.status === 'rejected' ? 'Request Again' : 'Request to Join'}
              </button>
            )}
          </>
        )}

        {isMember && (
          <button
            onClick={() => onLeave(circle)}
            className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
            id={`leave-circle-${circle.id}`}
            title="Leave circle"
          >
            Leave
          </button>
        )}
      </div>
    </div>
  );
};

// ─── CIRCLE WORKSPACE ────────────────────────────────────────────────────────

type WorkspaceTab = 'overview' | 'members' | 'requests' | 'resources' | 'posts';

interface CircleWorkspaceProps {
  circle: LearningCircleWithStats;
  currentUserId: string;
  onBack: () => void;
  onCircleUpdated: (updated: LearningCircleWithStats) => void;
}

const CircleWorkspace: React.FC<CircleWorkspaceProps> = ({ circle, currentUserId, onBack, onCircleUpdated }) => {
  const toast = useToast();
  const isOwner = circle.my_role === 'owner';
  const isMember = !!circle.my_role;
  const isArchived = circle.status === 'archived';
  const isPaused = circle.status === 'paused';

  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [members, setMembers] = useState<LearningCircleMember[]>([]);
  const [resources, setResources] = useState<LearningCircleResource[]>([]);
  const [posts, setPosts] = useState<LearningCirclePost[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [joinRequests, setJoinRequests] = useState<LearningCircleJoinRequestWithProfile[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [requestFeedbackMsgs, setRequestFeedbackMsgs] = useState<Record<string, string>>({});
  const [viewPublicProfileId, setViewPublicProfileId] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    title: circle.title,
    description: circle.description,
    category: circle.category,
    department: circle.department || '',
    difficulty_level: circle.difficulty_level,
    meeting_mode: circle.meeting_mode,
    meeting_schedule: circle.meeting_schedule || '',
    location_or_link: circle.location_or_link || '',
    meeting_link: circle.meeting_link || '',
    meeting_password: circle.meeting_password || '',
    max_members: circle.max_members,
    status: circle.status
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [resourceLimit, setResourceLimit] = useState(3);

  // Sync settings form with circle whenever circle changes
  useEffect(() => {
    setSettingsForm({
      title: circle.title,
      description: circle.description,
      category: circle.category,
      department: circle.department || '',
      difficulty_level: circle.difficulty_level,
      meeting_mode: circle.meeting_mode,
      meeting_schedule: circle.meeting_schedule || '',
      location_or_link: circle.location_or_link || '',
      meeting_link: circle.meeting_link || '',
      meeting_password: circle.meeting_password || '',
      max_members: circle.max_members,
      status: circle.status
    });
  }, [circle]);

  const loadRequests = useCallback(async () => {
    if (!isOwner) return;
    setLoadingRequests(true);
    try {
      const data = await getCircleJoinRequests(circle.id);
      setJoinRequests(data);
      const memberData = await getCircleMembers(circle.id);
      setMembers(memberData);
    } finally {
      setLoadingRequests(false);
    }
  }, [circle.id, isOwner]);

  useEffect(() => {
    if (isOwner) {
      loadRequests();
    }
  }, [isOwner, loadRequests]);

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (circle.status !== 'active') {
      toast.error('Circle Inactive', `Cannot approve or decline join requests while circle is ${circle.status}.`);
      return;
    }
    setRespondingRequestId(requestId);
    try {
      const responseMessage = requestFeedbackMsgs[requestId] || '';
      await respondToJoinRequest(requestId, action, responseMessage);
      toast.success(
        action === 'accept' ? 'Application Approved! 🎉' : 'Application Declined',
        action === 'accept' ? 'The requester has been added as a member.' : 'The requester has been notified.'
      );
      await loadRequests();
      if (action === 'accept') {
        loadMembers();
        const updated = {
          ...circle,
          member_count: (circle.member_count ?? 0) + 1
        };
        onCircleUpdated(updated);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not respond to join request.';
      toast.error('Action Failed', msg);
    } finally {
      setRespondingRequestId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);

    // URL validation
    if (settingsForm.meeting_link && settingsForm.meeting_link.trim() !== '') {
      if (!isValidHttpsUrl(settingsForm.meeting_link)) {
        setSettingsError('Member-only meeting link must strictly use the https:// protocol. http://, data:, javascript:, or file: links are not allowed.');
        setSavingSettings(false);
        return;
      }
    }

    if (settingsForm.location_or_link && settingsForm.location_or_link.trim() !== '') {
      if (!isValidMeetingLinkOrLocation(settingsForm.location_or_link)) {
        setSettingsError('Public Location / Coordinator Link must use https:// if it is a URL.');
        setSavingSettings(false);
        return;
      }
    }

    if (settingsForm.max_members < 2 || settingsForm.max_members > 100) {
      setSettingsError('Maximum cohort capacity must be between 2 and 100.');
      setSavingSettings(false);
      return;
    }

    if (settingsForm.max_members < members.length) {
      setSettingsError(`Maximum cohort capacity cannot be lower than the current member count (${members.length}).`);
      setSavingSettings(false);
      return;
    }

    try {
      const updated = await updateLearningCircle(circle.id, {
        title: settingsForm.title,
        description: settingsForm.description,
        category: settingsForm.category,
        department: settingsForm.department || null,
        difficulty_level: settingsForm.difficulty_level,
        meeting_mode: settingsForm.meeting_mode,
        meeting_schedule: settingsForm.meeting_schedule || null,
        location_or_link: settingsForm.location_or_link || null,
        meeting_link: settingsForm.meeting_link || null,
        meeting_password: settingsForm.meeting_password || null,
        max_members: settingsForm.max_members,
        status: settingsForm.status
      });

      // Update circle stats to match
      const updatedWithStats: LearningCircleWithStats = {
        ...circle,
        ...updated,
        creator_name: circle.creator_name,
        member_count: circle.member_count,
        my_role: circle.my_role
      };

      onCircleUpdated(updatedWithStats);
      toast.success('Settings Saved Successfully! 🎉', 'Your learning circle parameters have been updated.');
      setShowSettings(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save settings.';
      setSettingsError(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${targetName}" from this learning circle?`)) {
      return;
    }
    setRemovingMemberId(targetUserId);
    try {
      await removeCircleMember(circle.id, targetUserId);
      toast.success('Member Removed', `Successfully removed "${targetName}" from the study group.`);
      await loadMembers();
      
      // Update circle stats (decrement member count)
      const updated = {
        ...circle,
        member_count: Math.max(0, (circle.member_count ?? 0) - 1)
      };
      onCircleUpdated(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove member.';
      toast.error('Action Failed', msg);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleToggleLike = async (resourceId: string) => {
    try {
      await toggleResourceLike(resourceId);
      await loadResources();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not toggle like.';
      toast.error('Action Failed', msg);
    }
  };

  const handleTogglePin = async (resourceId: string) => {
    try {
      await toggleResourcePin(resourceId);
      await loadResources();
      toast.success('Pin Status Toggled', 'The resource ranking has been updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not toggle pin.';
      toast.error('Action Failed', msg);
    }
  };

  // Archive/status management
  const [archiving, setArchiving] = useState(false);

  // Resource form
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '', resource_type: 'Link' as CircleResourceType, url: '' });
  const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({});
  const [submittingResource, setSubmittingResource] = useState(false);

  // Post form
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<CirclePostType>('Update');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Resource file mode
  const [resourceMode, setResourceMode] = useState<'link' | 'file'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Preview lightbox modal state
  const [previewResource, setPreviewResource] = useState<LearningCircleResource | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await getCircleMembers(circle.id);
      setMembers(data);
    } finally {
      setLoadingMembers(false);
    }
  }, [circle.id]);

  const loadResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const data = await getCircleResources(circle.id);
      setResources(data);
    } finally {
      setLoadingResources(false);
    }
  }, [circle.id]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await getCirclePosts(circle.id);
      setPosts(data);
    } finally {
      setLoadingPosts(false);
    }
  }, [circle.id]);

  useEffect(() => {
    if (tab === 'members') loadMembers();
    else if (tab === 'resources') loadResources();
    else if (tab === 'posts') loadPosts();
    else if (tab === 'requests') loadRequests();
  }, [tab, loadMembers, loadResources, loadPosts, loadRequests]);

  // ── File Change Handler ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Validate type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('Unsupported file type. Only PDFs, documents, images, and text files are allowed.');
      setSelectedFile(null);
      return;
    }

    // Validate size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10 MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // Auto-fill title and suggest resource type
    setResourceForm((prev) => {
      const extIndex = file.name.lastIndexOf('.');
      const autoTitle = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
      const typeSug: CircleResourceType = 
        file.type === 'application/pdf' ? 'PDF' :
        file.type.startsWith('image/') ? 'Notes' :
        'Notes';
      return {
        ...prev,
        title: prev.title.trim() === '' ? autoTitle : prev.title,
        resource_type: typeSug,
      };
    });
  };

  // ── Resource Submit ────────────────────────────────────────────────────────
  const validateResource = () => {
    const e: Record<string, string> = {};
    if (!resourceForm.title.trim()) e.title = 'Title is required.';
    if (resourceMode === 'link') {
      if (!resourceForm.url?.trim()) {
        e.url = 'URL is required for link mode.';
      } else if (!isValidHttpsUrl(resourceForm.url)) {
        e.url = 'URL must use https:// protocol. Unsafe links are not allowed.';
      }
    }
    setResourceErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddResource = async (ev: React.FormEvent) => {
    ev.preventDefault();

    if (resourceMode === 'link') {
      if (!validateResource()) return;
      setSubmittingResource(true);
      try {
        const res = await addCircleResource({
          circle_id: circle.id,
          shared_by: currentUserId,
          title: resourceForm.title,
          description: resourceForm.description,
          resource_type: resourceForm.resource_type,
          url: resourceForm.url || undefined,
        });
        setResources((prev) => [res, ...prev]);
        setResourceForm({ title: '', description: '', resource_type: 'Link', url: '' });
        setShowResourceForm(false);
        toast.success('Resource Added', 'Study resource link shared with the circle.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not share resource.';
        toast.error('Failed', msg);
      } finally {
        setSubmittingResource(false);
      }
    } else {
      // File upload mode
      if (!selectedFile) {
        setFileError('Please select a file to upload.');
        return;
      }
      if (!resourceForm.title.trim()) {
        setResourceErrors({ title: 'Title is required for the file.' });
        return;
      }
      setSubmittingResource(true);
      try {
        // Generate unique folder ID client-side
        const resId = (typeof window !== 'undefined' && window.crypto?.randomUUID)
          ? window.crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);

        // 1. Upload to private bucket
        const fileData = await uploadCircleResourceFile({
          circleId: circle.id,
          file: selectedFile,
          resourceId: resId,
        });

        // 2. Write metadata row to Postgres
        const res = await addCircleResource({
          circle_id: circle.id,
          shared_by: currentUserId,
          title: resourceForm.title,
          description: resourceForm.description,
          resource_type: resourceForm.resource_type,
          file_path: fileData.file_path,
          file_name: fileData.file_name,
          file_mime_type: fileData.file_mime_type,
          file_size_bytes: fileData.file_size_bytes,
          storage_bucket: fileData.storage_bucket,
        });

        setResources((prev) => [res, ...prev]);
        setResourceForm({ title: '', description: '', resource_type: 'Link', url: '' });
        setSelectedFile(null);
        setResourceMode('link');
        setShowResourceForm(false);
        toast.success('File Uploaded! 🚀', `"${fileData.file_name}" uploaded and shared.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not upload file.';
        toast.error('Upload Failed', msg);
      } finally {
        setSubmittingResource(false);
      }
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteCircleResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      toast.success('Resource Removed', 'The resource has been deleted.');
    } catch {
      toast.error('Delete Failed', 'Could not remove resource. You may not have permission.');
    }
  };

  // ── Preview & Download Actions ─────────────────────────────────────────────
  const handlePreviewResource = async (r: LearningCircleResource) => {
    if (!r.storage_bucket || !r.file_path) return;
    setPreviewResource(r);
    setLoadingPreview(true);
    setPreviewUrl('');
    try {
      const url = await getSignedResourceUrl(r.storage_bucket, r.file_path);
      setPreviewUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not generate preview link.';
      toast.error('Preview Failed', msg);
      setPreviewResource(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownloadResource = async (r: LearningCircleResource) => {
    if (!r.storage_bucket || !r.file_path) return;
    try {
      const url = await getSignedResourceUrl(r.storage_bucket, r.file_path);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = r.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download Started', `Downloading "${r.file_name}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not download file.';
      toast.error('Download Failed', msg);
    }
  };

  // ── Post Submit ────────────────────────────────────────────────────────────
  const handleAddPost = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!postContent.trim()) {
      toast.error('Empty Post', 'Please write something before posting.');
      return;
    }
    setSubmittingPost(true);
    try {
      const post = await addCirclePost({ circle_id: circle.id, created_by: currentUserId, content: postContent, post_type: postType });
      setPosts((prev) => [post, ...prev]);
      setPostContent('');
      toast.success('Posted! 🎉', 'Your post is now visible to circle members.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not post.';
      toast.error('Post Failed', msg);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteCirclePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Post Deleted', 'The post has been removed.');
    } catch {
      toast.error('Delete Failed', 'Could not delete post. You may not have permission.');
    }
  };

  // ── Owner Status Update Console ────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus: CircleStatus) => {
    if (!isOwner) return;
    setArchiving(true);
    try {
      const updated = await updateLearningCircle(circle.id, { status: newStatus });
      const updatedWithStats: LearningCircleWithStats = {
        ...circle,
        ...updated,
        creator_name: circle.creator_name,
        member_count: circle.member_count,
        my_role: circle.my_role,
      };
      onCircleUpdated(updatedWithStats);
      toast.success('Status Updated! ⚙️', `Circle is now "${newStatus}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update status.';
      toast.error('Failed', msg);
    } finally {
      setArchiving(false);
    }
  };

  const isFull = (circle.member_count ?? 0) >= circle.max_members;

  const activeRequests = joinRequests.filter(r => r.status === 'pending' || (r.status === 'accepted' && r.member_left_at === null && !members.some(m => m.user_id === r.requester_id)));
  const pendingRequestsCount = activeRequests.length;

  const TABS: { id: WorkspaceTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    ...(isOwner ? [{ id: 'requests' as WorkspaceTab, label: `Requests (${pendingRequestsCount})`, icon: '⏳' }] : []),
    { id: 'members', label: `Members (${circle.member_count ?? '…'})`, icon: '👥' },
    { id: 'resources', label: 'Resources', icon: '📚' },
    { id: 'posts', label: 'Discussion', icon: '💬' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button onClick={onBack} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-xs font-medium mb-2 transition-colors" id="back-from-workspace">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Circles
            </button>
            <h2 className="text-xl font-bold truncate">{circle.title}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-indigo-100">
              <span>{MODE_ICON[circle.meeting_mode]} {circle.meeting_mode}</span>
              <span>👥 {circle.member_count ?? 0}/{circle.max_members} members</span>
              <span className={`px-2 py-0.5 rounded border text-xs font-bold ${DIFFICULTY_COLOR[circle.difficulty_level]} !text-white !bg-white/20 !border-white/30`}>{circle.difficulty_level}</span>
              {circle.status !== 'active' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/20 border border-white/30 uppercase">{circle.status}</span>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-white/20 border border-white/20 rounded-lg text-white">👑 Owner Workspace</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.id
                ? 'text-indigo-700 border-indigo-600 bg-indigo-50/50'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
            }`}
            id={`workspace-tab-${t.id}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Owner Management Console */}
            {isOwner && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      👑 Owner Control Console
                    </h3>
                    <p className="text-xs text-slate-500">Manage status, capacity, member permissions, and private links.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      circle.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      circle.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      Status: {circle.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-250 text-indigo-700 font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 focus:outline-none"
                    >
                      {showSettings ? '❌ Close Settings' : '⚙️ Manage Settings'}
                    </button>
                  </div>
                </div>

                {showSettings ? (
                  <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 text-left font-sans text-xs">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1">
                      <span>⚙️</span> Edit Workspace Settings
                    </h4>

                    {settingsError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                        {settingsError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Title */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Circle Title <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={settingsForm.title}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                      </div>
                      
                      {/* Category */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Category <span className="text-rose-500">*</span></label>
                        <select
                          value={settingsForm.category}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-850 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          {CIRCLE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Difficulty */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Difficulty Level <span className="text-rose-500">*</span></label>
                        <select
                          value={settingsForm.difficulty_level}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, difficulty_level: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-855 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          {CIRCLE_DIFFICULTIES.map((diff) => (
                            <option key={diff} value={diff}>{diff}</option>
                          ))}
                        </select>
                      </div>

                      {/* Mode */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Meeting Mode <span className="text-rose-500">*</span></label>
                        <select
                          value={settingsForm.meeting_mode}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, meeting_mode: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-855 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          {CIRCLE_MEETING_MODES.map((mode) => (
                            <option key={mode} value={mode}>{mode}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Department */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Department (Optional)</label>
                        <input
                          type="text"
                          value={settingsForm.department}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="e.g. Computer Science"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Schedule */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Meeting Schedule (Optional)</label>
                        <input
                          type="text"
                          value={settingsForm.meeting_schedule}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, meeting_schedule: e.target.value }))}
                          placeholder="e.g. Saturdays at 4:00 PM"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Public Location or Link */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Public Location / Coordinator Link</label>
                        <input
                          type="text"
                          value={settingsForm.location_or_link}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, location_or_link: e.target.value }))}
                          placeholder="e.g. Room 201 or Coordinator Link"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Capacity limit */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Maximum Cohort Capacity (2-100)</label>
                        <input
                          type="number"
                          required
                          min={2}
                          max={100}
                          value={settingsForm.max_members}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, max_members: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      {/* Private Meeting Link */}
                      <div>
                        <label className="block font-bold text-indigo-700 mb-1">🔐 Member-Only Meeting Link (Optional)</label>
                        <input
                          type="text"
                          value={settingsForm.meeting_link}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, meeting_link: e.target.value }))}
                          placeholder="e.g. https://meet.google.com/private-id (https:// strictly required)"
                          className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-xs bg-white text-indigo-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Private Meeting Password */}
                      <div>
                        <label className="block font-bold text-indigo-700 mb-1">🔐 Member-Only Password / Access Code (Optional)</label>
                        <input
                          type="text"
                          value={settingsForm.meeting_password}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, meeting_password: e.target.value }))}
                          placeholder="e.g. password123"
                          className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-xs bg-white text-indigo-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                      ℹ️ <strong>Privacy Lock Active:</strong> Private meeting link and password are confidential and shown strictly inside the workspace to accepted members. They are completely hidden on public discover cards and non-member views.
                    </p>

                    <div className="flex gap-3 pt-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowSettings(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition focus:outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingSettings}
                        className="px-5 py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-xl transition disabled:opacity-50 focus:outline-none"
                      >
                        {savingSettings ? 'Saving Changes…' : '💾 Save Settings'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Active button */}
                    <button
                      onClick={() => handleUpdateStatus('active')}
                      disabled={archiving}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        circle.status === 'active'
                          ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm font-bold text-emerald-900">🟢 Active</span>
                      <span className="block text-[11px] text-slate-500 mt-1">Resource uploads and discussions are fully open for all members.</span>
                    </button>

                    {/* Paused button */}
                    <button
                      onClick={() => handleUpdateStatus('paused')}
                      disabled={archiving}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        circle.status === 'paused'
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm font-bold text-amber-900">🟡 Pause Uploads</span>
                      <span className="block text-[11px] text-slate-500 mt-1">Locks new resource uploads. Existing posts and discussions remain active.</span>
                    </button>

                    {/* Archived button */}
                    <button
                      onClick={() => handleUpdateStatus('archived')}
                      disabled={archiving}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        circle.status === 'archived'
                          ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-sm font-bold text-rose-900">📦 Archive</span>
                      <span className="block text-[11px] text-slate-500 mt-1">Read-only state. Restricts joins, resource uploads, and discussions.</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="prose prose-sm max-w-none">
              <p className="text-slate-700 leading-relaxed font-sans text-sm">{circle.description}</p>
            </div>

            {/* Member-Only Private Meeting Access Coordinates */}
            {isMember && (circle.meeting_link || circle.meeting_password) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3.5 shadow-sm text-left">
                <div className="flex items-center gap-2 border-b border-indigo-100 pb-2.5">
                  <span className="text-xl">🔐</span>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900">Confidential Meeting Coordinates</h4>
                    <p className="text-[10px] text-indigo-500 font-medium">Visible strictly to verified cohort members & owner.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {circle.meeting_link && (
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-1">Private Meeting Link</span>
                      <a
                        href={circle.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition break-all"
                        id="private-meeting-link"
                      >
                        🌐 Join Online Session
                      </a>
                    </div>
                  )}
                  {circle.meeting_password && (
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-1">Access Password / Access Code</span>
                      <div className="px-3 py-2 bg-white rounded-xl border border-indigo-150 text-indigo-950 font-mono font-bold text-xs select-all inline-block">
                        {circle.meeting_password}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon="🏷" label="Category" value={circle.category} />
              <InfoRow icon="📊" label="Difficulty" value={circle.difficulty_level} />
              <InfoRow icon={MODE_ICON[circle.meeting_mode]} label="Meeting Mode" value={circle.meeting_mode} />
              {circle.department && <InfoRow icon="🏛" label="Department" value={circle.department} />}
              {circle.meeting_schedule && <InfoRow icon="📅" label="Schedule" value={circle.meeting_schedule} />}
              {circle.location_or_link && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-base mt-0.5">📍</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Location / Link</p>
                    {circle.location_or_link.startsWith('https://') ? (
                      <a href={circle.location_or_link} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                        {circle.location_or_link}
                      </a>
                    ) : (
                      <p className="text-sm text-slate-800">{circle.location_or_link}</p>
                    )}
                  </div>
                </div>
              )}
              <InfoRow icon="👑" label="Created By" value={circle.creator_name ?? 'Unknown'} />
              <InfoRow icon="📅" label="Created On" value={formatDate(circle.created_at)} />
              <InfoRow icon="👥" label="Members" value={`${circle.member_count ?? 0} / ${circle.max_members}`} />
              <InfoRow icon="🌐" label="Visibility" value={circle.is_public ? 'Public' : 'Private'} />
            </div>

            {/* Split Capability Guidelines Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mt-6">
              <div className="bg-slate-100/80 px-5 py-3 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  📋 Workspace Roles & Capability Guidelines
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs">
                {/* Left Column: Owner */}
                <div className="p-5 space-y-3 bg-white">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <span>👑</span>
                    <span>Circle Owner Capabilities</span>
                  </div>
                  <ul className="space-y-2 text-slate-600 list-disc pl-4 leading-relaxed">
                    <li>Full administrative management of the workspace.</li>
                    <li>Ability to change circle status (Active, Paused, Archived) to lock/unlock uploads.</li>
                    <li>Upload, view, and securely download study resource files (&lt;10MB).</li>
                    <li>Post announcements, plans, updates, and questions.</li>
                    <li>Delete <strong className="text-rose-600">any</strong> resource or post shared in the workspace.</li>
                  </ul>
                </div>
                {/* Right Column: Member */}
                <div className="p-5 space-y-3 bg-white">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <span>👥</span>
                    <span>Circle Member Capabilities</span>
                  </div>
                  <ul className="space-y-2 text-slate-600 list-disc pl-4 leading-relaxed">
                    <li>Access all shared study materials, resources, files, and links.</li>
                    <li>Interactive file previews (PDFs, images) and secure signed downloads.</li>
                    <li>Upload study resources (only allowed when circle status is <strong className="text-emerald-600">Active</strong>).</li>
                    <li>Participate in discussions by posting questions, plans, or updates.</li>
                    <li>Delete <strong className="text-slate-800">only</strong> resources and posts shared by yourself.</li>
                  </ul>
                </div>
              </div>
            </div>

            {!isMember && !isArchived && !isPaused && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                <p className="text-sm text-indigo-700 font-medium">You are not a member yet. Join to access resources and discussions.</p>
              </div>
            )}
            {(isArchived || isPaused) && !isOwner && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <p className="text-sm text-amber-700 font-medium">⚠ This circle is {circle.status}. Resource sharing and discussions may be locked.</p>
              </div>
            )}
          </div>
        )}

        {/* ── JOIN REQUESTS ── */}
        {tab === 'requests' && isOwner && (
          <div className="space-y-4 font-sans">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <span>⏳</span> Pending Join Requests ({pendingRequestsCount})
            </h3>

            {isPaused || isArchived ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <div>
                  <strong className="block">Circle is currently paused or archived</strong>
                  <span>You cannot accept or review pending requests while the circle is in a non-active status. Please set the circle status to Active in the Overview tab first.</span>
                </div>
              </div>
            ) : null}

            {isFull ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                <span>⚠️</span>
                <div>
                  <strong className="block">Circle capacity limit reached ({circle.member_count}/{circle.max_members})</strong>
                  <span>You cannot accept any new join requests because this cohort is full. To admit more students, please increase maximum cohort capacity inside your settings panel in the Overview tab or remove an existing member first.</span>
                </div>
              </div>
            ) : null}

            {loadingRequests ? (
              <LoadingSpinner label="Loading join requests…" />
            ) : activeRequests.length === 0 ? (
              <EmptyState icon="⏳" message="No pending join requests at the moment." />
            ) : (
              <div className="space-y-4 font-sans">
                {activeRequests.map((req) => (
                  <div key={req.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-4 text-left">
                    
                    {/* Requester Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-600 text-sm">
                          {req.requester_profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{req.requester_profile?.full_name ?? 'Unknown Student'}</h4>
                          <p className="text-[11px] text-slate-500">
                            {req.requester_profile?.department ?? 'General'} • {req.requester_profile?.year_of_study ?? '1st Year'}
                            {req.requester_profile?.section ? ` • Sec ${req.requester_profile?.section}` : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'accepted' && req.member_left_at === null && (
                          <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-extrabold rounded-full">
                            ⚠️ Repair Needed (Membership Missing)
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-violet-100 border border-violet-200 text-violet-750 text-[10px] font-bold rounded-full capitalize">
                          Interested in: {req.role_interest}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Requested {formatRelativeTime(req.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Request Message */}
                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider block">Application Message</span>
                      <p className="text-sm text-slate-700 bg-white p-3.5 rounded-xl border border-slate-150 leading-relaxed italic">
                        "{req.message}"
                      </p>
                    </div>

                    {/* Requester Public Profile Stats & Academic Details */}
                    {req.requester_profile && (
                      <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200/60 space-y-3.5 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-slate-800 text-[11px]">Academic & verification details:</span>
                          <button
                            onClick={() => setViewPublicProfileId(req.requester_id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-250 text-indigo-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 shadow-sm font-semibold"
                          >
                            👁️ View Full Public Profile
                          </button>
                        </div>

                        {req.requester_profile.headline && (
                          <div>
                            <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-0.5">Headline</span>
                            <p className="text-slate-700 font-medium leading-relaxed">"{req.requester_profile.headline}"</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {req.requester_profile.current_focus && (
                            <div>
                              <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-0.5">Current Focus</span>
                              <p className="text-slate-700 font-medium leading-relaxed">{req.requester_profile.current_focus}</p>
                            </div>
                          )}
                          {req.requester_profile.qualification_summary && (
                            <div>
                              <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-0.5">Qualifications</span>
                              <p className="text-slate-700 font-medium leading-relaxed">{req.requester_profile.qualification_summary}</p>
                            </div>
                          )}
                        </div>

                        {req.requester_profile.academic_interests && req.requester_profile.academic_interests.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-1">Academic Interests</span>
                            <div className="flex flex-wrap gap-1">
                              {req.requester_profile.academic_interests.map((interest) => (
                                <span key={interest} className="px-2 py-0.5 bg-slate-250 border border-slate-350 text-slate-700 text-[10px] font-medium rounded-full">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {req.requester_profile.skills_known && req.requester_profile.skills_known.length > 0 && (
                          <div>
                            <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-1">Skills Known</span>
                            <div className="flex flex-wrap gap-1">
                              {req.requester_profile.skills_known.map((s) => (
                                <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-semibold rounded-full">
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Social profiles links safely */}
                        {(req.requester_profile.github_url || req.requester_profile.linkedin_url || req.requester_profile.portfolio_url) && (
                          <div className="pt-2.5 border-t border-slate-200 flex flex-wrap gap-2">
                            {req.requester_profile.github_url && (
                              <a href={req.requester_profile.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white font-bold text-[10px] rounded-lg shadow-sm">
                                🐙 GitHub
                              </a>
                            )}
                            {req.requester_profile.linkedin_url && (
                              <a href={req.requester_profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-lg shadow-sm">
                                🔗 LinkedIn
                              </a>
                            )}
                            {req.requester_profile.portfolio_url && (
                              <a href={req.requester_profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-sm">
                                🌐 Portfolio
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Owner Response Actions */}
                    <div className="pt-2.5 border-t border-slate-200 flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Response Message <span className="text-slate-400 font-normal">(Optional context for accept/reject)</span></label>
                        <input
                          type="text"
                          value={requestFeedbackMsgs[req.id] || ''}
                          onChange={(e) => setRequestFeedbackMsgs(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="e.g. Welcome to the circle! We study DSA every Saturday. — or — Sorry, we have reached maximum member limits."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-left"
                          id={`response-msg-input-${req.id}`}
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRespondToRequest(req.id, 'reject')}
                          disabled={respondingRequestId === req.id || isPaused || isArchived}
                          className="flex-1 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-250 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50"
                          id={`reject-btn-${req.id}`}
                        >
                          ❌ Reject Application
                        </button>
                        <button
                          onClick={() => handleRespondToRequest(req.id, 'accept')}
                          disabled={respondingRequestId === req.id || isPaused || isArchived || isFull}
                          className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          id={`accept-btn-${req.id}`}
                        >
                          {respondingRequestId === req.id ? 'Reviewing…' : '✅ Accept Application'}
                        </button>
                      </div>
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Public profile lightbox in requests tab */}
        {viewPublicProfileId && (
          <PublicProfileModal
            userId={viewPublicProfileId}
            onClose={() => setViewPublicProfileId(null)}
            layer="top"
          />
        )}

        {/* ── MEMBERS ── */}
        {tab === 'members' && (() => {
          const sortedMembers = [...members].sort((a, b) => {
            const roleA = a.role === 'owner' ? 1 : 0;
            const roleB = b.role === 'owner' ? 1 : 0;
            if (roleB !== roleA) return roleB - roleA;
            const nameA = a.profile?.full_name?.trim() || '';
            const nameB = b.profile?.full_name?.trim() || '';
            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
          });
          return (
            <div>
              {loadingMembers ? (
                <LoadingSpinner label="Loading members…" />
              ) : sortedMembers.length === 0 ? (
                <EmptyState icon="👥" message="No members yet." />
              ) : (
                <div className="space-y-2">
                  {sortedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                        {m.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{m.profile?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{m.profile?.department} · {m.profile?.year_of_study}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.role === 'owner' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {m.role === 'owner' ? '👑 Owner' : 'Member'}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:block">Joined {formatDate(m.joined_at)}</span>
                        {isOwner && m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id, m.profile?.full_name ?? 'Unknown')}
                            disabled={removingMemberId === m.user_id}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 font-semibold text-[10px] rounded-lg transition-colors flex items-center gap-1 focus:outline-none shrink-0 active:scale-95 disabled:opacity-50"
                            id={`remove-member-${m.user_id}`}
                          >
                            {removingMemberId === m.user_id ? 'Removing…' : '❌ Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── RESOURCES ── */}
        {tab === 'resources' && (
          <div className="space-y-4">
            {!isMember ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 border border-slate-200 rounded-2xl bg-slate-50 text-center gap-3 shadow-sm">
                <span className="text-5xl">🔒</span>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Members Only Workspace</h4>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">Circle resources, file uploads, and study guides are private. Join this circle to access and share learning materials.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Share resource form trigger */}
                {isMember && (
                  <div>
                    {circle.status !== 'active' ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2 font-medium">
                        <span>🔒 Resource uploads are disabled because this circle is currently {circle.status}.</span>
                      </div>
                    ) : !showResourceForm ? (
                      <button
                        onClick={() => setShowResourceForm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        id="show-add-resource-form"
                      >
                        + Share a Resource / File
                      </button>
                    ) : (
                      <form onSubmit={handleAddResource} className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-4 shadow-sm">
                        <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-1.5">
                          <span>📤</span>
                          <span>Share a Study Resource</span>
                        </h4>

                        {/* Link vs File segment control */}
                        <div className="flex rounded-lg bg-slate-200 p-0.5 border border-slate-300">
                          <button
                            type="button"
                            onClick={() => {
                              setResourceMode('link');
                              setResourceErrors({});
                              setFileError(null);
                            }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                              resourceMode === 'link' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🔗 External HTTPS Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResourceMode('file');
                              setResourceErrors({});
                              setFileError(null);
                            }}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                              resourceMode === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            📤 Secure File Upload
                          </button>
                        </div>

                        {/* File Selector (File mode only) */}
                        {resourceMode === 'file' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Select File <span className="text-rose-500">*</span></label>
                            <div className="relative border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors">
                              <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.txt,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                id="resource-file-input"
                              />
                              <span className="text-3xl mb-1.5">📁</span>
                              {selectedFile ? (
                                <div className="text-center">
                                  <p className="text-xs font-semibold text-indigo-900 truncate max-w-xs">{selectedFile.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-1">{formatBytes(selectedFile.size)}</p>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <p className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Click to choose a file</p>
                                  <p className="text-[10px] text-slate-400 mt-1">PDF, Word, Excel, PowerPoint, Text, PNG, JPG (Max 10MB)</p>
                                </div>
                              )}
                            </div>
                            {fileError && <p className="text-xs text-rose-500 mt-1.5 font-medium">{fileError}</p>}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Title */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Title <span className="text-rose-500">*</span></label>
                            <input
                              id="resource-title"
                              type="text"
                              value={resourceForm.title}
                              onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))}
                              placeholder={resourceMode === 'file' ? "e.g., Week 1 Lecture Slides" : "e.g., React Hooks Guide"}
                              className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${resourceErrors.title ? 'border-rose-400' : 'border-slate-300'}`}
                            />
                            {resourceErrors.title && <p className="text-xs text-rose-500 mt-1">{resourceErrors.title}</p>}
                          </div>

                          {/* Resource Type */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                            <select
                              id="resource-type"
                              value={resourceForm.resource_type}
                              onChange={(e) => setResourceForm((f) => ({ ...f, resource_type: e.target.value as CircleResourceType }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                              {CIRCLE_RESOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* URL (Link mode only) */}
                        {resourceMode === 'link' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">URL <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(must be https://)</span></label>
                            <input
                              id="resource-url"
                              type="url"
                              value={resourceForm.url}
                              onChange={(e) => setResourceForm((f) => ({ ...f, url: e.target.value }))}
                              placeholder="https://example.com/notes"
                              className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${resourceErrors.url ? 'border-rose-400' : 'border-slate-300'}`}
                            />
                            {resourceErrors.url && <p className="text-xs text-rose-500 mt-1">{resourceErrors.url}</p>}
                          </div>
                        )}

                        {/* Description */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                          <input
                            id="resource-description"
                            type="text"
                            value={resourceForm.description}
                            onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Short note about this resource…"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowResourceForm(false);
                              setSelectedFile(null);
                              setFileError(null);
                              setResourceForm({ title: '', description: '', resource_type: 'Link', url: '' });
                            }}
                            className="px-4 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            id="cancel-add-resource"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingResource}
                            className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                            id="submit-add-resource"
                          >
                            {submittingResource ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {resourceMode === 'file' ? 'Uploading…' : 'Sharing…'}
                              </>
                            ) : (
                              resourceMode === 'file' ? '📤 Upload & Share' : 'Share Resource'
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Resource List */}
                {loadingResources ? (
                  <LoadingSpinner label="Loading resources…" />
                ) : resources.length === 0 ? (
                  <EmptyState icon="📚" message="No resources shared yet. Be the first to add one!" />
                ) : (() => {
                  const displayedResources = resources.slice(0, resourceLimit);
                  return (
                    <div className="space-y-2">
                      {displayedResources.map((r) => (
                        <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                          <span className="text-xl flex-shrink-0 mt-0.5">
                            {r.file_path ? (
                              r.file_mime_type === 'application/pdf' ? '📄' :
                              r.file_mime_type?.startsWith('image/') ? '🖼️' :
                              '📁'
                            ) : (
                              RESOURCE_TYPE_ICON[r.resource_type]
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {r.file_path ? (
                                <button
                                  onClick={() => handlePreviewResource(r)}
                                  className="text-sm font-semibold text-indigo-700 hover:underline truncate text-left"
                                >
                                  {r.title}
                                </button>
                              ) : r.url ? (
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-indigo-700 hover:underline truncate">
                                  {r.title}
                                </a>
                              ) : (
                                <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">{r.resource_type}</span>
                              {r.file_path && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-semibold">
                                  💾 {formatBytes(r.file_size_bytes)}
                                </span>
                              )}
                              {r.is_pinned && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-white font-extrabold rounded shadow-sm flex items-center gap-0.5 animate-pulse">
                                  📌 PINNED
                                </span>
                              )}
                            </div>
                            {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                            {r.file_path && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                File: {r.file_name}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1">
                              By {r.uploader_profile?.full_name ?? 'Unknown'} · {formatRelativeTime(r.created_at)}
                            </p>

                            {/* Actions and Interactions Row */}
                            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                              {r.file_path && (
                                <>
                                  <button
                                    onClick={() => handlePreviewResource(r)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                                  >
                                    👁️ Preview
                                  </button>
                                  <button
                                    onClick={() => handleDownloadResource(r)}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors"
                                  >
                                    ⬇️ Download
                                  </button>
                                </>
                              )}

                              {/* Like / Unlike (Member / Owner Only) */}
                              <button
                                onClick={() => handleToggleLike(r.id)}
                                className={`text-[10px] px-2 py-0.5 font-bold rounded border transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
                                  r.liked_by_me
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-250 hover:bg-indigo-100'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                                id={`like-resource-${r.id}`}
                              >
                                {r.liked_by_me ? '❤️' : '🤍'} Like
                                <span className="bg-slate-200/60 px-1 rounded text-[9px] font-extrabold">{r.likes_count ?? 0}</span>
                              </button>

                              {/* Pin / Unpin (Owner Only) */}
                              {isOwner && (
                                <button
                                  onClick={() => handleTogglePin(r.id)}
                                  className={`text-[10px] px-2 py-0.5 font-bold rounded border transition-all shrink-0 active:scale-95 ${
                                    r.is_pinned
                                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                  }`}
                                  id={`pin-resource-${r.id}`}
                                >
                                  {r.is_pinned ? '📌 Unpin' : '📌 Pin'}
                                </button>
                              )}
                            </div>
                          </div>
                          {(r.shared_by === currentUserId || isOwner) && (
                            <button
                              onClick={() => handleDeleteResource(r.id)}
                              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove resource"
                              id={`delete-resource-${r.id}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {resources.length > 3 && (
                        <div className="flex justify-center pt-3 border-t border-slate-150">
                          {resourceLimit < resources.length ? (
                            <button
                              type="button"
                              onClick={() => setResourceLimit((prev) => Math.min(prev + 10, resources.length))}
                              className="px-4 py-1.5 bg-white hover:bg-slate-50 border border-slate-250 text-indigo-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 focus:outline-none shrink-0 active:scale-95"
                              id="show-more-resources"
                            >
                              ➕ Show more resources ({resources.length - resourceLimit} remaining)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setResourceLimit(3)}
                              className="px-4 py-1.5 bg-white hover:bg-slate-50 border border-slate-250 text-indigo-700 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 focus:outline-none shrink-0 active:scale-95"
                              id="show-fewer-resources"
                            >
                              ➖ Show fewer resources
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── POSTS / DISCUSSION ── */}
        {tab === 'posts' && (
          <div className="space-y-4">
            {!isMember ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 border border-slate-200 rounded-2xl bg-slate-50 text-center gap-3 shadow-sm">
                <span className="text-5xl">🔒</span>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Members Only Discussion</h4>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm">Circle announcement boards and questions are restricted to joined members. Join this circle to participate in workspace discussions.</p>
                </div>
              </div>
            ) : (
              <>
                {isMember && !isArchived && (
                  <form onSubmit={handleAddPost} className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 space-y-3 shadow-sm">
                    <div className="flex gap-2 flex-wrap">
                      {CIRCLE_POST_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPostType(t)}
                          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${postType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'}`}
                          id={`post-type-${t}`}
                        >
                          {POST_TYPE_ICON[t]} {t}
                        </button>
                      ))}
                    </div>
                    <textarea
                      id="new-post-content"
                      rows={3}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder={`Share an ${postType.toLowerCase()} with your circle…`}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingPost || !postContent.trim()}
                        className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        id="submit-post"
                      >
                        {submittingPost ? 'Posting…' : `Post ${POST_TYPE_ICON[postType]}`}
                      </button>
                    </div>
                  </form>
                )}

                {loadingPosts ? (
                  <LoadingSpinner label="Loading discussion…" />
                ) : posts.length === 0 ? (
                  <EmptyState icon="💬" message="No posts yet. Start the discussion!" />
                ) : (
                  <div className="space-y-3">
                    {posts.map((p) => (
                      <div key={p.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                              {p.author_profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{p.author_profile?.full_name ?? 'Unknown'}</p>
                            <span className={`px-2 py-0.5 text-[10px] rounded border font-semibold ${POST_TYPE_COLOR[p.post_type]}`}>
                              {POST_TYPE_ICON[p.post_type]} {p.post_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-slate-400">{formatRelativeTime(p.created_at)}</span>
                            {(p.created_by === currentUserId || isOwner) && (
                              <button
                                onClick={() => handleDeletePost(p.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete post"
                                id={`delete-post-${p.id}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{p.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Media Preview Lightbox Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  👁️ Preview: {previewResource.title}
                </h3>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  File: {previewResource.file_name} · Size: {formatBytes(previewResource.file_size_bytes)}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewResource(null);
                  setPreviewUrl('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-[400px] max-h-[70vh] bg-slate-100 overflow-y-auto flex items-center justify-center p-4">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold">Generating secure preview link…</p>
                </div>
              ) : !previewUrl ? (
                <div className="text-center p-6 space-y-2 max-w-sm">
                  <span className="text-3xl">⚠️</span>
                  <p className="text-sm font-bold text-slate-800">Preview Link Generation Failed</p>
                  <p className="text-xs text-slate-500">Could not retrieve secure URL for this resource. Try downloading the file instead.</p>
                </div>
              ) : previewResource.file_mime_type === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[500px] border-0 rounded-lg shadow-inner bg-white"
                  title={previewResource.title}
                />
              ) : previewResource.file_mime_type?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewResource.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (
                /* Fallback detailed metadata card for documents */
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 max-w-md w-full space-y-4 text-center">
                  <span className="text-5xl block">📂</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{previewResource.file_name}</h4>
                    <p className="text-xs text-slate-500 mt-1">Shared by {previewResource.uploader_profile?.full_name ?? 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-left text-xs space-y-1.5 border border-slate-100 font-mono">
                    <p className="text-slate-600"><span className="font-semibold text-slate-800">Mime-Type:</span> {previewResource.file_mime_type}</p>
                    <p className="text-slate-600"><span className="font-semibold text-slate-800">File-Size:</span> {formatBytes(previewResource.file_size_bytes)}</p>
                    <p className="text-slate-600"><span className="font-semibold text-slate-800">Shared-On:</span> {formatDate(previewResource.created_at)}</p>
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100 leading-relaxed">
                    ℹ️ Direct browser preview is not supported for Office documents (Word, Excel, PowerPoint) to preserve security. Please download the file to open it.
                  </p>
                  <button
                    onClick={() => handleDownloadResource(previewResource)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    ⬇️ Download File Securely
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex gap-2">
                {previewUrl && (
                  <button
                    onClick={() => handleDownloadResource(previewResource)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    ⬇️ Download
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setPreviewResource(null);
                  setPreviewUrl('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── SMALL HELPERS ────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
    <span className="text-base">{icon}</span>
    <div>
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  </div>
);

const LoadingSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
    <div className="w-7 h-7 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin border-2" />
    {label && <p className="text-sm">{label}</p>}
  </div>
);

const EmptyState: React.FC<{ icon: string; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
    <span className="text-4xl">{icon}</span>
    <p className="text-sm">{message}</p>
  </div>
);

// ─── STATS CARD ───────────────────────────────────────────────────────────────

const StatsCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
    <span className="text-2xl">{icon}</span>
    <div>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type MainTab = 'discover' | 'my';

export const LearningCirclesPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [mainTab, setMainTab] = useState<MainTab>('discover');
  const [allCircles, setAllCircles] = useState<LearningCircleWithStats[]>([]);
  const [myCircles, setMyCircles] = useState<LearningCircleWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [workspaceCircle, setWorkspaceCircle] = useState<LearningCircleWithStats | null>(null);

  // Join Requests state
  const [myJoinRequests, setMyJoinRequests] = useState<LearningCircleJoinRequest[]>([]);
  const [requestingCircle, setRequestingCircle] = useState<LearningCircleWithStats | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [roleInterest, setRoleInterest] = useState<LearningCircleRoleInterest>('learner');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterMode, setFilterMode] = useState('');

  // Dynamic categories: default ones + any unique ones from fetched circles
  const dynamicCategories = React.useMemo(() => {
    const categoriesSet = new Set<string>();
    CIRCLE_CATEGORIES.forEach((c) => {
      if (c !== 'Other') categoriesSet.add(c);
    });
    allCircles.forEach((c) => {
      if (c.category) {
        const existing = Array.from(categoriesSet).find(
          (item) => item.toLowerCase() === c.category.trim().toLowerCase()
        );
        if (!existing) {
          categoriesSet.add(c.category.trim());
        }
      }
    });
    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
  }, [allCircles]);

  // Load data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [all, my, requests] = await Promise.all([
        getLearningCircles(userId || undefined),
        userId ? getMyLearningCircles(userId) : Promise.resolve([]),
        userId ? getMyJoinRequests() : Promise.resolve([]),
      ]);
      setAllCircles(all);
      setMyCircles(my);
      setMyJoinRequests(requests);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Filtered discover results
  const filteredCircles = allCircles.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [c.title, c.description, c.category, c.department ?? ''].some((s) => s.toLowerCase().includes(q));
    const matchCat = !filterCategory || c.category.trim().toLowerCase() === filterCategory.trim().toLowerCase();
    const matchDiff = !filterDifficulty || c.difficulty_level === filterDifficulty;
    const matchMode = !filterMode || c.meeting_mode === filterMode;
    return matchSearch && matchCat && matchDiff && matchMode;
  });

  const handleRequestJoinClick = (circle: LearningCircleWithStats) => {
    if (!userId) {
      toast.error('Sign In Required', 'Please sign in to request to join.');
      return;
    }
    setRequestingCircle(circle);
    setJoinMessage('');
    setRoleInterest('learner');
    setRequestError('');
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingCircle) return;
    if (joinMessage.trim().length < 10) {
      setRequestError('Please provide a message explaining why you want to join (minimum 10 characters).');
      return;
    }
    setSubmittingRequest(true);
    setRequestError('');
    try {
      await requestToJoinCircle(requestingCircle.id, {
        message: joinMessage,
        role_interest: roleInterest,
      });
      toast.success('Request Submitted! ⌛', 'The circle owner will review your application.');
      setRequestingCircle(null);
      setJoinMessage('');
      setRoleInterest('learner');
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit request.';
      setRequestError(msg);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelJoinRequest(requestId);
      toast.success('Request Cancelled', 'Your join request has been cancelled.');
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not cancel request.';
      toast.error('Cancellation Failed', msg);
    }
  };

  const handleLeave = async (circle: LearningCircleWithStats) => {
    if (!userId) return;
    const isOwner = circle.my_role === 'owner' || circle.created_by === userId;
    if (isOwner) {
      toast.error('Leave Failed', 'Owner cannot leave their own circle in MVP. Archive the circle instead.');
      return;
    }
    try {
      await leaveLearningCircle(circle.id, userId);
      toast.success('Left Circle', `You have left "${circle.title}".`);
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not leave circle.';
      toast.error('Leave Failed', msg);
    }
  };

  const handleView = (circle: LearningCircleWithStats) => {
    setWorkspaceCircle(circle);
  };

  const handleCreated = async (circle: LearningCircleWithStats) => {
    setShowCreate(false);
    await loadAll();
    setWorkspaceCircle(circle);
    setMainTab('my');
  };

  const handleCircleUpdated = (updated: LearningCircleWithStats) => {
    setWorkspaceCircle(updated);
    setAllCircles((prev) => prev.map((c) => c.id === updated.id ? { ...c, status: updated.status } : c));
    setMyCircles((prev) => prev.map((c) => c.id === updated.id ? { ...c, status: updated.status } : c));
  };

  // Stats
  const totalActive = allCircles.filter((c) => c.status === 'active').length;
  const myCount = myCircles.length;
  const totalMembers = allCircles.reduce((acc, c) => acc + (c.member_count ?? 0), 0);

  // If workspace open, show workspace
  if (workspaceCircle) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <CircleWorkspace
          circle={workspaceCircle}
          currentUserId={userId}
          onBack={() => setWorkspaceCircle(null)}
          onCircleUpdated={handleCircleUpdated}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {showCreate && userId && (
        <CreateCircleModal
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Learning Circles</h1>
          <p className="text-sm text-slate-500 mt-1">Join cohort-based study groups · Share resources · Collaborate with peers</p>
        </div>
        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            id="open-create-circle-modal"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Start a Circle
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard icon="🌐" label="Active Circles" value={loading ? '…' : totalActive} color="bg-indigo-50 border-indigo-200 text-indigo-800" />
        <StatsCard icon="📦" label="My Circles" value={loading ? '…' : myCount} color="bg-violet-50 border-violet-200 text-violet-800" />
        <StatsCard icon="👥" label="Total Members" value={loading ? '…' : totalMembers} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200">
        {([
          { id: 'discover' as MainTab, label: '🔍 Discover Circles' },
          { id: 'my' as MainTab, label: `📦 My Circles (${myCircles.length})` },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${mainTab === t.id ? 'text-indigo-700 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
            id={`main-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Discover Tab */}
      {mainTab === 'discover' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 font-sans">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
              <input
                id="search-circles"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search circles by title, topic, or department…"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <select
              id="filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {dynamicCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              id="filter-difficulty"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Levels</option>
              {CIRCLE_DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select
              id="filter-mode"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Modes</option>
              {CIRCLE_MEETING_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('');
                setFilterDifficulty('');
                setFilterMode('');
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
              id="reset-filters"
            >
              🔄 Reset
            </button>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading circles…" />
          ) : filteredCircles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <span className="text-5xl">🔍</span>
              <p className="text-base font-medium text-slate-500">No circles match your filters. Try resetting filters.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('');
                  setFilterDifficulty('');
                  setFilterMode('');
                }}
                className="mt-2 px-5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
                id="empty-reset-filters"
              >
                🔄 Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{filteredCircles.length} circle{filteredCircles.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCircles.map((circle) => {
                  const matchingReq = myJoinRequests.find(r => r.circle_id === circle.id && r.status === 'pending') || 
                                      myJoinRequests.find(r => r.circle_id === circle.id && r.status === 'rejected') || 
                                      myJoinRequests.find(r => r.circle_id === circle.id && r.status === 'cancelled');
                  return (
                    <CircleCard
                      key={circle.id}
                      circle={circle}
                      currentUserId={userId}
                      request={matchingReq || null}
                      onView={handleView}
                      onRequestJoin={handleRequestJoinClick}
                      onCancelRequest={handleCancelRequest}
                      onLeave={handleLeave}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* My Circles Tab */}
      {mainTab === 'my' && (
        <div className="space-y-4">
          {!userId ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <span className="text-5xl">🔐</span>
              <p className="text-sm">Sign in to see your circles.</p>
            </div>
          ) : loading ? (
            <LoadingSpinner label="Loading your circles…" />
          ) : (
            <>
              {/* Pending Join Requests Sub-section */}
              {myJoinRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-left font-sans">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span>⌛</span> Pending Join Requests ({myJoinRequests.filter(r => r.status === 'pending').length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myJoinRequests.filter(r => r.status === 'pending').map((req) => {
                      const targetCircle = allCircles.find(c => c.id === req.circle_id);
                      return (
                        <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {targetCircle?.title ?? 'Private Circle'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">Role Interest: <span className="font-semibold text-slate-700 capitalize">{req.role_interest}</span></p>
                            <p className="text-[10px] text-slate-400 mt-1">Requested on {formatDate(req.created_at)}</p>
                          </div>
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg border border-rose-200 transition-all shrink-0 active:scale-95 animate-in fade-in"
                            id={`cancel-request-list-${req.id}`}
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {myCircles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <span className="text-5xl">📦</span>
                  <p className="text-base font-medium text-slate-500">You haven't joined any circles yet</p>
                  <p className="text-sm">Discover circles in the Discover tab or start your own.</p>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => setMainTab('discover')} className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                      🔍 Discover Circles
                    </button>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
                      + Start a Circle
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500">{myCircles.length} circle{myCircles.length !== 1 ? 's' : ''} — sorted by newest first</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {myCircles.map((circle) => {
                      const matchingReq = myJoinRequests.find(r => r.circle_id === circle.id);
                      return (
                        <CircleCard
                          key={circle.id}
                          circle={circle}
                          currentUserId={userId}
                          request={matchingReq || null}
                          onView={handleView}
                          onRequestJoin={handleRequestJoinClick}
                          onCancelRequest={handleCancelRequest}
                          onLeave={handleLeave}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Join Request modal prompt */}
      {requestingCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 text-left">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Request to Join Circle</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Submit an application to join "{requestingCircle.title}".</p>
              </div>
              <button
                onClick={() => setRequestingCircle(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4 text-left">
              {requestError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {requestError}
                </div>
              )}

              {/* Role Interest */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Intended Role / Contribution</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'learner' as LearningCircleRoleInterest, emoji: '📖', title: 'Learner', desc: 'Participate and learn' },
                    { id: 'contributor' as LearningCircleRoleInterest, emoji: '💡', title: 'Contributor', desc: 'Share resources & posts' },
                    { id: 'peer_mentor' as LearningCircleRoleInterest, emoji: '🎓', title: 'Mentor', desc: 'Guide & support peers' },
                  ].map((roleOption) => (
                    <button
                      key={roleOption.id}
                      type="button"
                      onClick={() => setRoleInterest(roleOption.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        roleInterest === roleOption.id
                          ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/10'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-lg mb-0.5">{roleOption.emoji}</span>
                      <span className="block text-xs font-bold text-slate-900">{roleOption.title}</span>
                      <span className="block text-[9px] text-slate-400 leading-tight mt-0.5">{roleOption.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Why do you want to join this circle? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Explain your academic goals, what you hope to achieve, or how you plan to contribute. (minimum 10 characters)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white text-left"
                />
                <p className="text-[10px] text-slate-400 mt-1">Provide a clear description. The circle owner will verify your profile and request details.</p>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRequestingCircle(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest || joinMessage.trim().length < 10}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                  id="submit-join-request-btn"
                >
                  {submittingRequest ? 'Submitting…' : 'Submit Application 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
