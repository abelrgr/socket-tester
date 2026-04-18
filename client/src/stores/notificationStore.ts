import { create } from 'zustand';
import { v4 as uuidv4 } from '../utils/uuid';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

const AUTO_DISMISS_MS = 5000;

interface NotificationState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = uuidv4();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, createdAt: Date.now() }],
    }));
    // Auto-dismiss
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
