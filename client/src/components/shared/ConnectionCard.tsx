import { useState } from 'react';
import { ConnectionConfig } from '../../types';
import { ConfirmModal } from './ConfirmModal';

const PROTOCOL_LABELS: Record<string, string> = {
  websocket: 'WS',
  socketio: 'SIO',
  mqtt: 'MQTT',
  amqp: 'AMQP',
};

function getDisplayUrl(config: ConnectionConfig): string {
  const c = config.config as unknown as Record<string, unknown>;
  return (c.url as string) || (c.brokerUrl as string) || '';
}

interface ConnectionCardProps {
  config: ConnectionConfig;
  onLoad: (config: ConnectionConfig) => void;
  onDelete: (id: string) => void;
}

export function ConnectionCard({ config, onLoad, onDelete }: ConnectionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const displayUrl = getDisplayUrl(config);
  const protocolLabel = PROTOCOL_LABELS[config.protocol] ?? config.protocol;

  return (
    <>
      <div
        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-secondary hover:bg-surface-elevated border border-surface-border cursor-pointer transition-colors group"
        onClick={() => onLoad(config)}
        role="button"
        tabIndex={0}
        aria-label={`Load configuration: ${config.name}`}
        onKeyDown={(e) => e.key === 'Enter' && onLoad(config)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-surface-primary [color:var(--color-text-secondary)] uppercase tracking-wide flex-shrink-0">
              {protocolLabel}
            </span>
            <p className="text-sm font-medium [color:var(--color-text-primary)] truncate">{config.name}</p>
          </div>
          {displayUrl && <p className="text-xs [color:var(--color-text-secondary)] truncate mt-0.5 ml-0.5">{displayUrl}</p>}
        </div>
        <button
          onClick={handleDeleteClick}
          aria-label={`Delete ${config.name}`}
          className="ml-2 p-1 rounded [color:var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus:text-red-400 transition-opacity"
        >
          ✕
        </button>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Delete configuration"
          message={`"${config.name}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={() => { setShowConfirm(false); onDelete(config.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
