import { create } from 'zustand';
import type { ConnectionConfig } from '../types';

export interface EnvVar {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  envVars: EnvVar[];
  connections: ConnectionConfig[];
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;

  getActiveWorkspace: () => Workspace;
  createWorkspace: (name: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  duplicateWorkspace: (id: string) => void;

  addEnvVar: (key: string, value: string, isSecret?: boolean) => void;
  updateEnvVar: (key: string, value: string) => void;
  removeEnvVar: (key: string) => void;
  /** Replace all {{KEY}} placeholders in a string with workspace env var values. */
  resolveEnvVars: (str: string) => string;

  exportWorkspace: (id?: string) => void;
  importWorkspace: (jsonStr: string) => void;
}

function createDefaultWorkspace(): Workspace {
  return {
    id: crypto.randomUUID(),
    name: 'Default Workspace',
    envVars: [],
    connections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const STORAGE_KEY = 'socket-tester:workspaces';
const ACTIVE_KEY = 'socket-tester:activeWorkspace';

function loadFromStorage(): { workspaces: Workspace[]; activeWorkspaceId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const workspaces: Workspace[] = raw ? (JSON.parse(raw) as Workspace[]) : [];
    if (workspaces.length === 0) {
      const def = createDefaultWorkspace();
      return { workspaces: [def], activeWorkspaceId: def.id };
    }
    const activeId = localStorage.getItem(ACTIVE_KEY) ?? workspaces[0].id;
    return { workspaces, activeWorkspaceId: activeId };
  } catch {
    const def = createDefaultWorkspace();
    return { workspaces: [def], activeWorkspaceId: def.id };
  }
}

function persist(workspaces: Workspace[], activeId: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  localStorage.setItem(ACTIVE_KEY, activeId);
}

const initial = loadFromStorage();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: initial.workspaces,
  activeWorkspaceId: initial.activeWorkspaceId,

  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  },

  createWorkspace: (name) =>
    set((state) => {
      const ws = createDefaultWorkspace();
      ws.name = name;
      const workspaces = [...state.workspaces, ws];
      persist(workspaces, ws.id);
      return { workspaces, activeWorkspaceId: ws.id };
    }),

  renameWorkspace: (id, name) =>
    set((state) => {
      const workspaces = state.workspaces.map((w) =>
        w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w,
      );
      persist(workspaces, state.activeWorkspaceId);
      return { workspaces };
    }),

  deleteWorkspace: (id) =>
    set((state) => {
      if (state.workspaces.length === 1) return state;
      const workspaces = state.workspaces.filter((w) => w.id !== id);
      const newActiveId =
        state.activeWorkspaceId === id ? workspaces[0].id : state.activeWorkspaceId;
      persist(workspaces, newActiveId);
      return { workspaces, activeWorkspaceId: newActiveId };
    }),

  setActiveWorkspace: (id) =>
    set((state) => {
      persist(state.workspaces, id);
      return { activeWorkspaceId: id };
    }),

  duplicateWorkspace: (id) =>
    set((state) => {
      const source = state.workspaces.find((w) => w.id === id);
      if (!source) return state;
      const copy: Workspace = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const workspaces = [...state.workspaces, copy];
      persist(workspaces, copy.id);
      return { workspaces, activeWorkspaceId: copy.id };
    }),

  addEnvVar: (key, value, isSecret = false) =>
    set((state) => {
      const workspaces = state.workspaces.map((w) => {
        if (w.id !== state.activeWorkspaceId) return w;
        const idx = w.envVars.findIndex((v) => v.key === key);
        const envVars =
          idx >= 0
            ? w.envVars.map((v, i) => (i === idx ? { key, value, isSecret } : v))
            : [...w.envVars, { key, value, isSecret }];
        return { ...w, envVars, updatedAt: new Date().toISOString() };
      });
      persist(workspaces, state.activeWorkspaceId);
      return { workspaces };
    }),

  updateEnvVar: (key, value) =>
    set((state) => {
      const workspaces = state.workspaces.map((w) => {
        if (w.id !== state.activeWorkspaceId) return w;
        return {
          ...w,
          envVars: w.envVars.map((v) => (v.key === key ? { ...v, value } : v)),
          updatedAt: new Date().toISOString(),
        };
      });
      persist(workspaces, state.activeWorkspaceId);
      return { workspaces };
    }),

  removeEnvVar: (key) =>
    set((state) => {
      const workspaces = state.workspaces.map((w) => {
        if (w.id !== state.activeWorkspaceId) return w;
        return {
          ...w,
          envVars: w.envVars.filter((v) => v.key !== key),
          updatedAt: new Date().toISOString(),
        };
      });
      persist(workspaces, state.activeWorkspaceId);
      return { workspaces };
    }),

  resolveEnvVars: (str) => {
    const { workspaces, activeWorkspaceId } = get();
    const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!workspace) return str;
    return workspace.envVars.reduce(
      (s, { key, value }) => s.split(`{{${key}}}`).join(value),
      str,
    );
  },

  exportWorkspace: (id) => {
    const { workspaces, activeWorkspaceId } = get();
    const ws = workspaces.find((w) => w.id === (id ?? activeWorkspaceId));
    if (!ws) return;
    const exported = { ...ws, envVars: ws.envVars.filter((v) => !v.isSecret) };
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ws.name.replace(/\s+/g, '-').toLowerCase()}-workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importWorkspace: (jsonStr) =>
    set((state) => {
      try {
        const ws = JSON.parse(jsonStr) as Workspace;
        if (!ws.id || !ws.name) throw new Error('Invalid workspace format');
        const imported: Workspace = {
          ...ws,
          id: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        };
        const workspaces = [...state.workspaces, imported];
        persist(workspaces, imported.id);
        return { workspaces, activeWorkspaceId: imported.id };
      } catch {
        return state;
      }
    }),
}));
