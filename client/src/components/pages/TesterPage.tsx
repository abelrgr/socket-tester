import { useConnectionStore } from '../../stores/connectionStore';
import { useControlSocket } from '../../hooks/useControlSocket';
import { useUIStore, type MainTab } from '../../stores/uiStore';
import { Sidebar } from '../layout/Sidebar';
import { TabBar } from '../layout/TabBar';
import { StatusBar } from '../connection/StatusBar';
import { MessageFeed } from '../messages/MessageFeed';
import { MessageComposer } from '../messages/MessageComposer';
import { StatsPanel } from '../stats/StatsPanel';
import { LogPanel } from '../logs/LogPanel';
import { PerformancePanel } from '../performance/PerformancePanel';

const TABS: { id: MainTab; label: string }[] = [
  { id: 'messages', label: 'Messages' },
  { id: 'stats', label: 'Stats' },
  { id: 'logs', label: 'Logs' },
  { id: 'performance', label: 'Performance' },
];

export function TesterPage() {
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const connectionId = activeConnection?.connectionId ?? null;
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  // Multi-tab control socket (no argument — manages all tabs internally)
  useControlSocket();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar connectionId={connectionId} />

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Multi-connection tab bar */}
        <TabBar />

        <StatusBar />

        {/* Content tab bar */}
        <div
          className="flex border-b border-surface-border px-3 gap-1 shrink-0 bg-surface-secondary"
          role="tablist"
          aria-label="Content panels"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                activeTab === tab.id
                  ? 'border-brand [color:var(--color-text-primary)]'
                  : 'border-transparent [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden" role="tabpanel">
          {activeTab === 'messages' && (
            <>
              <MessageFeed />
              <MessageComposer />
            </>
          )}
          {activeTab === 'stats' && <StatsPanel connectionId={connectionId} />}
          {activeTab === 'logs' && <LogPanel connectionId={connectionId} />}
          {activeTab === 'performance' && <PerformancePanel />}
        </div>
      </main>
    </div>
  );
}

