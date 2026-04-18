import { useNotificationStore, type Toast, type ToastType } from '../../stores/notificationStore';

const TYPE_STYLES: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-green-900/90 border-green-700', icon: '✓' },
  warning: { bg: 'bg-yellow-900/90 border-yellow-700', icon: '⚠' },
  error: { bg: 'bg-red-900/90 border-red-700', icon: '✕' },
  info: { bg: 'bg-gray-800/90 border-gray-600', icon: 'ℹ' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useNotificationStore((s) => s.removeToast);
  const { bg, icon } = TYPE_STYLES[toast.type];

  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-lg border ${bg} shadow-lg text-sm text-white max-w-xs animate-fade-in`}
      role="alert"
    >
      <span className="shrink-0 font-bold">{icon}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-white/60 hover:text-white ml-2 font-bold"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function NotificationSystem() {
  const toasts = useNotificationStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-auto"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
