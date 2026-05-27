import React from 'react';

export const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Profile Header */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 border-2 border-indigo-200">
          SP
        </div>
        <div className="text-center md:text-left space-y-1 flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">Siddharth Patel</h2>
            <span className="self-center md:self-auto px-2.5 py-0.5 text-xs font-semibold text-indigo-800 bg-indigo-50 rounded-full border border-indigo-200">
              CS 3rd Year
            </span>
          </div>
          <p className="text-sm text-slate-500">Peer Tutor • Siddharth.p@college.edu</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-500 pt-2">
            <span>⭐ <strong>4.9</strong> rating (14 sessions)</span>
            <span>🤝 <strong>98</strong> Trust Score</span>
          </div>
        </div>
        <button className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors duration-150">
          Edit Profile
        </button>
      </div>

      {/* Skills Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Skills I Know */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Skills I Know & Can Help With</h3>
          <div className="flex flex-wrap gap-2">
            {['React', 'TypeScript', 'Data Structures', 'Python', 'Tailwind CSS'].map((skill) => (
              <span key={skill} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                ✓ {skill}
              </span>
            ))}
          </div>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-2 block">
            + Add/Edit Known Skills
          </button>
        </div>

        {/* Skills I Want to Learn */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Skills I Want to Learn</h3>
          <div className="flex flex-wrap gap-2">
            {['Docker', 'Machine Learning', 'UX Design', 'SQL & Database Design'].map((skill) => (
              <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-full">
                🔍 {skill}
              </span>
            ))}
          </div>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-2 block">
            + Add/Edit Learning Goals
          </button>
        </div>
      </div>
    </div>
  );
};
