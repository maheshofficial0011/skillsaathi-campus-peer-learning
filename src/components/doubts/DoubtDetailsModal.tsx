import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  DoubtPostWithProfile,
  DoubtAnswerWithProfile,
  DoubtAnswerRating,
  DoubtAnswerReplyWithProfile,
  DoubtAnswerLike,
  DoubtReplyLike,
} from '../../types';
import {
  getAnswersForDoubt,
  getRatingsForDoubt,
  getRepliesForDoubt,
  getAnswerLikesForDoubt,
  getReplyLikesForDoubt,
  createAnswer,
  markDoubtSolved,
  closeDoubt,
  reopenDoubt,
  deleteDoubt,
  rateDoubtAnswer,
  updateDoubtAnswerRating,
  createAnswerReply,
  toggleAnswerLike,
  toggleReplyLike,
  toggleAnswerPin,
} from '../../lib/doubts';
import { getStatusStyle, getStatusIcon } from './DoubtCard';
import { PublicProfileModal } from '../profile/PublicProfileModal';
import { useToast } from '../../hooks/useToast';

// ──────────────────────────────────────────
// CONSTANTS & HELPERS
// ──────────────────────────────────────────

/** Number of replies shown before "Show more replies" */
const REPLIES_INITIALLY_VISIBLE = 3;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

const getAvatarColor = (name: string) => {
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

/** Sort answers YouTube-style. Pinned always float to top. */
const sortAnswers = (
  answers: DoubtAnswerWithProfile[],
  order: 'top' | 'newest',
  ratings: DoubtAnswerRating[],
  answerLikes: DoubtAnswerLike[]
): DoubtAnswerWithProfile[] =>
  [...answers].sort((a, b) => {
    const aPinned = !!a.is_pinned;
    const bPinned = !!b.is_pinned;
    if (aPinned !== bPinned) return bPinned ? 1 : -1;
    if (order === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    // Top sort: accepted → likes → avg rating → newest
    if (a.is_accepted !== b.is_accepted) return b.is_accepted ? 1 : -1;
    const aLikes = answerLikes.filter((l) => l.answer_id === a.id).length;
    const bLikes = answerLikes.filter((l) => l.answer_id === b.id).length;
    if (aLikes !== bLikes) return bLikes - aLikes;
    const aR = ratings.filter((r) => r.answer_id === a.id);
    const bR = ratings.filter((r) => r.answer_id === b.id);
    const aAvg = aR.length ? aR.reduce((s, r) => s + r.rating, 0) / aR.length : 0;
    const bAvg = bR.length ? bR.reduce((s, r) => s + r.rating, 0) / bR.length : 0;
    if (aAvg !== bAvg) return bAvg - aAvg;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

// ──────────────────────────────────────────
// AVATAR
// ──────────────────────────────────────────
const Avatar: React.FC<{ name: string; size?: 'xs' | 'sm' | 'md' }> = ({ name, size = 'md' }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const color = getAvatarColor(name);
  const sizeClass =
    size === 'xs' ? 'w-5 h-5 text-[9px]' :
    size === 'sm' ? 'w-6 h-6 text-[10px]' :
                   'w-8 h-8 text-xs';
  return (
    <div className={`shrink-0 rounded-full flex items-center justify-center font-bold select-none ${color} ${sizeClass}`}>
      {initial}
    </div>
  );
};

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
        className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
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
// INLINE REPLY COMPOSER
// ──────────────────────────────────────────
interface ReplyComposerProps {
  answerId: string;
  doubtId: string;
  currentUserId: string;
  initialText?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPosted: () => Promise<void>;
  onCancel: () => void;
}

const ReplyComposer: React.FC<ReplyComposerProps> = ({
  answerId, doubtId, currentUserId, initialText = '', textareaRef, onPosted, onCancel,
}) => {
  const toast = useToast();
  const [text, setText] = useState(initialText);
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || localRef;

  // When initial text changes (e.g. @mention prefill), sync it
  useEffect(() => { setText(initialText); }, [initialText]);

  const handleSubmit = async () => {
    if (!text.trim()) { setError('Reply cannot be empty.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await createAnswerReply({
        answer_id: answerId,
        doubt_id: doubtId,
        reply_text: text,
        created_by: currentUserId,
        is_anonymous: anon,
      });
      setText('');
      await onPosted();
      toast.success('Reply Posted', 'Your reply is now live.');
    } catch {
      setError('Failed to post reply. Please try again.');
      toast.error('Reply Failed', 'Could not post your reply.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={text}
        onChange={(e) => { setText(e.target.value); setError(''); }}
        rows={2}
        placeholder="Write your follow-up or cross-question…"
        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
      />
      {error && <p className="text-red-500 text-[10px]">{error}</p>}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-slate-500 text-[11px]">Reply anonymously</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !text.trim()}
            onClick={handleSubmit}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-md transition-colors"
          >
            {submitting ? 'Posting…' : 'Reply'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// REPLY CARD (single reply)
// ──────────────────────────────────────────
interface ReplyCardProps {
  reply: DoubtAnswerReplyWithProfile;
  currentUserId: string;
  likeCount: number;
  isLiked: boolean;
  canReply: boolean;
  onToggleLike: () => Promise<void>;
  onReplyToThis: (authorName: string) => void;
  onViewProfile: (userId: string) => void;
}

const ReplyCard: React.FC<ReplyCardProps> = ({
  reply, currentUserId: _uid, likeCount, isLiked, canReply,
  onToggleLike, onReplyToThis, onViewProfile,
}) => {
  const [liking, setLiking] = useState(false);
  const isAnon = reply.is_anonymous;
  const authorName = isAnon
    ? 'Anonymous Student'
    : reply.author_profile?.full_name || 'Campus Student';

  const handleLike = async () => {
    setLiking(true);
    try { await onToggleLike(); } finally { setLiking(false); }
  };

  return (
    <div className="flex gap-2 min-w-0">
      <Avatar name={authorName} size="xs" />
      <div className="flex-1 min-w-0">
        {/* Author + date */}
        <div className="flex items-baseline gap-1.5 flex-wrap text-[11px] leading-none mb-0.5">
          {isAnon ? (
            <span className="font-semibold text-slate-500">{authorName}</span>
          ) : (
            <button
              type="button"
              onClick={() => onViewProfile(reply.created_by)}
              className="font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
            >
              {authorName}
            </button>
          )}
          <span className="text-slate-400">{formatDate(reply.created_at)}</span>
        </div>
        {/* Reply text */}
        <p className="text-xs text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{reply.reply_text}</p>
        {/* Action row */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <button
            type="button"
            disabled={liking}
            onClick={handleLike}
            className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${
              isLiked ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'
            }`}
          >
            {isLiked ? '👍' : '👍'}{' '}
            <span>{likeCount > 0 ? likeCount : ''}</span>
          </button>
          {canReply && (
            <button
              type="button"
              onClick={() => onReplyToThis(authorName)}
              className="text-[11px] font-semibold text-slate-400 hover:text-indigo-500 transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// REPLY THREAD
// Handles: show/hide, show-more, reply composer, reply-to-reply mention
// ──────────────────────────────────────────
interface ReplyThreadProps {
  answerId: string;
  doubtId: string;
  currentUserId: string;
  replies: DoubtAnswerReplyWithProfile[];
  replyLikes: DoubtReplyLike[];
  canReply: boolean;
  /** True when the composer should be opened from outside (e.g. action row Reply button) */
  externalOpenComposer: boolean;
  onExternalComposerHandled: () => void;
  onReplyPosted: () => Promise<void>;
  onToggleReplyLike: (replyId: string) => Promise<void>;
  onViewProfile: (userId: string) => void;
}

const ReplyThread: React.FC<ReplyThreadProps> = ({
  answerId, doubtId, currentUserId, replies, replyLikes,
  canReply, externalOpenComposer, onExternalComposerHandled,
  onReplyPosted, onToggleReplyLike, onViewProfile,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [mentionText, setMentionText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const replyCount = replies.length;
  const hasMore = replyCount > REPLIES_INITIALLY_VISIBLE;
  const visibleReplies = expanded
    ? showAll ? replies : replies.slice(0, REPLIES_INITIALLY_VISIBLE)
    : [];
  const hiddenCount = replyCount - REPLIES_INITIALLY_VISIBLE;

  // Open composer from outside (action row Reply button)
  useEffect(() => {
    if (externalOpenComposer) {
      setMentionText('');
      setShowComposer(true);
      setExpanded(true);
      onExternalComposerHandled();
      setTimeout(() => textareaRef.current?.focus(), 60);
    }
  }, [externalOpenComposer, onExternalComposerHandled]);

  const handleReplyToReply = (authorName: string) => {
    if (!canReply) return;
    const mention = `@${authorName} `;
    setMentionText(mention);
    setShowComposer(true);
    setExpanded(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(mention.length, mention.length);
      }
    }, 60);
  };

  const handlePosted = async () => {
    setShowComposer(false);
    setMentionText('');
    setExpanded(true);
    setShowAll(true); // show all so newly posted reply is visible
    await onReplyPosted();
  };

  const handleCancel = () => {
    setShowComposer(false);
    setMentionText('');
  };

  if (replyCount === 0 && !canReply) return null;

  return (
    // Vertical connector line: left-4 is avatar width/2, matches reply avatar offset
    <div className="mt-2 ml-4 pl-3 border-l-2 border-slate-100">
      {/* Show/hide toggle */}
      {replyCount > 0 && (
        <button
          type="button"
          onClick={() => { setExpanded((v) => !v); if (!expanded) setShowAll(false); }}
          className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {expanded
            ? `▲ Hide replies`
            : `▼ Show ${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}`}
        </button>
      )}

      {/* Replies list */}
      {expanded && replyCount > 0 && (
        <div className="mt-2 space-y-3">
          {visibleReplies.map((r) => (
            <ReplyCard
              key={r.id}
              reply={r}
              currentUserId={currentUserId}
              likeCount={replyLikes.filter((l) => l.reply_id === r.id).length}
              isLiked={replyLikes.some((l) => l.reply_id === r.id && l.created_by === currentUserId)}
              canReply={canReply}
              onToggleLike={() => onToggleReplyLike(r.id)}
              onReplyToThis={handleReplyToReply}
              onViewProfile={onViewProfile}
            />
          ))}

          {/* Show more / show less */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              {showAll
                ? '▲ Show fewer replies'
                : `▼ Show ${hiddenCount} more repl${hiddenCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>
      )}

      {/* Inline reply composer */}
      {showComposer && canReply && (
        <ReplyComposer
          answerId={answerId}
          doubtId={doubtId}
          currentUserId={currentUserId}
          initialText={mentionText}
          textareaRef={textareaRef}
          onPosted={handlePosted}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

// ──────────────────────────────────────────
// ANSWER CARD (YouTube comment style)
// ──────────────────────────────────────────
interface AnswerCardProps {
  answer: DoubtAnswerWithProfile;
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  ratings: DoubtAnswerRating[];           // filtered for this answer
  replies: DoubtAnswerReplyWithProfile[]; // filtered for this answer
  answerLikes: DoubtAnswerLike[];         // full array — card filters by answer_id
  replyLikes: DoubtReplyLike[];
  canRate: boolean;
  canMark: boolean;
  canPin: boolean;
  canReply: boolean;
  onMarkAccepted: (answerId: string) => Promise<void>;
  onTogglePin: (answerId: string, currentlyPinned: boolean) => Promise<void>;
  onToggleAnswerLike: (answerId: string) => Promise<void>;
  onRatingSubmitted: () => Promise<void>;
  onReplyPosted: () => Promise<void>;
  onToggleReplyLike: (replyId: string) => Promise<void>;
  onViewProfile: (userId: string) => void;
}

const AnswerCard: React.FC<AnswerCardProps> = ({
  answer, doubt, currentUserId,
  ratings, replies, answerLikes, replyLikes,
  canRate, canMark, canPin, canReply,
  onMarkAccepted, onTogglePin, onToggleAnswerLike,
  onRatingSubmitted, onReplyPosted, onToggleReplyLike, onViewProfile,
}) => {
  const toast = useToast();
  const TRUNCATE_AT = 500;
  const [textExpanded, setTextExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  // Triggers opening the reply composer from the action-row Reply button
  const [openComposer, setOpenComposer] = useState(false);

  // Derived values
  const myRating = ratings.find((r) => r.created_by === currentUserId);
  const avgRatingValue = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
    : null;
  const ratingCount = ratings.length;
  const likeCount = answerLikes.filter((l) => l.answer_id === answer.id).length;
  const isLiked = answerLikes.some((l) => l.answer_id === answer.id && l.created_by === currentUserId);
  const isPinned = !!answer.is_pinned;
  const answererName = answer.answerer_profile?.full_name || 'Campus Student';
  const isTruncated = answer.answer_text.length > TRUNCATE_AT;
  const displayText = isTruncated && !textExpanded
    ? answer.answer_text.slice(0, TRUNCATE_AT) + '…'
    : answer.answer_text;

  // Sync rating form inputs
  useEffect(() => {
    setRatingValue(myRating?.rating ?? 5);
    setRatingComment(myRating?.comment ?? '');
  }, [myRating?.id, myRating?.rating, myRating?.comment]);

  const handleMarkAccepted = async () => {
    setMarking(true);
    try { await onMarkAccepted(answer.id); } finally { setMarking(false); }
  };
  const handleTogglePin = async () => {
    setPinning(true);
    try { await onTogglePin(answer.id, isPinned); } finally { setPinning(false); }
  };
  const handleToggleLike = async () => {
    setLiking(true);
    try { await onToggleAnswerLike(answer.id); } finally { setLiking(false); }
  };

  const handleRatingSubmit = async () => {
    setRatingError('');
    setRatingSubmitting(true);
    try {
      if (myRating) {
        await updateDoubtAnswerRating(myRating.id, { rating: ratingValue, comment: ratingComment });
        toast.success('Rating Updated', 'Your rating has been updated.');
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
      await onRatingSubmitted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes('no_self_rating') ? 'You cannot rate your own answer.' : 'Failed to submit rating.';
      setRatingError(friendly);
      toast.error('Rating Failed', friendly);
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Left border color: pinned > accepted > default
  const borderClass = isPinned
    ? 'border-l-4 border-l-amber-400 border-slate-100'
    : answer.is_accepted
    ? 'border-l-4 border-l-emerald-400 border-slate-100'
    : 'border-slate-100';

  return (
    <div className={`border rounded-xl p-4 space-y-3 bg-white ${borderClass}`}>
      {/* ── Header: avatar + name + meta ── */}
      <div className="flex items-start gap-3">
        <Avatar name={answererName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] leading-snug">
            <button
              type="button"
              onClick={() => onViewProfile(answer.created_by)}
              className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
            >
              {answererName}
            </button>
            {answer.answerer_profile?.department && (
              <span className="text-slate-400 text-[11px]">· {answer.answerer_profile.department}</span>
            )}
            {answer.answerer_profile?.year_of_study && (
              <span className="text-slate-400 text-[11px]">· {answer.answerer_profile.year_of_study}</span>
            )}
            <span className="text-slate-400 text-[11px]">· {formatDate(answer.created_at)}</span>
          </div>

          {/* Badges inline under name */}
          {(isPinned || answer.is_accepted || avgRatingValue !== null) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  📌 Pinned by asker
                </span>
              )}
              {answer.is_accepted && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  ✅ Accepted Answer
                </span>
              )}
              {avgRatingValue !== null && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                  ⭐ {avgRatingValue}/10
                  <span className="text-slate-400 ml-0.5">({ratingCount})</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Answer text ── */}
      <div className="pl-11"> {/* indent to align with text under avatar */}
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{displayText}</p>
        {isTruncated && (
          <button
            type="button"
            onClick={() => setTextExpanded((v) => !v)}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold mt-1 transition-colors"
          >
            {textExpanded ? 'Show less ▲' : 'Show more ▼'}
          </button>
        )}

        {/* Existing rating display */}
        {myRating && !showRatingForm && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] mt-2">
            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded font-semibold">
              Your rating: {myRating.rating}/10
            </span>
            {myRating.comment && (
              <span className="text-slate-400 italic truncate max-w-[200px]">"{myRating.comment}"</span>
            )}
            {canRate && (
              <button
                type="button"
                onClick={() => setShowRatingForm(true)}
                className="text-indigo-500 hover:text-indigo-700 font-semibold underline"
              >
                Edit
              </button>
            )}
          </div>
        )}

        {/* Rating form */}
        {showRatingForm && canRate && (
          <div className="border border-amber-200 rounded-xl p-3 space-y-2.5 bg-amber-50/50 mt-2">
            <p className="text-xs font-bold text-slate-700">
              {myRating ? 'Update your rating (1–10)' : 'Rate this answer (1–10)'}
            </p>
            <RatingControl value={ratingValue} onChange={setRatingValue} disabled={ratingSubmitting} />
            <input
              type="text"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Optional comment…"
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
                {ratingSubmitting ? 'Saving…' : myRating ? 'Update' : 'Submit Rating'}
              </button>
            </div>
          </div>
        )}

        {/* ── Action row ── */}
        <div className="flex items-center gap-3 flex-wrap mt-2 text-[12px]">
          {/* Like */}
          <button
            type="button"
            disabled={liking}
            onClick={handleToggleLike}
            className={`flex items-center gap-1 font-semibold transition-colors ${
              isLiked ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'
            } disabled:opacity-60`}
          >
            <span>👍</span>
            <span>{likeCount > 0 ? likeCount : ''}</span>
          </button>

          {/* Reply — opens the inline reply composer in ReplyThread */}
          {canReply && (
            <button
              type="button"
              onClick={() => setOpenComposer(true)}
              className="font-semibold text-slate-400 hover:text-indigo-500 transition-colors"
            >
              Reply
            </button>
          )}

          {/* Rate */}
          {canRate && !showRatingForm && !myRating && (
            <button
              type="button"
              onClick={() => setShowRatingForm(true)}
              className="font-semibold text-slate-400 hover:text-amber-600 transition-colors"
            >
              ⭐ Rate
            </button>
          )}

          {/* Accept */}
          {canMark && (
            <button
              type="button"
              disabled={marking}
              onClick={handleMarkAccepted}
              className="font-semibold text-slate-400 hover:text-emerald-600 disabled:opacity-60 transition-colors"
            >
              {marking ? 'Accepting…' : '✅ Accept'}
            </button>
          )}

          {/* Pin / Unpin */}
          {canPin && (
            <button
              type="button"
              disabled={pinning}
              onClick={handleTogglePin}
              className={`font-semibold transition-colors disabled:opacity-60 ${
                isPinned
                  ? 'text-amber-600 hover:text-amber-800'
                  : 'text-slate-400 hover:text-amber-600'
              }`}
            >
              {pinning ? '…' : isPinned ? '📌 Unpin' : '📌 Pin'}
            </button>
          )}
        </div>

        {/* ── Reply thread ── */}
        <ReplyThread
          answerId={answer.id}
          doubtId={doubt.id}
          currentUserId={currentUserId}
          replies={replies}
          replyLikes={replyLikes}
          canReply={canReply}
          externalOpenComposer={openComposer}
          onExternalComposerHandled={() => setOpenComposer(false)}
          onReplyPosted={onReplyPosted}
          onToggleReplyLike={onToggleReplyLike}
          onViewProfile={onViewProfile}
        />
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// DOUBT DETAILS MODAL (main export)
// ──────────────────────────────────────────
interface DoubtDetailsModalProps {
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  onClose: () => void;
  onDoubtUpdated: (updated: DoubtPostWithProfile) => void;
  onDoubtDeleted?: (doubtId: string) => void;
}

export const DoubtDetailsModal: React.FC<DoubtDetailsModalProps> = ({
  doubt: initialDoubt,
  currentUserId,
  onClose,
  onDoubtUpdated,
  onDoubtDeleted,
}) => {
  const toast = useToast();

  const [doubt, setDoubt] = useState<DoubtPostWithProfile>(initialDoubt);
  const [answers, setAnswers] = useState<DoubtAnswerWithProfile[]>([]);
  const [ratings, setRatings] = useState<DoubtAnswerRating[]>([]);
  const [replies, setReplies] = useState<DoubtAnswerReplyWithProfile[]>([]);
  const [answerLikes, setAnswerLikes] = useState<DoubtAnswerLike[]>([]);
  const [replyLikes, setReplyLikes] = useState<DoubtReplyLike[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(true);
  const [sortOrder, setSortOrder] = useState<'top' | 'newest'>('top');
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);
  const mutatingRef = useRef(false);

  // ── Permissions ──
  const isCreator = doubt.created_by === currentUserId;
  const canAnswer = doubt.status === 'open' || doubt.status === 'answered';
  const canReply = doubt.status !== 'closed';
  const canMarkAnswers = isCreator && doubt.status !== 'closed';
  const canPin = isCreator && doubt.status !== 'closed';
  const canDelete =
    isCreator &&
    (doubt.status === 'open' || doubt.status === 'closed') &&
    !loadingAnswers &&
    answers.length === 0;

  // ── Sorted answers ──
  const sortedAnswers = useMemo(
    () => sortAnswers(answers, sortOrder, ratings, answerLikes),
    [answers, sortOrder, ratings, answerLikes]
  );

  // ── Counters ──
  const totalAnswers = answers.length;
  const acceptedCount = answers.filter((a) => a.is_accepted).length;
  const pinnedCount = answers.filter((a) => !!a.is_pinned).length;
  const totalReplies = replies.length;
  const totalAnswerLikes = answerLikes.length;

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoadingAnswers(true);
    try {
      const [r0, r1, r2, r3, r4] = await Promise.allSettled([
        getAnswersForDoubt(doubt.id),
        getRatingsForDoubt(doubt.id),
        getRepliesForDoubt(doubt.id),
        getAnswerLikesForDoubt(doubt.id),
        getReplyLikesForDoubt(doubt.id),
      ]);
      if (r0.status === 'fulfilled') setAnswers(r0.value);
      if (r1.status === 'fulfilled') setRatings(r1.value);
      if (r2.status === 'fulfilled') setReplies(r2.value);
      if (r3.status === 'fulfilled') setAnswerLikes(r3.value);
      if (r4.status === 'fulfilled') setReplyLikes(r4.value);
    } finally {
      setLoadingAnswers(false);
    }
  }, [doubt.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Sync initialDoubt without stomping mutations
  useEffect(() => {
    if (mutatingRef.current) return;
    if (initialDoubt.id !== doubt.id) {
      setDoubt(initialDoubt);
    } else {
      setDoubt((prev) => ({ ...prev, status: initialDoubt.status, solved_answer_id: initialDoubt.solved_answer_id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDoubt]);

  const applyDoubtUpdate = useCallback(
    (updated: DoubtPostWithProfile) => { setDoubt(updated); onDoubtUpdated(updated); },
    [onDoubtUpdated]
  );

  // ── Refresh helpers ──
  const refreshAnswers = useCallback(async () => {
    try { setAnswers(await getAnswersForDoubt(doubt.id)); } catch { /* ignore */ }
  }, [doubt.id]);
  const refreshRatings = useCallback(async () => {
    try { setRatings(await getRatingsForDoubt(doubt.id)); } catch { /* ignore */ }
  }, [doubt.id]);
  const refreshReplies = useCallback(async () => {
    try { setReplies(await getRepliesForDoubt(doubt.id)); } catch { /* ignore */ }
  }, [doubt.id]);
  const refreshAnswerLikes = useCallback(async () => {
    try { setAnswerLikes(await getAnswerLikesForDoubt(doubt.id)); } catch { /* ignore */ }
  }, [doubt.id]);
  const refreshReplyLikes = useCallback(async () => {
    try { setReplyLikes(await getReplyLikesForDoubt(doubt.id)); } catch { /* ignore */ }
  }, [doubt.id]);

  // ── ACCEPT ──
  const handleMarkAccepted = useCallback(async (answerId: string) => {
    mutatingRef.current = true;
    try {
      await markDoubtSolved(doubt.id, answerId);
      await refreshAnswers();
      applyDoubtUpdate({ ...doubt, status: 'solved' });
      toast.success('Answer Accepted', 'Marked as accepted! Doubt is now solved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Accept Failed', msg.includes('policy') ? msg : 'Could not accept answer.');
    } finally { mutatingRef.current = false; }
  }, [doubt, refreshAnswers, applyDoubtUpdate, toast]);

  // ── PIN ──
  const handleTogglePin = useCallback(async (answerId: string, currentlyPinned: boolean) => {
    try {
      await toggleAnswerPin(answerId, doubt.id, !currentlyPinned);
      await refreshAnswers();
      toast.success(
        currentlyPinned ? 'Answer Unpinned' : 'Answer Pinned',
        currentlyPinned ? 'Removed from pinned.' : 'Answer pinned to the top.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Pin Failed', msg.includes('policy') || msg.includes('patch')
        ? 'Apply supabase/phase3-doubt-likes-pins-patch.sql to enable pinning.'
        : 'Could not pin answer.');
    }
  }, [doubt.id, refreshAnswers, toast]);

  // ── ANSWER LIKE (optimistic) ──
  const handleToggleAnswerLike = useCallback(async (answerId: string) => {
    const isLiked = answerLikes.some((l) => l.answer_id === answerId && l.created_by === currentUserId);
    if (isLiked) {
      setAnswerLikes((prev) => prev.filter((l) => !(l.answer_id === answerId && l.created_by === currentUserId)));
    } else {
      setAnswerLikes((prev) => [...prev, {
        id: `opt-${Date.now()}`, answer_id: answerId, doubt_id: doubt.id,
        created_by: currentUserId, created_at: new Date().toISOString(),
      }]);
    }
    try {
      await toggleAnswerLike(answerId, doubt.id, currentUserId, isLiked);
      await refreshAnswerLikes();
    } catch (err: unknown) {
      await refreshAnswerLikes();
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Like Failed', msg || 'Apply the SQL patch to enable likes.');
    }
  }, [answerLikes, currentUserId, doubt.id, refreshAnswerLikes, toast]);

  // ── REPLY LIKE (optimistic) ──
  const handleToggleReplyLike = useCallback(async (replyId: string) => {
    const isLiked = replyLikes.some((l) => l.reply_id === replyId && l.created_by === currentUserId);
    if (isLiked) {
      setReplyLikes((prev) => prev.filter((l) => !(l.reply_id === replyId && l.created_by === currentUserId)));
    } else {
      setReplyLikes((prev) => [...prev, {
        id: `opt-${Date.now()}`, reply_id: replyId, doubt_id: doubt.id,
        created_by: currentUserId, created_at: new Date().toISOString(),
      }]);
    }
    try {
      await toggleReplyLike(replyId, doubt.id, currentUserId, isLiked);
      await refreshReplyLikes();
    } catch (err: unknown) {
      await refreshReplyLikes();
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Like Failed', msg || 'Apply the SQL patch to enable reply likes.');
    }
  }, [replyLikes, currentUserId, doubt.id, refreshReplyLikes, toast]);

  // ── POST ANSWER ──
  const handleSubmitAnswer = useCallback(async () => {
    if (!answerText.trim()) { setAnswerError('Answer cannot be empty.'); return; }
    setAnswerError('');
    setSubmittingAnswer(true);
    mutatingRef.current = true;
    try {
      await createAnswer({ doubt_id: doubt.id, answer_text: answerText, created_by: currentUserId });
      setAnswerText('');
      await loadData();
      if (doubt.status === 'open') applyDoubtUpdate({ ...doubt, status: 'answered' });
      toast.success('Answer Submitted', 'Your answer has been posted!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAnswerError('Failed to post answer. Please try again.');
      toast.error('Submission Failed', msg || 'Could not post answer.');
    } finally { setSubmittingAnswer(false); mutatingRef.current = false; }
  }, [answerText, doubt, currentUserId, loadData, applyDoubtUpdate, toast]);

  // ── CLOSE ──
  const handleClose = useCallback(async () => {
    if (!window.confirm('Close this doubt? Students will no longer be able to answer or reply.')) return;
    setClosing(true);
    mutatingRef.current = true;
    try {
      await closeDoubt(doubt.id);
      applyDoubtUpdate({ ...doubt, status: 'closed' });
      toast.success('Doubt Closed', 'The doubt post has been closed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Close Failed', msg || 'Could not close doubt.');
    } finally { setClosing(false); mutatingRef.current = false; }
  }, [doubt, applyDoubtUpdate, toast]);

  // ── REOPEN ──
  const handleReopen = useCallback(async () => {
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
    } finally { setReopening(false); mutatingRef.current = false; }
  }, [doubt, answers, applyDoubtUpdate, loadData, toast]);

  // ── DELETE ──
  const handleDelete = useCallback(async () => {
    setDeleteError('');
    if (answers.length > 0) { setDeleteError('Cannot delete: this doubt has answers. Please close it instead.'); return; }
    if (doubt.status === 'answered' || doubt.status === 'solved') { setDeleteError('Cannot delete an answered or solved doubt.'); return; }
    if (!window.confirm('Delete this doubt permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteDoubt(doubt.id);
      onDoubtDeleted?.(doubt.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg.includes('policy') || msg.includes('permission')
        ? 'Delete blocked by database policy.' : 'Failed to delete. Please try again.');
    } finally { setDeleting(false); }
  }, [doubt, answers, onDoubtDeleted, onClose]);

  // ── Asker name in header ──
  const HeaderAskerName = () => {
    if (doubt.is_anonymous) return <span className="font-semibold">Anonymous Student</span>;
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

  // ────────────────────────────────────────
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">

          {/* ── Modal header ── */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3 shrink-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 text-[11px] font-semibold border rounded-full ${getStatusStyle(doubt.status)}`}>
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
              <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug break-words">{doubt.title}</h3>
              <p className="text-xs text-slate-500">
                Asked by <HeaderAskerName /> · {formatDate(doubt.created_at)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Doubt description */}
            <div className="space-y-2">
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{doubt.description}</p>
              {doubt.tags && doubt.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doubt.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-400 text-[11px] rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Counters strip */}
            {!loadingAnswers && (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold rounded-full">
                  💬 {totalAnswers} Answer{totalAnswers !== 1 ? 's' : ''}
                </span>
                {acceptedCount > 0 && (
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-full">
                    ✅ {acceptedCount} Accepted
                  </span>
                )}
                {pinnedCount > 0 && (
                  <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-full">
                    📌 {pinnedCount} Pinned
                  </span>
                )}
                {totalReplies > 0 && (
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 font-semibold rounded-full">
                    🗨️ {totalReplies} Repl{totalReplies !== 1 ? 'ies' : 'y'}
                  </span>
                )}
                {totalAnswerLikes > 0 && (
                  <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 font-semibold rounded-full">
                    👍 {totalAnswerLikes}
                  </span>
                )}
              </div>
            )}

            {/* Creator management buttons */}
            {isCreator && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(doubt.status === 'open' || doubt.status === 'answered') && (
                    <button
                      onClick={handleClose}
                      disabled={closing}
                      className="px-3 py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                    >
                      {closing ? 'Closing…' : '🔒 Close Doubt'}
                    </button>
                  )}
                  {doubt.status === 'closed' && (
                    <button
                      onClick={handleReopen}
                      disabled={reopening}
                      className="px-3 py-1.5 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-60 text-emerald-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      {reopening ? 'Reopening…' : '🔓 Reopen Doubt'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-500 text-xs font-semibold rounded-lg transition-colors"
                    >
                      {deleting ? 'Deleting…' : '🗑 Delete'}
                    </button>
                  )}
                </div>
                {deleteError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ⚠️ {deleteError}
                  </p>
                )}
              </div>
            )}

            {/* Status banners */}
            {doubt.status === 'closed' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium text-center">
                🔒 This doubt is closed. No new answers or replies.
              </div>
            )}
            {doubt.status === 'solved' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium text-center">
                ✅ Solved!{' '}
                {isCreator
                  ? 'You can still accept or pin answers. Students can add follow-up replies.'
                  : 'An answer was accepted. You can still add follow-up replies.'}
              </div>
            )}

            {/* ── Answers section ── */}
            <div className="space-y-3">
              {/* Section header with sort control */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-bold text-slate-700">
                  {loadingAnswers ? 'Loading…' : `${totalAnswers} Answer${totalAnswers !== 1 ? 's' : ''}`}
                </span>
                {!loadingAnswers && totalAnswers > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Sort by</span>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px] font-semibold">
                      {(['top', 'newest'] as const).map((ord) => (
                        <button
                          key={ord}
                          type="button"
                          onClick={() => setSortOrder(ord)}
                          className={`px-3 py-1 transition-colors ${
                            sortOrder === ord
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 hover:bg-slate-50'
                          } ${ord === 'newest' ? 'border-l border-slate-200' : ''}`}
                        >
                          {ord === 'top' ? '🔥 Top' : '🕒 Newest'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {loadingAnswers ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading answers…</div>
              ) : totalAnswers === 0 ? (
                <div className="text-center py-8">
                  <p className="text-2xl mb-1">🤔</p>
                  <p className="text-slate-400 text-sm">No answers yet. Be the first to help!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAnswers.map((answer) => (
                    <AnswerCard
                      key={answer.id}
                      answer={answer}
                      doubt={doubt}
                      currentUserId={currentUserId}
                      ratings={ratings.filter((r) => r.answer_id === answer.id)}
                      replies={replies.filter((r) => r.answer_id === answer.id)}
                      answerLikes={answerLikes}
                      replyLikes={replyLikes}
                      canRate={
                        isCreator &&
                        answer.created_by !== currentUserId &&
                        (doubt.status === 'answered' || doubt.status === 'solved')
                      }
                      canMark={canMarkAnswers && !answer.is_accepted}
                      canPin={canPin}
                      canReply={canReply}
                      onMarkAccepted={handleMarkAccepted}
                      onTogglePin={handleTogglePin}
                      onToggleAnswerLike={handleToggleAnswerLike}
                      onRatingSubmitted={refreshRatings}
                      onReplyPosted={refreshReplies}
                      onToggleReplyLike={handleToggleReplyLike}
                      onViewProfile={(uid) => setViewProfileUserId(uid)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Answer composer */}
            {canAnswer && (
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Answer</h4>
                <textarea
                  value={answerText}
                  onChange={(e) => { setAnswerText(e.target.value); setAnswerError(''); }}
                  rows={4}
                  placeholder="Write a clear, detailed answer…"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
                />
                {answerError && <p className="text-xs text-red-600">{answerError}</p>}
                <button
                  type="button"
                  disabled={submittingAnswer || !answerText.trim()}
                  onClick={handleSubmitAnswer}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                >
                  {submittingAnswer ? 'Posting…' : '📤 Post Answer'}
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
