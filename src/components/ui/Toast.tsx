import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { id, type, title, message, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  // Styling based on toast type
  const typeStyles = {
    success: {
      bg: 'bg-white border-emerald-200 shadow-emerald-50/50',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-white border-rose-200 shadow-rose-50/50',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-white border-amber-200 shadow-amber-50/50',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-white border-indigo-200 shadow-indigo-50/50',
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      titleColor: 'text-slate-900',
      messageColor: 'text-slate-600',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const style = typeStyles[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm w-full transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in ${style.bg}`}
    >
      <div className={`flex-shrink-0 p-1.5 rounded-lg ${style.iconBg}`}>
        {style.icon}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-bold leading-5 ${style.titleColor}`}>
          {title}
        </h4>
        {message && (
          <p className={`text-xs mt-1 leading-4 ${style.messageColor} break-words`}>
            {message}
          </p>
        )}
      </div>

      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-md hover:bg-slate-100 focus:outline-none"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
