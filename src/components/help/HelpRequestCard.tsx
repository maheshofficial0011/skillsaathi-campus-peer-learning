import React from 'react';
import type { HelpRequestWithProfiles, Feedback } from '../../types';

interface HelpRequestCardProps {
  request: HelpRequestWithProfiles;
  currentUserId: string;
  onAccept: (requestId: string) => void;
  onMarkSolved: (requestId: string) => void;
  onGiveFeedback: (request: HelpRequestWithProfiles) => void;
  onClose: (requestId: string) => void;
  hasFeedback?: boolean;
  existingFeedback?: Feedback | null;
  matchPercentage?: number;
  matchedSkills?: string[];
}

export const HelpRequestCard: React.FC<HelpRequestCardProps> = ({
  request,
  currentUserId,
  onAccept,
  onMarkSolved,
  onGiveFeedback,
  onClose,
  hasFeedback = false,
  existingFeedback = null,
  matchPercentage,
  matchedSkills,
}) => {
  const isCreator = request.created_by === currentUserId;
  const isHelper = request.accepted_by === currentUserId;

  // Format date helper
  const formatDate = (dateStr: string | null) => {
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
  const formatDeadlineDate = (dateStr: string | null) => {
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
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, '0');

    return `${month} ${day}, ${year}, ${hoursStr}:${minutes} ${ampm}`;
  };

  // Status Badge Colors
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'accepted':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'solved':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'closed':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Urgency Badge Colors
  const getUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

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

      {/* Metadata Footers */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>By: <strong>{request.creator_profile?.full_name || 'Anonymous Peer'}</strong> ({request.creator_profile?.year_of_study || 'Student'})</span>
          <span>{formatDate(request.created_at)}</span>
        </div>
        
        {request.accepted_by && (
          <div className="text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-100 flex items-center justify-between">
            <span>Accepted By: <strong>{request.helper_profile?.full_name || 'Campus Helper'}</strong></span>
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
        {/* Guest accepts a request */}
        {request.status === 'open' && !isCreator && (
          <button
            onClick={() => onAccept(request.id)}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150"
          >
            Accept Request
          </button>
        )}

        {/* Helper marks as solved */}
        {request.status === 'accepted' && isHelper && (
          <button
            onClick={() => onMarkSolved(request.id)}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150"
          >
            Mark as Solved
          </button>
        )}

        {/* Creator submits feedback once solved */}
        {request.status === 'solved' && isCreator && (
          (existingFeedback || hasFeedback) ? (
            <div className="flex gap-2">
              <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg select-none flex items-center justify-center gap-1">
                ✓ Reviewed
              </div>
              <button
                onClick={() => onGiveFeedback(request)}
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
            onClick={() => onClose(request.id)}
            className="w-full py-2 border border-red-200 hover:bg-red-50 text-red-650 text-red-600 font-semibold text-xs rounded-lg transition-colors duration-150"
          >
            Close Request
          </button>
        )}
      </div>
    </div>
  );
};
