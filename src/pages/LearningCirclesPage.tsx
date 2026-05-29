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
} from '../types';
import {
  getLearningCircles,
  getMyLearningCircles,
  createLearningCircle,
  updateLearningCircle,
  joinLearningCircle,
  leaveLearningCircle,
  getCircleMembers,
  getCircleResources,
  addCircleResource,
  deleteCircleResource,
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
} from '../lib/learningCircles';

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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const circle = await createLearningCircle({ ...form, created_by: userId });
      const withStats: LearningCircleWithStats = {
        ...circle,
        creator_name: 'You',
        member_count: 1,
        my_role: 'owner',
      };
      toast.success('Circle Created! 🎉', `"${circle.title}" is now live.`);
      onCreated(withStats);
    } catch (err) {
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

// ─── CIRCLE CARD ─────────────────────────────────────────────────────────────

interface CircleCardProps {
  circle: LearningCircleWithStats;
  currentUserId: string;
  onView: (circle: LearningCircleWithStats) => void;
  onJoin: (circle: LearningCircleWithStats) => void;
  onLeave: (circle: LearningCircleWithStats) => void;
}

const CircleCard: React.FC<CircleCardProps> = ({ circle, onView, onJoin, onLeave }) => {
  const isMember = !!circle.my_role;
  const isOwner = circle.my_role === 'owner';
  const isFull = (circle.member_count ?? 0) >= circle.max_members;
  const isArchived = circle.status === 'archived';
  const isPaused = circle.status === 'paused';

  return (
    <div className={`group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${isArchived ? 'opacity-60' : ''}`}>
      {/* Card top accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-70" />

      <div className="p-5 flex flex-col gap-3 flex-1">
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
          {isMember && !isOwner && (
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
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2">
        <button
          onClick={() => onView(circle)}
          className="flex-1 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
          id={`view-circle-${circle.id}`}
        >
          {isMember ? '📂 Open Workspace' : '👁 View Details'}
        </button>
        {!isMember && !isArchived && !isPaused && (
          <button
            onClick={() => onJoin(circle)}
            disabled={isFull}
            className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            id={`join-circle-${circle.id}`}
          >
            {isFull ? 'Full' : '+ Join'}
          </button>
        )}
        {isMember && !isOwner && (
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

type WorkspaceTab = 'overview' | 'members' | 'resources' | 'posts';

interface CircleWorkspaceProps {
  circle: LearningCircleWithStats;
  currentUserId: string;
  onBack: () => void;
  onCircleUpdated: (updated: LearningCircleWithStats) => void;
}

const CircleWorkspace: React.FC<CircleWorkspaceProps> = ({ circle, currentUserId, onBack, onCircleUpdated }) => {
  const toast = useToast();
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [members, setMembers] = useState<LearningCircleMember[]>([]);
  const [resources, setResources] = useState<LearningCircleResource[]>([]);
  const [posts, setPosts] = useState<LearningCirclePost[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);

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

  const isOwner = circle.my_role === 'owner';
  const isMember = !!circle.my_role;
  const isArchived = circle.status === 'archived';
  const isPaused = circle.status === 'paused';

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
  }, [tab, loadMembers, loadResources, loadPosts]);

  // ── Resource Submit ────────────────────────────────────────────────────────
  const validateResource = () => {
    const e: Record<string, string> = {};
    if (!resourceForm.title.trim()) e.title = 'Title is required.';
    if (resourceForm.url && !isValidHttpsUrl(resourceForm.url)) {
      e.url = 'URL must use https:// protocol. Unsafe links are not allowed.';
    }
    setResourceErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddResource = async (ev: React.FormEvent) => {
    ev.preventDefault();
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
      toast.success('Resource Added', 'Study resource shared with the circle.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not share resource.';
      toast.error('Failed', msg);
    } finally {
      setSubmittingResource(false);
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

  // ── Archive Toggle ─────────────────────────────────────────────────────────
  const handleToggleArchive = async () => {
    if (!isOwner) return;
    const newStatus = isArchived ? 'active' : 'archived';
    setArchiving(true);
    try {
      const updated = await updateLearningCircle(circle.id, { status: newStatus });
      const updatedWithStats: LearningCircleWithStats = {
        ...updated,
        creator_name: circle.creator_name,
        member_count: circle.member_count,
        my_role: circle.my_role,
      };
      onCircleUpdated(updatedWithStats);
      toast.success(newStatus === 'archived' ? 'Circle Archived' : 'Circle Restored', newStatus === 'archived' ? 'No new joins or posts allowed.' : 'Circle is active again.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update status.';
      toast.error('Failed', msg);
    } finally {
      setArchiving(false);
    }
  };

  const TABS: { id: WorkspaceTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'members', label: `Members (${circle.member_count ?? '…'})`, icon: '👥' },
    { id: 'resources', label: 'Resources', icon: '📚' },
    { id: 'posts', label: 'Discussion', icon: '💬' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
            <button
              onClick={handleToggleArchive}
              disabled={archiving}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors disabled:opacity-50"
              id="toggle-archive-circle"
            >
              {archiving ? '…' : isArchived ? '♻ Restore' : '📦 Archive'}
            </button>
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
          <div className="space-y-5">
            <div className="prose prose-sm max-w-none">
              <p className="text-slate-700 leading-relaxed">{circle.description}</p>
            </div>
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

            {!isMember && !isArchived && !isPaused && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                <p className="text-sm text-indigo-700 font-medium">You are not a member yet. Join to access resources and discussions.</p>
              </div>
            )}
            {(isArchived || isPaused) && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <p className="text-sm text-amber-700 font-medium">⚠ This circle is {circle.status}. New joins and posts are disabled.</p>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS ── */}
        {tab === 'members' && (
          <div>
            {loadingMembers ? (
              <LoadingSpinner label="Loading members…" />
            ) : members.length === 0 ? (
              <EmptyState icon="👥" message="No members yet." />
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RESOURCES ── */}
        {tab === 'resources' && (
          <div className="space-y-4">
            {isMember && !isArchived && (
              <div>
                {!showResourceForm ? (
                  <button
                    onClick={() => setShowResourceForm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                    id="show-add-resource-form"
                  >
                    + Share a Resource
                  </button>
                ) : (
                  <form onSubmit={handleAddResource} className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
                    <h4 className="text-sm font-semibold text-indigo-800">Share a Study Resource</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Title <span className="text-rose-500">*</span></label>
                        <input
                          id="resource-title"
                          type="text"
                          value={resourceForm.title}
                          onChange={(e) => setResourceForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="e.g., React Hooks Guide"
                          className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${resourceErrors.title ? 'border-rose-400' : 'border-slate-300'}`}
                        />
                        {resourceErrors.title && <p className="text-xs text-rose-500 mt-1">{resourceErrors.title}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
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
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">URL <span className="text-slate-400">(optional, must be https://)</span></label>
                      <input
                        id="resource-url"
                        type="url"
                        value={resourceForm.url}
                        onChange={(e) => setResourceForm((f) => ({ ...f, url: e.target.value }))}
                        placeholder="https://..."
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${resourceErrors.url ? 'border-rose-400' : 'border-slate-300'}`}
                      />
                      {resourceErrors.url && <p className="text-xs text-rose-500 mt-1">{resourceErrors.url}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-slate-400">(optional)</span></label>
                      <input
                        id="resource-description"
                        type="text"
                        value={resourceForm.description}
                        onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Short note about this resource…"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowResourceForm(false)} className="px-4 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors" id="cancel-add-resource">Cancel</button>
                      <button type="submit" disabled={submittingResource} className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors" id="submit-add-resource">
                        {submittingResource ? 'Sharing…' : 'Share Resource'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {loadingResources ? (
              <LoadingSpinner label="Loading resources…" />
            ) : resources.length === 0 ? (
              <EmptyState icon="📚" message="No resources shared yet. Be the first to add one!" />
            ) : (
              <div className="space-y-2">
                {resources.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                    <span className="text-xl flex-shrink-0 mt-0.5">{RESOURCE_TYPE_ICON[r.resource_type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-indigo-700 hover:underline truncate">
                            {r.title}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">{r.resource_type}</span>
                      </div>
                      {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                      <p className="text-[11px] text-slate-400 mt-1">By {r.uploader_profile?.full_name ?? 'Unknown'} · {formatRelativeTime(r.created_at)}</p>
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
              </div>
            )}
          </div>
        )}

        {/* ── POSTS / DISCUSSION ── */}
        {tab === 'posts' && (
          <div className="space-y-4">
            {isMember && !isArchived && (
              <form onSubmit={handleAddPost} className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 space-y-3">
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
          </div>
        )}
      </div>
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterMode, setFilterMode] = useState('');

  // Load data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [all, my] = await Promise.all([
        getLearningCircles(userId || undefined),
        userId ? getMyLearningCircles(userId) : Promise.resolve([]),
      ]);
      setAllCircles(all);
      setMyCircles(my);
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
    const matchCat = !filterCategory || c.category === filterCategory;
    const matchDiff = !filterDifficulty || c.difficulty_level === filterDifficulty;
    const matchMode = !filterMode || c.meeting_mode === filterMode;
    return matchSearch && matchCat && matchDiff && matchMode;
  });

  const handleJoin = async (circle: LearningCircleWithStats) => {
    if (!userId) {
      toast.error('Sign In Required', 'Please sign in to join a learning circle.');
      return;
    }
    try {
      await joinLearningCircle(circle.id, userId);
      toast.success('Joined! 🎉', `Welcome to "${circle.title}"`);
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not join circle.';
      toast.error('Join Failed', msg);
    }
  };

  const handleLeave = async (circle: LearningCircleWithStats) => {
    if (!userId) return;
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
          <div className="flex flex-col sm:flex-row gap-3">
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
              {CIRCLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
          </div>

          {loading ? (
            <LoadingSpinner label="Loading circles…" />
          ) : filteredCircles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <span className="text-5xl">🔍</span>
              <p className="text-base font-medium text-slate-500">No circles found</p>
              <p className="text-sm">Try adjusting your filters or search terms.</p>
              {userId && (
                <button onClick={() => setShowCreate(true)} className="mt-2 px-5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
                  + Create the first one
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{filteredCircles.length} circle{filteredCircles.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCircles.map((circle) => (
                  <CircleCard
                    key={circle.id}
                    circle={circle}
                    currentUserId={userId}
                    onView={handleView}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                  />
                ))}
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
          ) : myCircles.length === 0 ? (
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
                {myCircles.map((circle) => (
                  <CircleCard
                    key={circle.id}
                    circle={circle}
                    currentUserId={userId}
                    onView={handleView}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
