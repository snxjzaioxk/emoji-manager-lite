import { useState, useCallback, createElement } from 'react';
import type { FC } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface UseConfirmReturn {
  confirm: (title: string, message: string, variant?: 'danger' | 'warning' | 'info') => Promise<boolean>;
  ConfirmComponent: FC;
}

export function useConfirm(): UseConfirmReturn {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    resolvePromise: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    resolvePromise: null
  });

  const confirm = useCallback((title: string, message: string, variant: 'danger' | 'warning' | 'info' = 'warning'): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        variant,
        resolvePromise: resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolvePromise) {
      dialogState.resolvePromise(true);
    }
    setDialogState(prev => ({ ...prev, isOpen: false, resolvePromise: null }));
  }, [dialogState.resolvePromise]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolvePromise) {
      dialogState.resolvePromise(false);
    }
    setDialogState(prev => ({ ...prev, isOpen: false, resolvePromise: null }));
  }, [dialogState.resolvePromise]);

  const ConfirmComponent = useCallback(() => createElement(ConfirmDialog, {
    isOpen: dialogState.isOpen,
    title: dialogState.title,
    message: dialogState.message,
    variant: dialogState.variant,
    onConfirm: handleConfirm,
    onCancel: handleCancel
  }), [dialogState, handleConfirm, handleCancel]);

  return {
    confirm,
    ConfirmComponent
  };
}