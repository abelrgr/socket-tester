import { useEffect, useRef, useState, useCallback } from 'react';
import { useMessageStore, MessageFilter } from '../../stores/messageStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { mqttSubscribe, mqttUnsubscribe } from '../../services/api';
import type { Message } from '../../types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function tryFormatJson(payload: string): { formatted: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(payload);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: payload, isJson: false };
  }
}

function highlight(text: string, search: string): JSX.Element {
  if (!search) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-500/30 text-yellow-200 rounded-sm">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  );
}

const MSG_CAP = 1000;
const PREVIEW_CAP = 500;

function CapBanner({ count, copy = 'Showing latest 1000 messages — older entries dropped' }: { count: number; copy?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs" role="status" aria-live="polite">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
        <path d="M12 9v4M12 17h.01"/>
      </svg>
      <span className="text-yellow-500">{copy}</span>
      <span className="ml-auto text-yellow-500/70 tabular-nums">{count.toLocaleString()} / {MSG_CAP.toLocaleString()}</span>
    </div>
  );
}

function TruncMarker() {
  return (
    <span className="ml-1 text-xs italic [color:var(--color-text-muted)] border-b border-dotted border-[var(--color-text-muted)]" title={`Preview limited to ${PREVIEW_CAP} characters`}>
      … (truncated)
    </span>
  );
}

function MessageBubble({ message, search }: { message: Message; search: string }) {
  const isSystem = message.direction === 'system';
  const isSent = message.direction === 'sent';
  const { formatted, isJson } = tryFormatJson(message.payload);
  const [expanded, setExpanded] = useState(true);

  const directionLabel = isSystem ? 'SYS' : isSent ? 'SENT' : 'RECV';
  const rowClass = isSystem ? 'justify-center' : isSent ? 'justify-end' : 'justify-start';
  const bubbleClass = isSystem
    ? 'bg-surface-elevated text-gray-500 text-xs px-3 py-1 rounded-full'
    : isSent
    ? 'bg-brand/20 border border-brand/40 text-blue-200'
    : 'bg-green-900/20 border border-green-800/40 text-green-200';

  return (
    <div className={`flex ${rowClass} w-full`} role="listitem">
      {isSystem ? (
        <span className={bubbleClass}>{message.payload}</span>
      ) : (
        <div className={`max-w-[82%] rounded-lg px-3 py-2 ${bubbleClass}`}>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold ${isSent ? 'text-blue-400' : 'text-green-400'}`}>
              [{directionLabel}]
            </span>
            <span className="text-xs [color:var(--color-text-muted)]">{formatTime(message.timestamp)}</span>
            {message.latency != null && <span className="text-xs [color:var(--color-text-muted)]">RTT:{message.latency}ms</span>}
            {message.size > 0 && <span className="text-xs [color:var(--color-text-muted)]">{message.size}B</span>}
            {message.eventName && <span className="text-xs bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">evt:{message.eventName}</span>}
            {message.topic && <span className="text-xs bg-teal-900/40 text-teal-300 px-1.5 py-0.5 rounded">topic:{message.topic}</span>}
            {message.qos != null && <span className="text-xs [color:var(--color-text-muted)]">QoS:{message.qos}</span>}
            {message.routingKey && <span className="text-xs bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded">rk:{message.routingKey}</span>}
            <button
              className="ml-auto text-xs [color:var(--color-text-muted)] hover:[color:var(--color-text-secondary)]"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
          {expanded && (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto">
              {isJson ? highlight(formatted, search) : highlight(message.payload, search)}
              {message.truncated && <TruncMarker />}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function MqttTopicsPanel() {
  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const addMqttTopic = useConnectionStore((s) => s.addMqttTopic);
  const removeMqttTopic = useConnectionStore((s) => s.removeMqttTopic);
  const addMessage = useMessageStore((s) => s.addMessage);
  const [newTopic, setNewTopic] = useState('');
  const [qos, setQos] = useState<0 | 1 | 2>(0);

  if (!activeConnection || activeConnection.protocol !== 'mqtt') return null;
  const topics = activeConnection.mqttTopics ?? [];

  const handleSubscribe = async () => {
    if (!newTopic.trim() || !activeConnection.connectionId) return;
    try {
      await mqttSubscribe(activeConnection.connectionId, newTopic.trim(), qos);
      addMqttTopic(newTopic.trim());
      setNewTopic('');
    } catch {
      addMessage(activeConnection.connectionId, '❌ Subscribe failed', 'system', 'text', 0);
    }
  };

  const handleUnsubscribe = async (topic: string) => {
    if (!activeConnection.connectionId) return;
    try {
      await mqttUnsubscribe(activeConnection.connectionId, topic);
      removeMqttTopic(topic);
    } catch {}
  };

  return (
    <div className="px-4 py-2 border-b border-surface-border bg-surface-secondary">
      <div className="text-xs text-gray-500 mb-1 font-medium">MQTT Subscriptions</div>
      <div className="flex gap-1 mb-2">
        <input
          className="input-field text-xs font-mono flex-1"
          placeholder="sensors/# or devices/+/state"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
          disabled={activeConnection.status !== 'connected'}
        />
        <select
          className="input-field text-xs w-14"
          value={qos}
          onChange={(e) => setQos(Number(e.target.value) as 0 | 1 | 2)}
        >
          <option value={0}>QoS 0</option>
          <option value={1}>QoS 1</option>
          <option value={2}>QoS 2</option>
        </select>
        <button onClick={handleSubscribe} className="btn-primary text-xs px-2 py-1" disabled={activeConnection.status !== 'connected'}>Sub</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {topics.map((t) => (
          <span key={t} className="flex items-center gap-1 bg-teal-900/30 text-teal-300 text-xs px-2 py-0.5 rounded-full border border-teal-800/40">
            {t}
            <button className="text-teal-500 hover:text-red-400 ml-0.5" onClick={() => handleUnsubscribe(t)} aria-label="Unsubscribe">×</button>
          </span>
        ))}
        {topics.length === 0 && <span className="text-xs text-gray-600">No active subscriptions</span>}
      </div>
    </div>
  );
}

function exportMessagesAsJson(messages: Message[]) {
  if (messages.length === 0) return;
  const data = JSON.stringify(messages, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `socket-tester-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMessagesAsCsv(messages: Message[]) {
  if (messages.length === 0) return;
  const headers = ['timestamp', 'direction', 'type', 'payload', 'latency_ms', 'topic', 'eventName', 'routingKey'];
  const rows = messages
    .filter((m) => m.direction !== 'system')
    .map((m) => [
      m.timestamp,
      m.direction,
      m.type,
      `"${m.payload.slice(0, 500).replace(/"/g, '""')}"`,
      m.latency ?? '',
      m.topic ?? '',
      m.eventName ?? '',
      m.routingKey ?? '',
    ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `socket-tester-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MessageFeed() {
  const allMessages = useMessageStore((s) => s.messages);
  const filter = useMessageStore((s) => s.filter);
  const setFilter = useMessageStore((s) => s.setFilter);
  const getFiltered = useMessageStore((s) => s.getFiltered);
  const clearMessages = useMessageStore((s) => s.clearMessages);
  const activeConnectionId = useConnectionStore((s) => s.activeConnection?.connectionId ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredMessages = getFiltered(activeConnectionId);
  const connectionMessageCount = activeConnectionId
    ? allMessages.filter((m) => m.connectionId === activeConnectionId).length
    : 0;

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 50);
  };

  const handleSearchChange = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilter({ search: value }), 300);
  }, [setFilter]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* MQTT topics panel */}
      <MqttTopicsPanel />

      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-surface-border">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 [color:var(--color-text-muted)] text-xs">🔍</span>
            <input
              className="input-field text-xs pl-6 py-1"
              placeholder="Search messages… (Ctrl+F)"
              defaultValue={filter.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'f') { e.preventDefault(); (e.target as HTMLInputElement).focus(); }
              }}
              aria-label="Search messages"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`text-xs px-2 py-1 border rounded transition-colors ${showFilters ? 'border-brand text-brand' : 'border-surface-border [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]'}`}
          >
            Filter
          </button>
          {/* Export */}
          <div className="relative group">
            <button className="text-xs px-2 py-1 border border-surface-border rounded [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] transition-colors">Export ▾</button>
            <div className="absolute right-0 top-7 z-20 bg-surface-elevated border border-surface-border rounded-lg shadow-lg hidden group-hover:block w-28">
              <button className="w-full text-left text-xs px-3 py-2 hover:bg-surface-secondary [color:var(--color-text-primary)]" onClick={() => exportMessagesAsJson(filteredMessages)}>JSON</button>
              <button className="w-full text-left text-xs px-3 py-2 hover:bg-surface-secondary [color:var(--color-text-primary)]" onClick={() => exportMessagesAsCsv(filteredMessages)}>CSV</button>
            </div>
          </div>
          <span className="text-xs [color:var(--color-text-muted)] whitespace-nowrap">
            {filteredMessages.length}/{connectionMessageCount}
            {connectionMessageCount >= 1000 && <span className="ml-1 text-yellow-500">⚠</span>}
          </span>
          {!autoScroll && (
            <button onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="text-xs text-brand hover:text-brand-light whitespace-nowrap">↓ Bottom</button>
          )}
          <button onClick={() => clearMessages(activeConnectionId)} className="text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)]" aria-label="Clear history">Clear</button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex items-center gap-4 px-4 py-2 bg-surface-secondary border-t border-surface-border flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs [color:var(--color-text-secondary)]">Direction</label>
              <select className="input-field text-xs py-0.5" value={filter.direction} onChange={(e) => setFilter({ direction: e.target.value as MessageFilter['direction'] })}>
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="received">Received</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs [color:var(--color-text-secondary)]">Type</label>
              <select className="input-field text-xs py-0.5" value={filter.type} onChange={(e) => setFilter({ type: e.target.value as MessageFilter['type'] })}>
                <option value="all">All</option>
                <option value="text">Text</option>
                <option value="json">JSON</option>
                <option value="binary">Binary</option>
                <option value="system">System</option>
              </select>
            </div>
            {(filter.direction !== 'all' || filter.type !== 'all' || filter.search) && (
              <button className="text-xs text-brand hover:underline" onClick={() => setFilter({ direction: 'all', type: 'all', search: '' })}>Reset filters</button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={handleScroll}
        role="list"
        aria-label="Message history"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {connectionMessageCount >= MSG_CAP && (
          <CapBanner count={Math.min(connectionMessageCount, MSG_CAP)} />
        )}
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full [color:var(--color-text-muted)]">
            <span className="text-3xl mb-2">💬</span>
            {connectionMessageCount === 0 ? (
              <>
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Connect to a server to start testing.</p>
              </>
            ) : (
              <p className="text-sm">No messages match the current filter.</p>
            )}
          </div>
        ) : (
          filteredMessages.map((msg) => <MessageBubble key={msg.id} message={msg} search={filter.search} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
