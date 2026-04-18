import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useMessageStore } from '../../stores/messageStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { closeConnection } from '../../services/api';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setTheme = useUIStore((s) => s.setTheme);
  const clearMessages = useMessageStore((s) => s.clearMessages);
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const addTab = useConnectionStore((s) => s.addTab);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => setOpen(false);

  const actions: CommandAction[] = [
    {
      id: 'new-tab',
      label: 'New Connection Tab',
      shortcut: 'Ctrl+N',
      action: () => {
        addTab();
        close();
      },
    },
    {
      id: 'clear',
      label: 'Clear Message History',
      shortcut: 'Ctrl+L',
      action: () => {
        clearMessages();
        close();
      },
    },
    {
      id: 'disconnect',
      label: 'Disconnect Active Connection',
      shortcut: 'Ctrl+D',
      action: () => {
        if (activeConnection?.status === 'connected') {
          void closeConnection(activeConnection.connectionId);
        }
        close();
      },
    },
    {
      id: 'theme-dark',
      label: 'Theme: Dark',
      action: () => {
        setTheme('dark');
        close();
      },
    },
    {
      id: 'theme-light',
      label: 'Theme: Light',
      action: () => {
        setTheme('light');
        close();
      },
    },
    {
      id: 'theme-dracula',
      label: 'Theme: Dracula',
      action: () => {
        setTheme('dracula');
        close();
      },
    },
    {
      id: 'theme-hc',
      label: 'Theme: High Contrast',
      action: () => {
        setTheme('high-contrast');
        close();
      },
    },
    {
      id: 'theme-solar',
      label: 'Theme: Solarized Dark',
      action: () => {
        setTheme('solarized');
        close();
      },
    },
    {
      id: 'docs',
      label: 'Open Documentation',
      shortcut: 'F1',
      action: () => {
        navigate('/docs');
        close();
      },
    },
    {
      id: 'swagger',
      label: 'Open API Reference (Swagger)',
      action: () => {
        window.open('/api/docs', '_blank', 'noopener,noreferrer');
        close();
      },
    },
  ];

  const filtered = query
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      filtered[selectedIndex]?.action();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={close}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl mx-4 bg-surface-secondary border border-surface-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none text-sm"
            aria-autocomplete="list"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
          />
          <kbd className="text-xs text-gray-500 bg-surface-primary px-1.5 py-0.5 rounded border border-surface-border">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <ul className="max-h-72 overflow-y-auto" role="listbox" aria-label="Commands">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500 text-sm" role="option" aria-selected={false}>
              No commands found
            </li>
          ) : (
            filtered.map((action, idx) => (
              <li
                key={action.id}
                role="option"
                aria-selected={selectedIndex === idx}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                  selectedIndex === idx
                    ? 'bg-surface-elevated'
                    : 'hover:bg-surface-elevated/50'
                }`}
                onClick={action.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div>
                  <span className="text-sm text-gray-200">{action.label}</span>
                  {action.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                  )}
                </div>
                {action.shortcut && (
                  <kbd className="text-xs text-gray-500 bg-surface-primary px-1.5 py-0.5 rounded font-mono border border-surface-border ml-4 flex-shrink-0">
                    {action.shortcut}
                  </kbd>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
