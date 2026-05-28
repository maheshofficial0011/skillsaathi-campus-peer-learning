import React from 'react';

interface LoadingStateProps {
  label?: string;
  minHeight?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Syncing platform data...',
  minHeight = 'min-h-[200px]',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${minHeight} w-full space-y-4`}>
      <div className="relative flex items-center justify-center">
        {/* Outer Glow Ring */}
        <div className="absolute w-12 h-12 rounded-full border-4 border-indigo-100 animate-ping opacity-75"></div>
        {/* Spinner Ring */}
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-650 border-t-indigo-600 animate-spin"></div>
      </div>
      <p className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse">
        {label}
      </p>
    </div>
  );
};
