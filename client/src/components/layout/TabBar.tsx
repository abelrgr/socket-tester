import { useConnectionStore, type ConnectionTab } from '../../stores/connectionStore';

const PROTOCOL_LABELS: Record<string, string> = {
  websocket: 'WS',
  socketio: 'SIO',
  mqtt: 'MQTT',
  amqp: 'AMQP 🚧',
};

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  reconnecting: 'bg-yellow-400 animate-pulse',
  error: 'bg-red-500',
  disconnected: 'bg-gray-500',
  idle: 'bg-gray-600',
};

export function TabBar() {
  const tabs = useConnectionStore((s) => s.tabs);
  const activeTabId = useConnectionStore((s) => s.activeTabId);
  const setActiveTab = useConnectionStore((s) => s.setActiveTab);
  const closeTab = useConnectionStore((s) => s.closeTab);
  const addTab = useConnectionStore((s) => s.addTab);

  return (
    <div
      className="flex items-center border-b border-surface-border bg-surface-secondary overflow-x-auto flex-shrink-0"
      role="tablist"
      aria-label="Connection tabs"
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
          onClose={tabs.length > 1 ? () => closeTab(tab.id) : undefined}
        />
      ))}

      {tabs.length < 10 && (
        <button
          onClick={() => addTab()}
          title="New connection tab (Ctrl+N)"
          aria-label="Add new connection tab"
          className="flex-shrink-0 px-3 py-2.5 [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] hover:bg-surface-elevated transition-colors text-base leading-none"
        >
          +
        </button>
      )}
    </div>
  );
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
}: {
  tab: ConnectionTab;
  isActive: boolean;
  onSelect: () => void;
  onClose?: () => void;
}) {
  const status = tab.connection?.status ?? 'idle';
  const statusClass = STATUS_COLORS[status] ?? 'bg-gray-500';

  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group flex items-center gap-1.5 px-3 py-2 border-b-2 cursor-pointer transition-colors min-w-0 max-w-[180px] flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
        isActive
          ? 'border-brand [color:var(--color-text-primary)] bg-surface-elevated'
          : 'border-transparent [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] hover:bg-surface-elevated/50'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${statusClass}`}
        aria-hidden="true"
      />
      <span
        className="text-xs font-mono px-1 rounded bg-surface-primary text-brand flex-shrink-0"
        aria-hidden="true"
      >
        {PROTOCOL_LABELS[tab.protocol] ?? tab.protocol.toUpperCase()}
      </span>
      <span className="text-xs truncate">{tab.label}</span>

      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={`Close ${tab.label} tab`}
          className="ml-auto p-0.5 rounded hover:bg-surface-border opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
