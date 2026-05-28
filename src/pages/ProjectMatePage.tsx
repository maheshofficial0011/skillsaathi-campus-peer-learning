import React from 'react';

export const ProjectMatePage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Find Project Teammates</h2>
          <p className="text-sm text-slate-500">Need a frontend wizard, a python backend pro, or a UI designer for your next hackathon or term project? Post it here!</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-150">
          Post Teammate Search
        </button>
      </div>

      {/* Grid of posts */}
      <div className="space-y-4">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Smart Campus Smart-Parking App (React Native)</h3>
            <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-full">
              Looking for: Mobile Developer
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            We are building an IoT-based parking reservation mobile app for our graduation design project. The hardware (NodeMCU + ultrasonic sensors) and NestJS backend are completed. We need someone who has experience in React Native to help build out the mobile dashboard UI.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-150">
            <span className="text-xs text-slate-500">Project Leader: Ankit Joshi • 3 weeks remaining</span>
            <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
              Contact Leader
            </button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Campus Hackathon Team (Theme: Green Tech)</h3>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-full">
              Looking for: UI/UX Designer
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Looking for a UI designer to complete our 4-person team for the upcoming GreenTech hackathon. We are two full-stack developers and a product manager. If you know Figma and love making sleek, responsive landing pages and dashboard concepts quickly, join us!
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-150">
            <span className="text-xs text-slate-500">Project Leader: Sneha Roy • Starts in 4 days</span>
            <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">
              Contact Leader
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
