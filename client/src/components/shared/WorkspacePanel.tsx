import { useState, useRef } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function WorkspacePanel() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    getActiveWorkspace,
    addEnvVar,
    updateEnvVar,
    removeEnvVar,
    exportWorkspace,
    importWorkspace,
  } = useWorkspaceStore();

  const workspace = getActiveWorkspace();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddEnvVar = () => {
    if (!newKey.trim()) return;
    addEnvVar(newKey.trim(), newValue.trim());
    setNewKey('');
    setNewValue('');
  };

  return (
    <div className="border-t border-surface-border">
      {/* Collapsible header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] uppercase tracking-wider transition-colors"
        aria-expanded={!collapsed}
        aria-controls="workspace-panel-content"
      >
        <span>Workspace</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {!collapsed && (
        <div id="workspace-panel-content" className="px-4 pb-4 space-y-3">
          {/* Workspace selector */}
          <div className="flex items-center gap-2">
            <select
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="input-field text-xs flex-1 py-1.5"
              aria-label="Select workspace"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const name = prompt('New workspace name:');
                if (name?.trim()) createWorkspace(name.trim());
              }}
              aria-label="Create new workspace"
              title="New workspace"
              className="p-1.5 rounded text-gray-400 hover:text-gray-100 hover:bg-surface-elevated text-sm flex-shrink-0"
            >
              +
            </button>
          </div>

          {/* Workspace actions */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
            <button
              onClick={() => exportWorkspace()}
              className="text-brand hover:underline"
              aria-label="Export current workspace"
            >
              Export
            </button>
            <span className="text-gray-600" aria-hidden="true">·</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-brand hover:underline"
              aria-label="Import workspace from file"
            >
              Import
            </button>
            {workspaces.length > 1 && (
              <>
                <span className="text-gray-600" aria-hidden="true">·</span>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete workspace "${workspace.name}"?`)) {
                      deleteWorkspace(activeWorkspaceId);
                    }
                  }}
                  className="text-red-400 hover:underline"
                  aria-label="Delete current workspace"
                >
                  Delete
                </button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string')
                  importWorkspace(ev.target.result);
              };
              reader.readAsText(file);
              // Reset so same file can be re-imported
              e.target.value = '';
            }}
          />

          {/* Environment Variables */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Environment Variables
            </p>
            <p className="text-xs text-gray-600 mb-2">
              Use <code className="text-brand text-xs">{'{{KEY}}'}</code> in any URL field.
            </p>

            <div className="space-y-1 max-h-36 overflow-y-auto mb-2">
              {workspace.envVars.length === 0 ? (
                <p className="text-xs text-gray-600">No variables defined.</p>
              ) : (
                workspace.envVars.map(({ key, value, isSecret }) => (
                  <div key={key} className="flex items-center gap-1">
                    <span
                      className="text-xs font-mono text-brand w-24 truncate flex-shrink-0"
                      title={`{{${key}}}`}
                    >
                      {`{{${key}}}`}
                    </span>
                    <input
                      type={isSecret ? 'password' : 'text'}
                      value={value}
                      onChange={(e) => updateEnvVar(key, e.target.value)}
                      className="input-field text-xs flex-1 py-1 font-mono min-w-0"
                      aria-label={`Value for ${key}`}
                    />
                    <button
                      onClick={() => removeEnvVar(key)}
                      aria-label={`Remove ${key}`}
                      className="text-red-400 hover:text-red-300 text-xs flex-shrink-0 px-1"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new env var */}
            <div className="flex gap-1">
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEnvVar()}
                placeholder="KEY"
                className="input-field text-xs py-1 font-mono min-w-0"
                style={{ width: '90px', flexShrink: 0 }}
                aria-label="New environment variable name"
              />
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEnvVar()}
                placeholder="value"
                className="input-field text-xs py-1 flex-1 min-w-0"
                aria-label="New environment variable value"
              />
              <button
                onClick={handleAddEnvVar}
                disabled={!newKey.trim()}
                className="flex-shrink-0 px-2 py-1 bg-brand [color:var(--color-on-brand)] rounded text-xs disabled:opacity-50 hover:bg-brand-dark transition-colors"
                aria-label="Add environment variable"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
