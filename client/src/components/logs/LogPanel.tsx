import { useRef, useEffect, useState, useCallback } from 'react';
import { useLogStore, type LogEntry } from '../../stores/logStore';
import axios from 'axios';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  debug: 'text-gray-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const DIR_ICON: Record<string, string> = {
  in: '←',
  out: '→',
};

interface Props {
  connectionId: string | null;
}

function EntryRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
  };

  return (
    <div
      className="group border-b border-surface-border py-1.5 px-3 hover:bg-white/5 cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-gray-600 shrink-0">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
        <span className={`uppercase font-semibold w-10 shrink-0 ${LEVEL_COLORS[entry.level] ?? 'text-gray-400'}`}>
          {entry.level}
        </span>
        {entry.direction && (
          <span className="text-gray-500 shrink-0">{DIR_ICON[entry.direction]}</span>
        )}
        <span className="text-gray-300 truncate">{entry.event}</span>
        {entry.payloadSize != null && (
          <span className="text-gray-600 shrink-0 ml-auto">{entry.payloadSize}B</span>
        )}
        {entry.latency != null && (
          <span className="text-purple-400 shrink-0">{entry.latency}ms</span>
        )}
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 ml-1 shrink-0"
          onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
          title="Copy entry"
        >
          ⎘
        </button>
      </div>
      {expanded && (
        <pre className="mt-1 text-xs text-gray-400 whitespace-pre-wrap break-all bg-black/20 rounded p-2 max-h-40 overflow-y-auto">
          {JSON.stringify({ ...entry, id: undefined }, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function LogPanel({ connectionId }: Props) {
  const entries = useLogStore((s) =>
    connectionId ? s.getFiltered(connectionId) : [],
  );
  const filter = useLogStore((s) => s.filter);
  const setFilter = useLogStore((s) => s.setFilter);
  const clearForConnection = useLogStore((s) => s.clearForConnection);

  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [showClear, setShowClear] = useState(false);

  // Auto-scroll unless paused
  useEffect(() => {
    if (paused || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [entries, paused]);

  const exportNdjson = useCallback(async () => {
    if (!connectionId) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/logs/${connectionId}/export`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${connectionId.slice(0, 8)}.ndjson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: export frontend entries as NDJSON
      const ndjson = entries.map((e) => JSON.stringify(e)).join('\n');
      const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${(connectionId ?? 'all').slice(0, 8)}.ndjson`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [connectionId, entries]);

  const handleClear = () => {
    if (connectionId) clearForConnection(connectionId);
    setShowClear(false);
  };

  const levelOptions: Array<{ value: LogEntry['level'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warn' },
    { value: 'error', label: 'Error' },
  ];

  if (!connectionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Connect to a server to see logs.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          {levelOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter({ level: opt.value })}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter.level === opt.value
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-primary text-gray-500 hover:text-gray-300 border border-surface-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search logs…"
          value={filter.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="flex-1 min-w-24 bg-surface-primary border border-surface-border rounded px-2 py-0.5 outline-none text-gray-200 placeholder-gray-600"
        />
        <button
          onClick={() => setPaused((v) => !v)}
          className={`px-2 py-0.5 rounded border ${paused ? 'border-yellow-500 text-yellow-400' : 'border-surface-border text-gray-400 hover:text-gray-200'}`}
          title={paused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          onClick={() => void exportNdjson()}
          className="px-2 py-0.5 rounded border border-surface-border text-gray-400 hover:text-gray-200"
        >
          Export
        </button>
        <button
          onClick={() => setShowClear(true)}
          className="px-2 py-0.5 rounded border border-surface-border text-gray-400 hover:text-red-400"
        >
          Clear
        </button>
      </div>

      {/* Entries */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto font-mono"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {entries.length === 0 ? (
          <p className="text-center text-gray-600 text-xs py-8">No log entries.</p>
        ) : (
          entries.map((e) => <EntryRow key={e.id} entry={e} />)
        )}
      </div>

      {/* Confirm clear */}
      {showClear && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-secondary border border-surface-border rounded-lg p-6 flex flex-col gap-4 min-w-56">
            <p className="text-sm text-gray-200">Clear all logs for this connection?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClear(false)}
                className="px-3 py-1 text-sm rounded border border-surface-border text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
