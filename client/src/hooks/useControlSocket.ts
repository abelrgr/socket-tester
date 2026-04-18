import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useConnectionStore } from '../stores/connectionStore';
import { useMessageStore } from '../stores/messageStore';
import { useStatsStore } from '../stores/statsStore';
import { useLogStore } from '../stores/logStore';
import { useNotificationStore } from '../stores/notificationStore';

const SOCKET_URL = import.meta.env.DEV
  ? ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000')
  : '';

/**
 * Manages one persistent Socket.io control channel that handles events for ALL
 * active connection tabs.  Events are routed by the `connectionId` field present
 * in every backend event payload.
 *
 * Call once, no arguments — reads tab state from the store internally.
 */
export function useControlSocket() {
  const socketRef = useRef<Socket | null>(null);
  // Track which connectionIds have already been joined to avoid re-emitting
  // join-connection on every tabs change (which would trigger backend to replay
  // connection:open and create an infinite notification loop).
  const joinedRooms = useRef<Set<string>>(new Set());

  // Store selectors
  const tabs = useConnectionStore((s) => s.tabs);
  const updateStatusByConnectionId = useConnectionStore((s) => s.updateStatusByConnectionId);
  const addMqttTopic = useConnectionStore((s) => s.addMqttTopic);
  const removeMqttTopic = useConnectionStore((s) => s.removeMqttTopic);
  const addSocketIoEvent = useConnectionStore((s) => s.addSocketIoEvent);
  const addMessage = useMessageStore((s) => s.addMessage);
  const recordMessage = useStatsStore((s) => s.recordMessage);
  const recordError = useStatsStore((s) => s.recordError);
  const addLog = useLogStore((s) => s.addEntry);
  const addToast = useNotificationStore((s) => s.addToast);

  // ---- Establish socket once ----
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    // On reconnect, clear the joined-rooms set so rooms are re-joined
    const onDisconnect = () => joinedRooms.current.clear();
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ---- Join / leave rooms as tabs come and go ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Collect all active connectionIds across all tabs
    const activeIds = tabs
      .map((t) => t.connection?.connectionId)
      .filter((id): id is string => Boolean(id));

    // Evict ids no longer present in any tab from the tracking set
    const activeSet = new Set(activeIds);
    for (const id of joinedRooms.current) {
      if (!activeSet.has(id)) joinedRooms.current.delete(id);
    }

    // Only emit join-connection for ids we haven't joined yet
    const joinNew = () => {
      activeIds.forEach((id) => {
        if (!joinedRooms.current.has(id)) {
          joinedRooms.current.add(id);
          socket.emit('join-connection', id);
        }
      });
    };

    if (socket.connected) {
      joinNew();
    } else {
      socket.once('connect', joinNew);
    }

    return () => {
      socket.off('connect', joinNew);
    };
  }, [tabs]);

  // ---- Register event handlers (once, stable) ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // All backend payloads include `connectionId` — use it to route updates.

    const onOpen = (data: {
      connectionId: string;
      transport?: string;
      namespace?: string;
    }) => {
      const cid = data.connectionId;
      updateStatusByConnectionId(cid, 'connected');
      const detail = [data.namespace, data.transport ? `via ${data.transport}` : '']
        .filter(Boolean)
        .join(' ');
      addMessage(cid, `Connected${detail ? ` (${detail})` : ''}`, 'system', 'text', 0);
      addLog({ connectionId: cid, level: 'info', event: 'connection:open', metadata: data });
      addToast('Connection established', 'success');
    };

    const onMessage = (data: {
      connectionId: string;
      payload: string;
      direction: 'sent' | 'received';
      type?: 'text' | 'json' | 'binary';
      size?: number;
      latency?: number | null;
      eventName?: string;
      topic?: string;
      qos?: 0 | 1 | 2;
      retain?: boolean;
      exchange?: string;
      routingKey?: string;
      deliveryTag?: string;
    }) => {
      const cid = data.connectionId;
      if (data.direction === 'received') {
        setTimeout(() => {
          addMessage(
            cid,
            data.payload,
            'received',
            data.type ?? 'text',
            data.size ?? 0,
            data.latency,
            {
              eventName: data.eventName,
              topic: data.topic,
              qos: data.qos,
              retain: data.retain,
              exchange: data.exchange,
              routingKey: data.routingKey,
              deliveryTag: data.deliveryTag,
            },
          );
        }, 100);
      }
      recordMessage(cid, data.direction, data.size ?? 0, data.latency);
      addLog({
        connectionId: cid,
        level: 'debug',
        event: `msg:${data.direction}`,
        direction: data.direction === 'sent' ? 'out' : 'in',
        payload: data.payload.slice(0, 500),
        payloadSize: data.size,
        latency: data.latency ?? undefined,
      });
    };

    const onError = (data: { connectionId: string; message: string }) => {
      const cid = data.connectionId;
      updateStatusByConnectionId(cid, 'error');
      addMessage(cid, `Error: ${data.message}`, 'system', 'text', 0);
      recordError(cid);
      addLog({
        connectionId: cid,
        level: 'error',
        event: 'connection:error',
        metadata: { message: data.message },
      });
      addToast(`Connection error: ${data.message}`, 'error');
    };

    const onClose = (data: {
      connectionId: string;
      code?: number;
      reason?: string;
    }) => {
      const cid = data.connectionId;
      // If the tab is already in error state (from connection:error), don't
      // overwrite with disconnected and don't show a redundant toast.
      const currentTab = useConnectionStore.getState().tabs.find(
        (t) => t.connection?.connectionId === cid,
      );
      const wasError = currentTab?.connection?.status === 'error';

      // Don't overwrite an error state with disconnected — the error is the
      // meaningful terminal state the user should see.
      if (!wasError) {
        updateStatusByConnectionId(cid, 'disconnected');
      }
      addMessage(
        cid,
        `Disconnected${data.code ? ` (code: ${data.code})` : ''}${data.reason ? `, reason: ${data.reason}` : ''}`,
        'system',
        'text',
        0,
      );
      addLog({
        connectionId: cid,
        level: 'info',
        event: 'connection:close',
        metadata: data,
      });
      if (!wasError) addToast('Connection closed', 'warning');
    };

    const onReconnecting = (data: { connectionId: string; attempt: number }) => {
      updateStatusByConnectionId(data.connectionId, 'reconnecting');
      addMessage(
        data.connectionId,
        `Reconnecting… (attempt ${data.attempt})`,
        'system',
        'text',
        0,
      );
      addLog({
        connectionId: data.connectionId,
        level: 'warn',
        event: 'connection:reconnecting',
        metadata: data,
      });
    };

    const onPong = (data: { connectionId: string; latency: number }) => {
      addMessage(data.connectionId, `Pong — ${data.latency}ms`, 'system', 'text', 0);
      recordMessage(data.connectionId, 'received', 0, data.latency);
    };

    const onAck = (data: {
      connectionId: string;
      eventName: string;
      ackPayload: unknown;
    }) => {
      const payload =
        typeof data.ackPayload === 'string'
          ? data.ackPayload
          : JSON.stringify(data.ackPayload);
      addMessage(
        data.connectionId,
        `ACK [${data.eventName}]: ${payload}`,
        'system',
        'text',
        0,
      );
    };

    const onPerfProgress = (data: unknown) => {
      window.dispatchEvent(new CustomEvent('perf:progress', { detail: data }));
    };

    const onPerfComplete = (data: { result: unknown }) => {
      window.dispatchEvent(new CustomEvent('perf:complete', { detail: data.result }));
    };

    const onMqttSubscribed = (data: {
      connectionId: string;
      topic: string;
      qos: number;
    }) => {
      addMqttTopic(data.topic, data.connectionId);
      addMessage(
        data.connectionId,
        `Subscribed to "${data.topic}" (QoS ${data.qos})`,
        'system',
        'text',
        0,
      );
    };

    const onMqttUnsubscribed = (data: { connectionId: string; topic: string }) => {
      removeMqttTopic(data.topic, data.connectionId);
      addMessage(
        data.connectionId,
        `Unsubscribed from "${data.topic}"`,
        'system',
        'text',
        0,
      );
    };

    const onAmqpSetup = (data: {
      connectionId: string;
      queueName?: string;
      exchangeName?: string;
    }) => {
      const parts = [
        data.exchangeName && `exchange: ${data.exchangeName}`,
        data.queueName && `queue: ${data.queueName}`,
      ].filter(Boolean);
      addMessage(
        data.connectionId,
        `AMQP setup: ${parts.join(', ')}`,
        'system',
        'text',
        0,
      );
    };

    const onSocketIoSubscribed = (data: {
      connectionId: string;
      eventName: string;
    }) => {
      addSocketIoEvent(data.eventName, data.connectionId);
    };

    socket.on('connection:open', onOpen);
    socket.on('connection:message', onMessage);
    socket.on('connection:error', onError);
    socket.on('connection:close', onClose);
    socket.on('connection:reconnecting', onReconnecting);
    socket.on('connection:pong', onPong);
    socket.on('connection:ack', onAck);
    socket.on('perf:progress', onPerfProgress);
    socket.on('perf:complete', onPerfComplete);
    socket.on('mqtt:subscribed', onMqttSubscribed);
    socket.on('mqtt:unsubscribed', onMqttUnsubscribed);
    socket.on('amqp:setup', onAmqpSetup);
    socket.on('socketio:subscribed', onSocketIoSubscribed);

    return () => {
      socket.off('connection:open', onOpen);
      socket.off('connection:message', onMessage);
      socket.off('connection:error', onError);
      socket.off('connection:close', onClose);
      socket.off('connection:reconnecting', onReconnecting);
      socket.off('connection:pong', onPong);
      socket.off('connection:ack', onAck);
      socket.off('perf:progress', onPerfProgress);
      socket.off('perf:complete', onPerfComplete);
      socket.off('mqtt:subscribed', onMqttSubscribed);
      socket.off('mqtt:unsubscribed', onMqttUnsubscribed);
      socket.off('amqp:setup', onAmqpSetup);
      socket.off('socketio:subscribed', onSocketIoSubscribed);
    };
  }, [
    updateStatusByConnectionId,
    addMessage,
    addMqttTopic,
    removeMqttTopic,
    addSocketIoEvent,
    recordMessage,
    recordError,
    addLog,
    addToast,
  ]);

  return socketRef;
}
