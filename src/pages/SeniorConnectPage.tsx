import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { PublicProfileModal } from '../components/profile/PublicProfileModal';
import { DEPARTMENTS as SHARED_DEPARTMENTS } from '../lib/departments';
import {
  getSeniorMentors,
  updateSeniorMentorProfile,
  createGuidanceRequest,
  getMyGuidanceRequests,
  getSeniorIncomingRequests,
  updateGuidanceRequestStatus,
  MENTOR_TOPICS,
  GUIDANCE_MODES,
} from '../lib/seniorConnect';
import type {
  SeniorMentorProfile,
  SeniorGuidanceRequestWithProfiles,
  SeniorGuidanceStatus,
  GuidanceMode,
} from '../types';

// ──────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────
// Local DEPARTMENTS constant removed, computed dynamically below

const STATUS_STYLES: Record<SeniorGuidanceStatus, string> = {
  pending:   'bg-amber-50   border-amber-200   text-amber-700',
  accepted:  'bg-emerald-50 border-emerald-200 text-emerald-700',
  declined:  'bg-red-50     border-red-200     text-red-700',
  completed: 'bg-indigo-50  border-indigo-200  text-indigo-700',
  cancelled: 'bg-slate-50   border-slate-200   text-slate-500',
};

const STATUS_ICONS: Record<SeniorGuidanceStatus, string> = {
  pending:   '⏳',
  accepted:  '✅',
  declined:  '❌',
  completed: '🎓',
  cancelled: '🚫',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'SS';

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100  text-amber-700',
  'bg-sky-100    text-sky-700',
  'bg-rose-100   text-rose-700',
  'bg-teal-100   text-teal-700',
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// ──────────────────────────────────────────
// AVATAR COMPONENT
// ──────────────────────────────────────────
const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'md' }) => {
  const cls = size === 'lg' ? 'w-14 h-14 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`shrink-0 rounded-full flex items-center justify-center font-bold select-none ${avatarColor(name)} ${cls}`}>
      {getInitials(name)}
    </div>
  );
};

// ──────────────────────────────────────────
// REQUEST GUIDANCE MODAL
// ──────────────────────────────────────────
interface RequestGuidanceModalProps {
  mentor: SeniorMentorProfile;
  currentUserId: string;
  onSubmit: (input: {
    topic: string; message: string; preferred_mode: GuidanceMode; preferred_time: string;
  }) => Promise<void>;
  onClose: () => void;
}

const RequestGuidanceModal: React.FC<RequestGuidanceModalProps> = ({ mentor, currentUserId: _uid, onSubmit, onClose }) => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [message, setMessage] = useState('');
  const [preferredMode, setPreferredMode] = useState<GuidanceMode>('Hybrid');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const finalTopic = topic === 'Other' ? customTopic : topic;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!topic) e.topic = 'Please select a topic.';
    if (topic === 'Other' && !customTopic.trim()) e.customTopic = 'Please enter your topic.';
    if (!message.trim()) e.message = 'Please describe what guidance you need.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit({ topic: finalTopic, message, preferred_mode: preferredMode, preferred_time: preferredTime });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={mentor.full_name} size="sm" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Request Guidance</h3>
              <p className="text-xs text-slate-500">from {mentor.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/70 text-slate-400 flex items-center justify-center transition-colors">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Topic select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Topic *</label>
            <select
              value={topic}
              onChange={(e) => { setTopic(e.target.value); setErrors((p) => ({ ...p, topic: '' })); }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            >
              <option value="">Select a topic…</option>
              {MENTOR_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.topic && <p className="text-xs text-red-600">{errors.topic}</p>}
          </div>

          {/* Custom topic if Other */}
          {topic === 'Other' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Topic *</label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => { setCustomTopic(e.target.value); setErrors((p) => ({ ...p, customTopic: '' })); }}
                placeholder="Describe your topic…"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
              />
              {errors.customTopic && <p className="text-xs text-red-600">{errors.customTopic}</p>}
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Message *</label>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: '' })); }}
              rows={4}
              placeholder="Describe what guidance you need, your current situation, specific questions…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            />
            {errors.message && <p className="text-xs text-red-600">{errors.message}</p>}
          </div>

          {/* Preferred Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Preferred Mode</label>
            <div className="flex gap-2 flex-wrap">
              {GUIDANCE_MODES.map((m) => (
                <button
                  key={m} type="button"
                  onClick={() => setPreferredMode(m)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    preferredMode === m
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Preferred Time <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <input
              type="text"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="e.g. Weekday evenings, Saturday morning…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              {submitting ? 'Sending…' : '📤 Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// RESPONSE MESSAGE MODAL (for senior actions)
// ──────────────────────────────────────────
interface ResponseModalProps {
  action: 'accept' | 'decline' | 'complete';
  onConfirm: (
    msg: string,
    coordination?: {
      meeting_mode: GuidanceMode;
      meeting_details: string;
      scheduled_time: string;
    }
  ) => Promise<void>;
  onClose: () => void;
}
const ResponseModal: React.FC<ResponseModalProps> = ({ action, onConfirm, onClose }) => {
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [meetingMode, setMeetingMode] = useState<GuidanceMode>('Online');
  const [scheduledTime, setScheduledTime] = useState('');
  const [meetingDetails, setMeetingDetails] = useState('');

  const labels = {
    accept:   { title: 'Accept Request', btn: '✅ Accept', color: 'bg-emerald-600 hover:bg-emerald-700', placeholder: 'e.g. Sure! Let\'s connect this weekend.' },
    decline:  { title: 'Decline Request', btn: '❌ Decline', color: 'bg-red-600 hover:bg-red-700',       placeholder: 'e.g. Sorry, I\'m not available this week.' },
    complete: { title: 'Mark Completed', btn: '🎓 Complete', color: 'bg-indigo-600 hover:bg-indigo-700', placeholder: 'e.g. Great session! Hope this helps your placement prep.' },
  };
  const l = labels[action];

  const handleConfirm = async () => {
    if (action === 'accept' && (!scheduledTime.trim() || !meetingDetails.trim())) {
      alert('Please fill in both Scheduled Time and Meeting/Contact Details.');
      return;
    }
    setSubmitting(true);
    try {
      if (action === 'accept') {
        await onConfirm(msg, {
          meeting_mode: meetingMode,
          scheduled_time: scheduledTime.trim(),
          meeting_details: meetingDetails.trim(),
        });
      } else {
        await onConfirm(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
        <h3 className="font-bold text-slate-900 text-base">{l.title}</h3>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Message <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea
            value={msg} onChange={(e) => setMsg(e.target.value)}
            rows={2} placeholder={l.placeholder}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors text-slate-900"
          />
        </div>

        {action === 'accept' && (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Meeting Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={meetingMode}
                onChange={(e) => setMeetingMode(e.target.value as GuidanceMode)}
                className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-900"
              >
                <option value="Online">Online</option>
                <option value="In-Person">In-Person</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Scheduled Time <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="e.g. Next Monday at 4 PM"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Meeting/Contact Details <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={meetingDetails}
                onChange={(e) => setMeetingDetails(e.target.value)}
                rows={2}
                placeholder={
                  meetingMode === 'Online'
                    ? "e.g. Google Meet link or WhatsApp/Discord instructions"
                    : meetingMode === 'In-Person'
                    ? "e.g. Library, CSE block, lab, classroom, etc."
                    : "e.g. Online link + campus backup location"
                }
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-900"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting}
            className={`flex-1 py-2.5 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors ${l.color}`}>
            {submitting ? 'Saving…' : l.btn}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// MENTOR CARD (Find Seniors tab)
// ──────────────────────────────────────────
interface MentorCardProps {
  mentor: SeniorMentorProfile;
  currentUserId: string;
  onRequest: (mentor: SeniorMentorProfile) => void;
  onViewProfile: (userId: string) => void;
}
const MentorCard: React.FC<MentorCardProps> = ({ mentor, currentUserId, onRequest, onViewProfile }) => {
  const isSelf = mentor.id === currentUserId;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={mentor.full_name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm truncate">{mentor.full_name}</h3>
            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full shrink-0">
              🎓 Senior Mentor
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {mentor.department} · {mentor.year_of_study}
            {mentor.section ? ` · Sec ${mentor.section}` : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-slate-400">
            {mentor.availability && <span>🕐 {mentor.availability}</span>}
            {mentor.help_mode && <span>📍 {mentor.help_mode}</span>}
            {mentor.trust_score > 0 && (
              <span className="text-amber-600 font-semibold">⭐ {mentor.trust_score}% Trust</span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {mentor.mentor_bio && (
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{mentor.mentor_bio}</p>
      )}

      {/* Topics */}
      {mentor.mentor_topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mentor.mentor_topics.slice(0, 5).map((t) => (
            <span key={t} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-full">
              {t}
            </span>
          ))}
          {mentor.mentor_topics.length > 5 && (
            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-semibold rounded-full">
              +{mentor.mentor_topics.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button" onClick={() => onViewProfile(mentor.id)}
          className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          View Profile
        </button>
        {!isSelf && (
          <button
            type="button" onClick={() => onRequest(mentor)}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            Request Guidance
          </button>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// MY REQUEST CARD (My Requests tab)
// ──────────────────────────────────────────
interface MyRequestCardProps {
  req: SeniorGuidanceRequestWithProfiles;
  onCancel: (req: SeniorGuidanceRequestWithProfiles) => Promise<void>;
  onViewProfile: (userId: string) => void;
}
const MyRequestCard: React.FC<MyRequestCardProps> = ({ req, onCancel, onViewProfile }) => {
  const [cancelling, setCancelling] = useState(false);
  const canCancel = req.status === 'pending' || req.status === 'accepted';
  const seniorName = req.senior_profile?.full_name || 'Senior Mentor';

  const handleCancel = async () => {
    if (!window.confirm('Cancel this guidance request?')) return;
    setCancelling(true);
    try { await onCancel(req); } finally { setCancelling(false); }
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3 ${req.status === 'completed' ? 'border-indigo-200' : req.status === 'declined' ? 'border-red-200' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={seniorName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => onViewProfile(req.senior_id)}
              className="font-bold text-sm text-slate-800 hover:text-indigo-600 transition-colors text-left">
              {seniorName}
            </button>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[req.status]}`}>
              {STATUS_ICONS[req.status]} {req.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {req.senior_profile?.department} · {req.senior_profile?.year_of_study}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1.5 pl-9">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold rounded">
            📚 {req.topic}
          </span>
          <span className="text-slate-400">📍 {req.preferred_mode}</span>
          {req.preferred_time && <span className="text-slate-400">🕐 {req.preferred_time}</span>}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{req.message}</p>
        {req.response_message && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[11px] font-bold text-slate-500 mb-0.5">Senior's Response:</p>
            <p className="text-xs text-slate-700 italic">"{req.response_message}"</p>
          </div>
        )}

        {/* Coordination details display */}
        {(req.meeting_mode || req.scheduled_time || req.meeting_details) && (
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
            <p className="text-[11px] font-bold text-indigo-850 flex items-center gap-1">
              <span>📅</span> Session Coordination:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium">
              {req.meeting_mode && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-500">Mode:</span> {req.meeting_mode}
                </p>
              )}
              {req.scheduled_time && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-500">Scheduled:</span> {req.scheduled_time}
                </p>
              )}
            </div>
            {req.meeting_details && (
              <div className="text-[11px] pt-1.5 border-t border-indigo-100/50 text-slate-700">
                <span className="font-semibold text-slate-500 block mb-0.5">Location / Contact Details:</span>
                <p className="bg-white p-2 rounded border border-indigo-100 leading-relaxed break-words text-xs font-semibold">{req.meeting_details}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
          <span>Sent {formatDate(req.created_at)}</span>
          {req.completed_at && <span>· Completed {formatDate(req.completed_at)}</span>}
        </div>
      </div>

      {/* Actions */}
      {canCancel && (
        <div className="pl-9">
          <button type="button" disabled={cancelling} onClick={handleCancel}
            className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 text-xs font-semibold rounded-lg transition-colors">
            {cancelling ? 'Cancelling…' : '🚫 Cancel Request'}
          </button>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// INCOMING REQUEST CARD (Mentor Dashboard)
// ──────────────────────────────────────────
interface IncomingRequestCardProps {
  req: SeniorGuidanceRequestWithProfiles;
  onAction: (req: SeniorGuidanceRequestWithProfiles, action: 'accept' | 'decline' | 'complete') => void;
  onViewProfile: (userId: string) => void;
}
const IncomingRequestCard: React.FC<IncomingRequestCardProps> = ({ req, onAction, onViewProfile }) => {
  const requesterName = req.requester_profile?.full_name || 'Student';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3 ${req.status === 'completed' ? 'border-indigo-200 bg-indigo-50/20' : req.status === 'declined' ? 'border-red-100' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={requesterName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => onViewProfile(req.requester_id)}
              className="font-bold text-sm text-slate-800 hover:text-indigo-600 transition-colors text-left">
              {requesterName}
            </button>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[req.status]}`}>
              {STATUS_ICONS[req.status]} {req.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {req.requester_profile?.department} · {req.requester_profile?.year_of_study}
            {req.requester_profile?.section ? ` · Sec ${req.requester_profile.section}` : ''}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1.5 pl-9">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold rounded">
            📚 {req.topic}
          </span>
          <span className="text-slate-400">📍 {req.preferred_mode}</span>
          {req.preferred_time && <span className="text-slate-400">🕐 {req.preferred_time}</span>}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{req.message}</p>
        {req.response_message && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[11px] font-bold text-slate-500 mb-0.5">Your Response:</p>
            <p className="text-xs text-slate-700 italic">"{req.response_message}"</p>
          </div>
        )}

        {/* Coordination details display */}
        {(req.meeting_mode || req.scheduled_time || req.meeting_details) && (
          <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl space-y-2">
            <p className="text-[11px] font-bold text-violet-850 flex items-center gap-1">
              <span>📅</span> Session Coordination:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium">
              {req.meeting_mode && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-500">Mode:</span> {req.meeting_mode}
                </p>
              )}
              {req.scheduled_time && (
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-500">Scheduled:</span> {req.scheduled_time}
                </p>
              )}
            </div>
            {req.meeting_details && (
              <div className="text-[11px] pt-1.5 border-t border-violet-100/50 text-slate-700">
                <span className="font-semibold text-slate-500 block mb-0.5">Location / Contact Details:</span>
                <p className="bg-white p-2 rounded border border-violet-200 leading-relaxed break-words text-xs font-semibold">{req.meeting_details}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
          <span>Received {formatDate(req.created_at)}</span>
          {req.completed_at && <span>· Completed {formatDate(req.completed_at)}</span>}
        </div>
      </div>

      {/* Actions */}
      {req.status === 'pending' && (
        <div className="pl-9 flex gap-2 flex-wrap">
          <button type="button" onClick={() => onAction(req, 'accept')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
            ✅ Accept
          </button>
          <button type="button" onClick={() => onAction(req, 'decline')}
            className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors">
            ❌ Decline
          </button>
        </div>
      )}
      {req.status === 'accepted' && (
        <div className="pl-9">
          <button type="button" onClick={() => onAction(req, 'complete')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
            🎓 Mark Completed
          </button>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────
export const SeniorConnectPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id ?? '';

  // ── State ──
  const [activeTab, setActiveTab] = useState<'find' | 'my-requests' | 'mentor-dash'>('find');
  const [mentors, setMentors] = useState<SeniorMentorProfile[]>([]);
  const [myRequests, setMyRequests] = useState<SeniorGuidanceRequestWithProfiles[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<SeniorGuidanceRequestWithProfiles[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [loadingMyReqs, setLoadingMyReqs] = useState(true);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterMode, setFilterMode] = useState('');

  // Modal state
  const [requestModal, setRequestModal] = useState<SeniorMentorProfile | null>(null);
  const [responseModal, setResponseModal] = useState<{
    req: SeniorGuidanceRequestWithProfiles; action: 'accept' | 'decline' | 'complete';
  } | null>(null);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);

  // Mentor profile form
  const [editingMentorProfile, setEditingMentorProfile] = useState(false);
  const [mentorFormTopics, setMentorFormTopics] = useState<string[]>([]);
  const [mentorFormBio, setMentorFormBio] = useState('');
  const [mentorFormAvailability, setMentorFormAvailability] = useState('');
  const [mentorFormMode, setMentorFormMode] = useState<GuidanceMode>('Hybrid');
  const [savingMentorProfile, setSavingMentorProfile] = useState(false);

  // ── Data loading ──
  const loadMentors = useCallback(async () => {
    setLoadingMentors(true);
    try { setMentors(await getSeniorMentors()); } finally { setLoadingMentors(false); }
  }, []);

  const loadMyRequests = useCallback(async () => {
    if (!userId) return;
    setLoadingMyReqs(true);
    try { setMyRequests(await getMyGuidanceRequests(userId)); } finally { setLoadingMyReqs(false); }
  }, [userId]);

  const loadIncoming = useCallback(async () => {
    if (!userId) return;
    setLoadingIncoming(true);
    try { setIncomingRequests(await getSeniorIncomingRequests(userId)); } finally { setLoadingIncoming(false); }
  }, [userId]);

  // Determine if current user is a mentor — fetch own profile
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('is_senior_mentor, mentor_topics, mentor_bio, availability, help_mode')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsMentor(!!data.is_senior_mentor);
          setMentorFormTopics(data.mentor_topics || []);
          setMentorFormBio(data.mentor_bio || '');
          setMentorFormAvailability(data.availability || '');
          setMentorFormMode((data.help_mode as GuidanceMode) || 'Hybrid');
        }
      });
  }, [userId]);

  useEffect(() => { loadMentors(); }, [loadMentors]);
  useEffect(() => { loadMyRequests(); }, [loadMyRequests]);
  useEffect(() => { loadIncoming(); }, [loadIncoming]);

  // ── Filtered mentors ──
  const filteredMentors = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return mentors.filter((m) => {
      const matchesSearch = !q || [m.full_name, m.department, m.mentor_bio, ...m.mentor_topics].join(' ').toLowerCase().includes(q);
      const matchesDept = filterDept === 'All' || m.department === filterDept;
      const matchesTopic = !filterTopic || m.mentor_topics.includes(filterTopic);
      const matchesMode = !filterMode || m.help_mode === filterMode;
      return matchesSearch && matchesDept && matchesTopic && matchesMode;
    });
  }, [mentors, searchQuery, filterDept, filterTopic, filterMode]);

  // ── Stats ──
  const totalMentors = mentors.length;
  const myActiveReqs = myRequests.filter((r) => r.status === 'pending' || r.status === 'accepted').length;
  const myCompletedReqs = myRequests.filter((r) => r.status === 'completed').length;
  const pendingIncoming = incomingRequests.filter((r) => r.status === 'pending').length;

  // ── Handlers ──
  const handleRequestGuidance = async (input: {
    topic: string; message: string; preferred_mode: GuidanceMode; preferred_time: string;
  }) => {
    if (!requestModal || !userId) return;
    try {
      await createGuidanceRequest({
        requester_id: userId,
        senior_id: requestModal.id,
        ...input,
      });
      setRequestModal(null);
      await loadMyRequests();
      toast.success('Request Sent! 🎓', `Your guidance request has been sent to ${requestModal.full_name}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Request Failed', msg.includes('table') ? 'Apply supabase/phase4-senior-connect-patch.sql to enable guidance requests.' : 'Could not send request.');
      throw err;
    }
  };

  const handleCancelRequest = async (req: SeniorGuidanceRequestWithProfiles) => {
    try {
      await updateGuidanceRequestStatus(req.id, 'cancelled');
      await loadMyRequests();
      toast.success('Request Cancelled', 'Your guidance request has been cancelled.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Cancel Failed', msg || 'Could not cancel request.');
    }
  };

  const handleSeniorAction = async (
    msg: string,
    coordination?: {
      meeting_mode: GuidanceMode;
      meeting_details: string;
      scheduled_time: string;
    }
  ) => {
    if (!responseModal) return;
    const statusMap = { accept: 'accepted', decline: 'declined', complete: 'completed' } as const;
    const newStatus: SeniorGuidanceStatus = statusMap[responseModal.action];
    try {
      await updateGuidanceRequestStatus(responseModal.req.id, newStatus, msg, coordination);
      setResponseModal(null);
      await loadIncoming();
      const messages = {
        accept: 'Request accepted! The student will be notified.',
        decline: 'Request declined.',
        complete: 'Session marked as completed! 🎓',
      };
      toast.success(
        newStatus === 'accepted' ? 'Accepted ✅' : newStatus === 'declined' ? 'Declined' : 'Completed 🎓',
        messages[responseModal.action]
      );
    } catch (err: unknown) {
      const msg2 = err instanceof Error ? err.message : String(err);
      toast.error('Action Failed', msg2 || 'Could not update request.');
    }
  };

  const handleSaveMentorProfile = async () => {
    if (!userId) return;
    setSavingMentorProfile(true);
    try {
      await updateSeniorMentorProfile(userId, {
        is_senior_mentor: true,
        mentor_topics: mentorFormTopics,
        mentor_bio: mentorFormBio,
        availability: mentorFormAvailability,
        help_mode: mentorFormMode,
      });
      setIsMentor(true);
      setEditingMentorProfile(false);
      await loadMentors();
      await loadIncoming();
      toast.success('Profile Saved 🎓', 'You are now listed as a Senior Mentor!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Save Failed', msg || 'Could not save mentor profile.');
    } finally {
      setSavingMentorProfile(false);
    }
  };

  const toggleMentorTopic = (topic: string) => {
    setMentorFormTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  // ── Stats for incoming ──
  const incomingStats = useMemo(() => {
    const pending = incomingRequests.filter((r) => r.status === 'pending').length;
    const accepted = incomingRequests.filter((r) => r.status === 'accepted').length;
    const completed = incomingRequests.filter((r) => r.status === 'completed').length;
    const declined = incomingRequests.filter((r) => r.status === 'declined').length;
    const received = incomingRequests.length;
    const completionRate = received > 0 ? Math.round((completed / received) * 100) : 0;
    return { pending, accepted, completed, declined, received, completionRate };
  }, [incomingRequests]);

  // ── Dynamic filter departments computation ──
  const filterDepartmentsList = useMemo(() => {
    const activeDepts = Array.from(new Set(mentors.map((m) => m.department).filter(Boolean)));
    const standardDepts = SHARED_DEPARTMENTS.filter((d) => d.toLowerCase() !== 'other');
    const combined = Array.from(new Set([...activeDepts, ...standardDepts]));
    combined.sort((a, b) => a.localeCompare(b));
    return ['All', ...combined];
  }, [mentors]);

  // ── Current mentor profile for display ──
  const myMentorProfile = mentors.find((m) => m.id === userId);

  // ── Render ──
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">🎓 Senior Connect</h2>
        <p className="text-sm text-slate-500">
          Find experienced seniors for placement prep, internships, projects, exams, and college life guidance.
        </p>
      </div>

      {/* Hero stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-indigo-700">{totalMentors}</p>
          <p className="text-[11px] font-semibold text-indigo-500 mt-0.5">Active Mentors</p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-amber-700">{myActiveReqs}</p>
          <p className="text-[11px] font-semibold text-amber-500 mt-0.5">My Active Requests</p>
        </div>
        {isMentor && (
          <div className="p-4 bg-white rounded-2xl border border-violet-200 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-violet-700">{pendingIncoming}</p>
            <p className="text-[11px] font-semibold text-violet-500 mt-0.5">Pending Incoming</p>
          </div>
        )}
        <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-emerald-700">{myCompletedReqs}</p>
          <p className="text-[11px] font-semibold text-emerald-500 mt-0.5">Sessions Completed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {([['find', '🔍 Find Seniors'], ['my-requests', `📋 My Requests${myActiveReqs > 0 ? ` (${myActiveReqs})` : ''}`], ['mentor-dash', `🎓 Mentor Dashboard${isMentor && pendingIncoming > 0 ? ` (${pendingIncoming})` : ''}`]] as const).map(([tab, label]) => (
          <button
            key={tab} type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: FIND SENIORS ── */}
      {activeTab === 'find' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, department, topic…"
              className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            />
            <select
              value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors text-slate-900"
            >
              {filterDepartmentsList.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            >
              <option value="">All Topics</option>
              {MENTOR_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filterMode} onChange={(e) => setFilterMode(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            >
              <option value="">All Modes</option>
              {GUIDANCE_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {(searchQuery || filterDept !== 'All' || filterTopic || filterMode) && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setFilterDept('All'); setFilterTopic(''); setFilterMode(''); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {loadingMentors ? (
            <LoadingState label="Loading senior mentors…" />
          ) : filteredMentors.length === 0 ? (
            <EmptyState
              icon="🎓"
              title="No mentors found"
              message={
                totalMentors === 0
                  ? 'No senior mentors have registered yet. Be the first — go to Mentor Dashboard!'
                  : 'No mentors match your filters. Try resetting them.'
              }
              actionLabel={totalMentors === 0 ? 'Become a Mentor' : undefined}
              onAction={totalMentors === 0 ? () => setActiveTab('mentor-dash') : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMentors.map((mentor) => (
                <MentorCard
                  key={mentor.id} mentor={mentor}
                  currentUserId={userId}
                  onRequest={(m) => setRequestModal(m)}
                  onViewProfile={(uid) => setViewProfileUserId(uid)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY REQUESTS ── */}
      {activeTab === 'my-requests' && (
        <div className="space-y-4">
          {loadingMyReqs ? (
            <LoadingState label="Loading your requests…" />
          ) : myRequests.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No requests yet"
              message="You haven't requested guidance from any senior yet. Browse the Find Seniors tab to get started!"
              actionLabel="Find Seniors"
              onAction={() => setActiveTab('find')}
            />
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <MyRequestCard
                  key={req.id} req={req}
                  onCancel={handleCancelRequest}
                  onViewProfile={(uid) => setViewProfileUserId(uid)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MENTOR DASHBOARD ── */}
      {activeTab === 'mentor-dash' && (
        <div className="space-y-5">
          {/* Onboarding / Mentor profile form */}
          {(!isMentor || editingMentorProfile) && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl shrink-0">🎓</div>
                <div>
                  <h3 className="font-bold text-slate-900">{isMentor ? 'Update Mentor Profile' : 'Become a Senior Mentor'}</h3>
                  <p className="text-xs text-slate-500">
                    {isMentor
                      ? 'Update your mentor profile so juniors can find and request guidance from you.'
                      : 'Share your knowledge and experience to help juniors with placements, projects, internships, and more.'}
                  </p>
                </div>
              </div>

              {/* Topics selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Topics You Can Help With</label>
                <div className="flex flex-wrap gap-1.5">
                  {MENTOR_TOPICS.map((t) => (
                    <button
                      key={t} type="button" onClick={() => toggleMentorTopic(t)}
                      className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                        mentorFormTopics.includes(t)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mentor Bio</label>
                <textarea
                  value={mentorFormBio} onChange={(e) => setMentorFormBio(e.target.value)}
                  rows={3} placeholder="Tell juniors about your experience, placement journey, projects, and what you can help with…"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                />
              </div>

              {/* Availability + Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Availability</label>
                  <input
                    type="text" value={mentorFormAvailability}
                    onChange={(e) => setMentorFormAvailability(e.target.value)}
                    placeholder="e.g. Weekday evenings, Weekends…"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Preferred Mode</label>
                  <div className="flex gap-2">
                    {GUIDANCE_MODES.map((m) => (
                      <button key={m} type="button" onClick={() => setMentorFormMode(m)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                          mentorFormMode === m
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {editingMentorProfile && (
                  <button type="button" onClick={() => setEditingMentorProfile(false)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                )}
                <button
                  type="button" disabled={savingMentorProfile}
                  onClick={handleSaveMentorProfile}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                >
                  {savingMentorProfile ? 'Saving…' : isMentor ? '💾 Update Mentor Profile' : '🎓 Become a Mentor'}
                </button>
              </div>
            </div>
          )}

          {/* Mentor profile card (when active and not editing) */}
          {isMentor && !editingMentorProfile && myMentorProfile && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={myMentorProfile.full_name} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{myMentorProfile.full_name}</h3>
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">
                        🎓 Active Mentor
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{myMentorProfile.department} · {myMentorProfile.year_of_study}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setEditingMentorProfile(true)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
                  ✏️ Edit
                </button>
              </div>
              {myMentorProfile.mentor_bio && (
                <p className="text-xs text-slate-600 leading-relaxed pl-13">{myMentorProfile.mentor_bio}</p>
              )}
              {myMentorProfile.mentor_topics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {myMentorProfile.mentor_topics.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incoming stats */}
          {isMentor && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Received',  value: incomingStats.received,  color: 'slate',   icon: '📬' },
                  { label: 'Pending',   value: incomingStats.pending,   color: 'amber',   icon: '⏳' },
                  { label: 'Accepted',  value: incomingStats.accepted,  color: 'emerald', icon: '✅' },
                  { label: 'Completed', value: incomingStats.completed, color: 'indigo',  icon: '🎓' },
                  { label: 'Declined',  value: incomingStats.declined,  color: 'red',     icon: '❌' },
                  { label: 'Rate',      value: `${incomingStats.completionRate}%`, color: 'violet', icon: '📈' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                    <p className="text-xl font-extrabold text-slate-800">{value}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{icon} {label}</p>
                  </div>
                ))}
              </div>

              {/* Incoming requests list */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700">Incoming Guidance Requests</h3>
                {loadingIncoming ? (
                  <LoadingState label="Loading incoming requests…" />
                ) : incomingRequests.length === 0 ? (
                  <EmptyState
                    icon="📬"
                    title="No requests yet"
                    message="No students have sent you guidance requests yet. Make sure your mentor profile is complete so they can find you!"
                  />
                ) : (
                  incomingRequests.map((req) => (
                    <IncomingRequestCard
                      key={req.id} req={req}
                      onAction={(r, action) => setResponseModal({ req: r, action })}
                      onViewProfile={(uid) => setViewProfileUserId(uid)}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {/* Not a mentor yet but no form showing (shouldn't happen, but fallback) */}
          {!isMentor && !editingMentorProfile && (
            <EmptyState
              icon="🎓"
              title="Become a Senior Mentor"
              message="Fill out the form above to register as a mentor and start helping junior students."
            />
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {requestModal && (
        <RequestGuidanceModal
          mentor={requestModal}
          currentUserId={userId}
          onSubmit={handleRequestGuidance}
          onClose={() => setRequestModal(null)}
        />
      )}

      {responseModal && (
        <ResponseModal
          action={responseModal.action}
          onConfirm={handleSeniorAction}
          onClose={() => setResponseModal(null)}
        />
      )}

      {viewProfileUserId && (
        <PublicProfileModal
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(null)}
          layer="base"
        />
      )}
    </div>
  );
};
