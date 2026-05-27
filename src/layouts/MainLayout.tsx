import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  userEmail?: string | null;
  onLogout?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activePage,
  onNavigate,
  userEmail,
  onLogout,
}) => {
  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'auth', label: 'Auth Gateway' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'My Profile' },
    { id: 'doubts', label: 'Anonymous Doubts' },
    { id: 'circles', label: 'Learning Circles' },
    { id: 'projectmate', label: 'Find Teammates' },
    { id: 'seniorconnect', label: 'Senior Connect' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-lg tracking-wider">
              SS
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              SkillSaathi
            </h1>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            <span>Phase 1: Supabase Integration</span>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 p-4 lg:py-6 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between">
          <div className="space-y-6">
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-4 lg:pb-0 scrollbar-none">
              {navItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap text-left shrink-0 w-full ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Authenticated Profile Widget */}
          {userEmail && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
              <div className="px-4 py-2.5 bg-slate-100 rounded-lg border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Signed In As</p>
                <p className="text-xs font-semibold text-slate-800 truncate" title={userEmail}>
                  {userEmail}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors text-left"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Dynamic Page Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[60vh] shadow-sm">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© 2026 SkillSaathi Campus Platform. All rights reserved. (Phase 1 Enabled)</p>
      </footer>
    </div>
  );
};
