import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  overlay?: boolean;
}

export function Loading({
  message = '加载中...',
  size = 'medium',
  fullScreen = false,
  overlay = false
}: LoadingProps) {
  const sizes = {
    small: 24,
    medium: 40,
    large: 64
  };

  const iconSize = sizes[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2
        size={iconSize}
        className="animate-spin text-blue-500"
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm text-gray-600" role="status">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`
          fixed inset-0 z-[9998] flex items-center justify-center
          ${overlay ? 'bg-black/20 backdrop-blur-sm' : 'bg-white'}
        `}
        role="progressbar"
        aria-busy="true"
        aria-live="polite"
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center p-8"
      role="progressbar"
      aria-busy="true"
      aria-live="polite"
    >
      {content}
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  show: boolean;
}

export function LoadingOverlay({ message, show }: LoadingOverlayProps) {
  if (!show) return null;

  return <Loading message={message} fullScreen overlay />;
}
