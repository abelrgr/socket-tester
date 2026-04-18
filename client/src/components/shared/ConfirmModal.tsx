import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on mount and trap Escape
  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl border border-surface-border bg-surface-secondary shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/15 text-red-400 text-lg flex-shrink-0">
            🗑️
          </span>
          <h2
            id="confirm-modal-title"
            className="text-base font-semibold text-gray-100"
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{message}</p>

        {/* Divider */}
        <div className="border-t border-surface-border" />

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="btn-secondary text-sm px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
