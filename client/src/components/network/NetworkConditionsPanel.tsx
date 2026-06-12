import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useNotificationStore } from '../../stores/notificationStore';

interface NetworkCondition {
  delayMs: number;
  jitterMs: number;
  packetLossRate: number;
  disconnectAfterMs: number;
  active: boolean;
}

const DEFAULT: NetworkCondition = {
  delayMs: 0,
  jitterMs: 0,
  packetLossRate: 0,
  disconnectAfterMs: 0,
  active: false,
};

const PRESETS: { label: string; values: Partial<NetworkCondition> }[] = [
  {
    label: 'Slow 3G',
    values: { delayMs: 200, jitterMs: 50, packetLossRate: 0.05 },
  },
  {
    label: 'High Latency',
    values: { delayMs: 500, jitterMs: 100, packetLossRate: 0 },
  },
  {
    label: 'Lossy',
    values: { packetLossRate: 0.2, delayMs: 50 },
  },
];

interface Props {
  connectionId: string | null;
}

export function NetworkConditionsPanel({ connectionId }: Props) {
  const addToast = useNotificationStore((s) => s.addToast);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<NetworkCondition>(DEFAULT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!connectionId) return;
    void api
      .get<NetworkCondition>(`/api/connections/${connectionId}/network`)
      .then((r) => setForm({ ...DEFAULT, ...r.data }))
      .catch(() => setForm(DEFAULT));
  }, [connectionId]);

  const apply = useCallback(async () => {
    if (!connectionId) return;
    try {
      const resp = await api.put<NetworkCondition>(
        `/api/connections/${connectionId}/network`,
        form,
      );
      setForm(resp.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      addToast('Network conditions applied', 'warning');
    } catch {
      addToast('Failed to apply network conditions', 'error');
    }
  }, [connectionId, form, addToast]);

  const clear = useCallback(async () => {
    if (!connectionId) return;
    try {
      await api.delete(`/api/connections/${connectionId}/network`);
      setForm(DEFAULT);
      addToast('Network conditions cleared', 'info');
    } catch {
      addToast('Failed to clear network conditions', 'error');
    }
  }, [connectionId, addToast]);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setForm((f) => ({ ...f, ...preset.values }));
  };

  if (!connectionId) return null;

  const isActive = form.active;

  return (
    <div className="border-t border-surface-border">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Network Simulation
          </span>
          {isActive && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30">
              ⚠ Active
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-2 py-0.5 text-xs rounded bg-surface-primary border border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-500"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Delay (ms)', key: 'delayMs', min: 0, max: 10000 },
              { label: 'Jitter (ms)', key: 'jitterMs', min: 0, max: 5000 },
              { label: 'Disconnect after (ms, 0=off)', key: 'disconnectAfterMs', min: 0, max: 300000 },
            ].map(({ label, key, min, max }) => (
              <label key={key} className="flex flex-col gap-0.5">
                <span className="text-gray-500">{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={form[key as keyof NetworkCondition] as number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                  className="bg-surface-primary border border-surface-border rounded px-2 py-0.5 text-gray-200 outline-none"
                />
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Packet loss rate</span>
              <span>{(form.packetLossRate * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(form.packetLossRate * 100)}
              onChange={(e) =>
                setForm((f) => ({ ...f, packetLossRate: Number(e.target.value) / 100 }))
              }
              className="accent-yellow-400"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => void apply()}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {saved ? '✓ Applied' : 'Apply Conditions'}
            </button>
            <button
              onClick={() => void clear()}
              className="px-3 py-1.5 rounded text-xs border border-surface-border text-gray-400 hover:text-gray-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
