import { useState, useEffect } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useMessageStore } from '../../stores/messageStore';
import { useSavedConfigs } from '../../hooks/useSavedConfigs';
import {
  createWebSocketConnection,
  createSocketIoConnection,
  createMqttConnection,
  createAmqpConnection,
  closeConnection,
} from '../../services/api';
import type { Protocol, ProtocolConfig, WebSocketConfig, SocketIoConfig, MqttConfig, AmqpConfig } from '../../types';

const PROTOCOLS: { value: Protocol; label: string; comingSoon?: boolean }[] = [
  { value: 'websocket', label: 'WebSocket' },
  { value: 'socketio', label: 'Socket.io' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'amqp', label: 'AMQP', comingSoon: true },
];

function KVEditor({
  label,
  pairs,
  onChange,
}: {
  label: string;
  pairs: { key: string; value: string }[];
  onChange: (pairs: { key: string; value: string }[]) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <button
          type="button"
          className="text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]"
          onClick={() => onChange([...pairs, { key: '', value: '' }])}
        >
          + Add
        </button>
      </div>
      {pairs.map((p, i) => (
        <div key={i} className="flex gap-1">
          <input
            className="input-field text-xs flex-1 font-mono"
            placeholder="Key"
            value={p.key}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...next[i], key: e.target.value };
              onChange(next);
            }}
          />
          <input
            className="input-field text-xs flex-1 font-mono"
            placeholder="Value"
            value={p.value}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...next[i], value: e.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="text-red-400 hover:text-red-300 px-1"
            onClick={() => onChange(pairs.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConnectionForm() {
  const [protocol, setProtocol] = useState<Protocol>('websocket');

  // WebSocket / Socket.io shared
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [wssProtocols, setWssProtocols] = useState('');

  // Socket.io extra
  const [namespace, setNamespace] = useState('');
  const [sioPath, setSioPath] = useState('');
  const [authJson, setAuthJson] = useState('');
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(3);
  const [reconnectDelay, setReconnectDelay] = useState(1000);
  const [transports, setTransports] = useState<('websocket' | 'polling')[]>(['websocket']);

  // MQTT
  const [brokerUrl, setBrokerUrl] = useState('');
  const [mqttClientId, setMqttClientId] = useState('');
  const [mqttUsername, setMqttUsername] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [keepalive, setKeepalive] = useState(60);
  const [cleanSession, setCleanSession] = useState(true);
  const [mqttSubscribeAll, setMqttSubscribeAll] = useState(true);

  // AMQP
  const [amqpUrl, setAmqpUrl] = useState('');
  const [amqpVhost, setAmqpVhost] = useState('/');
  const [amqpUsername, setAmqpUsername] = useState('');
  const [amqpPassword, _setAmqpPassword] = useState('');
  const [amqpHeartbeat, setAmqpHeartbeat] = useState(60);

  // Auth (WS + Socket.io)
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'apikey' | 'basic'>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKeyName, setApiKeyName] = useState('Authorization');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');

  // Save config UI
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeConnection, setConnection, updateStatus } = useConnectionStore();
  const addMessage = useMessageStore((s) => s.addMessage);
  const { saveConfig, pendingLoad, clearPendingLoad } = useSavedConfigs();

  // Populate form fields when a saved config is loaded
  useEffect(() => {
    if (!pendingLoad) return;
    const { protocol: p, config: c } = pendingLoad;
    setProtocol(p);
    setError(null);
    if (p === 'websocket') {
      const cfg = c as WebSocketConfig;
      setUrl(cfg.url ?? '');
      setHeaders(cfg.headers ?? []);
      setWssProtocols(cfg.protocols ?? '');
    } else if (p === 'socketio') {
      const cfg = c as SocketIoConfig;
      setUrl(cfg.url ?? '');
      setNamespace(cfg.namespace ?? '');
      setSioPath(cfg.path ?? '');
      setAuthJson(cfg.auth?.socketioAuth ?? '');
      setTransports(cfg.transports ?? ['websocket']);
      setAutoReconnect(cfg.autoReconnect ?? false);
      setReconnectAttempts(cfg.reconnectionAttempts ?? 3);
      setReconnectDelay(cfg.reconnectionDelay ?? 1000);
    } else if (p === 'mqtt') {
      const cfg = c as MqttConfig;
      setBrokerUrl(cfg.brokerUrl ?? '');
      setMqttClientId(cfg.clientId ?? '');
      setMqttUsername(cfg.username ?? '');
      setKeepalive(cfg.keepalive ?? 60);
      setCleanSession(cfg.clean ?? true);
    } else if (p === 'amqp') {
      const cfg = c as AmqpConfig;
      setAmqpUrl(cfg.url ?? '');
      setAmqpVhost(cfg.vhost ?? '/');
      setAmqpUsername(cfg.username ?? '');
      setAmqpHeartbeat(cfg.heartbeat ?? 60);
    }
    clearPendingLoad();
  }, [pendingLoad, clearPendingLoad]);

  const isConnected = activeConnection?.status === 'connected';
  const isConnecting = activeConnection?.status === 'connecting';

  // Build headers map including auth
  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    headers.forEach(({ key, value }) => { if (key) h[key] = value; });
    if (authType === 'bearer' && bearerToken) h['Authorization'] = `Bearer ${bearerToken}`;
    if (authType === 'apikey' && apiKeyName && apiKeyValue) h[apiKeyName] = apiKeyValue;
    if (authType === 'basic' && basicUser) {
      h['Authorization'] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`;
    }
    return h;
  };

  const buildProtocolConfig = (): ProtocolConfig => {
    if (protocol === 'websocket') {
      return { url: url.trim(), headers, protocols: wssProtocols || undefined };
    }
    if (protocol === 'socketio') {
      return { url: url.trim(), namespace: namespace || undefined, path: sioPath || undefined, auth: authJson ? { type: 'custom', socketioAuth: authJson } : undefined, transports, autoReconnect, reconnectionAttempts: reconnectAttempts, reconnectionDelay: reconnectDelay };
    }
    if (protocol === 'mqtt') {
      return { brokerUrl: brokerUrl.trim(), clientId: mqttClientId || undefined, username: mqttUsername || undefined, keepalive, clean: cleanSession };
    }
    // amqp
    return { url: amqpUrl.trim(), vhost: amqpVhost || undefined, username: amqpUsername || undefined, heartbeat: amqpHeartbeat };
  };

  const handleSaveConfig = () => {
    if (!saveName.trim()) return;
    saveConfig({ name: saveName.trim(), protocol, config: buildProtocolConfig() });
    setSaveName('');
    setShowSaveInput(false);
  };

  const handleConnect = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      updateStatus('connecting');
      let connectionId = '';
      let displayUrl = '';

      if (protocol === 'websocket') {
        if (!/^wss?:\/\/.+/.test(url.trim())) {
          throw new Error('URL must start with ws:// or wss://');
        }
        displayUrl = url.trim();
        setConnection({ connectionId: '', url: displayUrl, protocol, status: 'connecting' });
        const builtHeaders = buildHeaders();
        const res = await createWebSocketConnection({
          url: displayUrl,
          headers: Object.keys(builtHeaders).length > 0 ? builtHeaders : undefined,
          protocols: wssProtocols ? wssProtocols.split(',').map((s) => s.trim()) : undefined,
        });
        connectionId = res.data.connectionId;

      } else if (protocol === 'socketio') {
        if (!/^https?:\/\/.+/.test(url.trim())) {
          throw new Error('URL must start with http:// or https://');
        }
        displayUrl = url.trim();
        setConnection({ connectionId: '', url: displayUrl, protocol, status: 'connecting' });
        let auth: Record<string, unknown> | undefined;
        if (authJson.trim()) {
          try { auth = JSON.parse(authJson); } catch { throw new Error('Auth JSON is invalid'); }
        }
        const builtHeaders = buildHeaders();
        const sioAuth = auth ?? (Object.keys(builtHeaders).length > 0 ? builtHeaders : undefined);
        const res = await createSocketIoConnection({
          url: displayUrl,
          namespace: namespace || undefined,
          path: sioPath || undefined,
          auth: sioAuth,
          transports,
          autoReconnect,
          reconnectionAttempts: autoReconnect ? reconnectAttempts : undefined,
          reconnectionDelay: autoReconnect ? reconnectDelay : undefined,
        });
        connectionId = res.data.connectionId;

      } else if (protocol === 'mqtt') {
        if (!/^mqtts?:\/\/.+|^wss?:\/\/.+/.test(brokerUrl.trim())) {
          throw new Error('Broker URL must start with mqtt://, mqtts://, ws://, or wss://');
        }
        displayUrl = brokerUrl.trim();
        setConnection({ connectionId: '', url: displayUrl, protocol, status: 'connecting' });
        const res = await createMqttConnection({
          brokerUrl: displayUrl,
          clientId: mqttClientId || undefined,
          username: mqttUsername || undefined,
          password: mqttPassword || undefined,
          keepalive,
          clean: cleanSession,
          initialTopics: mqttSubscribeAll ? ['#'] : undefined,
        });
        connectionId = res.data.connectionId;

      } else if (protocol === 'amqp') {
        if (!/^amqps?:\/\/.+/.test(amqpUrl.trim())) {
          throw new Error('URL must start with amqp:// or amqps://');
        }
        displayUrl = amqpUrl.trim();
        setConnection({ connectionId: '', url: displayUrl, protocol, status: 'connecting' });
        const res = await createAmqpConnection({
          url: displayUrl,
          vhost: amqpVhost || undefined,
          username: amqpUsername || undefined,
          password: amqpPassword || undefined,
          heartbeat: amqpHeartbeat,
        });
        connectionId = res.data.connectionId;
      }

      setConnection({ connectionId, url: displayUrl, protocol, status: 'connecting' });
    } catch (err: unknown) {
      updateStatus('error');
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      addMessage('', `Failed to connect: ${msg}`, 'system', 'text', 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!activeConnection?.connectionId) return;
    try {
      await closeConnection(activeConnection.connectionId);
    } catch {
      // ignore — server will clean up
    }
    updateStatus('disconnected');
    setConnection(null);
  };

  const urlPlaceholders: Record<Protocol, string> = {
    websocket: 'wss://echo.websocket.org',
    socketio: 'http://localhost:3001',
    mqtt: 'mqtt://localhost:1883',
    amqp: 'amqp://localhost:5672',
  };

  const disabled = isConnected || isConnecting;

  return (
    <div className="space-y-3">
      {/* Protocol selector */}
      <div>
        <label className="label" htmlFor="protocol-select">Protocol</label>
        <div className="grid grid-cols-2 gap-1">
          {PROTOCOLS.map(({ value, label, comingSoon }) => (
            <button
              key={value}
              type="button"
              disabled={disabled || comingSoon}
              onClick={() => { setProtocol(value); setError(null); }}
              className={`text-xs px-2 py-1.5 rounded border transition-colors font-medium relative ${
                protocol === value
                  ? 'bg-brand border-brand [color:var(--color-on-brand)]'
                  : 'border-surface-border [color:var(--color-text-secondary)] hover:border-brand hover:[color:var(--color-text-primary)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-pressed={protocol === value}
              title={comingSoon ? 'Coming soon' : undefined}
            >
              {label}
              {comingSoon && (
                <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide text-yellow-400 opacity-90">Soon</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ---- WebSocket fields ---- */}
      {protocol === 'websocket' && (
        <>
          <div>
            <label className="label" htmlFor="url-input">Server URL</label>
            <input
              id="url-input"
              type="url"
              className={`input-field text-sm font-mono${error ? ' border-red-500' : ''}`}
              placeholder={urlPlaceholders.websocket}
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              disabled={disabled}
              onKeyDown={(e) => e.key === 'Enter' && !disabled && handleConnect()}
            />
          </div>
          <div>
            <label className="label" htmlFor="wss-protocols">Sub-protocols</label>
            <input
              id="wss-protocols"
              className="input-field text-xs font-mono"
              placeholder="e.g. chat, json (comma-separated)"
              value={wssProtocols}
              onChange={(e) => setWssProtocols(e.target.value)}
              disabled={disabled}
            />
          </div>
          {/* Auth */}
          <div>
            <label className="label">Authentication</label>
            <select
              className="input-field text-xs mb-2"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as typeof authType)}
              disabled={disabled}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="apikey">API Key</option>
              <option value="basic">Basic Auth</option>
            </select>
            {authType === 'bearer' && (
              <input className="input-field text-xs font-mono" type="password" placeholder="Token" value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} disabled={disabled} />
            )}
            {authType === 'apikey' && (
              <div className="flex gap-1">
                <input className="input-field text-xs font-mono flex-1" placeholder="Header name" value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} disabled={disabled} />
                <input className="input-field text-xs font-mono flex-1" type="password" placeholder="Value" value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} disabled={disabled} />
              </div>
            )}
            {authType === 'basic' && (
              <div className="flex gap-1">
                <input className="input-field text-xs flex-1" placeholder="Username" value={basicUser} onChange={(e) => setBasicUser(e.target.value)} disabled={disabled} />
                <input className="input-field text-xs flex-1" type="password" placeholder="Password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} disabled={disabled} />
              </div>
            )}
          </div>
          <KVEditor label="Custom Headers" pairs={headers} onChange={setHeaders} />
        </>
      )}

      {/* ---- Socket.io fields ---- */}
      {protocol === 'socketio' && (
        <>
          <div>
            <label className="label">Server URL</label>
            <input className={`input-field text-sm font-mono${error ? ' border-red-500' : ''}`} placeholder={urlPlaceholders.socketio} value={url} onChange={(e) => { setUrl(e.target.value); setError(null); }} disabled={disabled} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Namespace</label>
              <input className="input-field text-xs font-mono" placeholder="/chat" value={namespace} onChange={(e) => setNamespace(e.target.value)} disabled={disabled} />
            </div>
            <div>
              <label className="label">Path</label>
              <input className="input-field text-xs font-mono" placeholder="/socket.io" value={sioPath} onChange={(e) => setSioPath(e.target.value)} disabled={disabled} />
            </div>
          </div>
          <div>
            <label className="label">Auth JSON</label>
            <textarea
              className="input-field text-xs font-mono resize-none h-16"
              placeholder={'{"token":"..."}'}
              value={authJson}
              onChange={(e) => setAuthJson(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="label">Transports</label>
            <div className="flex gap-3">
              {(['websocket', 'polling'] as const).map((t) => (
                <label key={t} className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transports.includes(t)}
                    onChange={(e) => setTransports(e.target.checked ? [...transports, t] : transports.filter((x) => x !== t))}
                    disabled={disabled}
                    className="accent-brand"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={autoReconnect} onChange={(e) => setAutoReconnect(e.target.checked)} disabled={disabled} className="accent-brand" />
              Auto-reconnect
            </label>
            {autoReconnect && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="label">Max attempts</label>
                  <input type="number" className="input-field text-xs" min={1} max={20} value={reconnectAttempts} onChange={(e) => setReconnectAttempts(Number(e.target.value))} disabled={disabled} />
                </div>
                <div>
                  <label className="label">Delay (ms)</label>
                  <input type="number" className="input-field text-xs" min={100} step={100} value={reconnectDelay} onChange={(e) => setReconnectDelay(Number(e.target.value))} disabled={disabled} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---- MQTT fields ---- */}
      {protocol === 'mqtt' && (
        <>
          <div>
            <label className="label">Broker URL</label>
            <input className={`input-field text-sm font-mono${error ? ' border-red-500' : ''}`} placeholder={urlPlaceholders.mqtt} value={brokerUrl} onChange={(e) => { setBrokerUrl(e.target.value); setError(null); }} disabled={disabled} />
          </div>
          <div>
            <label className="label">Client ID</label>
            <input className="input-field text-xs font-mono" placeholder="auto-generated if empty" value={mqttClientId} onChange={(e) => setMqttClientId(e.target.value)} disabled={disabled} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Username</label>
              <input className="input-field text-xs" value={mqttUsername} onChange={(e) => setMqttUsername(e.target.value)} disabled={disabled} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field text-xs" value={mqttPassword} onChange={(e) => setMqttPassword(e.target.value)} disabled={disabled} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Keep-alive (s)</label>
              <input type="number" className="input-field text-xs" min={0} max={3600} value={keepalive} onChange={(e) => setKeepalive(Number(e.target.value))} disabled={disabled} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={cleanSession} onChange={(e) => setCleanSession(e.target.checked)} disabled={disabled} className="accent-brand" />
                Clean session
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={mqttSubscribeAll} onChange={(e) => setMqttSubscribeAll(e.target.checked)} disabled={disabled} className="accent-brand" />
            Subscribe to all topics (<code className="font-mono text-teal-400">#</code>)
          </label>
        </>
      )}

      {/* ---- AMQP fields (coming soon) ---- */}
      {protocol === 'amqp' && (
        <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5">
          <span className="text-2xl">🚧</span>
          <p className="text-sm font-semibold text-yellow-400">AMQP — Coming Soon</p>
          <p className="text-xs text-gray-500 text-center">
            RabbitMQ / AMQP 0-9-1 support is currently under development.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      )}

      {/* Save Config */}
      {showSaveInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field text-sm py-1.5 flex-1"
            placeholder="Config name…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveConfig()}
            autoFocus
          />
          <button onClick={handleSaveConfig} className="btn-primary text-xs py-1.5 px-3">Save</button>
          <button onClick={() => setShowSaveInput(false)} className="btn-secondary text-xs py-1.5 px-2">✕</button>
        </div>
      ) : (
        <button onClick={() => setShowSaveInput(true)} className="btn-secondary w-full text-xs">
          💾 Save Config
        </button>
      )}

      {/* Connect / Disconnect */}
      {isConnected ? (
        <button onClick={handleDisconnect} className="btn-danger w-full" aria-label="Disconnect">
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting || isSubmitting}
          className="btn-primary w-full"
          aria-label="Connect"
        >
          {isConnecting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Connecting…
            </span>
          ) : (
            'Connect'
          )}
        </button>
      )}
    </div>
  );
}
