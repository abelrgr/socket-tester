import { useEffect, useState } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { ConnectionStatus } from '../../types';

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotClass: string; chipClass: string; pulse: boolean }
> = {
  idle: {
    label: 'Idle',
    dotClass: 'bg-gray-500',
    chipClass: 'bg-gray-800 text-gray-400',
    pulse: false,
  },
  connecting: {
    label: 'Connecting',
    dotClass: 'bg-yellow-400',
    chipClass: 'bg-yellow-900/40 text-yellow-300',
    pulse: true,
  },
  connected: {
    label: 'Connected',
    dotClass: 'bg-green-400',
    chipClass: 'bg-green-900/40 text-green-300',
    pulse: false,
  },
  reconnecting: {
    label: 'Reconnecting',
    dotClass: 'bg-orange-400',
    chipClass: 'bg-orange-900/40 text-orange-300',
    pulse: true,
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    chipClass: 'bg-red-900/40 text-red-300',
    pulse: false,
  },
  disconnected: {
    label: 'Disconnected',
    dotClass: 'bg-gray-500',
    chipClass: 'bg-gray-800 text-gray-400',
    pulse: false,
  },
};

export function StatusBar() {
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const [elapsed, setElapsed] = useState(0);

  const status: ConnectionStatus = activeConnection?.status ?? 'idle';
  const cfg = STATUS_CONFIG[status];

  // Elapsed timer
  useEffect(() => {
    if (status !== 'connected') {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatElapsed = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-secondary border-b border-surface-border">
      {/* Status chip */}
      <span className={`status-chip ${cfg.chipClass}`}>
        <span
          className={`w-2 h-2 rounded-full ${cfg.dotClass} ${cfg.pulse ? 'animate-pulse-ring' : ''}`}
          aria-hidden="true"
        />
        {cfg.label}
      </span>

      {/* URL */}
      {activeConnection?.url && (
        <span
          className="text-sm text-gray-400 font-mono truncate flex-1"
          title={activeConnection.url}
          aria-label={`Connected to ${activeConnection.url}`}
        >
          {activeConnection.url}
        </span>
      )}

      {/* Elapsed time */}
      {status === 'connected' && (
        <span className="text-xs text-gray-500 tabular-nums flex-shrink-0" aria-live="polite">
          {formatElapsed(elapsed)}
        </span>
      )}
    </div>
  );
}
