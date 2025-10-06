import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';

let toastId = 0;

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => string;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  remove: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((
    type: ToastType,
    message: string,
    title?: string,
    duration?: number
  ) => {
    const id = `toast-${toastId++}`;
    const toast: ToastMessage = {
      id,
      type,
      message,
      title,
      duration: duration ?? 3000
    };
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const success = useCallback((message: string, title?: string) => {
    return showToast('success', message, title);
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    return showToast('error', message, title, 5000);
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    return showToast('info', message, title);
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    return showToast('warning', message, title);
  }, [showToast]);

  const contextValue = useMemo<ToastContextValue>(() => ({
    toasts,
    showToast,
    success,
    error,
    info,
    warning,
    remove,
    clear
  }), [toasts, showToast, success, error, info, warning, remove, clear]);

  return React.createElement(
    ToastContext.Provider,
    { value: contextValue },
    children,
    React.createElement(ToastContainer, { toasts, onClose: remove })
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 中使用');
  }
  return context;
}
