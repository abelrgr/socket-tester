import { useState, useRef, KeyboardEvent } from 'react';
import { useConnectionStore } from '../../stores/connectionStore';
import { useMessageStore } from '../../stores/messageStore';
import {
  sendMessage,
  sendSocketIoMessage,
  mqttPublish,
  amqpPublish,
} from '../../services/api';
import type { MessageTemplate, MessageType } from '../../types';

type PayloadType = 'text' | 'json' | 'binary';

const TEMPLATES_KEY = 'socket-tester:templates';

function loadTemplates(): MessageTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]'); } catch { return []; }
}
function saveTemplates(tpls: MessageTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(tpls));
}

export function MessageComposer() {
  const [payload, setPayload] = useState('');
  const [type, setType] = useState<PayloadType>('text');
  const [isSending, setIsSending] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Socket.io extras
  const [eventName, setEventName] = useState('message');
  const [ack, setAck] = useState(false);

  // MQTT extras
  const [mqttTopic, setMqttTopic] = useState('');
  const [mqttQos, setMqttQos] = useState<0 | 1 | 2>(0);
  const [mqttRetain, setMqttRetain] = useState(false);

  // AMQP extras
  const [amqpExchange, _setAmqpExchange] = useState('');
  const [amqpRoutingKey, _setAmqpRoutingKey] = useState('');

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => loadTemplates());
  const [showTemplates, setShowTemplates] = useState(false);
  const [tplName, setTplName] = useState('');
  const [showSaveTpl, setShowSaveTpl] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConnection = useConnectionStore((s) => s.activeConnection);
  const addMessage = useMessageStore((s) => s.addMessage);

  const isConnected = activeConnection?.status === 'connected';
  const connectionId = activeConnection?.connectionId ?? '';
  const protocol = activeConnection?.protocol ?? 'websocket';

  const validatePayload = (): boolean => {
    if (type === 'json') {
      try { JSON.parse(payload); setJsonError(null); return true; }
      catch (e) { setJsonError(e instanceof SyntaxError ? e.message : 'Invalid JSON'); return false; }
    }
    setJsonError(null);
    return true;
  };

  const handleSend = async () => {
    if (!isConnected || !connectionId || !payload.trim()) return;
    if (!validatePayload()) return;

    setIsSending(true);
    try {
      const size = new TextEncoder().encode(payload.trim()).length;

      if (protocol === 'websocket') {
        await sendMessage(connectionId, { payload: payload.trim(), type });
        addMessage(connectionId, payload.trim(), 'sent', type as MessageType, size, null);

      } else if (protocol === 'socketio') {
        await sendSocketIoMessage(connectionId, {
          eventName,
          payload: type === 'json' ? JSON.parse(payload.trim()) : payload.trim(),
          ack,
        });
        addMessage(connectionId, payload.trim(), 'sent', type as MessageType, size, null, { eventName });

      } else if (protocol === 'mqtt') {
        if (!mqttTopic.trim()) { setJsonError('Topic is required for MQTT'); return; }
        await mqttPublish(connectionId, { topic: mqttTopic.trim(), payload: payload.trim(), qos: mqttQos, retain: mqttRetain });
        addMessage(connectionId, payload.trim(), 'sent', 'text', size, null, { topic: mqttTopic.trim(), qos: mqttQos, retain: mqttRetain });

      } else if (protocol === 'amqp') {
        await amqpPublish(connectionId, { exchange: amqpExchange || undefined, routingKey: amqpRoutingKey || undefined, payload: payload.trim() });
        addMessage(connectionId, payload.trim(), 'sent', 'text', size, null, { exchange: amqpExchange, routingKey: amqpRoutingKey });
      }

      setPayload('');
      textareaRef.current?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      addMessage(connectionId, `❌ Send error: ${msg}`, 'system', 'text', 0);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
  };

  const handleFormatJson = () => {
    try { setPayload(JSON.stringify(JSON.parse(payload), null, 2)); setJsonError(null); } catch {}
  };

  const handleMinifyJson = () => {
    try { setPayload(JSON.stringify(JSON.parse(payload))); setJsonError(null); } catch {}
  };

  const saveTemplate = () => {
    if (!tplName.trim() || !payload.trim()) return;
    const tpl: MessageTemplate = {
      id: crypto.randomUUID(),
      name: tplName.trim(),
      payload: payload.trim(),
      type: type as MessageType,
      eventName: protocol === 'socketio' ? eventName : undefined,
      topic: protocol === 'mqtt' ? mqttTopic : undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveTemplates(next);
    setTplName('');
    setShowSaveTpl(false);
  };

  const loadTemplate = (tpl: MessageTemplate) => {
    setPayload(tpl.payload);
    setType(tpl.type as PayloadType);
    if (tpl.eventName) setEventName(tpl.eventName);
    if (tpl.topic) setMqttTopic(tpl.topic);
    setShowTemplates(false);
    setJsonError(null);
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  const showsType = protocol === 'websocket' || protocol === 'socketio';

  return (
    <div className="border-t border-surface-border bg-surface-secondary flex-shrink-0">
      {/* Protocol-specific extras row */}
      {protocol === 'socketio' && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <label className="text-xs [color:var(--color-text-secondary)] whitespace-nowrap">Event</label>
          <input
            className="input-field text-xs font-mono flex-1"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="event name"
            disabled={!isConnected}
          />
          <label className="flex items-center gap-1 text-xs [color:var(--color-text-secondary)] whitespace-nowrap">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="accent-brand" disabled={!isConnected} />
            ACK
          </label>
        </div>
      )}

      {protocol === 'mqtt' && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
          <label className="text-xs [color:var(--color-text-secondary)] whitespace-nowrap">Topic</label>
          <input
            className="input-field text-xs font-mono flex-1 min-w-[100px]"
            value={mqttTopic}
            onChange={(e) => setMqttTopic(e.target.value)}
            placeholder="sensors/temp"
            disabled={!isConnected}
          />
          <label className="text-xs [color:var(--color-text-secondary)]">QoS</label>
          <select
            className="input-field text-xs w-14"
            value={mqttQos}
            onChange={(e) => setMqttQos(Number(e.target.value) as 0 | 1 | 2)}
            disabled={!isConnected}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
          <label className="flex items-center gap-1 text-xs [color:var(--color-text-secondary)]">
            <input type="checkbox" checked={mqttRetain} onChange={(e) => setMqttRetain(e.target.checked)} className="accent-brand" disabled={!isConnected} />
            Retain
          </label>
        </div>
      )}

      {protocol === 'amqp' && (
        <div className="flex items-center justify-center gap-2 px-4 py-3">
          <span className="text-yellow-400 text-xs font-semibold">🚧 AMQP messaging — Coming Soon</span>
        </div>
      )}

      {/* Type selector + format actions */}
      <div className="flex items-center gap-1 px-4 pt-2">
        {showsType && (['text', 'json', 'binary'] as PayloadType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setJsonError(null); }}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              type === t ? 'bg-brand [color:var(--color-on-brand)]' : '[color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] hover:bg-surface-elevated'
            }`}
            aria-pressed={type === t}
          >
            {t.toUpperCase()}
          </button>
        ))}
        {type === 'json' && payload && (
          <>
            <button onClick={handleFormatJson} className="text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] px-2" aria-label="Format JSON">Format</button>
            <button onClick={handleMinifyJson} className="text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] px-2" aria-label="Minify JSON">Minify</button>
          </>
        )}
        {/* Templates button */}
        <div className="ml-auto relative">
          <button
            onClick={() => setShowTemplates((s) => !s)}
            className="text-xs [color:var(--color-text-secondary)] hover:[color:var(--color-text-primary)] px-2 py-1 border border-surface-border rounded transition-colors"
          >
            Templates {templates.length > 0 ? `(${templates.length})` : ''}
          </button>
          {showTemplates && (
            <div className="absolute bottom-8 right-0 z-20 bg-surface-elevated border border-surface-border rounded-lg shadow-lg w-56 max-h-60 overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-xs [color:var(--color-text-secondary)] p-3">No saved templates yet.</p>
              ) : (
                templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center gap-1 px-3 py-2 hover:bg-surface-secondary">
                    <button className="flex-1 text-left text-xs [color:var(--color-text-primary)] truncate" onClick={() => loadTemplate(tpl)}>{tpl.name}</button>
                    <button className="text-red-400 hover:text-red-300 text-xs" onClick={() => deleteTemplate(tpl.id)} aria-label="Delete template">×</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="px-4 pt-2">
        <textarea
          ref={textareaRef}
          rows={4}
          className={`w-full bg-surface-primary border rounded-lg px-3 py-2 text-sm font-mono [color:var(--color-text-primary)] placeholder:[color:var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-brand resize-none transition-colors${
            jsonError ? ' border-red-500 focus:ring-red-500' : ' border-surface-border'
          }`}
          placeholder={
            type === 'json' ? '{"event": "ping"}' : type === 'binary' ? 'Base64 encoded data...' : 'Type a message…'
          }
          value={payload}
          onChange={(e) => { setPayload(e.target.value); if (jsonError) setJsonError(null); }}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          aria-label="Message payload"
        />
        {jsonError && <p className="mt-1 text-xs text-red-400" role="alert">{jsonError}</p>}
      </div>

      {/* Save template inline */}
      {showSaveTpl && (
        <div className="flex gap-2 px-4 pt-2">
          <input
            className="input-field text-xs flex-1"
            placeholder="Template name…"
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
          />
          <button onClick={saveTemplate} className="btn-primary text-xs py-1 px-3">Save</button>
          <button onClick={() => setShowSaveTpl(false)} className="btn-secondary text-xs py-1 px-2">✕</button>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs [color:var(--color-text-muted)]">
          {isConnected ? 'Ctrl+Enter to send' : 'Connect to send messages'}
        </span>
        <div className="flex gap-2">
          {!showSaveTpl && (
            <button
              onClick={() => setShowSaveTpl(true)}
              disabled={!payload.trim()}
              className="btn-secondary text-xs py-1.5 px-2 hidden sm:inline-flex"
              title="Save as template"
            >
              Save tpl
            </button>
          )}
          <button onClick={() => { setPayload(''); setJsonError(null); }} className="btn-secondary text-xs py-1.5 px-3">Clear</button>
          <button
            onClick={handleSend}
            disabled={!isConnected || isSending || !payload.trim()}
            className="btn-primary text-xs py-1.5 px-4"
          >
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
