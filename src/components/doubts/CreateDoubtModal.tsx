import React, { useState } from 'react';
import type { DoubtPostWithProfile } from '../../types';
import { createDoubt, DOUBT_CATEGORIES } from '../../lib/doubts';

interface CreateDoubtModalProps {
  currentUserId: string;
  onClose: () => void;
  onCreated: (doubt: DoubtPostWithProfile) => void;
}

export const CreateDoubtModal: React.FC<CreateDoubtModalProps> = ({
  currentUserId,
  onClose,
  onCreated,
}) => {
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
    const finalCat = category === 'Other' ? customCategory.trim() : category;
    if (!finalCat) e.category = 'Please enter a custom category.';
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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
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
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
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
            <label className="block text-sm font-semibold text-slate-700 mb-1">
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
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
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
                className={`mt-2 w-full px-4 py-2.5 text-sm border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                  errors.category ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
            )}
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Tags <span className="text-slate-400 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. networking, tcp, handshake"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                isAnonymous ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                isAnonymous ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isAnonymous ? '🕵️ Post Anonymously' : 'Post with your name'}
              </p>
              <p className="text-xs text-slate-500">
                {isAnonymous
                  ? 'Your name will be hidden from all students.'
                  : 'Your name will be visible to other students.'}
              </p>
            </div>
          </div>

          {errors.submit && (
            <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg">{errors.submit}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
            >
              {submitting ? 'Posting…' : isAnonymous ? '🕵️ Post Anonymously' : '📝 Post Doubt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
