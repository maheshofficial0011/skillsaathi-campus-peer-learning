import React, { useState } from 'react';
import type { DoubtPostWithProfile, DoubtStatus } from '../../types';

interface DoubtCardProps {
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  matchScore?: number;
  onView: (doubt: DoubtPostWithProfile) => void;
  onClose: (doubtId: string) => Promise<void>;
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getStatusStyle = (status: DoubtStatus | string): string => {
  switch (status) {
    case 'open':     return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'answered': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'solved':   return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'closed':   return 'bg-slate-100 text-slate-600 border-slate-200';
    default:         return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

export const getStatusIcon = (status: DoubtStatus | string): string => {
  switch (status) {
    case 'open':     return '⚡';
    case 'answered': return '💬';
    case 'solved':   return '✅';
    case 'closed':   return '🔒';
    default:         return '•';
  }
};

export const getDisplayName = (post: DoubtPostWithProfile): string => {
  if (post.is_anonymous) return 'Anonymous Student';
  return post.creator_profile?.full_name || 'Campus Student';
};

export const DoubtCard: React.FC<DoubtCardProps> = ({
  doubt,
  currentUserId,
  matchScore,
  onView,
  onClose,
}) => {
  const isCreator = doubt.created_by === currentUserId;
  const [closing, setClosing] = useState(false);

  // Visual status: if the doubt has answers but DB still shows 'open' (pre-trigger data), show as 'answered'
  const visualStatus: DoubtStatus | string =
    doubt.status === 'open' && (doubt.answer_count ?? 0) > 0 ? 'answered' : doubt.status;

  const canAnswer = visualStatus === 'open' || visualStatus === 'answered';

  const handleClose = async () => {
    if (!window.confirm('Close this doubt? Students will no longer be able to answer.')) return;
    setClosing(true);
    try {
      await onClose(doubt.id);
    } finally {
      setClosing(false);
    }
  };

  const descPreview = doubt.description.length > 150
    ? doubt.description.slice(0, 150) + '…'
    : doubt.description;

  return (
    <div className={`p-5 bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col gap-3 ${
      canAnswer ? 'border-slate-200 hover:border-indigo-100' : 'border-slate-200 border-dashed opacity-90'
    }`}>
      {/* Top row: category badge + status + anon badge */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded uppercase tracking-wider">
            {doubt.category}
          </span>
          {doubt.is_anonymous && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded">
              🕵️ Anon
            </span>
          )}
        </div>
        <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${getStatusStyle(visualStatus)}`}>
          {getStatusIcon(visualStatus)} {visualStatus}
        </span>
      </div>

      {/* Recommended match score */}
      {matchScore !== undefined && matchScore > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            🎯 {matchScore}% match
          </span>
        </div>
      )}

      {/* Title + description */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <h4 className="font-bold text-base text-slate-900 leading-snug break-words">{doubt.title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed break-words">{descPreview}</p>

        {doubt.tags && doubt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {doubt.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium rounded">
                #{tag}
              </span>
            ))}
            {doubt.tags.length > 4 && (
              <span className="text-[10px] text-slate-400 self-center">+{doubt.tags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer meta */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 flex-wrap">
        <span className="min-w-0">
          By <span className="font-semibold text-slate-700">{getDisplayName(doubt)}</span>
          <span className="mx-1.5 text-slate-300">·</span>
          {formatDate(doubt.created_at)}
        </span>
        {typeof doubt.answer_count === 'number' && doubt.answer_count > 0 && (
          <span className="shrink-0 text-sky-600 font-semibold">
            {doubt.answer_count} answer{doubt.answer_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => onView(doubt)}
          className={`w-full py-2 font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150 ${
            canAnswer
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {doubt.status === 'solved' ? '✅ View Solution' : canAnswer ? '💬 View / Answer' : '👁 View Answers'}
        </button>

        {isCreator && (doubt.status === 'open' || doubt.status === 'answered') && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 font-semibold text-xs rounded-lg transition-colors"
          >
            {closing ? 'Closing…' : '🔒 Close Doubt'}
          </button>
        )}
      </div>
    </div>
  );
};
