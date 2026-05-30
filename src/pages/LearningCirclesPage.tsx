import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import type {
  LearningCircleWithStats,
  LearningCircleMember,
  LearningCircleResource,
  LearningCirclePost,
  LearningCirclePostReply,
  CircleDifficulty,
  CircleMeetingMode,
  CircleResourceType,
  CirclePostType,
  CircleStatus,
  LearningCircleJoinRequest,
  LearningCircleJoinRequestWithProfile,
  LearningCircleRoleInterest,
  LearningCirclePresence,
} from '../types';
import {
  getLearningCircles,
  getMyLearningCircles,
  getLearningCircleById,
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
  createCirclePost,
  updateCirclePost,
  softDeleteCirclePost,
  togglePostPin,
  togglePostResolved,
  addPostReply,
  getPostReplies,
  updatePostReply,
  deletePostReply,
  togglePostHelpful,
  toggleReplyHelpful,
  getDiscussionStats,
  updateCirclePresence,
  getCirclePresence,
  derivePresenceStatus,
  CIRCLE_CATEGORIES,
  CIRCLE_DIFFICULTIES,
  CIRCLE_MEETING_MODES,
  CIRCLE_RESOURCE_TYPES,
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
  verifyCircleResource,
  rejectCircleResource,
  toggleOwnerRecommend,
  runResourceLinkSafetyCheck,
  getResourceVerificationQueue,
  getMySubmittedResources,
  getCircleMemberResourceStats,
  getCircleRejectedResources,
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
  discussion: 'bg-sky-50 text-sky-700 border-sky-200',
  question: 'bg-amber-50 text-amber-700 border-amber-200',
  study_plan: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  announcement: 'bg-rose-50 text-rose-700 border-rose-200',
};

const POST_TYPE_ICON: Record<CirclePostType, string> = {
  Update: '📢',
  Question: '❓',
  Plan: '📅',
  Announcement: '📣',
  discussion: '📢',
  question: '❓',
  study_plan: '📅',
  announcement: '📣',
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
            {isFull && <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase text-rose-600 bg-rose-50 border-rose-200">Full</span>}
            {request?.status === 'pending' && <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border-amber-200">Pending</span>}
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

        {isFull && !isJoined && (
          <div className="text-[10.5px] text-amber-700 bg-amber-50 border border-amber-250 p-2.5 rounded-lg mt-1 leading-normal w-full text-left font-sans">
            ⚠️ <strong>Full</strong> — owner must increase capacity before accepting.
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
                className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                id={`request-join-circle-${circle.id}`}
              >
                {(request?.status === 'rejected' || request?.status === 'cancelled' || request?.status === 'accepted') ? 'Request Again' : 'Request to Join'}
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

  const [resourceLimit, setResourceLimit] = useState(3);

  // Verification & dashboard states
  const [verificationQueue, setVerificationQueue] = useState<LearningCircleResource[]>([]);
  const [mySubmittedResources, setMySubmittedResources] = useState<LearningCircleResource[]>([]);
  const [memberStats, setMemberStats] = useState<Record<string, any>>({});
  const [rejectedResources, setRejectedResources] = useState<LearningCircleResource[]>([]);
  const [showRejectedHistory, setShowRejectedHistory] = useState(false);
  const [rejectionResourceId, setRejectionResourceId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Custom modals state
  const [removingMember, setRemovingMember] = useState<{ id: string; name: string } | null>(null);
  const [removeReason, setRemoveReason] = useState('Inactive member');
  const [removeMessage, setRemoveMessage] = useState('');
  const [submittingRemove, setSubmittingRemove] = useState(false);

  // Reload circle details on mount to fetch the latest meeting credentials securely
  const loadCircleDetails = useCallback(async () => {
    try {
      const latest = await getLearningCircleById(circle.id, currentUserId);
      if (latest) {
        onCircleUpdated(latest);
      }
    } catch (err) {
      console.error('Failed to reload circle details:', err);
    }
  }, [circle.id, currentUserId, onCircleUpdated]);

  useEffect(() => {
    loadCircleDetails();
  }, [loadCircleDetails]);

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

  const handleRemoveMemberClick = (targetUserId: string, targetName: string) => {
    setRemovingMember({ id: targetUserId, name: targetName });
    setRemoveReason('Inactive member');
    setRemoveMessage('');
  };

  const handleRemoveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingMember) return;
    setSubmittingRemove(true);
    try {
      await removeCircleMember(circle.id, removingMember.id, {
        reason: removeReason,
        message: removeMessage
      });
      toast.success('Member Removed', `Successfully removed "${removingMember.name}" from the study group.`);
      setRemovingMember(null);
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
      setSubmittingRemove(false);
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

  const handleVerifyResource = async (resourceId: string, recommend: boolean) => {
    try {
      await verifyCircleResource(resourceId, { owner_recommended: recommend });
      toast.success('Resource Verified! ✅', recommend ? 'The resource was approved and marked as Recommended.' : 'The resource was approved.');
      await loadResources();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not verify resource.';
      toast.error('Verification Failed', msg);
    }
  };

  const handleOpenRejectDialog = (resourceId: string) => {
    setRejectionResourceId(resourceId);
    setRejectionReasonText('');
  };

  const handleRejectResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionResourceId) return;
    if (rejectionReasonText.trim().length < 5) {
      toast.error('Rejection Reason Required', 'Please provide a reason of at least 5 characters.');
      return;
    }
    setSubmittingRejection(true);
    try {
      await rejectCircleResource(rejectionResourceId, rejectionReasonText);
      toast.success('Resource Rejected ❌', 'Feedback message saved.');
      setRejectionResourceId(null);
      setRejectionReasonText('');
      await loadResources();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reject resource.';
      toast.error('Rejection Failed', msg);
    } finally {
      setSubmittingRejection(false);
    }
  };

  const handleToggleRecommend = async (resourceId: string) => {
    try {
      await toggleOwnerRecommend(resourceId);
      toast.success('Recommendation Toggled ⭐️', 'Resource ranking updated.');
      await loadResources();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not toggle recommendation.';
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

  // ─── UPGRADED DISCUSSION BOARD & PRESENCE STATES ───
  const [submittingPost, setSubmittingPost] = useState(false);

  // Active filter memory (Requirement 6)
  const [discFilters, setDiscFilters] = useState<{
    post_type: CirclePostType | 'All';
    search: string;
    mine: boolean;
    resolved: boolean | null;
  }>({
    post_type: 'All',
    search: '',
    mine: false,
    resolved: null,
  });

  const [discStats, setDiscStats] = useState({
    totalPosts: 0,
    openQuestions: 0,
    resolvedQuestions: 0,
    announcementsCount: 0,
    totalReplies: 0,
  });

  // Modal / Editing states for Posts
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostForm, setNewPostForm] = useState({
    title: '',
    body: '',
    post_type: 'discussion' as CirclePostType,
    tagsString: '',
  });

  const [editingPost, setEditingPost] = useState<LearningCirclePost | null>(null);
  const [editingPostForm, setEditingPostForm] = useState({
    title: '',
    body: '',
    tagsString: '',
  });

  // Thread/Replies states (Requirement 5 live updates)
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<Record<string, LearningCirclePostReply[]>>({});
  const [loadingRepliesPostId, setLoadingRepliesPostId] = useState<string | null>(null);
  const [replyInputTexts, setReplyInputTexts] = useState<Record<string, string>>({});
  const [submittingReplyPostId, setSubmittingReplyPostId] = useState<string | null>(null);

  // Modal / Inline Editing for Replies
  const [editingReply, setEditingReply] = useState<LearningCirclePostReply | null>(null);
  const [editingReplyBody, setEditingReplyBody] = useState('');

  // Presence States (Phase 5.6 ADD-ON)
  const [presences, setPresences] = useState<LearningCirclePresence[]>([]);

  // Pagination and delete confirm states (Phase 5.6A)
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'post' | 'reply';
    id: string;
    postId?: string;
  } | null>(null);

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

  const isUserOwner = (userId: string) => {
    if (userId === circle.created_by) return true;
    const mem = members.find((m) => m.user_id === userId);
    return mem?.role === 'owner';
  };

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await getCircleMembers(circle.id);
      setMembers(data);
      if (isMember) {
        const stats = await getCircleMemberResourceStats(circle.id);
        setMemberStats(stats);
        const pres = await getCirclePresence(circle.id);
        setPresences(pres);
      }
    } catch (err) {
      console.error('loadMembers stats error:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [circle.id, isMember]);

  const loadResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const data = await getCircleResources(circle.id);
      setResources(data);
      if (isOwner) {
        const queue = await getResourceVerificationQueue(circle.id);
        setVerificationQueue(queue);
        const rejected = await getCircleRejectedResources(circle.id);
        setRejectedResources(rejected);
      }
      if (isMember) {
        const myRes = await getMySubmittedResources(circle.id);
        setMySubmittedResources(myRes);
      }
    } catch (err) {
      console.error('loadResources queue error:', err);
    } finally {
      setLoadingResources(false);
    }
  }, [circle.id, isOwner, isMember]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const apiFilters = {
        post_type: discFilters.post_type,
        search: discFilters.search,
        mine: discFilters.mine,
        resolved: discFilters.resolved === null ? undefined : discFilters.resolved,
      };
      const data = await getCirclePosts(circle.id, apiFilters);
      setPosts(data);
      const stats = await getDiscussionStats(circle.id);
      setDiscStats(stats);
    } catch (err) {
      console.error('loadPosts error:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [circle.id, discFilters]);

  // Reset show more pagination on filters update
  useEffect(() => {
    setShowAllPosts(false);
  }, [discFilters]);

  useEffect(() => {
    if (tab === 'members') loadMembers();
    else if (tab === 'resources') loadResources();
    else if (tab === 'posts') loadPosts();
    else if (tab === 'requests') loadRequests();
  }, [tab, loadMembers, loadResources, loadPosts, loadRequests]);

  // Synchronize user presence automatically (heartbeat and tab changes)
  useEffect(() => {
    if (!isMember) return;

    const syncPresence = async () => {
      await updateCirclePresence(circle.id, tab);
      const data = await getCirclePresence(circle.id);
      setPresences(data);
    };

    syncPresence();

    const interval = setInterval(async () => {
      await updateCirclePresence(circle.id, tab);
      const data = await getCirclePresence(circle.id);
      setPresences(data);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [circle.id, tab, isMember]);

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

        if (isOwner) {
          setResources((prev) => [res, ...prev]);
          toast.success('Resource Added', 'Study resource link shared and verified.');
        } else {
          toast.success('Resource Submitted! ⏳', 'Your shared material has been sent to the circle owner for verification.');
        }
        setMySubmittedResources((prev) => [res, ...prev]);

        setResourceForm({ title: '', description: '', resource_type: 'Link', url: '' });
        setShowResourceForm(false);
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

        if (isOwner) {
          setResources((prev) => [res, ...prev]);
          toast.success('File Uploaded! 🚀', `"${fileData.file_name}" uploaded and verified.`);
        } else {
          toast.success('File Submitted! ⏳', `"${fileData.file_name}" uploaded. Pending owner verification.`);
        }
        setMySubmittedResources((prev) => [res, ...prev]);

        setResourceForm({ title: '', description: '', resource_type: 'Link', url: '' });
        setSelectedFile(null);
        setResourceMode('link');
        setShowResourceForm(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not upload file.';
        toast.error('Upload Failed', msg);
      } finally {
        setSubmittingResource(false);
      }
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this resource?')) return;
    try {
      await deleteCircleResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
      setMySubmittedResources((prev) => prev.filter((r) => r.id !== id));
      setVerificationQueue((prev) => prev.filter((r) => r.id !== id));
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

  // ── Post Handlers (Phase 5.6 UPGRADED DISCUSSION BOARD) ────────────────────

  const handleCreatePost = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const titleTrimmed = newPostForm.title.trim();
    const bodyTrimmed = newPostForm.body.trim();

    if (titleTrimmed.length < 3) {
      toast.error('Short Title', 'Title must be at least 3 characters.');
      return;
    }
    if (bodyTrimmed.length < 5) {
      toast.error('Short Body', 'Body must be at least 5 characters.');
      return;
    }

    // Split tags by comma
    const tagsArr = newPostForm.tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tagsArr.length > 5) {
      toast.error('Too Many Tags', 'You can specify a maximum of 5 tags.');
      return;
    }

    setSubmittingPost(true);
    try {
      const post = await createCirclePost({
        circle_id: circle.id,
        title: titleTrimmed,
        body: bodyTrimmed,
        post_type: newPostForm.post_type,
        tags: tagsArr,
      });

      setPosts((prev) => [post, ...prev]);
      setNewPostForm({
        title: '',
        body: '',
        post_type: 'discussion',
        tagsString: '',
      });
      setShowNewPostModal(false);
      toast.success('Post Published! 🎉', 'Your post is now active in the discussion board.');
      
      // Refresh Stats
      const stats = await getDiscussionStats(circle.id);
      setDiscStats(stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create post.';
      toast.error('Post Failed', msg);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleUpdatePost = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editingPost) return;

    const titleTrimmed = editingPostForm.title.trim();
    const bodyTrimmed = editingPostForm.body.trim();

    if (titleTrimmed.length < 3) {
      toast.error('Short Title', 'Title must be at least 3 characters.');
      return;
    }
    if (bodyTrimmed.length < 5) {
      toast.error('Short Body', 'Body must be at least 5 characters.');
      return;
    }

    const tagsArr = editingPostForm.tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tagsArr.length > 5) {
      toast.error('Too Many Tags', 'You can specify a maximum of 5 tags.');
      return;
    }

    try {
      const updated = await updateCirclePost(editingPost.id, {
        title: titleTrimmed,
        body: bodyTrimmed,
        tags: tagsArr,
      });

      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? { ...p, ...updated } : p)));
      setEditingPost(null);
      toast.success('Post Updated! ✏️', 'Your changes have been saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update post.';
      toast.error('Update Failed', msg);
    }
  };

  const handleSoftDeletePost = (id: string) => {
    setDeleteConfirm({ type: 'post', id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, postId } = deleteConfirm;
    setDeleteConfirm(null);

    if (type === 'post') {
      try {
        await softDeleteCirclePost(id);
        
        // Update local state to reflect soft delete: set deleted_at and deleted_by
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, deleted_at: new Date().toISOString(), deleted_by: currentUserId }
              : p
          )
        );

        toast.success('Post removed successfully.');

        // Refresh Stats
        const stats = await getDiscussionStats(circle.id);
        setDiscStats(stats);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not remove post.';
        toast.error('Action Failed', `Could not remove post: ${msg}`);
      }
    } else if (type === 'reply' && postId) {
      try {
        await deletePostReply(id);

        // Update local state for reply to be soft-deleted instead of filtering it out
        setRepliesByPost((prev) => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.map((item) =>
              item.id === id
                ? { ...item, deleted_at: new Date().toISOString(), deleted_by: currentUserId }
                : item
            ),
          };
        });

        // Update reply count locally in posts list IMMEDIATELY
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, replies_count: Math.max(0, (p.replies_count ?? 1) - 1) } : p
          )
        );

        toast.success('Comment removed successfully.');

        // Refresh Stats
        const stats = await getDiscussionStats(circle.id);
        setDiscStats(stats);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not remove comment.';
        toast.error('Action Failed', `Could not remove comment: ${msg}`);
      }
    }
  };

  const handleTogglePostPin = async (id: string) => {
    try {
      await togglePostPin(id);
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_pinned: !p.is_pinned } : p))
      );
      toast.success('Pin Status Toggled 📌');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      toast.error('Action Failed', msg);
    }
  };

  const handleToggleResolved = async (id: string) => {
    try {
      await togglePostResolved(id);
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_resolved: !p.is_resolved } : p))
      );
      toast.success('Resolution Status Updated ✅');

      // Refresh Stats
      const stats = await getDiscussionStats(circle.id);
      setDiscStats(stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed.';
      toast.error('Action Failed', msg);
    }
  };

  const handleToggleHelpful = async (id: string) => {
    try {
      await togglePostHelpful(id);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const prevReacted = !!p.reacted_by_me;
          const prevCount = p.helpful_count ?? 0;
          return {
            ...p,
            reacted_by_me: !prevReacted,
            helpful_count: prevReacted ? Math.max(0, prevCount - 1) : prevCount + 1,
          };
        })
      );
    } catch (err) {
      console.error('toggle helpful failed:', err);
    }
  };

  // ── Comment/Reply Handlers ──────────────────────────────────────────────────

  const handleLoadReplies = async (postId: string) => {
    setLoadingRepliesPostId(postId);
    try {
      const replies = await getPostReplies(postId);
      setRepliesByPost((prev) => ({ ...prev, [postId]: replies }));
    } catch (err) {
      console.error('load replies failed:', err);
    } finally {
      setLoadingRepliesPostId(null);
    }
  };

  const handleAddReplySubmit = async (postId: string) => {
    const text = replyInputTexts[postId] || '';
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      toast.error('Short Comment', 'Comment must be at least 2 characters.');
      return;
    }

    setSubmittingReplyPostId(postId);
    try {
      const reply = await addPostReply(postId, trimmed);
      
      // Update replies list for this post
      setRepliesByPost((prev) => {
        const existing = prev[postId] || [];
        return { ...prev, [postId]: [...existing, reply] };
      });

      // Clear input
      setReplyInputTexts((prev) => ({ ...prev, [postId]: '' }));

      // Update reply count locally in posts list IMMEDIATELY (Requirement 5)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, replies_count: (p.replies_count ?? 0) + 1 } : p
        )
      );

      toast.success('Comment Added 💬');

      // Refresh Stats
      const stats = await getDiscussionStats(circle.id);
      setDiscStats(stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add reply.';
      toast.error('Comment Failed', msg);
    } finally {
      setSubmittingReplyPostId(null);
    }
  };

  const handleUpdateReplySubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editingReply) return;

    const trimmed = editingReplyBody.trim();
    if (trimmed.length < 2) {
      toast.error('Short Comment', 'Comment must be at least 2 characters.');
      return;
    }

    try {
      const updated = await updatePostReply(editingReply.id, trimmed);
      
      // Update in local state
      setRepliesByPost((prev) => {
        const list = prev[editingReply.post_id] || [];
        return {
          ...prev,
          [editingReply.post_id]: list.map((r) => (r.id === editingReply.id ? updated : r)),
        };
      });

      setEditingReply(null);
      toast.success('Comment Updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not edit comment.';
      toast.error('Edit Failed', msg);
    }
  };

  const handleDeleteReply = (replyId: string, postId: string) => {
    setDeleteConfirm({ type: 'reply', id: replyId, postId });
  };

  const handleToggleReplyHelpful = async (replyId: string, postId: string) => {
    try {
      await toggleReplyHelpful(replyId);
      setRepliesByPost((prev) => {
        const list = prev[postId] || [];
        return {
          ...prev,
          [postId]: list.map((r) => {
            if (r.id !== replyId) return r;
            const prevReacted = !!r.reacted_by_me;
            const prevCount = r.helpful_count ?? 0;
            return {
              ...r,
              reacted_by_me: !prevReacted,
              helpful_count: prevReacted ? Math.max(0, prevCount - 1) : prevCount + 1,
            };
          }),
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not react to comment.';
      toast.error('Action Failed', `Could not react to comment: ${msg}`);
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

  const activeRequests = joinRequests.filter(r => {
    if (r.status === 'pending') return true;
    if (r.status === 'accepted') {
      const hasMember = members.some(m => m.user_id === r.requester_id);
      return (
        !hasMember &&
        !r.member_left_at &&
        !r.left_by &&
        !r.removed_by &&
        !!r.membership_created_at
      );
    }
    return false;
  });
  const pendingRequestsCount = activeRequests.length;

  const TABS: { id: WorkspaceTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    ...(isOwner ? [{ id: 'requests' as WorkspaceTab, label: `Requests (${pendingRequestsCount})`, icon: '⏳' }] : []),
    { id: 'members', label: `Members (${circle.member_count ?? '…'})`, icon: '👥' },
    { id: 'resources', label: `Resources (${resources.length})`, icon: '📚' },
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

      {/* Lightweight Presence Bar (Requirement A) */}
      {isMember && (
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-600 animate-fade-in">
          {(() => {
            // Count presence
            let onlineCount = 0;
            let recentCount = 0;
            let offlineCount = 0;

            // To avoid duplicate counting, let's build statuses for loaded circle members
            const memberPresenceStatuses = members.map((m) => {
              const pres = presences.find((p) => p.user_id === m.user_id);
              const status = pres ? derivePresenceStatus(pres.last_seen_at) : 'offline';
              return { userId: m.user_id, status };
            });

            // Also check if any presences aren't in members list (e.g. before members loaded or owner)
            presences.forEach((p) => {
              const alreadyCounted = memberPresenceStatuses.some((m) => m.userId === p.user_id);
              if (!alreadyCounted) {
                memberPresenceStatuses.push({
                  userId: p.user_id,
                  status: derivePresenceStatus(p.last_seen_at),
                });
              }
            });

            // Count them
            memberPresenceStatuses.forEach((mps) => {
              if (mps.status === 'online') onlineCount++;
              else if (mps.status === 'recently_active') recentCount++;
              else offlineCount++;
            });

            if (memberPresenceStatuses.length === 0) {
              return (
                <div className="flex items-center gap-1.5 text-slate-400 italic">
                  <span>💬 Activity will appear as members open the workspace.</span>
                </div>
              );
            }

            return (
              <>
                <div className="flex items-center gap-3 flex-wrap animate-fade-in">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <strong>{onlineCount}</strong> online
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <strong>{recentCount}</strong> recently active
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <strong>{offlineCount}</strong> offline
                  </span>
                </div>
                {/* Active users microcopy */}
                <div className="text-[11px] text-slate-400 hidden sm:block font-normal">
                  🟢 Online: {presences
                    .filter((p) => derivePresenceStatus(p.last_seen_at) === 'online')
                    .map((p) => p.profile?.full_name?.split(' ')[0])
                    .filter(Boolean)
                    .join(', ') || 'Only you'}
                </div>
              </>
            );
          })()}
        </div>
      )}

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

            {/* Members-Only Private Meeting Details */}
            {(isOwner || isMember || circle.my_role === 'owner' || circle.my_role === 'member') && (
              (circle.meeting_link || circle.meeting_password) ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3.5 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-indigo-100 pb-2.5">
                    <span className="text-xl">🔐</span>
                    <div>
                      <h4 className="text-sm font-bold text-indigo-900 font-sans">Members-only meeting details</h4>
                      <p className="text-[10px] text-indigo-500 font-medium font-sans">Visible strictly to verified cohort members & owner.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                    {circle.meeting_link ? (
                      <div>
                        <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-1">Private Meeting Link</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={circle.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition break-all"
                            id="private-meeting-link"
                          >
                            🌐 Join Online Session
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(circle.meeting_link || '');
                              toast.success('Link Copied', 'Meeting link copied to clipboard.');
                            }}
                            className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-indigo-700 font-bold text-xs rounded-xl shadow-xs transition"
                            title="Copy meeting link"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {circle.meeting_password ? (
                      <div>
                        <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wider mb-1">Access Password / Access Code</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-3 py-2 bg-white rounded-xl border border-indigo-150 text-indigo-950 font-mono font-bold text-xs select-all">
                            {circle.meeting_password}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(circle.meeting_password || '');
                              toast.success('Password Copied', 'Meeting password copied to clipboard.');
                            }}
                            className="px-2.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-indigo-700 font-bold text-xs rounded-xl shadow-xs transition"
                            title="Copy meeting password"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔐</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 font-sans">Members-only meeting details</h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-sans">Meeting details will be shared by the owner.</p>
                    </div>
                  </div>
                </div>
              )
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
                        {req.status === 'accepted' &&
                          !members.some(m => m.user_id === req.requester_id) &&
                          !req.member_left_at &&
                          !req.left_by &&
                          !req.removed_by &&
                          !!req.membership_created_at && (
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
                <div className="space-y-2 text-left">
                  {sortedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                        {m.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 truncate">{m.profile?.full_name ?? 'Unknown'}</p>
                          {isMember && (() => {
                            const pres = presences.find((p) => p.user_id === m.user_id);
                            const status = pres ? derivePresenceStatus(pres.last_seen_at) : 'offline';
                            
                            const colorClass = 
                              status === 'online' ? 'bg-emerald-500' :
                              status === 'recently_active' ? 'bg-amber-500' : 'bg-slate-300';
                            
                            const label = 
                              status === 'online' ? 'Online' :
                              status === 'recently_active' ? 'Recently active' : 'Offline';

                            return (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 shrink-0 select-none">
                                <span className={`w-1.5 h-1.5 rounded-full ${colorClass} ${status === 'online' ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] text-slate-400 font-normal">{label}</span>
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {m.profile?.department} · {m.profile?.year_of_study}
                          {isMember && (() => {
                            const pres = presences.find((p) => p.user_id === m.user_id);
                            if (!pres) return null;
                            const status = derivePresenceStatus(pres.last_seen_at);
                            return (
                              <span className="text-[10px] text-slate-400 font-normal block sm:inline sm:ml-2">
                                • Last seen: {status === 'online' ? 'just now' : formatRelativeTime(pres.last_seen_at)}
                              </span>
                            );
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Member Resource Statistics */}
                        {isMember && (() => {
                          const stats = memberStats[m.user_id] || { sharedCount: 0, verifiedCount: 0, pendingCount: 0, rejectedCount: 0 };
                          return (
                            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-extrabold text-slate-500 bg-white border border-slate-200/80 px-2 py-1 rounded-lg mr-1 shadow-xs shrink-0 select-none">
                              <span className="text-slate-600">Shared: {stats.sharedCount}</span>
                              <span className="text-slate-350">|</span>
                              <span className="text-emerald-600">V: {stats.verifiedCount}</span>
                              <span className="text-slate-355">|</span>
                              <span className="text-amber-600">P: {stats.pendingCount}</span>
                              <span className="text-slate-355">|</span>
                              <span className="text-rose-600">R: {stats.rejectedCount}</span>
                            </div>
                          );
                        })()}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.role === 'owner' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {m.role === 'owner' ? '👑 Owner' : 'Member'}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden lg:block">Joined {formatDate(m.joined_at)}</span>
                        {isOwner && m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMemberClick(m.user_id, m.profile?.full_name ?? 'Unknown')}
                            disabled={submittingRemove}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 font-semibold text-[10px] rounded-lg transition-colors flex items-center gap-1 focus:outline-none shrink-0 active:scale-95 disabled:opacity-50"
                            id={`remove-member-${m.user_id}`}
                          >
                            ❌ Remove
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
                            {resourceForm.url && (() => {
                              const check = runResourceLinkSafetyCheck(resourceForm.url);
                              return (
                                <div className={`mt-1.5 p-2 rounded-lg border text-[10px] leading-relaxed text-left font-sans ${
                                  check.isSafe 
                                    ? check.warning 
                                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                      : 'bg-indigo-50/55 border-indigo-100 text-indigo-750'
                                    : 'bg-rose-50 border-rose-250 text-rose-800'
                                }`}>
                                  <p className="font-extrabold flex items-center gap-1 mb-0.5">
                                    <span>{check.isSafe ? check.warning ? '⚠️' : '🛡️' : '❌'}</span>
                                    <span>Format Safety Review:</span>
                                  </p>
                                  <p className="opacity-95">{check.isSafe ? check.warning || 'URL conforms to secure HTTPS standards and contains no dangerous signatures.' : check.reason}</p>
                                  <p className="text-[9px] text-slate-450 mt-1 italic border-t border-slate-200/50 pt-1">
                                    Basic automated check only. Please manually verify before trusting.
                                  </p>
                                </div>
                              );
                            })()}
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

                {/* Owner's Resource Verification Queue Section */}
                {isOwner && (
                  <div className="bg-indigo-50/50 border border-indigo-150 rounded-2xl p-5 space-y-4 text-left shadow-sm mt-4 font-sans">
                    <div className="flex items-center justify-between border-b border-indigo-150 pb-2">
                      <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <span>🛡️</span> Resource Verification Queue ({verificationQueue.length})
                      </h4>
                      <span className="text-[9px] text-indigo-600 font-bold bg-indigo-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Owner Console</span>
                    </div>

                    {verificationQueue.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-6 bg-white/60 rounded-xl border border-slate-100">
                        No resources waiting for verification.
                      </p>
                    ) : (
                      <>
                        {/* Safety Disclaimer */}
                        <p className="text-[10px] text-slate-500 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-200">
                          ⚠️ <span className="font-semibold text-slate-700">Disclaimer:</span> Automated link reviews are basic. Please manually inspect each shared file or URL before approving to maintain study group integrity and prevent spam or malicious content.
                        </p>

                        <div className="space-y-3">
                          {verificationQueue.map((r) => {
                            const check = r.url ? runResourceLinkSafetyCheck(r.url) : { isSafe: true };
                            return (
                              <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-bold text-slate-800">{r.title}</span>
                                      <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-500 capitalize">{r.resource_type}</span>
                                      {r.file_path && (
                                        <span className="text-[9px] px-1.5 py-0.2 bg-indigo-55 text-indigo-600 border border-indigo-100 rounded font-bold">
                                          💾 File
                                        </span>
                                      )}
                                      {r.verification_status === 'rejected' && (
                                        <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 border border-rose-200 rounded text-rose-700 font-bold uppercase">
                                          Rejected
                                        </span>
                                      )}
                                    </div>
                                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                                    <p className="text-[10px] text-slate-400">
                                      Uploaded by <span className="font-semibold text-slate-650">{r.uploader_profile?.full_name ?? 'Unknown'}</span> · {formatRelativeTime(r.created_at)}
                                    </p>
                                  </div>

                                  <div className="flex gap-2 flex-shrink-0">
                                    {r.file_path ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handlePreviewResource(r)}
                                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-150 transition-colors"
                                        >
                                          👁️ Preview
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadResource(r)}
                                          className="text-[10px] font-bold text-slate-600 hover:text-slate-850 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
                                        >
                                          ⬇️ Download
                                        </button>
                                      </>
                                    ) : r.url ? (
                                      <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-150 transition-colors block"
                                      >
                                        🔗 Open URL
                                      </a>
                                    ) : null}
                                  </div>
                                </div>

                                {/* Safety Checks for Links */}
                                {r.url && (
                                  <div className={`p-2.5 rounded-xl border text-[10px] leading-relaxed space-y-1 ${
                                    check.isSafe 
                                      ? check.warning 
                                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                        : 'bg-emerald-50/50 border-emerald-150 text-emerald-800' 
                                      : 'bg-rose-50 border-rose-200 text-rose-800'
                                  }`}>
                                    <p className="font-bold flex items-center gap-1">
                                      <span>{check.isSafe ? check.warning ? '⚠️' : '🛡️' : '❌'}</span>
                                      <span>Safety Check: {check.isSafe ? check.warning ? 'Warning' : 'Verified Secure Format' : 'Blocked'}</span>
                                    </p>
                                    <p className="opacity-95">{check.isSafe ? check.warning || 'URL conforms to secure HTTPS standards and contains no executable extension signatures.' : check.reason}</p>
                                  </div>
                                )}

                                {/* Rejection Context Display */}
                                {r.verification_status === 'rejected' && r.rejection_reason && (
                                  <div className="bg-rose-50/60 text-rose-900 border border-rose-150 text-[10px] p-2.5 rounded-xl">
                                    <span className="font-bold">Prior Rejection Reason:</span> "{r.rejection_reason}"
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRejectDialog(r.id)}
                                    className="flex-1 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
                                  >
                                    ❌ Decline & Reject
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyResource(r.id, false)}
                                    className="flex-1 py-1.5 text-xs font-semibold text-indigo-750 bg-indigo-55 hover:bg-indigo-100 rounded-lg border border-indigo-150 transition-colors"
                                  >
                                    ✅ Approve Only
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyResource(r.id, true)}
                                    className="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                                  >
                                    ⭐ Approve & Recommend
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Owner's Rejected Resource History Section */}
                {isOwner && rejectedResources.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-left shadow-sm mt-4 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectedHistory(!showRejectedHistory)}
                        className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide focus:outline-none"
                      >
                        <span>📜</span> Rejected Resource History ({rejectedResources.length}) {showRejectedHistory ? '▼' : '▶'}
                      </button>
                      <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Owner History</span>
                    </div>

                    {showRejectedHistory && (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {rejectedResources.map((r: LearningCircleResource) => (
                          <div key={r.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-slate-800">{r.title}</span>
                                <span className="ml-2 text-[9px] px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-500 capitalize">{r.resource_type}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Rejected {formatRelativeTime(r.rejected_at || r.updated_at)}</span>
                            </div>
                            {r.description && <p className="text-slate-500 italic">"{r.description}"</p>}
                            <div className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-rose-800 text-[10px]">
                              <span className="font-bold">Rejection Reason:</span> "{r.rejection_reason || 'N/A'}"
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                              <span>Uploader: <span className="font-semibold text-slate-600">{r.uploader_profile?.full_name ?? 'Unknown'}</span></span>
                              {r.url ? (
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                  View Link
                                </a>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Member's Own Submitted Resources Section */}
                {isMember && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-left shadow-sm mt-4 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <span>📤</span> My Submitted Resources ({mySubmittedResources.length})
                      </h4>
                      <p className="text-[10px] text-slate-400">Track verification status of your shared materials.</p>
                    </div>

                    {mySubmittedResources.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-6 bg-white rounded-xl border border-slate-150">
                        You have not submitted resources yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {mySubmittedResources.map((r) => {
                          const check = r.url ? runResourceLinkSafetyCheck(r.url) : { isSafe: true };
                          return (
                            <div key={r.id} className="p-3 bg-white border border-slate-150 rounded-xl hover:shadow-xs transition-all flex items-start justify-between gap-3 text-xs">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800 truncate block max-w-[200px] sm:max-w-xs">{r.title}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-500 capitalize">{r.resource_type}</span>
                                  {r.file_path && (
                                    <span className="text-[9px] px-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-500">{formatBytes(r.file_size_bytes)}</span>
                                  )}
                                </div>
                                {r.description && <p className="text-[10px] text-slate-500 truncate">{r.description}</p>}
                                {r.url && <p className="text-[9px] text-indigo-600 truncate">{r.url}</p>}

                                {/* Safety warning if applicable */}
                                {r.url && check.warning && (
                                  <p className="text-[9px] text-amber-600 font-medium bg-amber-50/50 p-1.5 rounded-md border border-amber-100/60 leading-normal max-w-md">
                                    ⚠️ {check.warning}
                                  </p>
                                )}

                                {/* Rejection reason details */}
                                {r.verification_status === 'rejected' && r.rejection_reason && (
                                  <div className="bg-rose-50 text-rose-800 text-[10px] p-2 rounded-lg border border-rose-100/70 leading-normal mt-1">
                                    <span className="font-bold">Rejection Reason:</span> "{r.rejection_reason}"
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {r.verification_status === 'verified' && (
                                  <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-250 text-emerald-800 text-[9px] font-extrabold rounded-full">
                                    ✅ Verified
                                  </span>
                                )}
                                {r.verification_status === 'pending_verification' && (
                                  <span className="px-2 py-0.5 bg-amber-100 border border-amber-250 text-amber-800 text-[9px] font-extrabold rounded-full animate-pulse">
                                    ⏳ Pending Verification
                                  </span>
                                )}
                                {r.verification_status === 'rejected' && (
                                  <span className="px-2 py-0.5 bg-rose-100 border border-rose-250 text-rose-800 text-[9px] font-extrabold rounded-full">
                                    ❌ Rejected
                                  </span>
                                )}

                                {/* Delete action */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteResource(r.id)}
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors active:scale-95"
                                  title="Delete submitted resource"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Resource List */}
                {loadingResources ? (
                  <LoadingSpinner label="Loading resources…" />
                ) : resources.length === 0 ? (
                  <EmptyState icon="📚" message="No verified resources yet." />
                ) : (() => {
                  const displayedResources = resources.slice(0, resourceLimit);
                  return (
                    <div className="space-y-3 mt-4 text-left font-sans">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">
                        📖 Main Library Resources
                      </h4>
                      {displayedResources.map((r) => (
                        <div key={r.id} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
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
                            <div className="flex items-center gap-2 flex-wrap text-[10px]">
                              {r.file_path ? (
                                <button
                                  type="button"
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
                                <p className="text-sm font-semibold text-slate-900 truncate">{r.title}</p>
                              )}
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-650 rounded font-medium">{r.resource_type}</span>
                              {r.file_path && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded font-semibold">
                                  💾 {formatBytes(r.file_size_bytes)}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded shadow-xs flex items-center gap-0.5">
                                ✅ Verified by Owner
                              </span>
                              {r.is_pinned && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white font-extrabold rounded shadow-sm flex items-center gap-0.5">
                                  📌 Pinned
                                </span>
                              )}
                              {r.owner_recommended && (
                                <span className="px-1.5 py-0.5 bg-indigo-600 text-white font-bold rounded shadow-xs flex items-center gap-0.5">
                                  ⭐ Owner Recommended
                                </span>
                              )}
                            </div>
                            {r.description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.description}</p>}
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
                                    type="button"
                                    onClick={() => handlePreviewResource(r)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-0.5 rounded transition-colors"
                                  >
                                    👁️ Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadResource(r)}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-850 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded transition-colors"
                                  >
                                    ⬇️ Download
                                  </button>
                                </>
                              )}

                              {/* Like / Unlike (Member / Owner Only) */}
                              <button
                                type="button"
                                onClick={() => handleToggleLike(r.id)}
                                className={`text-[10px] px-2 py-0.5 font-bold rounded border transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
                                  r.liked_by_me
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-250 hover:bg-indigo-100'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-750'
                                }`}
                                id={`like-resource-${r.id}`}
                              >
                                <span>{r.liked_by_me ? '❤️' : '🤍'}</span>
                                <span>👍 {r.likes_count ?? 0} likes</span>
                              </button>

                              {/* Pin / Unpin (Owner Only) */}
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(r.id)}
                                  className={`text-[10px] px-2 py-0.5 font-bold rounded border transition-all shrink-0 active:scale-95 ${
                                    r.is_pinned
                                      ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-750'
                                  }`}
                                  id={`pin-resource-${r.id}`}
                                >
                                  {r.is_pinned ? '📌 Unpin' : '📌 Pin'}
                                </button>
                              )}

                              {/* Recommend / Unrecommend (Owner Only) */}
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRecommend(r.id)}
                                  className={`text-[10px] px-2 py-0.5 font-bold rounded border transition-all shrink-0 active:scale-95 ${
                                    r.owner_recommended
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-755'
                                  }`}
                                  id={`recommend-resource-${r.id}`}
                                >
                                  {r.owner_recommended ? '⭐ Owner Recommended' : '⭐ Owner Recommend'}
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
          <div className="space-y-6">
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
                {/* 1. Discussion Stats Panels */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-xs text-left">
                    <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Total Posts</p>
                    <p className="text-xl font-black text-indigo-900 mt-0.5">{discStats.totalPosts}</p>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl shadow-xs text-left">
                    <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Open Questions</p>
                    <p className="text-xl font-black text-amber-900 mt-0.5">{discStats.openQuestions}</p>
                  </div>
                  <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl shadow-xs text-left">
                    <p className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Announcements</p>
                    <p className="text-xl font-black text-rose-900 mt-0.5">{discStats.announcementsCount}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl shadow-xs text-left">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider font-extrabold">Active Replies</p>
                    <p className="text-xl font-black text-emerald-900 mt-0.5">{discStats.totalReplies}</p>
                  </div>
                </div>

                {/* 2. Controls, Search, Filter Memory (Requirement 6, 8) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">🔍</span>
                      <input
                        type="text"
                        placeholder="Search posts..."
                        value={discFilters.search}
                        onChange={(e) => setDiscFilters((prev) => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-250 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        id="search-posts-input"
                      />
                    </div>

                    {/* Post Type Selector */}
                    <select
                      value={discFilters.post_type}
                      onChange={(e) => setDiscFilters((prev) => ({ ...prev, post_type: e.target.value as CirclePostType | 'All' }))}
                      className="px-2 py-1.5 rounded-lg border border-slate-250 bg-white text-xs text-slate-750 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      id="filter-post-type"
                    >
                      <option value="All">All Types</option>
                      <option value="discussion">📢 Discussions</option>
                      <option value="question">❓ Questions</option>
                      <option value="announcement">📣 Announcements</option>
                      <option value="study_plan">📅 Study Plans</option>
                    </select>

                    {/* Resolved question filter toggle */}
                    {discFilters.post_type === 'question' && (
                      <select
                        value={discFilters.resolved === null ? 'all' : discFilters.resolved ? 'resolved' : 'unresolved'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDiscFilters((prev) => ({
                            ...prev,
                            resolved: val === 'all' ? null : val === 'resolved',
                          }));
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-250 bg-white text-xs text-slate-750 font-medium focus:outline-none"
                        id="filter-question-resolved"
                      >
                        <option value="all">All Questions</option>
                        <option value="unresolved">❓ Open / Unresolved</option>
                        <option value="resolved">✅ Resolved Only</option>
                      </select>
                    )}

                    {/* Mine checkbox button */}
                    <button
                      type="button"
                      onClick={() => setDiscFilters((prev) => ({ ...prev, mine: !prev.mine }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        discFilters.mine
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'
                      }`}
                      id="toggle-my-posts-filter"
                    >
                      👤 My Posts
                    </button>

                    {/* Reset Filters button — shown only when filters are active */}
                    {(discFilters.search || discFilters.post_type !== 'All' || discFilters.mine || discFilters.resolved !== null) && (
                      <button
                        type="button"
                        onClick={() => setDiscFilters({ post_type: 'All', search: '', mine: false, resolved: null })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition flex items-center gap-1"
                        id="reset-discussion-filters"
                        title="Clear all filters"
                      >
                        ✕ Reset
                      </button>
                    )}
                  </div>

                  {/* Create Trigger */}
                  {!isArchived && !isPaused && (
                    <button
                      type="button"
                      onClick={() => setShowNewPostModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 select-none active:scale-95"
                      id="trigger-new-post-modal"
                    >
                      ➕ New Post
                    </button>
                  )}
                </div>

                {/* Active Filter Chips */}
                {(discFilters.search || discFilters.post_type !== 'All' || discFilters.mine || discFilters.resolved !== null) && (
                  <div className="flex flex-wrap gap-1.5 -mt-2">
                    {discFilters.search && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition"
                        onClick={() => setDiscFilters((prev) => ({ ...prev, search: '' }))}
                        title="Clear search"
                      >
                        🔍 "{discFilters.search}" ✕
                      </span>
                    )}
                    {discFilters.post_type !== 'All' && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer hover:bg-slate-200 transition"
                        onClick={() => setDiscFilters((prev) => ({ ...prev, post_type: 'All' }))}
                        title="Clear type filter"
                      >
                        {discFilters.post_type === 'study_plan' ? '📅 Study Plan' : discFilters.post_type} ✕
                      </span>
                    )}
                    {discFilters.mine && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition"
                        onClick={() => setDiscFilters((prev) => ({ ...prev, mine: false }))}
                        title="Clear my posts filter"
                      >
                        👤 My Posts ✕
                      </span>
                    )}
                    {discFilters.resolved !== null && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition"
                        onClick={() => setDiscFilters((prev) => ({ ...prev, resolved: null }))}
                        title="Clear resolved filter"
                      >
                        {discFilters.resolved ? '✅ Resolved' : '❓ Unresolved'} ✕
                      </span>
                    )}
                  </div>
                )}

                {/* Status Notice for Paused/Archived Circles (Requirement 10) */}
                {(isArchived || isPaused) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-xl text-left flex items-center gap-2">
                    <span>🔒 Discussions are read-only because this circle is currently {circle.status}.</span>
                  </div>
                )}

                {/* 3. Render Post Cards */}
                {loadingPosts ? (
                  <LoadingSpinner label="Loading discussions…" />
                ) : posts.length === 0 ? (
                  <div className="py-12 border border-slate-150 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <span className="text-4xl">💬</span>
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm">No discussions found</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {discFilters.search
                          ? 'Try adjusting your search keywords.'
                          : discFilters.post_type !== 'All'
                          ? `No ${discFilters.post_type === 'study_plan' ? 'study plan' : discFilters.post_type} posts exist yet.`
                          : 'Be the first to publish a post in this circle!'}
                      </p>
                    </div>
                  </div>
) : (
                  <div className="space-y-3">
                    {/* Show more/fewer pagination — default 3, expand on click */}
                    {(showAllPosts ? posts : posts.slice(0, 3)).map((p) => {
                      const isPostOwner = p.created_by === currentUserId;
                      const isPostAnnouncement = p.post_type.toLowerCase() === 'announcement' || p.post_type === 'Announcement';
                      const isPostQuestion = p.post_type.toLowerCase() === 'question' || p.post_type === 'Question';
                      
                      // Derive if author is currently online (Phase 5.6 ADD-ON D)
                      const authorPres = presences.find((pr) => pr.user_id === p.created_by);
                      const isAuthorOnline = authorPres ? derivePresenceStatus(authorPres.last_seen_at) === 'online' : false;

                      // Check soft deleted state
                      if (p.deleted_at) {
                        // Distinguish self-delete vs owner moderation
                        const selfDeleted = p.deleted_by === p.created_by;
                        return (
                          <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-between text-left">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                              <span>🚫</span>
                              <span>{selfDeleted ? 'This post was deleted.' : 'This post was removed by the owner.'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal">{formatRelativeTime(p.deleted_at)}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={p.id}
                          className={`p-5 rounded-xl border text-left bg-white transition-all shadow-xs relative overflow-hidden ${
                            isPostAnnouncement
                              ? 'border-rose-300 bg-gradient-to-br from-rose-50/20 to-white hover:border-rose-400 shadow-sm'
                              : p.is_pinned
                              ? 'border-indigo-300 hover:border-indigo-400 bg-gradient-to-br from-indigo-50/10 to-white'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Announcement Golden Top Glow Line */}
                          {isPostAnnouncement && p.is_pinned && (
                            <div className="absolute top-0 inset-x-0 h-1 bg-rose-500" />
                          )}

                          {/* Post Header Card */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 shadow-inner relative">
                                {p.author_profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                                
                                {/* 🟢 Small online status dot (Presence Add-on) */}
                                {isAuthorOnline && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse" title="Author is currently online" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800">{p.author_profile?.full_name ?? 'Unknown'}</span>
                                  {/* 👑 Owner Badge */}
                                  {isUserOwner(p.created_by) && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0" title="Circle Owner">
                                      👑 Owner
                                    </span>
                                  )}
                                  {/* You Badge */}
                                  {p.created_by === currentUserId && !isUserOwner(p.created_by) && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                                      You
                                    </span>
                                  )}
                                  {p.is_pinned && (
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5 shrink-0 select-none">
                                      📌 Pinned
                                    </span>
                                  )}
                                  {isPostQuestion && (
                                    <span
                                      className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 select-none border ${
                                        p.is_resolved
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {p.is_resolved ? '✅ Resolved' : '❓ Open Question'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                  <span>{formatRelativeTime(p.created_at)}</span>
                                  {p.edited_at && (
                                    <span className="text-slate-350 bg-slate-100 px-1 rounded" title={`Edited ${formatRelativeTime(p.edited_at)}`}>
                                      (edited)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Badges / Microcopy */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`px-2 py-0.5 text-[9px] rounded-full border font-bold uppercase ${POST_TYPE_COLOR[p.post_type]}`}>
                                {POST_TYPE_ICON[p.post_type]} {p.post_type === 'study_plan' ? 'Study Plan' : p.post_type}
                              </span>
                            </div>
                          </div>

                          {/* Post Content Body */}
                          <div className="space-y-2 mb-4 pr-1">
                            <h3 className="font-bold text-sm text-slate-800 leading-snug">{p.title || 'Untitled Post'}</h3>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{p.body || p.content}</p>
                            
                            {/* Rendering tags */}
                            {p.tags && p.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {p.tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    onClick={() => setDiscFilters((prev) => ({ ...prev, search: t }))}
                                    className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-700 rounded-lg cursor-pointer transition"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Post Controls Footer */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              {/* Helpful Reaction Button */}
                              <button
                                onClick={() => handleToggleHelpful(p.id)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                                  p.reacted_by_me
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs animate-pulse'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                                title="Mark as helpful"
                                id={`helpful-post-${p.id}`}
                              >
                                <span>{p.reacted_by_me ? '❤️' : '👍'}</span>
                                <span className="font-extrabold">{p.helpful_count ?? 0}</span>
                                <span className="text-[10px] font-normal hidden sm:inline">Helpful</span>
                              </button>

                              {/* Comments Collapsible Toggle */}
                              <button
                                onClick={async () => {
                                  if (expandedPostId === p.id) {
                                    setExpandedPostId(null);
                                  } else {
                                    setExpandedPostId(p.id);
                                    await handleLoadReplies(p.id);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                                  expandedPostId === p.id
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                                id={`toggle-replies-${p.id}`}
                              >
                                <span>💬</span>
                                <span className="font-extrabold">{p.replies_count ?? 0}</span>
                                <span className="text-[10px] font-normal hidden sm:inline">
                                  {expandedPostId === p.id ? 'Hide Comments' : 'Comments'}
                                </span>
                              </button>
                            </div>

                            {/* Owner / Author moderation controls */}
                            <div className="flex items-center gap-1.5">
                              {/* Resolve/Reopen Questions controls */}
                              {isPostQuestion && (isPostOwner || isOwner) && !isArchived && !isPaused && (
                                <button
                                  onClick={() => handleToggleResolved(p.id)}
                                  className={`px-2 py-1 border text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 focus:outline-none ${
                                    p.is_resolved
                                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                                  }`}
                                  title={p.is_resolved ? 'Reopen question' : 'Mark question as solved'}
                                  id={`resolve-btn-${p.id}`}
                                >
                                  {p.is_resolved ? '❓ Reopen' : '✅ Solve'}
                                </button>
                              )}

                              {/* Owner pin control */}
                              {isOwner && !isArchived && !isPaused && (
                                <button
                                  onClick={() => handleTogglePostPin(p.id)}
                                  className={`p-1 border rounded-lg transition ${
                                    p.is_pinned
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-indigo-600 hover:bg-indigo-50'
                                  }`}
                                  title={p.is_pinned ? 'Unpin post' : 'Pin post to circle top'}
                                  id={`pin-post-btn-${p.id}`}
                                >
                                  📌
                                </button>
                              )}

                              {/* Author edit control */}
                              {isPostOwner && !isArchived && !isPaused && (
                                <button
                                  onClick={() => {
                                    setEditingPost(p);
                                    setEditingPostForm({
                                      title: p.title || '',
                                      body: p.body || p.content || '',
                                      tagsString: p.tags?.join(', ') || '',
                                    });
                                  }}
                                  className="p-1 border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Edit post"
                                  id={`edit-post-${p.id}`}
                                >
                                  ✏️
                                </button>
                              )}

                              {/* Author or owner delete control */}
                              {(isPostOwner || isOwner) && !isArchived && !isPaused && (
                                <button
                                  onClick={() => handleSoftDeletePost(p.id)}
                                  className="p-1 border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Remove post"
                                  id={`delete-post-${p.id}`}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 4. Replies Collapsible Drawer */}
                          {expandedPostId === p.id && (
                            <div className="mt-4 border-t border-slate-100 pt-4 space-y-3 bg-slate-50/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-xl border-x-0 border-b-0">
                              <h4 className="text-xs font-bold text-slate-500 text-left uppercase tracking-wider mb-2">Comments</h4>
                              
                              {/* Replies lists */}
                              {loadingRepliesPostId === p.id ? (
                                <LoadingSpinner label="Loading comments..." />
                              ) : !repliesByPost[p.id] || repliesByPost[p.id].length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2 text-left">No comments yet. Start the conversation!</p>
                              ) : (
                                <div className="space-y-2">
                                  {repliesByPost[p.id].map((r) => {
                                    const isReplyAuthor = r.created_by === currentUserId;
                                    const replyPres = presences.find((pr) => pr.user_id === r.created_by);
                                    const isReplyAuthorOnline = replyPres ? derivePresenceStatus(replyPres.last_seen_at) === 'online' : false;

                                    if (r.deleted_at) {
                                      return (
                                        <div key={r.id} className="p-2 border border-slate-150 border-dashed rounded-lg bg-white/70 text-left text-[11px] text-slate-400 font-semibold italic flex items-center justify-between">
                                          <span>🚫 Comment removed.</span>
                                          <span>{formatRelativeTime(r.deleted_at)}</span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={r.id} className="p-3 bg-white border border-slate-200/80 rounded-lg flex items-start gap-2.5 text-left relative shadow-xs group transition hover:border-slate-300">
                                        <div className="w-6.5 h-6.5 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-[10px] shrink-0 relative">
                                          {r.author_profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                                          {isReplyAuthorOnline && (
                                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white animate-pulse" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-bold text-slate-800">{r.author_profile?.full_name ?? 'Unknown'}</span>
                                            {/* 👑 Owner/You badges for replies */}
                                            {isUserOwner(r.created_by) && (
                                              <span className="text-[8px] font-black px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0" title="Circle Owner">
                                                👑 Owner
                                              </span>
                                            )}
                                            {r.created_by === currentUserId && !isUserOwner(r.created_by) && (
                                              <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                                                You
                                              </span>
                                            )}
                                            <span className="text-[9px] text-slate-400">{formatRelativeTime(r.created_at)}</span>
                                            {r.edited_at && <span className="text-[8px] bg-slate-100 text-slate-400 px-0.5 rounded">(edited)</span>}
                                          </div>
                                          
                                          {/* Reply edit state */}
                                          {editingReply?.id === r.id ? (
                                            <form
                                              onSubmit={handleUpdateReplySubmit}
                                              className="mt-1 space-y-1.5"
                                            >
                                              <textarea
                                                value={editingReplyBody}
                                                onChange={(e) => setEditingReplyBody(e.target.value)}
                                                rows={2}
                                                className="w-full px-2.5 py-1.5 border border-indigo-200 rounded-md text-xs focus:outline-none bg-white text-slate-700 text-left"
                                              />
                                              <div className="flex justify-end gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingReply(null)}
                                                  className="px-2 py-1 text-[10px] font-semibold text-slate-500 bg-white border border-slate-250 rounded hover:bg-slate-50"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="submit"
                                                  className="px-2.5 py-1 text-[10px] font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700"
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </form>
                                          ) : (
                                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                                          )}
                                        </div>

                                        {/* Reply Actions: helpful reaction + edit/delete */}
                                        {editingReply?.id !== r.id && (
                                          <div className="flex items-center gap-1.5 self-start ml-2 shrink-0">
                                            {/* Helpful reaction for reply */}
                                            <button
                                              onClick={() => handleToggleReplyHelpful(r.id, p.id)}
                                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold transition active:scale-95 ${
                                                r.reacted_by_me
                                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                              }`}
                                              title={r.reacted_by_me ? 'Remove helpful reaction' : 'Mark as helpful'}
                                              id={`helpful-reply-${r.id}`}
                                            >
                                              <span>{r.reacted_by_me ? '❤️' : '👍'}</span>
                                              <span>{r.helpful_count ?? 0}</span>
                                            </button>

                                            {/* Edit/Delete — shown on hover for author/owner */}
                                            {!isArchived && !isPaused && (isReplyAuthor || isOwner) && (
                                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
                                                {isReplyAuthor && (
                                                  <button
                                                    onClick={() => {
                                                      setEditingReply(r);
                                                      setEditingReplyBody(r.body);
                                                    }}
                                                    className="p-0.5 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-slate-400 hover:text-indigo-600 rounded transition"
                                                    title="Edit comment"
                                                    id={`edit-comment-${r.id}`}
                                                  >
                                                    ✏️
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleDeleteReply(r.id, p.id)}
                                                  className="p-0.5 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded transition"
                                                  title="Delete comment"
                                                  id={`delete-comment-${r.id}`}
                                                >
                                                  🗑️
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Comment Inline Composer */}
                              {!isArchived && !isPaused && (
                                <div className="flex gap-2 items-start pt-2">
                                  <textarea
                                    value={replyInputTexts[p.id] || ''}
                                    onChange={(e) =>
                                      setReplyInputTexts((prev) => ({ ...prev, [p.id]: e.target.value }))
                                    }
                                    placeholder="Write a comment..."
                                    rows={1}
                                    className="flex-1 px-3 py-1.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none text-left"
                                  />
                                  <button
                                    onClick={() => handleAddReplySubmit(p.id)}
                                    disabled={submittingReplyPostId === p.id || !(replyInputTexts[p.id] || '').trim()}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition active:scale-95 shrink-0"
                                    id={`submit-reply-${p.id}`}
                                  >
                                    {submittingReplyPostId === p.id ? 'Sending...' : 'Reply'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Show more/fewer toggle */}
                    {posts.length > 3 && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAllPosts((prev) => !prev)}
                          className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-indigo-700 font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 focus:outline-none active:scale-95"
                          id="toggle-show-all-posts"
                        >
                          {showAllPosts
                            ? '➖ Show fewer discussions'
                            : `➕ Show more discussions (${posts.length - 3} more)`}
                        </button>
                      </div>
                    )}
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

      {/* Owner Remove Member Modal */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-1.5">
                <span>🚫</span> Remove Member: {removingMember.name}
              </h3>
              <button
                onClick={() => setRemovingMember(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleRemoveMemberSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed bg-rose-50/50 text-rose-900 border border-rose-105 p-3 rounded-xl">
                ⚠️ Removing this student will instantly revoke their access to the workspace. They will lose access to shared notes and coordinates immediately.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for removal <span className="text-rose-500">*</span></label>
                <select
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option>Inactive member</option>
                  <option>Inappropriate behavior</option>
                  <option>Resource misuse</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Context / message <span className="text-slate-400 font-normal">(visible to removed member)</span></label>
                <textarea
                  rows={3}
                  value={removeMessage}
                  onChange={(e) => setRemoveMessage(e.target.value)}
                  placeholder="Provide context explaining the removal..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white text-left"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRemovingMember(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRemove}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                  id="confirm-remove-btn"
                >
                  {submittingRemove ? 'Removing…' : '🚫 Remove Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionResourceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-1.5">
                <span>❌</span> Decline Study Material
              </h3>
              <button
                onClick={() => setRejectionResourceId(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleRejectResourceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Why are you declining this resource? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="Explain why this resource is being declined (e.g. Broken link, duplicated slides, invalid course contents...) - minimum 5 characters."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white text-left"
                />
                <p className="text-[10px] text-slate-450 mt-1.5 leading-normal">This feedback message will be privately visible to the uploader so they can review, fix, and resubmit.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectionResourceId(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRejection || rejectionReasonText.trim().length < 5}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                  id="confirm-decline-resource-btn"
                >
                  {submittingRejection ? 'Declining…' : 'Decline Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. New Post Composer Modal (Requirement 1, 7) */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>➕</span> Create New Discussion Post
              </h3>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 space-y-4">
              {/* Type picking */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Post Category <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPostForm((prev) => ({ ...prev, post_type: 'discussion' }))}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                      newPostForm.post_type === 'discussion'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📢 Discussion
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPostForm((prev) => ({ ...prev, post_type: 'question' }))}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                      newPostForm.post_type === 'question'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ❓ Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPostForm((prev) => ({ ...prev, post_type: 'study_plan' }))}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition ${
                      newPostForm.post_type === 'study_plan'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📅 Study Plan
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setNewPostForm((prev) => ({ ...prev, post_type: 'announcement' }))}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition col-span-2 sm:col-span-1 ${
                        newPostForm.post_type === 'announcement'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      📣 Announcement
                    </button>
                  )}
                </div>
              </div>

              {/* Title input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Post Title <span className="text-rose-500">*</span></label>
                  <span className={`text-[10px] font-semibold ${newPostForm.title.trim().length >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {newPostForm.title.trim().length}/100 chars (min 3)
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  value={newPostForm.title}
                  onChange={(e) => setNewPostForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your question or discussion topic..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 text-left"
                  required
                />
              </div>

              {/* Body input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Detailed Message <span className="text-rose-500">*</span></label>
                  <span className={`text-[10px] font-semibold ${newPostForm.body.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {newPostForm.body.trim().length}/1000 chars (min 5)
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={newPostForm.body}
                  onChange={(e) => setNewPostForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Provide context, references, questions, or updates..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white text-slate-800 text-left"
                  required
                />
              </div>

              {/* Tags input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags <span className="text-slate-400 font-normal">(comma separated, max 5)</span></label>
                <input
                  type="text"
                  value={newPostForm.tagsString}
                  onChange={(e) => setNewPostForm((prev) => ({ ...prev, tagsString: e.target.value }))}
                  placeholder="e.g. revision, arrays, midterm"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 text-left"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {newPostForm.tagsString
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0)
                    .slice(0, 5)
                    .map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                        #{tag}
                      </span>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost || newPostForm.title.trim().length < 3 || newPostForm.body.trim().length < 5}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition shadow-sm"
                  id="confirm-create-post-btn"
                >
                  {submittingPost ? 'Publishing…' : '📢 Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Post Composer Modal (Requirement 1, 7) */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>✏️</span> Edit Discussion Post
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleUpdatePost} className="p-6 space-y-4">
              {/* Title input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Post Title <span className="text-rose-500">*</span></label>
                  <span className={`text-[10px] font-semibold ${editingPostForm.title.trim().length >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {editingPostForm.title.trim().length}/100 chars (min 3)
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  value={editingPostForm.title}
                  onChange={(e) => setEditingPostForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your question..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 text-left"
                  required
                />
              </div>

              {/* Body input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Detailed Message <span className="text-rose-500">*</span></label>
                  <span className={`text-[10px] font-semibold ${editingPostForm.body.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {editingPostForm.body.trim().length}/1000 chars (min 5)
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={editingPostForm.body}
                  onChange={(e) => setEditingPostForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Provide details..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white text-slate-800 text-left"
                  required
                />
              </div>

              {/* Tags input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags <span className="text-slate-400 font-normal">(comma separated, max 5)</span></label>
                <input
                  type="text"
                  value={editingPostForm.tagsString}
                  onChange={(e) => setEditingPostForm((prev) => ({ ...prev, tagsString: e.target.value }))}
                  placeholder="e.g. revision, midterm"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 text-left"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingPostForm.title.trim().length < 3 || editingPostForm.body.trim().length < 5}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                  id="confirm-edit-post-btn"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-xl">🗑️</span>
              <h3 className="text-sm font-bold text-slate-800">
                {deleteConfirm.type === 'post' ? 'Remove Post?' : 'Remove Comment?'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-100 text-rose-800">
                {deleteConfirm.type === 'post'
                  ? '⚠️ This will permanently hide the post. A placeholder message will be shown in its place. This action cannot be undone.'
                  : '⚠️ This will permanently remove the comment. This action cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  id="cancel-delete-confirm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm"
                  id="confirm-delete-btn"
                >
                  🗑️ {deleteConfirm.type === 'post' ? 'Remove Post' : 'Remove Comment'}
                </button>
              </div>
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

  // Leave circle custom modal states
  const [leavingCircle, setLeavingCircle] = useState<LearningCircleWithStats | null>(null);
  const [leaveReason, setLeaveReason] = useState('Leaving by choice');
  const [leaveMessage, setLeaveMessage] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

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

  const handleLeaveClick = (circle: LearningCircleWithStats) => {
    if (!userId) return;
    const isOwner = circle.my_role === 'owner' || circle.created_by === userId;
    if (isOwner) {
      toast.error('Leave Failed', 'Owner cannot leave their own circle in MVP. Archive the circle instead.');
      return;
    }
    setLeavingCircle(circle);
    setLeaveReason('Leaving by choice');
    setLeaveMessage('');
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leavingCircle || !userId) return;
    setSubmittingLeave(true);
    try {
      await leaveLearningCircle(leavingCircle.id, userId, {
        leave_reason: leaveReason,
        leave_message: leaveMessage,
      });
      toast.success('Left Circle', `You have left "${leavingCircle.title}".`);
      setLeavingCircle(null);
      await loadAll();
      if (workspaceCircle?.id === leavingCircle.id) {
        setWorkspaceCircle(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not leave circle.';
      toast.error('Leave Failed', msg);
    } finally {
      setSubmittingLeave(false);
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
    setAllCircles((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
    setMyCircles((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
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
                  const matchingReq = myJoinRequests
                    .filter(r => r.circle_id === circle.id)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                  return (
                    <CircleCard
                      key={circle.id}
                      circle={circle}
                      currentUserId={userId}
                      request={matchingReq || null}
                      onView={handleView}
                      onRequestJoin={handleRequestJoinClick}
                      onCancelRequest={handleCancelRequest}
                      onLeave={handleLeaveClick}
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
                          onLeave={handleLeaveClick}
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
      {/* Leave Circle Modal */}
      {leavingCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-1.5 font-sans">
                <span>🚪</span> Leave Circle: {leavingCircle.title}
              </h3>
              <button
                onClick={() => setLeavingCircle(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed bg-rose-50/50 text-rose-900 border border-rose-100 p-3 rounded-xl">
                ⚠️ Leaving this circle will instantly revoke your access to shared resources, private files, and circle discussions. You can request to join again later.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for leaving <span className="text-rose-500">*</span></label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option>Leaving by choice</option>
                  <option>Completed learning goal</option>
                  <option>No longer interested</option>
                  <option>Scheduling conflict</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Optional message <span className="text-slate-400 font-normal">(visible to owner)</span></label>
                <textarea
                  rows={3}
                  value={leaveMessage}
                  onChange={(e) => setLeaveMessage(e.target.value)}
                  placeholder="Share a short note about your exit with the study circle…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white text-left"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setLeavingCircle(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                  id="confirm-leave-btn"
                >
                  {submittingLeave ? 'Leaving…' : '🚪 Leave Study Circle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
