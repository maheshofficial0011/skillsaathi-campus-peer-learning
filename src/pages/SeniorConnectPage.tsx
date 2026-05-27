import React from 'react';

export const SeniorConnectPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Senior Connect</h2>
          <p className="text-sm text-slate-500">Reach out to final-year students and alumni for placement advice, project mentoring, or elective choices.</p>
        </div>
        <button className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm shadow-sm transition-colors">
          Register as a Senior Mentor
        </button>
      </div>

      {/* Grid of seniors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xl shrink-0">
            AM
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <h3 className="font-bold text-slate-900">Arjun Mehta</h3>
              <p className="text-xs text-slate-500">CS Senior • Placed at Microsoft</p>
            </div>
            <p className="text-sm text-slate-600">
              Happy to mentor juniors on DSA, resume building, and preparing for off-campus placement drives. Feel free to book a quick 15-minute chat.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">Interview Prep</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">DSA</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">C++</span>
            </div>
            <div className="pt-3">
              <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                Connect with Arjun
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex gap-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xl shrink-0">
            VT
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <h3 className="font-bold text-slate-900">Vikram Thapar</h3>
              <p className="text-xs text-slate-500">ECE Senior • Core & IoT Specialist</p>
            </div>
            <p className="text-sm text-slate-600">
              Mentoring students interested in robotics, Arduino programming, and PCB layout design. Can also give tips on choosing the best electives.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">IoT</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">Hardware</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded">Embedded C</span>
            </div>
            <div className="pt-3">
              <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                Connect with Vikram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
