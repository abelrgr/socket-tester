import { create } from 'zustand';
import { ConnectionConfig } from '../types';

const STORAGE_KEY = 'socket-tester:configs';
const MAX_CONFIGS = 50;

function loadConfigs(): ConnectionConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConnectionConfig[]) : [];
  } catch {
    return [];
  }
}

function persistConfigs(configs: ConnectionConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

interface SavedConfigsState {
  configs: ConnectionConfig[];
  pendingLoad: ConnectionConfig | null;
  saveConfig: (config: Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteConfig: (id: string) => void;
  updateConfig: (id: string, updates: Partial<ConnectionConfig>) => void;
  loadConfig: (config: ConnectionConfig) => void;
  clearPendingLoad: () => void;
}

const useSavedConfigsStore = create<SavedConfigsState>((set, get) => ({
  configs: loadConfigs(),
  pendingLoad: null,

  loadConfig: (config) => set({ pendingLoad: config }),
  clearPendingLoad: () => set({ pendingLoad: null }),

  saveConfig: (config) => {
    const prev = get().configs;
    if (prev.length >= MAX_CONFIGS) {
      alert('Maximum 50 saved configurations reached. Please delete some before saving.');
      return;
    }
    const newConfig: ConnectionConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...prev, newConfig];
    persistConfigs(next);
    set({ configs: next });
  },

  deleteConfig: (id) => {
    const next = get().configs.filter((c) => c.id !== id);
    persistConfigs(next);
    set({ configs: next });
  },

  updateConfig: (id, updates) => {
    const next = get().configs.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
    );
    persistConfigs(next);
    set({ configs: next });
  },
}));

export function useSavedConfigs() {
  return useSavedConfigsStore();
}
