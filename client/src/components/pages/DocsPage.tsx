import React from 'react';

const SHORTCUTS = [
  ['Ctrl+Enter', 'Send current message'],
  ['Ctrl+K', 'Open command palette'],
  ['Ctrl+N', 'New connection tab'],
  ['Ctrl+L', 'Clear message history'],
  ['Ctrl+D', 'Disconnect active connection'],
  ['Ctrl+F', 'Focus search bar'],
  ['Ctrl+S', 'Save current config'],
  ['Ctrl+E', 'Export message history'],
  ['Ctrl+1–4', 'Switch content tab (Messages/Stats/Logs/Perf)'],
  ['F1', 'Open documentation'],
  ['Esc', 'Close modal / Command palette'],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10" aria-labelledby={title.toLowerCase().replace(/\s+/g, '-')}>
      <h2
        id={title.toLowerCase().replace(/\s+/g, '-')}
        className="text-xl font-semibold [color:var(--color-text-primary)] mb-4 pb-2 border-b border-surface-border"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-brand font-mono text-sm bg-surface-elevated px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}

export function DocsPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-3xl font-bold [color:var(--color-text-primary)] mb-2">Documentation</h1>
      <p className="[color:var(--color-text-secondary)] mb-8">Universal Socket Testing Platform — v1.0.0</p>

      {/* Quick Start */}
      <Section title="Quick Start">
        <ol className="space-y-3 [color:var(--color-text-secondary)] list-decimal list-inside">
          <li>
            Choose a protocol in the sidebar (WebSocket, Socket.io, MQTT, or AMQP).
          </li>
          <li>
            Enter the URL — e.g. <Code>wss://echo.websocket.org</Code> for WebSocket.
          </li>
          <li>
            Click <strong className="[color:var(--color-text-primary)]">Connect</strong>.
          </li>
          <li>
            Type a message in the composer and press{' '}
            <kbd className="px-1.5 py-0.5 bg-surface-elevated rounded text-xs border border-surface-border">
              Ctrl+Enter
            </kbd>{' '}
            or click <strong className="[color:var(--color-text-primary)]">Send</strong>.
          </li>
          <li>Watch the response appear in the Messages tab.</li>
          <li>Save your config with "Save Config" for future sessions.</li>
        </ol>
      </Section>

      {/* Multi-Tab */}
      <Section title="Multi-Connection Tabs">
        <p className="[color:var(--color-text-secondary)] mb-3">
          Open up to <strong className="[color:var(--color-text-primary)]">10 simultaneous connections</strong> across
          any protocol using the tab bar at the top of the main panel.
        </p>
        <ul className="space-y-2 [color:var(--color-text-secondary)] list-disc list-inside">
          <li>
            Click <strong className="[color:var(--color-text-primary)]">+</strong> or press{' '}
            <kbd className="text-xs bg-surface-elevated px-1 py-0.5 rounded border border-surface-border">
              Ctrl+N
            </kbd>{' '}
            to open a new tab.
          </li>
          <li>Each tab has its own connection, message history, stats, and logs.</li>
          <li>Tab status dot: green = connected, yellow = connecting, red = error.</li>
        </ul>
      </Section>

      {/* WebSocket Guide */}
      <Section title="WebSocket Guide">
        <p className="[color:var(--color-text-secondary)] mb-3">
          WebSocket connections are proxied through the backend, enabling full lifecycle
          control and inspection.
        </p>
        <h3 className="text-sm font-semibold [color:var(--color-text-primary)] mb-2">URL Formats</h3>
        <ul className="space-y-1 [color:var(--color-text-secondary)] list-disc list-inside font-mono text-sm mb-4">
          <li>
            <span className="text-green-400">ws://</span>localhost:3001 — plain WebSocket
          </li>
          <li>
            <span className="text-green-400">wss://</span>api.example.com — secure WebSocket
          </li>
        </ul>
        <h3 className="text-sm font-semibold [color:var(--color-text-primary)] mb-2">Options</h3>
        <ul className="space-y-1 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">Sub-protocols:</strong> comma-separated list
            (e.g. <Code>graphql-ws,chat</Code>)
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Custom headers:</strong> key-value pairs sent
            during the HTTP upgrade handshake.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Auth:</strong> Bearer token, API Key, or Basic
            auth auto-injected as headers.
          </li>
        </ul>
      </Section>

      {/* Socket.io Guide */}
      <Section title="Socket.io Guide">
        <p className="[color:var(--color-text-secondary)] mb-3">
          Socket Tester proxies Socket.io connections and exposes namespace, room, and event
          support.
        </p>
        <ul className="space-y-1 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">Namespace:</strong> e.g. <Code>/chat</Code>
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Path:</strong> defaults to <Code>/socket.io</Code>
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Auth payload:</strong> JSON object sent as
            the <Code>auth</Code> argument.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Transports:</strong> websocket and/or polling.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Auto-reconnect:</strong> configurable attempts
            and delay.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Event subscription:</strong> subscribe to any
            named event via the message composer.
          </li>
        </ul>
      </Section>

      {/* MQTT Guide */}
      <Section title="MQTT Guide">
        <p className="[color:var(--color-text-secondary)] mb-3">
          Connect to any MQTT broker (Mosquitto, HiveMQ, AWS IoT, etc.).
        </p>
        <h3 className="text-sm font-semibold [color:var(--color-text-primary)] mb-2">Broker URL Formats</h3>
        <ul className="space-y-1 [color:var(--color-text-secondary)] list-disc list-inside font-mono text-sm mb-4">
          <li>
            <Code>mqtt://broker.example.com:1883</Code>
          </li>
          <li>
            <Code>mqtts://broker.example.com:8883</Code> (TLS)
          </li>
          <li>
            <Code>ws://broker.example.com:8080</Code> (WebSocket transport)
          </li>
        </ul>
        <h3 className="text-sm font-semibold [color:var(--color-text-primary)] mb-2">QoS Levels</h3>
        <ul className="space-y-1 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">QoS 0:</strong> At most once (fire-and-forget)
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">QoS 1:</strong> At least once (acknowledged)
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">QoS 2:</strong> Exactly once (fully guaranteed)
          </li>
        </ul>
      </Section>

      {/* AMQP Guide */}
      <Section title="AMQP Guide">
        <div className="flex flex-col items-center justify-center gap-2 py-6 rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5">
          <span className="text-3xl">🚧</span>
          <p className="text-base font-semibold text-yellow-400">Coming Soon</p>
          <p className="text-sm [color:var(--color-text-muted)] text-center max-w-xs">
            Full AMQP / RabbitMQ support (exchanges, queues, bindings, ack/nack) is currently under development and will be available in a future release.
          </p>
        </div>
      </Section>

      {/* Authentication */}
      <Section title="Authentication">
        <p className="[color:var(--color-text-secondary)] mb-3">
          Supported auth types for WebSocket and Socket.io:
        </p>
        <ul className="space-y-2 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">None:</strong> No auth header added.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Bearer Token:</strong> Adds{' '}
            <Code>Authorization: Bearer &lt;token&gt;</Code>
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">API Key:</strong> Custom header name + value.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Basic:</strong> Base64-encodes
            username:password.
          </li>
        </ul>
        <p className="[color:var(--color-text-muted)] text-sm mt-3">
          Auth credentials are never logged or included in shared configs.
        </p>
      </Section>

      {/* Performance Testing */}
      <Section title="Performance Testing">
        <p className="[color:var(--color-text-secondary)] mb-3">
          Use the <strong className="[color:var(--color-text-primary)]">Performance</strong> tab to run latency
          and load tests.
        </p>
        <ul className="space-y-2 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">Latency Test:</strong> Sends N ping messages
            and measures round-trip time (avg, P95, P99, min, max).
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Load Test:</strong> Opens multiple concurrent
            connections and measures aggregate throughput.
          </li>
          <li>Results are displayed as charts and can be exported as JSON.</li>
        </ul>
      </Section>

      {/* Network Simulation */}
      <Section title="Network Simulation">
        <p className="[color:var(--color-text-secondary)] mb-3">
          The Network panel (in the sidebar when connected) simulates real-world conditions:
        </p>
        <ul className="space-y-2 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">Latency:</strong> Artificial delay added to
            every incoming message.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Packet Loss:</strong> Percentage of messages
            randomly dropped.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Disconnect After:</strong> Force-closes the
            connection after N seconds.
          </li>
        </ul>
      </Section>

      {/* Workspace & Env Vars */}
      <Section title="Workspaces & Environment Variables">
        <p className="[color:var(--color-text-secondary)] mb-3">
          Workspaces group connection configs and environment variables together.
        </p>
        <ul className="space-y-2 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            Define variables like <Code>{'{{BASE_URL}}'}</Code> and reference them in any
            URL field.
          </li>
          <li>
            Variables are resolved at connect-time — useful for switching between dev/staging/prod.
          </li>
          <li>Secret variables are stored only in sessionStorage and excluded from exports.</li>
          <li>Export/import workspaces as JSON files to share with teammates.</li>
        </ul>
      </Section>

      {/* Export & Sharing */}
      <Section title="Export & Sharing">
        <ul className="space-y-2 [color:var(--color-text-secondary)] list-disc list-inside text-sm">
          <li>
            <strong className="[color:var(--color-text-primary)]">Export Messages:</strong> Download as JSON or
            CSV from the Messages tab.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Share Config:</strong> Click the share icon on
            any saved config. Credentials are stripped automatically. Link expires in 7 days.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">QR Code:</strong> Scan the QR code to open the
            shared config on another device.
          </li>
          <li>
            <strong className="[color:var(--color-text-primary)]">Import:</strong> Drag-and-drop a{' '}
            <Code>.stconfig.json</Code> or Postman Collection v2.1 file anywhere on the app.
          </li>
        </ul>
      </Section>

      {/* Keyboard Shortcuts */}
      <Section title="Keyboard Shortcuts">
        <div className="space-y-2">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center gap-4">
              <kbd className="px-2 py-1 bg-surface-elevated border border-surface-border rounded text-xs font-mono [color:var(--color-text-secondary)] min-w-[120px] text-center flex-shrink-0">
                {key}
              </kbd>
              <span className="[color:var(--color-text-secondary)] text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section title="FAQ">
        <dl className="space-y-4">
          {[
            {
              q: 'Can I connect to a localhost WebSocket server?',
              a: 'Yes. Use ws://localhost:PORT. The backend proxies the connection, so browser CORS restrictions do not apply.',
            },
            {
              q: 'Are my credentials stored?',
              a: 'Connection configs (without passwords) are saved to localStorage. Passwords and tokens are handled in memory only and are never logged.',
            },
            {
              q: 'Why does my MQTT connection fail?',
              a: 'Ensure the broker supports WebSocket transport on the specified port (common: 8080 or 9001). MQTT over TCP (port 1883) requires the ws:// or mqtt:// scheme with WebSocket support.',
            },
            {
              q: 'How do I test a Socket.io server with namespaces?',
              a: 'Enter the base server URL (http://...) and set the namespace field to /your-namespace. The backend will connect to that namespace automatically.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <dt className="[color:var(--color-text-primary)] font-medium text-sm">{q}</dt>
              <dd className="[color:var(--color-text-secondary)] text-sm mt-1">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* API Reference */}
      <Section title="API Reference">
        <p className="[color:var(--color-text-secondary)]">
          The backend exposes a full REST API. The interactive Swagger UI is available at{' '}
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            /api/docs
          </a>{' '}
          (enabled in development mode).
        </p>
      </Section>
    </main>
  );
}

