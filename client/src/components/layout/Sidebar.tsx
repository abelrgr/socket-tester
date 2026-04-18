import { useUIStore } from '../../stores/uiStore';
import { ConnectionForm } from '../connection/ConnectionForm';
import { ConnectionCard } from '../shared/ConnectionCard';
import { NetworkConditionsPanel } from '../network/NetworkConditionsPanel';
import { WorkspacePanel } from '../shared/WorkspacePanel';
import { useSavedConfigs } from '../../hooks/useSavedConfigs';

interface SidebarProps {
  connectionId: string | null;
}

export function Sidebar({ connectionId }: SidebarProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const { configs, deleteConfig, loadConfig } = useSavedConfigs();

  if (!sidebarOpen) return null;

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col bg-surface-secondary border-r border-surface-border overflow-y-auto">
      {/* Connection Form Section */}
      <div className="p-4 border-b border-surface-border">
        <h2 className="text-xs font-semibold [color:var(--color-text-secondary)] uppercase tracking-wider mb-3">
          New Connection
        </h2>
        <ConnectionForm />
      </div>

      {/* Saved Configs Section */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold [color:var(--color-text-secondary)] uppercase tracking-wider">
            Saved Configs
          </h2>
          <span className="text-xs [color:var(--color-text-muted)]">{configs.length}/50</span>
        </div>

        {configs.length === 0 ? (
          <p className="text-xs [color:var(--color-text-muted)] text-center py-4">
            No saved configurations yet.
            <br />
            Connect to a URL and save it.
          </p>
        ) : (
          <div className="space-y-1.5">
            {configs.map((c) => (
              <ConnectionCard
                key={c.id}
                config={c}
                onLoad={loadConfig}
                onDelete={deleteConfig}
              />
            ))}
          </div>
        )}
      </div>

      {/* Network Conditions Accordion — visible when connected */}
      <NetworkConditionsPanel connectionId={connectionId} />

      {/* Workspace & Environment Variables */}
      <WorkspacePanel />
    </aside>
  );
}
