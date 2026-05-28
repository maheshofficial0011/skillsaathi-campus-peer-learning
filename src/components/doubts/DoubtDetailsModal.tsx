import React, { useState, useEffect, useCallback } from 'react';
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
  rateDoubtAnswer,
  updateDoubtAnswerRating,
  createAnswerReply,
} from '../../lib/doubts';
import { getDisplayName, getStatusStyle, getStatusIcon } from './DoubtCard';

interface DoubtDetailsModalProps {
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  onClose: () => void;
  onDoubtUpdated: (updated: DoubtPostWithProfile) => void;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ──────────────────────────────────────────
// STAR / NUMBER RATING CONTROL (1-10)
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
  onReplyAdded: (reply: DoubtAnswerReplyWithProfile) => void;
}> = ({ answerId, doubtId, currentUserId, replies, canReply, onReplyAdded }) => {
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
      const r = await createAnswerReply({
        answer_id: answerId,
        doubt_id: doubtId,
        reply_text: replyText,
        created_by: currentUserId,
        is_anonymous: replyAnon,
      });
      if (r) {
        onReplyAdded(r);
        setReplyText('');
        setShowForm(false);
        setExpanded(true);
      }
    } catch {
      setError('Failed to post reply. Please try again.');
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
      {/* Toggle replies header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-500 hover:text-indigo-600 font-semibold py-0.5 transition-colors"
        >
          {answerReplies.length > 0
            ? `${expanded ? '▲ Hide' : '▼ Show'} ${answerReplies.length} repl${answerReplies.length === 1 ? 'y' : 'ies'}`
            : expanded
            ? '▲ Hide replies'
            : '💬 Replies (0)'}
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

      {/* Existing replies */}
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

      {/* Reply form */}
      {expanded && showForm && canReply && (
        <div className="mt-2 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write your cross-question or follow-up here…"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs resize-y focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 whitespace-pre-wrap break-words"
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
              {submitting ? 'Posting…' : 'Post Reply'}
            </button>
          </div>
          {error && <p className="text-red-500 text-[10px]">{error}</p>}
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// ANSWER CARD (inline, inside modal)
// ──────────────────────────────────────────
const AnswerCard: React.FC<{
  answer: DoubtAnswerWithProfile;
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  existingRating?: DoubtAnswerRating;
  replies: DoubtAnswerReplyWithProfile[];
  canRate: boolean;
  canMark: boolean;
  canReply: boolean;
  onMarkAccepted: (answerId: string) => Promise<void>;
  onRated: (rating: DoubtAnswerRating) => void;
  onReplyAdded: (reply: DoubtAnswerReplyWithProfile) => void;
}> = ({
  answer,
  doubt,
  currentUserId,
  existingRating,
  replies,
  canRate,
  canMark,
  canReply,
  onMarkAccepted,
  onRated,
  onReplyAdded,
}) => {
  const TRUNCATE_AT = 400;
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);

  // Rating state
  const [ratingValue, setRatingValue] = useState(existingRating?.rating ?? 5);
  const [ratingComment, setRatingComment] = useState(existingRating?.comment ?? '');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [showRatingForm, setShowRatingForm] = useState(false);

  const answererName = answer.answerer_profile?.full_name || 'Campus Student';
  const isTruncated = answer.answer_text.length > TRUNCATE_AT;
  const displayText = isTruncated && !expanded
    ? answer.answer_text.slice(0, TRUNCATE_AT) + '…'
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
      let result: DoubtAnswerRating | null = null;
      if (existingRating) {
        result = await updateDoubtAnswerRating(existingRating.id, {
          rating: ratingValue,
          comment: ratingComment,
        });
      } else {
        result = await rateDoubtAnswer({
          answer_id: answer.id,
          doubt_id: doubt.id,
          created_by: currentUserId,
          receiver_id: answer.created_by,
          rating: ratingValue,
          comment: ratingComment,
        });
      }
      if (result) {
        onRated(result);
        setShowRatingForm(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRatingError(msg.includes('no_self_rating') ? 'You cannot rate your own answer.' : 'Failed to submit rating. Please try again.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border space-y-3 ${
      answer.is_accepted
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-slate-200'
    }`}>
      {/* Accepted badge */}
      {answer.is_accepted && (
        <div className="flex items-center gap-1.5 text-emerald-700">
          <span className="text-sm font-bold">✅ Accepted Answer</span>
        </div>
      )}

      {/* Answerer + time */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{answererName}</span>
        {answer.answerer_profile?.department && (
          <>
            <span className="text-slate-300">·</span>
            <span>{answer.answerer_profile.department}</span>
          </>
        )}
        <span className="text-slate-300">·</span>
        <span>{formatDate(answer.created_at)}</span>
      </div>

      {/* Answer text */}
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{displayText}</p>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold transition-colors"
        >
          {expanded ? 'Show less ▲' : 'Show more ▼'}
        </button>
      )}

      {/* Rating display */}
      {existingRating && !showRatingForm && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded font-bold">
            Your rating: {existingRating.rating}/10
          </span>
          {existingRating.comment && (
            <span className="text-slate-500 italic truncate max-w-[200px]">"{existingRating.comment}"</span>
          )}
          {canRate && (
            <button
              type="button"
              onClick={() => setShowRatingForm(true)}
              className="text-indigo-500 hover:text-indigo-700 font-semibold underline"
            >
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
            type="text"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            placeholder="Optional comment (e.g. Very clear explanation)"
            className="w-full px-3 py-2 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 transition-colors"
          />
          {ratingError && <p className="text-xs text-red-600">{ratingError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowRatingForm(false); setRatingError(''); }}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={ratingSubmitting}
              onClick={handleRatingSubmit}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              {ratingSubmitting ? 'Saving…' : existingRating ? 'Update Rating' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}

      {/* Show rating button if not yet shown */}
      {canRate && !showRatingForm && !existingRating && (
        <button
          type="button"
          onClick={() => setShowRatingForm(true)}
          className="text-xs text-amber-600 hover:text-amber-800 font-semibold transition-colors"
        >
          ⭐ Rate this answer
        </button>
      )}

      {/* Mark as accepted */}
      {canMark && !answer.is_accepted && (
        <button
          type="button"
          disabled={marking}
          onClick={handleMarkAccepted}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          {marking ? 'Marking…' : '✅ Mark as Accepted'}
        </button>
      )}

      {/* Replies */}
      <ReplyThread
        answerId={answer.id}
        doubtId={doubt.id}
        currentUserId={currentUserId}
        replies={replies}
        canReply={canReply}
        onReplyAdded={onReplyAdded}
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
}) => {
  const [doubt, setDoubt] = useState<DoubtPostWithProfile>(initialDoubt);
  const [answers, setAnswers] = useState<DoubtAnswerWithProfile[]>([]);
  const [ratings, setRatings] = useState<DoubtAnswerRating[]>([]);
  const [replies, setReplies] = useState<DoubtAnswerReplyWithProfile[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [closing, setClosing] = useState(false);

  const isCreator = doubt.created_by === currentUserId;
  const canAnswer = doubt.status === 'open' || doubt.status === 'answered';
  const canReply = canAnswer;

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

  useEffect(() => { loadData(); }, [loadData]);

  // Keep local doubt in sync with parent updates
  useEffect(() => { setDoubt(initialDoubt); }, [initialDoubt]);

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) { setAnswerError('Answer cannot be empty.'); return; }
    setAnswerError('');
    setSubmittingAnswer(true);
    try {
      const newAnswer = await createAnswer({
        doubt_id: doubt.id,
        answer_text: answerText,
        created_by: currentUserId,
      });
      if (newAnswer) {
        setAnswers((prev) => [...prev, newAnswer]);
        setAnswerText('');
        // Optimistically update status to answered if was open
        if (doubt.status === 'open') {
          const updated = { ...doubt, status: 'answered' as const };
          setDoubt(updated);
          onDoubtUpdated(updated);
        }
      }
    } catch {
      setAnswerError('Failed to post answer. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleMarkAccepted = async (answerId: string) => {
    await markDoubtSolved(doubt.id, answerId);
    const updated = { ...doubt, status: 'solved' as const, solved_answer_id: answerId };
    setDoubt(updated);
    onDoubtUpdated(updated);
    setAnswers((prev) => prev.map((a) => ({ ...a, is_accepted: a.id === answerId })));
  };

  const handleClose = async () => {
    if (!window.confirm('Close this doubt? Students will no longer be able to answer.')) return;
    setClosing(true);
    try {
      await closeDoubt(doubt.id);
      const updated = { ...doubt, status: 'closed' as const };
      setDoubt(updated);
      onDoubtUpdated(updated);
    } catch {
      // ignore
    } finally {
      setClosing(false);
    }
  };

  const handleRated = (newRating: DoubtAnswerRating) => {
    setRatings((prev) => {
      const idx = prev.findIndex((r) => r.id === newRating.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = newRating;
        return updated;
      }
      return [...prev, newRating];
    });
  };

  const handleReplyAdded = (reply: DoubtAnswerReplyWithProfile) => {
    setReplies((prev) => [...prev, reply]);
  };

  const avgRating = (answerId: string): number | null => {
    const r = ratings.filter((rt) => rt.answer_id === answerId);
    if (r.length === 0) return null;
    return Math.round((r.reduce((s, rt) => s + rt.rating, 0) / r.length) * 10) / 10;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-semibold border rounded-full ${getStatusStyle(doubt.status)}`}>
                {getStatusIcon(doubt.status)} {doubt.status}
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">
                {doubt.category}
              </span>
            </div>
            <h3 className="font-bold text-lg text-slate-900 leading-snug break-words">{doubt.title}</h3>
            <p className="text-xs text-slate-500">
              By <span className="font-semibold">{getDisplayName(doubt)}</span>
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

        {/* Scrollable body */}
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

          {/* Creator controls */}
          {isCreator && (doubt.status === 'open' || doubt.status === 'answered') && (
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                disabled={closing}
                className="px-4 py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 text-xs font-bold rounded-lg transition-colors"
              >
                {closing ? 'Closing…' : '🔒 Close Doubt'}
              </button>
            </div>
          )}

          {/* Closed / Solved banner */}
          {doubt.status === 'closed' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold text-center">
              🔒 This doubt is closed. No new answers or replies can be posted.
            </div>
          )}
          {doubt.status === 'solved' && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700 font-semibold text-center">
              ✅ This doubt has been solved! An answer has been accepted.
            </div>
          )}

          {/* Answers section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {answers.length === 0
                ? 'No answers yet'
                : `${answers.length} Answer${answers.length !== 1 ? 's' : ''}`}
            </h4>

            {loadingAnswers ? (
              <div className="text-center py-6 text-slate-400 text-sm">Loading answers…</div>
            ) : answers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                Be the first to help!
              </div>
            ) : (
              <div className="space-y-4">
                {answers.map((answer) => {
                  const myRating = ratings.find(
                    (r) => r.answer_id === answer.id && r.created_by === currentUserId
                  );
                  const avg = avgRating(answer.id);
                  const answerReplies = replies.filter((r) => r.answer_id === answer.id);

                  return (
                    <div key={answer.id}>
                      {avg !== null && (
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Avg rating: {avg}/10
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({ratings.filter((r) => r.answer_id === answer.id).length} rating{ratings.filter((r) => r.answer_id === answer.id).length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      )}
                      <AnswerCard
                        answer={answer}
                        doubt={doubt}
                        currentUserId={currentUserId}
                        existingRating={myRating}
                        replies={answerReplies}
                        canRate={
                          isCreator &&
                          answer.created_by !== currentUserId &&
                          (doubt.status === 'answered' || doubt.status === 'solved')
                        }
                        canMark={
                          isCreator &&
                          !answer.is_accepted &&
                          (doubt.status === 'open' || doubt.status === 'answered')
                        }
                        canReply={canReply}
                        onMarkAccepted={handleMarkAccepted}
                        onRated={handleRated}
                        onReplyAdded={handleReplyAdded}
                      />
                    </div>
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
                placeholder="Write a clear, detailed answer. Markdown is not supported — plain text only."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 whitespace-pre-wrap break-words transition-colors"
              />
              {answerError && <p className="text-xs text-red-600 font-medium">{answerError}</p>}
              <button
                type="button"
                disabled={submittingAnswer || !answerText.trim()}
                onClick={handleSubmitAnswer}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
              >
                {submittingAnswer ? 'Posting Answer…' : '📤 Post Answer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
