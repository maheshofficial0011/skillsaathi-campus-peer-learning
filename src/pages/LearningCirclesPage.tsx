import React from 'react';

export const LearningCirclesPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Learning Circles</h2>
          <p className="text-sm text-slate-500">Join cohort-based groups to study specialized subjects, share resources, and collaborate.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-150">
          Start a Learning Circle
        </button>
      </div>

      {/* Grid of circles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 rounded border border-indigo-200 uppercase">
                Frontend Dev
              </span>
              <span className="text-xs text-slate-400">14 Members</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">React & Frontend Creators</h3>
            <p className="text-sm text-slate-600">
              For campus peers building web projects. We meet weekly on Discord to review each other's code, share styling tips, and talk about React performance.
            </p>
          </div>
          <button className="w-full mt-4 py-2 px-4 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-semibold text-sm rounded-lg border border-indigo-200 transition-colors">
            Join Circle
          </button>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 rounded border border-purple-200 uppercase">
                Data Science
              </span>
              <span className="text-xs text-slate-400">8 Members</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Intro to Deep Learning</h3>
            <p className="text-sm text-slate-600">
              A cohort studying deep learning basics using PyTorch. Currently working through neural network fundamentals, backpropagation, and CNNs.
            </p>
          </div>
          <button className="w-full mt-4 py-2 px-4 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-semibold text-sm rounded-lg border border-indigo-200 transition-colors">
            Join Circle
          </button>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 rounded border border-amber-200 uppercase">
                Aptitude & Prep
              </span>
              <span className="text-xs text-slate-400">42 Members</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Placement Prep 2026</h3>
            <p className="text-sm text-slate-600">
              A large campus circle focused on solving competitive coding questions, sharing interview experiences, and peer-reviewing resumes.
            </p>
          </div>
          <button className="w-full mt-4 py-2 px-4 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-semibold text-sm rounded-lg border border-indigo-200 transition-colors">
            Join Circle
          </button>
        </div>
      </div>
    </div>
  );
};
