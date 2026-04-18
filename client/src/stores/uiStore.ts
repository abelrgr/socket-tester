import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'dracula' | 'high-contrast' | 'solarized';
export type MainTab = 'messages' | 'stats' | 'logs' | 'performance';

export const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dracula', label: 'Dracula', icon: '🧛' },
  { value: 'high-contrast', label: 'High Contrast', icon: '⚡' },
  { value: 'solarized', label: 'Solarized', icon: '🌅' },
];

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  activeTab: MainTab;
  commandPaletteOpen: boolean;

  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: MainTab) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme !== 'light');
}

function loadTheme(): Theme {
  const saved = localStorage.getItem('socket-tester:theme') as Theme | null;
  const valid: Theme[] = ['dark', 'light', 'dracula', 'high-contrast', 'solarized'];
  return saved !== null && valid.includes(saved) ? saved : 'dark';
}

const initialTheme = loadTheme();
if (typeof document !== 'undefined') applyTheme(initialTheme);

export const useUIStore = create<UIState>((set) => ({
  theme: initialTheme,
  sidebarOpen: true,
  activeTab: 'messages',
  commandPaletteOpen: false,

  setTheme: (theme) => {
    applyTheme(theme);
    localStorage.setItem('socket-tester:theme', theme);
    set({ theme });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
}));

