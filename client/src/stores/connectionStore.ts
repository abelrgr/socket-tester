import { create } from 'zustand';
import { ActiveConnection, ConnectionStatus, Protocol } from '../types';
import { PROTOCOL_COLORS } from '../constants/protocolColors';

export interface ConnectionTab {
  id: string;
  label: string;
  protocol: Protocol;
  color: string;
  connection: ActiveConnection | null;
}

function createTab(protocol: Protocol = 'websocket'): ConnectionTab {
  return {
    id: crypto.randomUUID(),
    label: 'New Connection',
    protocol,
    color: PROTOCOL_COLORS[protocol],
    connection: null,
  };
}

const FIRST_TAB = createTab();

interface ConnectionState {
  tabs: ConnectionTab[];
  activeTabId: string;
  /** Derived: always equals tabs[activeTabId].connection — kept flat for backward compat */
  activeConnection: ActiveConnection | null;

  // ---- Tab management ----
  addTab: (protocol?: Protocol) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // ---- Connection mutations on the ACTIVE tab ----
  setConnection: (conn: ActiveConnection | null) => void;
  updateStatus: (status: ConnectionStatus) => void;
  /** Update status by connectionId — used by multi-tab event routing. */
  updateStatusByConnectionId: (connectionId: string, status: ConnectionStatus) => void;
  addMqttTopic: (topic: string, connectionId?: string) => void;
  removeMqttTopic: (topic: string, connectionId?: string) => void;
  addSocketIoEvent: (eventName: string, connectionId?: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  tabs: [FIRST_TAB],
  activeTabId: FIRST_TAB.id,
  activeConnection: null,

  addTab: (protocol = 'websocket') =>
    set((state) => {
      if (state.tabs.length >= 10) return state;
      const tab = createTab(protocol);
      return { tabs: [...state.tabs, tab], activeTabId: tab.id, activeConnection: null };
    }),

  closeTab: (tabId) =>
    set((state) => {
      if (state.tabs.length === 1) return state;
      const next = state.tabs.filter((t) => t.id !== tabId);
      const newActiveId =
        state.activeTabId === tabId ? next[next.length - 1]!.id : state.activeTabId;
      return {
        tabs: next,
        activeTabId: newActiveId,
        activeConnection: next.find((t) => t.id === newActiveId)?.connection ?? null,
      };
    }),

  setActiveTab: (tabId) =>
    set((state) => ({
      activeTabId: tabId,
      activeConnection: state.tabs.find((t) => t.id === tabId)?.connection ?? null,
    })),

  setConnection: (conn) =>
    set((state) => {
      const label = conn?.url
        ? conn.url.replace(/^wss?:\/\//, '').replace(/^https?:\/\//, '').slice(0, 32)
        : 'New Connection';
      const color = conn?.protocol
        ? PROTOCOL_COLORS[conn.protocol]
        : PROTOCOL_COLORS.websocket;
      const tabs = state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, connection: conn, label, color } : t,
      );
      return { tabs, activeConnection: conn };
    }),

  updateStatus: (status) =>
    set((state) => {
      if (!state.activeConnection) return state;
      const conn = { ...state.activeConnection, status };
      const tabs = state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, connection: conn } : t,
      );
      return { tabs, activeConnection: conn };
    }),

  updateStatusByConnectionId: (connectionId, status) =>
    set((state) => {
      // Idempotent: skip the update if status hasn't changed to avoid infinite loops
      const tab = state.tabs.find((t) => t.connection?.connectionId === connectionId);
      if (!tab || tab.connection?.status === status) return state;
      const tabs = state.tabs.map((t) => {
        if (t.connection?.connectionId !== connectionId) return t;
        return { ...t, connection: { ...t.connection, status } };
      });
      const active = tabs.find((t) => t.id === state.activeTabId);
      return { tabs, activeConnection: active?.connection ?? null };
    }),

  addMqttTopic: (topic, connectionId) =>
    set((state) => {
      const targetId = connectionId ?? state.activeConnection?.connectionId;
      const tabs = state.tabs.map((t) => {
        if (t.connection?.connectionId !== targetId) return t;
        const conn = t.connection!;
        return {
          ...t,
          connection: {
            ...conn,
            mqttTopics: [...new Set([...(conn.mqttTopics ?? []), topic])],
          } as ActiveConnection,
        };
      });
      const active = tabs.find((t) => t.id === state.activeTabId);
      return { tabs, activeConnection: active?.connection ?? null };
    }),

  removeMqttTopic: (topic, connectionId) =>
    set((state) => {
      const targetId = connectionId ?? state.activeConnection?.connectionId;
      const tabs = state.tabs.map((t) => {
        if (t.connection?.connectionId !== targetId) return t;
        const conn = t.connection!;
        return {
          ...t,
          connection: {
            ...conn,
            mqttTopics: (conn.mqttTopics ?? []).filter((x) => x !== topic),
          } as ActiveConnection,
        };
      });
      const active = tabs.find((t) => t.id === state.activeTabId);
      return { tabs, activeConnection: active?.connection ?? null };
    }),

  addSocketIoEvent: (eventName, connectionId) =>
    set((state) => {
      const targetId = connectionId ?? state.activeConnection?.connectionId;
      const tabs = state.tabs.map((t) => {
        if (t.connection?.connectionId !== targetId) return t;
        const conn = t.connection!;
        return {
          ...t,
          connection: {
            ...conn,
            socketioEvents: [
              ...new Set([...(conn.socketioEvents ?? []), eventName]),
            ],
          } as ActiveConnection,
        };
      });
      const active = tabs.find((t) => t.id === state.activeTabId);
      return { tabs, activeConnection: active?.connection ?? null };
    }),
}));

export type { Protocol };


