import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  minHeight?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'Search',
  title,
  message,
  actionLabel,
  onAction,
  minHeight = 'min-h-[220px]',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center space-y-4 ${minHeight} w-full`}>
      <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 select-none" aria-hidden="true">
        {icon}
      </span>

      <div className="space-y-1.5 max-w-md">
        <h4 className="font-bold text-slate-800 text-base">{title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">
          {message}
        </p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition hover:shadow border border-transparent active:scale-95 mt-1"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
