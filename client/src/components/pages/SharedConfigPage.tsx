import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSharedConfig } from '../../services/api';
import { useSavedConfigs } from '../../hooks/useSavedConfigs';
import type { ConnectionConfig } from '../../types';

export function SharedConfigPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { saveConfig } = useSavedConfigs();

  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Sanitise token — only alphanumeric chars
    const safe = token.replace(/[^a-z0-9]/gi, '').slice(0, 32);
    getSharedConfig(safe)
      .then((res) => {
        setConfig(res.data);
      })
      .catch(() => {
        setError('This shared config was not found or has expired.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleImport = () => {
    if (!config) return;
    const cfg = config as unknown as ConnectionConfig;
    saveConfig({
      name: (cfg.name as string | undefined) ?? 'Shared config',
      protocol: cfg.protocol ?? 'websocket',
      config: cfg.config ?? {},
    });
    setImported(true);
  };

  return (
    <main className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-brand hover:underline flex items-center gap-1"
          aria-label="Back to tester"
        >
          ← Back to Tester
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-100 mb-2">Shared Configuration</h1>
      <p className="text-gray-400 text-sm mb-6">
        Someone shared a Socket Tester configuration with you.
      </p>

      {loading && (
        <div className="text-gray-400" aria-live="polite">
          Loading shared config…
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {config && !error && (
        <div className="bg-surface-secondary border border-surface-border rounded-xl p-6 space-y-4">
          {/* Config preview */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Preview
            </h2>
            <pre className="bg-surface-primary rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto max-h-72">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>

          <div
            role="note"
            className="text-sm text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2"
          >
            ⚠️ Review the config before importing. Credentials have been stripped.
          </div>

          {imported ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 text-green-400 text-sm"
            >
              <span aria-hidden="true">✓</span> Config saved to your local configurations.{' '}
              <button
                onClick={() => navigate('/')}
                className="text-brand hover:underline"
              >
                Go to Tester
              </button>
            </div>
          ) : (
            <button onClick={handleImport} className="btn-primary">
              Import to My Configs
            </button>
          )}
        </div>
      )}
    </main>
  );
}
