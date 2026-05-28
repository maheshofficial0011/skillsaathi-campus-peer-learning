import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DoubtPostWithProfile,
  DoubtAnswerWithProfile,
  DoubtAnswerRating,
  DoubtAnswerReplyWithProfile,
} from '../../types';
import {
  getAnswersForDoubt,
  getRatingsForDoubt,
  getRepliesForDoubt,
  createAnswer,
  markDoubtSolved,
  closeDoubt,
  reopenDoubt,
  deleteDoubt,
  rateDoubtAnswer,
  updateDoubtAnswerRating,
  createAnswerReply,
} from '../../lib/doubts';
import { getStatusStyle, getStatusIcon } from './DoubtCard';
import { PublicProfileModal } from '../profile/PublicProfileModal';
import { useToast } from '../../hooks/useToast';

interface DoubtDetailsModalProps {
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  onClose: () => void;
  onDoubtUpdated: (updated: DoubtPostWithProfile) => void;
  onDoubtDeleted?: (doubtId: string) => void;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ──────────────────────────────────────────
// RATING CONTROL (1–10)
// ──────────────────────────────────────────
const RatingControl: React.FC<{
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div className="flex flex-wrap gap-1">
    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
      <button
        key={n}
        type="button"
        disabled={disabled}
        onClick={() => onChange(n)}
        className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all duration-100 ${
          n <= value
            ? 'bg-amber-400 border-amber-500 text-white shadow-sm'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-300'
        } disabled:cursor-default`}
      >
        {n}
      </button>
    ))}
  </div>
);

// ──────────────────────────────────────────
// REPLY THREAD (per answer)
// ──────────────────────────────────────────
const ReplyThread: React.FC<{
  answerId: string;
  doubtId: string;
  currentUserId: string;
  replies: DoubtAnswerReplyWithProfile[];
  canReply: boolean;
  onReplyPosted: () => Promise<void>;
}> = ({ answerId, doubtId, currentUserId, replies, canReply, onReplyPosted }) => {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const answerReplies = replies.filter((r) => r.answer_id === answerId);

  const handleSubmit = async () => {
    if (!replyText.trim()) { setError('Reply cannot be empty.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await createAnswerReply({
        answer_id: answerId,
        doubt_id: doubtId,
        reply_text: replyText,
        created_by: currentUserId,
        is_anonymous: replyAnon,
      });
      setReplyText('');
      setShowForm(false);
      setExpanded(true);
      // Re-fetch all replies so count and list are accurate
      await onReplyPosted();
      toast.success('Reply Posted', 'Your reply/cross-question is now live.');
    } catch {
      setError('Failed to post reply. Please try again.');
      toast.error('Reply Failed', 'Could not post your reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const replyAuthorName = (r: DoubtAnswerReplyWithProfile) => {
    if (r.is_anonymous) return 'Anonymous Student';
    return r.author_profile?.full_name || 'Campus Student';
  };

  return (
    <div className="mt-2 pl-3 border-l-2 border-slate-100 text-xs">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-500 hover:text-indigo-600 font-semibold py-0.5 transition-colors"
        >
          {answerReplies.length > 0
            ? `${expanded ? '▲ Hide' : '▼ Show'} ${answerReplies.length} repl${answerReplies.length === 1 ? 'y' : 'ies'}`
            : expanded ? '▲ Hide replies' : '💬 Replies (0)'}
        </button>
        {canReply && (
          <button
            type="button"
            onClick={() => { setShowForm((v) => !v); setExpanded(true); }}
            className="text-indigo-500 hover:text-indigo-700 font-semibold py-0.5 transition-colors"
          >
            {showForm ? '✕ Cancel' : '+ Cross-question / Reply'}
          </button>
        )}
      </div>

      {expanded && answerReplies.length > 0 && (
        <div className="mt-2 space-y-2">
          {answerReplies.map((r) => (
            <div key={r.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-0.5">
              <p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{r.reply_text}</p>
              <p className="text-[10px] text-slate-400">
                <span className="font-semibold text-slate-500">{replyAuthorName(r)}</span>
                {' · '}{formatDate(r.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {expanded && showForm && canReply && (
        <div className="mt-2 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write your cross-question or follow-up here..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs resize-y focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={replyAnon}
                onChange={(e) => setReplyAnon(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-600 text-[11px] font-medium">Reply anonymously</span>
            </label>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[11px] font-bold rounded-lg transition-colors"
            >
              {submitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
          {error && <p className="text-red-500 text-[10px]">{error}</p>}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// ANSWER CARD
// ──────────────────────────────────────────
const AnswerCard: React.FC<{
  answer: DoubtAnswerWithProfile;
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  existingRating?: DoubtAnswerRating;
  avgRatingValue: number | null;
  ratingCount: number;
  replies: DoubtAnswerReplyWithProfile[];
  canRate: boolean;
  /** True only when: isCreator + doubt not closed + answer.is_accepted === false */
  canMark: boolean;
  canReply: boolean;
  onMarkAccepted: (answerId: string) => Promise<void>;
  onRatingSubmitted: () => Promise<void>;
  onReplyPosted: () => Promise<void>;
}> = ({
  answer, doubt, currentUserId, existingRating, avgRatingValue, ratingCount, replies,
  canRate, canMark, canReply, onMarkAccepted, onRatingSubmitted, onReplyPosted,
}) => {
  const toast = useToast();
  const TRUNCATE_AT = 400;
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const [ratingValue, setRatingValue] = useState(existingRating?.rating ?? 5);
  const [ratingComment, setRatingComment] = useState(existingRating?.comment ?? '');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);

  // Sync rating inputs when existingRating changes (after parent re-fetches ratings)
  useEffect(() => {
    setRatingValue(existingRating?.rating ?? 5);
    setRatingComment(existingRating?.comment ?? '');
  }, [existingRating?.id, existingRating?.rating, existingRating?.comment]);

  const answererName = answer.answerer_profile?.full_name || 'Campus Student';
  const isTruncated = answer.answer_text.length > TRUNCATE_AT;
  const displayText = isTruncated && !expanded
    ? answer.answer_text.slice(0, TRUNCATE_AT) + '...'
    : answer.answer_text;

  const handleMarkAccepted = async () => {
    setMarking(true);
    try { await onMarkAccepted(answer.id); }
    finally { setMarking(false); }
  };

  const handleRatingSubmit = async () => {
    setRatingError('');
    setRatingSubmitting(true);
    try {
      if (existingRating) {
        await updateDoubtAnswerRating(existingRating.id, { rating: ratingValue, comment: ratingComment });
        toast.success('Rating Updated', 'Your answer rating has been updated.');
      } else {
        await rateDoubtAnswer({
          answer_id: answer.id,
          doubt_id: doubt.id,
          created_by: currentUserId,
          receiver_id: answer.created_by,
          rating: ratingValue,
          comment: ratingComment,
        });
        toast.success('Answer Rated', 'Thank you for rating this answer!');
      }
      setShowRatingForm(false);
      // Re-fetch ratings from parent for authoritative data
      await onRatingSubmitted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const userFriendlyMsg = msg.includes('no_self_rating') ? 'You cannot rate your own answer.' : 'Failed to submit rating.';
      setRatingError(userFriendlyMsg);
      toast.error('Rating Failed', userFriendlyMsg);
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
      answer.is_accepted
        ? 'bg-emerald-50 border-emerald-300 shadow-sm'
        : 'bg-white border-slate-200'
    }`}>
      {/* Accepted badge — shown whenever answer.is_accepted is true from DB */}
      {answer.is_accepted && (
        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 w-fit">
          <span className="text-sm font-bold">✅ Accepted Answer</span>
        </div>
      )}

      {/* Avg rating pill */}
      {avgRatingValue !== null && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            Avg rating: {avgRatingValue}/10
          </span>
          <span className="text-[10px] text-slate-400">
            ({ratingCount} rating{ratingCount !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {/* Answerer + time */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{answererName}</span>
        {answer.answerer_profile?.department && (
          <><span className="text-slate-300">·</span><span>{answer.answerer_profile.department}</span></>
        )}
        <span className="text-slate-300">·</span>
        <span>{formatDate(answer.created_at)}</span>
      </div>

      {/* Answer text */}
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{displayText}</p>
      {isTruncated && (
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold transition-colors">
          {expanded ? 'Show less ▲' : 'Show more ▼'}
        </button>
      )}

      {/* Existing rating display */}
      {existingRating && !showRatingForm && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded font-bold">
            Your rating: {existingRating.rating}/10
          </span>
          {existingRating.comment && (
            <span className="text-slate-500 italic truncate max-w-[200px]">"{existingRating.comment}"</span>
          )}
          {canRate && (
            <button type="button" onClick={() => setShowRatingForm(true)}
              className="text-indigo-500 hover:text-indigo-700 font-semibold underline">
              Edit Rating
            </button>
          )}
        </div>
      )}

      {/* Rating form */}
      {canRate && showRatingForm && (
        <div className="border border-amber-200 rounded-xl p-3 space-y-2.5 bg-amber-50/40">
          <p className="text-xs font-bold text-slate-700">
            {existingRating ? 'Update your rating' : 'Rate this answer (1–10)'}
          </p>
          <RatingControl value={ratingValue} onChange={setRatingValue} disabled={ratingSubmitting} />
          <input
            type="text" value={ratingComment} onChange={(e) => setRatingComment(e.target.value)}
            placeholder="Optional comment (e.g. Very clear explanation)"
            className="w-full px-3 py-2 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
          />
          {ratingError && <p className="text-xs text-red-600">{ratingError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowRatingForm(false); setRatingError(''); }}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold transition-colors">
              Cancel
            </button>
            <button type="button" disabled={ratingSubmitting} onClick={handleRatingSubmit}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
              {ratingSubmitting ? 'Saving...' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}

      {/* Rate button (no existing rating, no form) */}
      {canRate && !showRatingForm && !existingRating && (
        <button type="button" onClick={() => setShowRatingForm(true)}
          className="text-xs text-amber-600 hover:text-amber-800 font-semibold transition-colors">
          ⭐ Rate this answer
        </button>
      )}

      {/* Accept button — hidden if answer.is_accepted is true OR canMark is false */}
      {canMark && (
        <button type="button" disabled={marking} onClick={handleMarkAccepted}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
          {marking ? 'Marking...' : '✅ Accept Answer'}
        </button>
      )}

      {/* Replies */}
      <ReplyThread
        answerId={answer.id}
        doubtId={doubt.id}
        currentUserId={currentUserId}
        replies={replies}
        canReply={canReply}
        onReplyPosted={onReplyPosted}
      />
    </div>
  );
};

// ──────────────────────────────────────────
// DOUBT DETAILS MODAL (main export)
// ──────────────────────────────────────────
export const DoubtDetailsModal: React.FC<DoubtDetailsModalProps> = ({
  doubt: initialDoubt,
  currentUserId,
  onClose,
  onDoubtUpdated,
  onDoubtDeleted,
}) => {
  const toast = useToast();

  // Local doubt state — synced from initialDoubt only when doubt ID changes
  const [doubt, setDoubt] = useState<DoubtPostWithProfile>(initialDoubt);
  const [answers, setAnswers] = useState<DoubtAnswerWithProfile[]>([]);
  const [ratings, setRatings] = useState<DoubtAnswerRating[]>([]);
  const [replies, setReplies] = useState<DoubtAnswerReplyWithProfile[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);

  // Track whether a mutation is in-flight so we don't allow concurrent refreshes
  const mutatingRef = useRef(false);

  // ── Derived permissions (computed from current local doubt state) ──
  const isCreator = doubt.created_by === currentUserId;
  const canAnswer = doubt.status === 'open' || doubt.status === 'answered';
  const canReply = doubt.status === 'open' || doubt.status === 'answered';
  // Creator can accept on open, answered, or solved (NOT closed)
  const canMarkAnswers = isCreator && (
    doubt.status === 'open' || doubt.status === 'answered' || doubt.status === 'solved'
  );
  const canDelete =
    isCreator &&
    (doubt.status === 'open' || doubt.status === 'closed') &&
    !loadingAnswers &&
    answers.length === 0;

  // ── Derived counters (update automatically when answers/replies change) ──
  const totalAnswers = answers.length;
  const acceptedAnswersCount = answers.filter((a) => a.is_accepted).length;
  const totalReplies = replies.length;

  // ── Full data load — fetches answers, ratings, replies fresh from Supabase ──
  const loadData = useCallback(async () => {
    setLoadingAnswers(true);
    try {
      const [a, r, rp] = await Promise.all([
        getAnswersForDoubt(doubt.id),
        getRatingsForDoubt(doubt.id),
        getRepliesForDoubt(doubt.id),
      ]);
      setAnswers(a);
      setRatings(r);
      setReplies(rp);
    } finally {
      setLoadingAnswers(false);
    }
  }, [doubt.id]);

  // Fetch on mount and whenever doubt ID changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync doubt STATUS from parent (e.g. board-level close/reopen) but ONLY when
  // we are not in the middle of a local mutation to avoid stomping our own updates.
  useEffect(() => {
    if (mutatingRef.current) return;
    if (initialDoubt.id !== doubt.id) {
      // Different doubt opened — full reset
      setDoubt(initialDoubt);
    } else {
      // Same doubt — only pull in status/solved_answer_id changes from parent
      setDoubt((prev) => ({
        ...prev,
        status: initialDoubt.status,
        solved_answer_id: initialDoubt.solved_answer_id,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDoubt]);

  // Propagate local doubt state changes back to the parent board
  const applyDoubtUpdate = useCallback((updated: DoubtPostWithProfile) => {
    setDoubt(updated);
    onDoubtUpdated(updated);
  }, [onDoubtUpdated]);

  // ── Refresh helpers (can be called by child components) ──
  const refreshRatings = useCallback(async () => {
    const r = await getRatingsForDoubt(doubt.id);
    setRatings(r);
  }, [doubt.id]);

  const refreshReplies = useCallback(async () => {
    const rp = await getRepliesForDoubt(doubt.id);
    setReplies(rp);
  }, [doubt.id]);

  // ── ACCEPT ANSWER ──
  const handleMarkAccepted = async (answerId: string) => {
    mutatingRef.current = true;
    try {
      await markDoubtSolved(doubt.id, answerId);

      // Re-fetch authoritative answers from DB — this is the single source of truth
      // for is_accepted flags. Never rely solely on optimistic state.
      const freshAnswers = await getAnswersForDoubt(doubt.id);
      setAnswers(freshAnswers);

      // Update local + parent doubt status to 'solved'
      const updated = { ...doubt, status: 'solved' as const };
      applyDoubtUpdate(updated);

      toast.success('Answer Accepted', 'You marked this answer as accepted! Doubt is now solved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Surface descriptive RLS/policy error so user can apply the SQL patch
      toast.error('Accept Failed', msg.includes('policy') ? msg : 'Could not accept answer. Please try again.');
    } finally {
      mutatingRef.current = false;
    }
  };

  // ── POST ANSWER ──
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) { setAnswerError('Answer cannot be empty.'); return; }
    setAnswerError('');
    setSubmittingAnswer(true);
    mutatingRef.current = true;
    try {
      await createAnswer({ doubt_id: doubt.id, answer_text: answerText, created_by: currentUserId });
      setAnswerText('');
      // Full refresh — DB trigger may have flipped status to 'answered'
      await loadData();
      if (doubt.status === 'open') {
        applyDoubtUpdate({ ...doubt, status: 'answered' as const });
      }
      toast.success('Answer Submitted', 'Your answer has been posted successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAnswerError('Failed to post answer. Please try again.');
      toast.error('Submission Failed', msg || 'Could not post answer.');
    } finally {
      setSubmittingAnswer(false);
      mutatingRef.current = false;
    }
  };

  // ── CLOSE DOUBT ──
  const handleClose = async () => {
    if (!window.confirm('Close this doubt? Students will no longer be able to answer.')) return;
    setClosing(true);
    mutatingRef.current = true;
    try {
      await closeDoubt(doubt.id);
      applyDoubtUpdate({ ...doubt, status: 'closed' as const });
      toast.success('Doubt Closed', 'The doubt post has been closed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Close Failed', msg || 'Could not close doubt.');
    } finally {
      setClosing(false);
      mutatingRef.current = false;
    }
  };

  // ── REOPEN DOUBT ──
  const handleReopen = async () => {
    if (!window.confirm('Reopen this doubt so students can answer again?')) return;
    setReopening(true);
    mutatingRef.current = true;
    try {
      const nextStatus: 'open' | 'answered' = answers.length > 0 ? 'answered' : 'open';
      await reopenDoubt(doubt.id, nextStatus);
      applyDoubtUpdate({ ...doubt, status: nextStatus });
      await loadData();
      toast.success('Doubt Reopened', 'The doubt is open for answers again.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Reopen Failed', msg || 'Could not reopen doubt.');
    } finally {
      setReopening(false);
      mutatingRef.current = false;
    }
  };

  // ── DELETE DOUBT ──
  const handleDelete = async () => {
    setDeleteError('');
    if (answers.length > 0) {
      setDeleteError('Cannot delete: this doubt has answers. Please close it instead.');
      return;
    }
    if (doubt.status === 'answered' || doubt.status === 'solved') {
      setDeleteError('Cannot delete an answered or solved doubt.');
      return;
    }
    if (!window.confirm('Delete this doubt permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteDoubt(doubt.id);
      onDoubtDeleted?.(doubt.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('policy') || msg.includes('permission') || msg.includes('violates')) {
        setDeleteError('Delete blocked by database policy. The doubt may already have answers or an invalid status.');
      } else {
        setDeleteError('Failed to delete. Please try again or contact support.');
      }
    } finally { setDeleting(false); }
  };

  // ── HELPERS ──
  const avgRating = (answerId: string): number | null => {
    const r = ratings.filter((rt) => rt.answer_id === answerId);
    if (r.length === 0) return null;
    return Math.round((r.reduce((s, rt) => s + rt.rating, 0) / r.length) * 10) / 10;
  };

  const HeaderAskerName = () => {
    if (doubt.is_anonymous) {
      return <span className="font-semibold">Anonymous Student</span>;
    }
    const name = doubt.creator_profile?.full_name || 'Campus Student';
    return (
      <button
        type="button"
        onClick={() => setViewProfileUserId(doubt.created_by)}
        className="font-semibold text-indigo-700 hover:underline focus:outline-none"
      >
        {name}
      </button>
    );
  };

  // ──────────────────────────────────────────
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">

          {/* ── Header ── */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-semibold border rounded-full ${getStatusStyle(doubt.status)}`}>
                  {getStatusIcon(doubt.status)} {doubt.status}
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  {doubt.category}
                </span>
                {doubt.is_anonymous && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                    Anonymous
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-900 leading-snug break-words">{doubt.title}</h3>
              <p className="text-xs text-slate-500">
                By <HeaderAskerName />
                {' · '}{formatDate(doubt.created_at)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doubt</h4>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{doubt.description}</p>
              {doubt.tags && doubt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doubt.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-medium rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Answer / reply counters */}
            {!loadingAnswers && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold rounded-full">
                  💬 {totalAnswers} Answer{totalAnswers !== 1 ? 's' : ''}
                </span>
                {acceptedAnswersCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full">
                    ✅ {acceptedAnswersCount} Accepted
                  </span>
                )}
                {totalReplies > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-full">
                    🗨️ {totalReplies} Repl{totalReplies !== 1 ? 'ies' : 'y'}
                  </span>
                )}
              </div>
            )}

            {/* Creator actions */}
            {isCreator && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(doubt.status === 'open' || doubt.status === 'answered') && (
                    <button onClick={handleClose} disabled={closing}
                      className="px-4 py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 text-xs font-bold rounded-lg transition-colors">
                      {closing ? 'Closing...' : '🔒 Close Doubt'}
                    </button>
                  )}
                  {doubt.status === 'closed' && (
                    <button onClick={handleReopen} disabled={reopening}
                      className="px-4 py-1.5 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-60 text-emerald-700 text-xs font-bold rounded-lg transition-colors">
                      {reopening ? 'Reopening...' : '🔓 Reopen Doubt'}
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} disabled={deleting}
                      className="px-4 py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-500 text-xs font-bold rounded-lg transition-colors">
                      {deleting ? 'Deleting...' : '🗑 Delete Doubt'}
                    </button>
                  )}
                </div>
                {deleteError && (
                  <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ⚠️ {deleteError}
                  </p>
                )}
              </div>
            )}

            {/* Status banners */}
            {doubt.status === 'closed' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold text-center">
                🔒 This doubt is closed. No new answers or replies can be posted.
              </div>
            )}
            {doubt.status === 'solved' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold text-center">
                ✅ This doubt has been solved!{' '}
                {isCreator
                  ? 'New answers are closed, but you can still accept any existing answer below.'
                  : 'An answer has been accepted by the asker.'}
              </div>
            )}

            {/* Answers */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {loadingAnswers
                  ? 'Loading answers...'
                  : totalAnswers === 0 ? 'No answers yet' : `${totalAnswers} Answer${totalAnswers !== 1 ? 's' : ''}`}
              </h4>

              {loadingAnswers ? (
                <div className="text-center py-6 text-slate-400 text-sm">Loading answers...</div>
              ) : totalAnswers === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">Be the first to help!</div>
              ) : (
                <div className="space-y-4">
                  {answers.map((answer) => {
                    const myRating = ratings.find((r) => r.answer_id === answer.id && r.created_by === currentUserId);
                    const avgVal = avgRating(answer.id);
                    const answerReplies = replies.filter((r) => r.answer_id === answer.id);
                    const ratingCount = ratings.filter((r) => r.answer_id === answer.id).length;

                    // canMark: only when creator + doubt not closed + THIS answer not already accepted
                    const canMarkThis = canMarkAnswers && !answer.is_accepted;

                    return (
                      <AnswerCard
                        key={answer.id}
                        answer={answer}
                        doubt={doubt}
                        currentUserId={currentUserId}
                        existingRating={myRating}
                        avgRatingValue={avgVal}
                        ratingCount={ratingCount}
                        replies={answerReplies}
                        canRate={
                          isCreator &&
                          answer.created_by !== currentUserId &&
                          (doubt.status === 'answered' || doubt.status === 'solved')
                        }
                        canMark={canMarkThis}
                        canReply={canReply}
                        onMarkAccepted={handleMarkAccepted}
                        onRatingSubmitted={refreshRatings}
                        onReplyPosted={refreshReplies}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Answer form */}
            {canAnswer && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Answer</h4>
                <textarea
                  value={answerText}
                  onChange={(e) => { setAnswerText(e.target.value); setAnswerError(''); }}
                  rows={4}
                  placeholder="Write a clear, detailed answer. Plain text only."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                />
                {answerError && <p className="text-xs text-red-600 font-medium">{answerError}</p>}
                <button
                  type="button"
                  disabled={submittingAnswer || !answerText.trim()}
                  onClick={handleSubmitAnswer}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                >
                  {submittingAnswer ? 'Posting Answer...' : '📤 Post Answer'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewProfileUserId && (
        <PublicProfileModal
          userId={viewProfileUserId}
          onClose={() => setViewProfileUserId(null)}
          layer="top"
        />
      )}
    </>
  );
};
