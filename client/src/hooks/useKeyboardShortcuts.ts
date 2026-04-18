import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useMessageStore } from '../stores/messageStore';
import { useConnectionStore } from '../stores/connectionStore';
import { closeConnection } from '../services/api';

/**
 * Registers all global keyboard shortcuts (4.5).
 * Must be mounted once in the app root.
 */
export function useKeyboardShortcuts() {
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const clearMessages = useMessageStore((s) => s.clearMessages);
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const updateStatus = useConnectionStore((s) => s.updateStatus);
  const addTab = useConnectionStore((s) => s.addTab);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+K — command palette
      if (ctrl && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Ctrl+N — new tab
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        addTab();
        return;
      }

      // Ctrl+L — clear messages
      if (ctrl && e.key === 'l') {
        e.preventDefault();
        clearMessages();
        return;
      }

      // Ctrl+D — disconnect
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (activeConnection?.status === 'connected') {
          void closeConnection(activeConnection.connectionId).finally(() => {
            updateStatus('disconnected');
          });
        }
        return;
      }

      // Ctrl+F — focus search (Messages tab)
      if (ctrl && e.key === 'f') {
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-search-input]',
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
        return;
      }

      // Ctrl+E — export messages
      if (ctrl && e.key === 'e') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('[data-export-btn]')?.click();
        return;
      }

      // Ctrl+S — save config
      if (ctrl && e.key === 's') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('[data-save-config-btn]')?.click();
        return;
      }

      // F1 — docs
      if (e.key === 'F1') {
        e.preventDefault();
        window.location.href = '/docs';
        return;
      }

      // Number keys 1-4 for main tabs (Ctrl+1 … Ctrl+4)
      if (ctrl && e.key >= '1' && e.key <= '4') {
        const tabMap: Record<string, Parameters<typeof setActiveTab>[0]> = {
          '1': 'messages',
          '2': 'stats',
          '3': 'logs',
          '4': 'performance',
        };
        const tab = tabMap[e.key];
        if (tab) {
          e.preventDefault();
          setActiveTab(tab);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    toggleCommandPalette,
    clearMessages,
    activeConnection,
    updateStatus,
    addTab,
    setActiveTab,
  ]);
}
