import { useContext } from 'react';
import { ToastContext } from '../components/ui/ToastProvider';
import type { ToastContextType } from '../components/ui/ToastProvider';

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
