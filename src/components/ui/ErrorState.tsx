import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  minHeight?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Encountered a Connection Glitch',
  message,
  onRetry,
  minHeight = 'min-h-[200px]',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-red-100 bg-red-50/30 ${minHeight} text-center space-y-4 max-w-lg mx-auto w-full`}>
      <div className="p-3 bg-red-100/60 rounded-full text-red-650 text-red-650 text-red-600 border border-red-200 shadow-sm animate-bounce">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-base">{title}</h4>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors border border-transparent shadow-sm hover:shadow active:scale-95"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
