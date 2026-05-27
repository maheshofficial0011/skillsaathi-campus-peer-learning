import React, { useState } from 'react';
import type { HelpRequestWithProfiles, Feedback } from '../../types';
import { PublicProfileModal } from '../profile/PublicProfileModal';

interface HelpRequestCardProps {
  request: HelpRequestWithProfiles;
  currentUserId: string;
  onAccept: (requestId: string) => Promise<void>;
  onMarkSolved: (requestId: string) => Promise<void>;
  onGiveFeedback: (request: HelpRequestWithProfiles) => void;
  onClose: (requestId: string) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
  onViewDetails: (request: HelpRequestWithProfiles) => void;
  hasFeedback?: boolean;
  existingFeedback?: Feedback | null;
  matchPercentage?: number;
  matchedSkills?: string[];
}

// Format date helper
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format deadline to exact layout: "May 28, 2026, 03:30 PM"
const formatDeadlineDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

// Compact status timeline in card
const CardTimeline: React.FC<{ status: string; hasFeedback: boolean }> = ({ status, hasFeedback }) => {
  const steps = [
    { label: 'Posted', active: true },
    { label: 'Accepted', active: status === 'accepted' || status === 'solved' },
    { label: 'Solved', active: status === 'solved' },
    { label: 'Reviewed', active: hasFeedback },
  ];

  return (
    <div className="flex items-center gap-0 w-full py-1">
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                step.active ? 'bg-indigo-500' : 'bg-slate-200'
              }`}
            />
            <span
              className={`text-[9px] font-bold mt-0.5 whitespace-nowrap ${
                step.active ? 'text-indigo-600' : 'text-slate-300'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-1 mb-3.5 ${
                steps[idx + 1].active ? 'bg-indigo-300' : 'bg-slate-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const HelpRequestCard: React.FC<HelpRequestCardProps> = ({
  request,
  currentUserId,
  onAccept,
  onMarkSolved,
  onGiveFeedback,
  onClose,
  onDelete,
  onViewDetails,
  hasFeedback = false,
  existingFeedback = null,
  matchPercentage,
  matchedSkills,
}) => {
  const isCreator = request.created_by === currentUserId;
  const isHelper = request.accepted_by === currentUserId;

  // Per-action loading states
  const [accepting, setAccepting] = useState(false);
  const [solving, setSolving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Public profile modal trigger
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!window.confirm('Accept this help request?')) return;
    setAccepting(true);
    try {
      await onAccept(request.id);
    } finally {
      setAccepting(false);
    }
  };

  const handleMarkSolved = async () => {
    if (!window.confirm('Mark this request as solved?')) return;
    setSolving(true);
    try {
      await onMarkSolved(request.id);
    } finally {
      setSolving(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Close this request?')) return;
    setClosing(true);
    try {
      await onClose(request.id);
    } finally {
      setClosing(false);
    }
  };

  const handleEditReview = () => {
    if (!window.confirm('Update this review?')) return;
    onGiveFeedback(request);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this request permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await onDelete(request.id);
    } finally {
      setDeleting(false);
    }
  };

  // Status Badge Colors
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'accepted': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'solved': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Urgency Badge Colors
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'Urgent': return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      case 'High': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const feedbackExists = existingFeedback || hasFeedback;

  return (
    <div className={`p-6 bg-white rounded-2xl border transition-all duration-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md ${
      request.status === 'open' ? 'border-slate-200 hover:border-indigo-100' : 'border-slate-150 border-dashed'
    }`}>
      
      {/* Top badges bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 rounded uppercase tracking-wider">
            {request.category}
          </span>
          <span className={`px-2.5 py-0.5 text-[10px] font-bold border rounded uppercase tracking-wider ${getUrgencyStyle(request.urgency)}`}>
            {request.urgency}
          </span>
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${getStatusStyle(request.status)}`}>
          {request.status}
        </span>
      </div>

      {/* Main details body */}
      <div className="space-y-2 flex-1">
        <h4 className="font-bold text-lg text-slate-900 leading-tight">
          {request.title}
        </h4>
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
          {request.description}
        </p>

        {/* Required skills list */}
        {request.required_skills && request.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {request.required_skills.map((skill) => (
              <span key={skill} className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-medium rounded">
                #{skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Compact Status Timeline */}
      <CardTimeline status={request.status} hasFeedback={!!feedbackExists} />

      {/* Metadata Footers */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>
            By:{' '}
            <button
              onClick={() => setViewProfileId(request.created_by)}
              className="font-bold text-indigo-700 hover:underline focus:outline-none"
            >
              {request.creator_profile?.full_name || 'Campus Student'}
            </button>
            {' '}({request.creator_profile?.year_of_study || 'Student'})
          </span>
          <span>{formatDate(request.created_at)}</span>
        </div>
        
        {request.accepted_by && (
          <div className="text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-100 flex items-center justify-between">
            <span>
              Accepted By:{' '}
              <button
                onClick={() => setViewProfileId(request.accepted_by!)}
                className="font-bold hover:underline focus:outline-none"
              >
                {request.helper_profile?.full_name || 'Campus Helper'}
              </button>
            </span>
            {request.solved_at && (
              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-semibold border border-purple-100">
                Solved
              </span>
            )}
          </div>
        )}

        {request.deadline && (
          <div className="text-[11px] text-amber-700 flex items-center justify-between">
            <span>📅 Deadline:</span>
            <span>{formatDeadlineDate(request.deadline)}</span>
          </div>
        )}
      </div>

      {/* Public Profile Modal triggered from card */}
      {viewProfileId && (
        <PublicProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />
      )}

      {/* Match Percentage Display for Recommendations */}
      {matchPercentage !== undefined && matchPercentage > 0 && (
        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">🎯 Recommended Match:</span>
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {matchPercentage}% Match
            </span>
          </div>
          {matchedSkills && matchedSkills.length > 0 && (
            <div className="text-[11px] text-slate-600 flex flex-wrap gap-1 items-center">
              <span>Matched Skills:</span>
              {matchedSkills.map((s) => (
                <span key={s} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action triggers */}
      <div className="pt-2 flex flex-col gap-2">
        {/* View Details button — always visible */}
        <button
          onClick={() => onViewDetails(request)}
          className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors duration-150"
        >
          View Details
        </button>

        {/* Guest accepts a request */}
        {request.status === 'open' && !isCreator && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150"
          >
            {accepting ? 'Accepting...' : 'Accept Request'}
          </button>
        )}

        {/* Helper marks as solved */}
        {request.status === 'accepted' && isHelper && (
          <button
            onClick={handleMarkSolved}
            disabled={solving}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150"
          >
            {solving ? 'Marking solved...' : 'Mark as Solved'}
          </button>
        )}

        {/* Creator submits feedback once solved */}
        {request.status === 'solved' && isCreator && (
          feedbackExists ? (
            <div className="flex gap-2">
              <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg select-none flex items-center justify-center gap-1">
                ✓ Reviewed
              </div>
              <button
                onClick={handleEditReview}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg shadow-sm transition duration-150"
              >
                Edit Review
              </button>
            </div>
          ) : (
            <button
              onClick={() => onGiveFeedback(request)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150"
            >
              Give Tutor Feedback
            </button>
          )
        )}

        {/* Creator cancels/closes active open/accepted request */}
        {(request.status === 'open' || request.status === 'accepted') && isCreator && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full py-2 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 font-semibold text-xs rounded-lg transition-colors duration-150"
          >
            {closing ? 'Closing...' : 'Close Request'}
          </button>
        )}

        {/* Creator permanently deletes open or closed request (no feedback) */}
        {(request.status === 'open' || request.status === 'closed') && isCreator && !feedbackExists && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full py-2 border border-rose-300 hover:bg-rose-50 disabled:opacity-60 text-rose-700 font-semibold text-xs rounded-lg transition-colors duration-150"
          >
            {deleting ? 'Deleting...' : '🗑 Delete Request'}
          </button>
        )}
      </div>
    </div>
  );
};
