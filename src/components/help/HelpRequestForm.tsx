import React, { useState } from 'react';
import { createHelpRequest } from '../../lib/helpRequests';
import { HELP_CATEGORIES } from '../../lib/helpCategories';
import type { HelpRequestUrgency } from '../../types';

interface HelpRequestFormProps {
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const HelpRequestForm: React.FC<HelpRequestFormProps> = ({
  currentUserId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [urgency, setUrgency] = useState<HelpRequestUrgency>('Medium');
  
  // Separate deadline picker states
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('12');
  const [deadlineMinute, setDeadlineMinute] = useState('00');
  const [deadlineAmPm, setDeadlineAmPm] = useState('PM');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setErrorMsg('Please enter both a title and description.');
      return;
    }

    // Validation: Custom category must not be empty if "Other" is selected
    let finalCategory = category;
    if (category === 'Other') {
      const trimmedCustom = customCategory.trim();
      if (!trimmedCustom) {
        setErrorMsg('Please enter a custom category name when selecting "Other".');
        return;
      }
      finalCategory = trimmedCustom;
    }

    // Process and validate the optional deadline date/time inputs
    let deadlineIso: string | null = null;
    if (deadlineDate) {
      let hours = parseInt(deadlineHour, 10);
      const minutes = parseInt(deadlineMinute, 10);

      // Convert 12h format to 24h format
      if (deadlineAmPm === 'PM' && hours < 12) {
        hours += 12;
      } else if (deadlineAmPm === 'AM' && hours === 12) {
        hours = 0;
      }

      const hoursStr = String(hours).padStart(2, '0');
      const minutesStr = String(minutes).padStart(2, '0');

      // Formulate ISO in local browser timezone: YYYY-MM-DDThh:mm:00
      const localDateTimeStr = `${deadlineDate}T${hoursStr}:${minutesStr}:00`;
      const combinedDate = new Date(localDateTimeStr);

      if (isNaN(combinedDate.getTime())) {
        setErrorMsg('Please select a valid deadline date and time.');
        return;
      }

      // Check if deadline is in the future
      if (combinedDate.getTime() <= Date.now()) {
        setErrorMsg('The specified help deadline must be in the future.');
        return;
      }

      deadlineIso = combinedDate.toISOString();
    }

    setLoading(true);
    setErrorMsg(null);

    // Split and clean skills tags
    const required_skills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const result = await createHelpRequest({
        title,
        description,
        required_skills,
        category: finalCategory,
        urgency,
        deadline: deadlineIso,
        created_by: currentUserId,
      });

      if (result) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Failed to save help request record.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[900] overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <div className="relative z-[910] bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header Banner */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Post Peer Help Request</h3>
            <p className="text-xs text-slate-500 mt-0.5">Describe what you need help with, and campus partners will connect with you.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 hover:bg-slate-100 rounded-md transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Status Alerts */}
          {errorMsg && (
            <div className="p-4 text-xs text-red-800 bg-red-50 rounded-lg border border-red-200" role="alert">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Help Request Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Red-Black Tree Rotation Cases"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what concept, task, or bug you are struggling with. Be descriptive so helpers know if they have the skills to help."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
              >
                {HELP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Urgency Level
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as HelpRequestUrgency)}
                className="w-full px-4 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
              >
                <option value="Low">Low (No Rush)</option>
                <option value="Medium">Medium</option>
                <option value="High">High (Urgent Study)</option>
                <option value="Urgent">Urgent (Exam Tomorrow!)</option>
              </select>
            </div>
          </div>

          {/* Conditional Manual Category Input when "Other" is selected */}
          {category === 'Other' && (
            <div className="animate-in slide-in-from-top-2 duration-150">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Specify Custom Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Advanced Deep Learning"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
              />
            </div>
          )}

          {/* Skills Needed */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Skills Needed <span className="text-slate-400 font-normal">(Comma Separated)</span>
            </label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="e.g. React, C++, Calculus"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 text-sm font-medium"
            />
          </div>

          {/* Improved Deadline Selection with Date + 12h Time dropdown + AM/PM selection */}
          <div className="space-y-2 pt-2">
            <label className="block text-sm font-semibold text-slate-700">
              Help Deadline <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
              />
              
              {/* Flex hours/minutes/AM-PM picker container */}
              <div className="flex gap-2 items-center">
                <select
                  value={deadlineHour}
                  onChange={(e) => setDeadlineHour(e.target.value)}
                  className="flex-1 px-2.5 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">:</span>
                <select
                  value={deadlineMinute}
                  onChange={(e) => setDeadlineMinute(e.target.value)}
                  className="flex-1 px-2.5 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={deadlineAmPm}
                  onChange={(e) => setDeadlineAmPm(e.target.value)}
                  className="w-20 px-2.5 py-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              💡 Note: Both date and time values are required for setting a deadline. This uses your browser's local time.
            </p>
          </div>

          {/* Action buttons footer */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              {loading ? 'Submitting Request...' : 'Post Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
