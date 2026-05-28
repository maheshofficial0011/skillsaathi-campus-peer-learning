import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { DoubtPostWithProfile, DoubtAnswerWithProfile, DoubtStatus } from '../types';
import {
  getDoubts,
  createDoubt,
  closeDoubt,
  markDoubtSolved,
  getAnswersForDoubt,
  createAnswer,
  DOUBT_CATEGORIES,
} from '../lib/doubts';

// ──────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────
const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDisplayName = (
  post: DoubtPostWithProfile,
  showAnon: boolean = true
): string => {
  if (showAnon && post.is_anonymous) return 'Anonymous Student';
  return post.creator_profile?.full_name || 'Campus Student';
};

const getStatusStyle = (status: DoubtStatus | string): string => {
  switch (status) {
    case 'open':     return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'answered': return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'solved':   return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'closed':   return 'bg-slate-100 text-slate-600 border-slate-200';
    default:         return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getStatusIcon = (status: DoubtStatus | string): string => {
  switch (status) {
    case 'open':     return '⚡';
    case 'answered': return '💬';
    case 'solved':   return '✅';
    case 'closed':   return '🔒';
    default:         return '•';
  }
};

// ──────────────────────────────────────────
// ANSWER CARD
// ──────────────────────────────────────────
interface AnswerCardProps {
  answer: DoubtAnswerWithProfile;
  isCreator: boolean;
  doubtStatus: DoubtStatus | string;
  onMarkAccepted: (answerId: string) => Promise<void>;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ answer, isCreator, doubtStatus, onMarkAccepted }) => {
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const isLong = answer.answer_text.length > 400;
  const displayText = isLong && !expanded
    ? answer.answer_text.slice(0, 400) + '…'
    : answer.answer_text;

  const handleAccept = async () => {
    if (!window.confirm('Mark this as the accepted answer? This will mark the doubt as solved.')) return;
    setAccepting(true);
    try {
      await onMarkAccepted(answer.id);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      answer.is_accepted
        ? 'bg-purple-50/60 border-purple-300 shadow-sm'
        : 'bg-white border-slate-200'
    }`}>
      {/* Accepted Badge */}
      {answer.is_accepted && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-300 flex items-center gap-1">
            ✅ Accepted Answer
          </span>
        </div>
      )}

      {/* Answer Text */}
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
        {displayText}
      </p>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold focus:outline-none"
        >
          {expanded ? 'Show less ▲' : 'Show more ▼'}
        </button>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {answer.answerer_profile?.full_name || 'Campus Student'}
          </span>
          {answer.answerer_profile?.year_of_study && (
            <span className="ml-1 text-slate-400">({answer.answerer_profile.year_of_study})</span>
          )}
          <span className="mx-1.5 text-slate-300">·</span>
          {formatDate(answer.created_at)}
        </span>

        {/* Creator: mark accepted (only on open/answered doubts, and answer not already accepted) */}
        {isCreator && !answer.is_accepted && (doubtStatus === 'open' || doubtStatus === 'answered') && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="px-3 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg shadow-sm transition-colors duration-150"
          >
            {accepting ? 'Accepting…' : '✅ Mark as Accepted'}
          </button>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// DOUBT DETAILS MODAL
// ──────────────────────────────────────────
interface DoubtDetailsModalProps {
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  onClose: () => void;
  onSolved: (doubtId: string) => void;
}

const DoubtDetailsModal: React.FC<DoubtDetailsModalProps> = ({
  doubt,
  currentUserId,
  onClose,
  onSolved,
}) => {
  const [answers, setAnswers] = useState<DoubtAnswerWithProfile[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [localDoubt, setLocalDoubt] = useState<DoubtPostWithProfile>(doubt);

  const isCreator = localDoubt.created_by === currentUserId;
  const canAnswer = localDoubt.status === 'open' || localDoubt.status === 'answered';

  useEffect(() => {
    setLocalDoubt(doubt);
  }, [doubt]);

  const loadAnswers = useCallback(async () => {
    setLoadingAnswers(true);
    const data = await getAnswersForDoubt(localDoubt.id);
    setAnswers(data);
    setLoadingAnswers(false);
  }, [localDoubt.id]);

  useEffect(() => {
    loadAnswers();
  }, [loadAnswers]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) {
      setAnswerError('Answer text is required.');
      return;
    }
    setAnswerError('');
    setSubmitting(true);
    try {
      const newAnswer = await createAnswer({
        doubt_id: localDoubt.id,
        answer_text: answerText,
        created_by: currentUserId,
      });
      if (newAnswer) {
        setAnswers((prev) => [...prev, newAnswer]);
        setLocalDoubt((prev) => ({ ...prev, status: 'answered' as DoubtStatus }));
        setAnswerText('');
      }
    } catch {
      setAnswerError('Failed to post answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAccepted = async (answerId: string) => {
    await markDoubtSolved(localDoubt.id, answerId);
    setLocalDoubt((prev) => ({
      ...prev,
      status: 'solved',
      solved_answer_id: answerId,
    }));
    setAnswers((prev) =>
      prev.map((a) => ({ ...a, is_accepted: a.id === answerId }))
    );
    onSolved(localDoubt.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded uppercase tracking-wider">
                {localDoubt.category}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${getStatusStyle(localDoubt.status)}`}>
                {getStatusIcon(localDoubt.status)} {localDoubt.status}
              </span>
              {localDoubt.is_anonymous && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded">
                  🕵️ Anonymous
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight">{localDoubt.title}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Posted by{' '}
              <span className="font-semibold text-slate-600">{getDisplayName(localDoubt)}</span>
              <span className="mx-1.5">·</span>
              {formatDate(localDoubt.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Description */}
          <div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
              {localDoubt.description}
            </p>

            {localDoubt.tags && localDoubt.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {localDoubt.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Answers Section */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">
              {answers.length === 0 ? 'No answers yet' : `${answers.length} Answer${answers.length > 1 ? 's' : ''}`}
            </h4>

            {loadingAnswers ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                Loading answers…
              </div>
            ) : answers.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-3xl mb-2">🤔</p>
                <p className="text-sm font-medium">Be the first to answer this doubt!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {answers.map((answer) => (
                  <AnswerCard
                    key={answer.id}
                    answer={answer}
                    isCreator={isCreator}
                    doubtStatus={localDoubt.status}
                    onMarkAccepted={handleMarkAccepted}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Answer Form */}
          {canAnswer && (
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Write Your Answer</h4>
              <form onSubmit={handleSubmitAnswer} className="space-y-3">
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Share your explanation, solution, or resources…"
                  rows={4}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-y transition-colors"
                />
                {answerError && (
                  <p className="text-xs text-red-600 font-medium">{answerError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors duration-150"
                >
                  {submitting ? 'Posting…' : '💬 Post Answer'}
                </button>
              </form>
            </div>
          )}

          {/* Solved/Closed notice */}
          {(localDoubt.status === 'solved' || localDoubt.status === 'closed') && (
            <div className={`rounded-xl border p-3 text-sm font-medium flex items-center gap-2 ${
              localDoubt.status === 'solved'
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              {localDoubt.status === 'solved' ? '✅ This doubt has been marked as solved.' : '🔒 This doubt is closed.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// CREATE DOUBT MODAL
// ──────────────────────────────────────────
interface CreateDoubtModalProps {
  currentUserId: string;
  onClose: () => void;
  onCreated: (doubt: DoubtPostWithProfile) => void;
}

const CreateDoubtModal: React.FC<CreateDoubtModalProps> = ({ currentUserId, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required.';
    if (!description.trim()) e.description = 'Description is required.';
    const finalCategory = category === 'Other' ? customCategory.trim() : category;
    if (!finalCategory) e.category = 'Category is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const finalCategory = category === 'Other' ? customCategory.trim() : category;
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const newDoubt = await createDoubt({
        title,
        description,
        category: finalCategory,
        tags,
        is_anonymous: isAnonymous,
        created_by: currentUserId,
      });
      if (newDoubt) {
        onCreated(newDoubt);
        onClose();
      }
    } catch {
      setErrors({ submit: 'Failed to post doubt. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Post a Doubt</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ask your question — the campus community will help!</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Why does TCP use a 3-way handshake?"
              maxLength={200}
              className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors ${
                errors.title ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your doubt in detail. Include what you've tried so far…"
              rows={4}
              className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-y transition-colors ${
                errors.description ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors ${
                errors.category ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            >
              {DOUBT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {category === 'Other' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category…"
                className={`mt-2 w-full px-4 py-2.5 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors ${
                  errors.category ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            )}
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tags <span className="text-slate-400 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. networking, tcp, handshake"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 ${
                isAnonymous ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                isAnonymous ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isAnonymous ? '🕵️ Post Anonymously' : 'Post with your name'}
              </p>
              <p className="text-xs text-slate-500">
                {isAnonymous
                  ? 'Your name will be hidden from other students.'
                  : 'Your name will be visible to other students.'}
              </p>
            </div>
          </div>

          {errors.submit && (
            <p className="text-xs text-red-600 font-medium">{errors.submit}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors duration-150"
            >
              {submitting ? 'Posting…' : isAnonymous ? '🕵️ Post Anonymously' : '📝 Post Doubt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// DOUBT CARD
// ──────────────────────────────────────────
interface DoubtCardProps {
  doubt: DoubtPostWithProfile;
  currentUserId: string;
  onView: (doubt: DoubtPostWithProfile) => void;
  onClose: (doubtId: string) => Promise<void>;
}

const DoubtCard: React.FC<DoubtCardProps> = ({ doubt, currentUserId, onView, onClose }) => {
  const isCreator = doubt.created_by === currentUserId;
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!window.confirm('Close this doubt? It can no longer receive new answers.')) return;
    setClosing(true);
    try {
      await onClose(doubt.id);
    } finally {
      setClosing(false);
    }
  };

  const descPreview = doubt.description.length > 160
    ? doubt.description.slice(0, 160) + '…'
    : doubt.description;

  return (
    <div className={`p-5 bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col gap-4 ${
      doubt.status === 'open' || doubt.status === 'answered'
        ? 'border-slate-200 hover:border-indigo-100'
        : 'border-slate-200 border-dashed'
    }`}>
      {/* Top row */}
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
        <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${getStatusStyle(doubt.status)}`}>
          {getStatusIcon(doubt.status)} {doubt.status}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-2">
        <h4 className="font-bold text-base text-slate-900 leading-snug">{doubt.title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{descPreview}</p>

        {doubt.tags && doubt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {doubt.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium rounded">
                #{tag}
              </span>
            ))}
            {doubt.tags.length > 4 && (
              <span className="text-[10px] text-slate-400 self-center">+{doubt.tags.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Footer meta */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          By <span className="font-semibold text-slate-700">{getDisplayName(doubt)}</span>
          <span className="mx-1.5 text-slate-300">·</span>
          {formatDate(doubt.created_at)}
        </span>
        <span className="text-slate-400 shrink-0">
          {typeof doubt.answer_count === 'number'
            ? `${doubt.answer_count} answer${doubt.answer_count !== 1 ? 's' : ''}`
            : ''}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onView(doubt)}
          className={`w-full py-2 font-semibold text-xs rounded-lg shadow-sm transition-colors duration-150 ${
            doubt.status === 'open' || doubt.status === 'answered'
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {doubt.status === 'open' ? '💬 Answer / View' : 'View Answers'}
        </button>

        {isCreator && (doubt.status === 'open' || doubt.status === 'answered') && (
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full py-1.5 border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 font-semibold text-xs rounded-lg transition-colors duration-150"
          >
            {closing ? 'Closing…' : '🔒 Close Doubt'}
          </button>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────
export const DoubtsPage: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  const [doubts, setDoubts] = useState<DoubtPostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | DoubtStatus>('all');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState<DoubtPostWithProfile | null>(null);

  const loadDoubts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDoubts();
      setDoubts(data);
    } catch {
      setError('Failed to load doubts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoubts();
  }, [loadDoubts]);

  const handleCreated = (doubt: DoubtPostWithProfile) => {
    setDoubts((prev) => [doubt, ...prev]);
  };

  const handleClose = async (doubtId: string) => {
    await closeDoubt(doubtId);
    setDoubts((prev) =>
      prev.map((d) => (d.id === doubtId ? { ...d, status: 'closed' as DoubtStatus } : d))
    );
  };

  const handleSolved = (doubtId: string) => {
    setDoubts((prev) =>
      prev.map((d) => (d.id === doubtId ? { ...d, status: 'solved' as DoubtStatus } : d))
    );
    if (selectedDoubt?.id === doubtId) {
      setSelectedDoubt((prev) => prev ? { ...prev, status: 'solved' as DoubtStatus } : prev);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setStatusFilter('all');
  };

  // Filter doubts
  const filtered = doubts.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.tags.some((t) => t.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'All' || d.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const hasFilters = search || categoryFilter !== 'All' || statusFilter !== 'all';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Anonymous Doubts</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ask or answer questions — optionally post anonymously. Keep it friendly!
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors duration-150 flex items-center gap-2 shrink-0"
        >
          <span>+</span> Ask a Doubt
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, tags…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
        >
          <option value="All">All Categories</option>
          {DOUBT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | DoubtStatus)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="solved">Solved</option>
          <option value="closed">Closed</option>
        </select>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition-colors duration-150 shrink-0"
          >
            Reset
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={loadDoubts}
          disabled={loading}
          className="px-3 py-2 text-sm border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600 font-semibold rounded-xl transition-colors duration-150 shrink-0"
          title="Refresh doubts"
        >
          {loading ? '⟳' : '↺'} Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading doubts…</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="py-12 flex flex-col items-center text-center gap-3">
          <p className="text-4xl">⚠️</p>
          <p className="text-base font-semibold text-red-600">{error}</p>
          <button
            onClick={loadDoubts}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center text-center gap-3">
          <p className="text-5xl">🤔</p>
          <p className="text-lg font-bold text-slate-800">
            {hasFilters ? 'No doubts match your filters' : 'No doubts posted yet'}
          </p>
          <p className="text-sm text-slate-500">
            {hasFilters
              ? 'Try adjusting your search or filters.'
              : 'Be the first to ask a question!'}
          </p>
          {hasFilters ? (
            <button onClick={resetFilters} className="mt-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors">
              Reset Filters
            </button>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              Ask a Doubt
            </button>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {!loading && !error && doubts.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{doubts.length}</span> doubts
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-emerald-600">
              {doubts.filter((d) => d.status === 'open').length}
            </span>{' '}
            open
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-purple-600">
              {doubts.filter((d) => d.status === 'solved').length}
            </span>{' '}
            solved
          </span>
        </div>
      )}

      {/* Doubt Cards Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((doubt) => (
            <DoubtCard
              key={doubt.id}
              doubt={doubt}
              currentUserId={currentUserId}
              onView={setSelectedDoubt}
              onClose={handleClose}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateDoubtModal
          currentUserId={currentUserId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {selectedDoubt && (
        <DoubtDetailsModal
          doubt={selectedDoubt}
          currentUserId={currentUserId}
          onClose={() => setSelectedDoubt(null)}
          onSolved={handleSolved}
        />
      )}
    </div>
  );
};
