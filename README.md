# socket-tester

A browser-based, multi-protocol socket testing platform. Provides a Postman-like interface for WebSocket (RFC 6455), Socket.IO, MQTT 3.1.1, and AMQP 0.9.1 connections, with real-time monitoring, performance testing, network condition simulation, and shareable configurations.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Development Mode](#development-mode)
  - [Production Build (Node.js)](#production-build-nodejs)
  - [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Protocols and Features](#protocols-and-features)
  - [WebSocket](#websocket)
  - [Socket.IO](#socketio)
  - [MQTT](#mqtt)
  - [AMQP / RabbitMQ](#amqp--rabbitmq)
  - [Performance Testing](#performance-testing)
  - [Network Condition Simulation](#network-condition-simulation)
  - [Statistics and Logging](#statistics-and-logging)
  - [Share Configurations](#share-configurations)
- [REST API Reference](#rest-api-reference)
- [Real-time Control Channel](#real-time-control-channel)
- [Socket-Server (Companion Echo Server)](#socket-server-companion-echo-server)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  React 18 + Zustand + Vite                                      │
│  (served as static assets from NestJS ServeStaticModule)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP + Socket.IO (control channel)
┌──────────────────────────▼──────────────────────────────────────┐
│  NestJS Backend (Node.js)                                       │
│  ┌────────────┐ ┌───────────┐ ┌───────┐ ┌──────────────────┐   │
│  │ WebSocket  │ │ Socket.IO │ │ MQTT  │ │ AMQP (amqplib)   │   │
│  │ Proxy      │ │ Proxy     │ │ Proxy │ │ Proxy            │   │
│  └────────────┘ └───────────┘ └───────┘ └──────────────────┘   │
│  ┌────────────┐ ┌───────────┐ ┌──────────────┐ ┌───────────┐   │
│  │ Session    │ │ Stats     │ │ Performance  │ │ Network   │   │
│  │ Manager    │ │ Aggregator│ │ Tests        │ │ Simulator │   │
│  └────────────┘ └───────────┘ └──────────────┘ └───────────┘   │
│  ┌─────────────────┐ ┌─────────┐ ┌─────────────────────────┐   │
│  │ EventsGateway   │ │ Log     │ │ ShareModule             │   │
│  │ (Socket.IO)     │ │ Service │ │ (config distribution)   │   │
│  └─────────────────┘ └─────────┘ └─────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MQTT / AMQP / WS / Socket.IO
┌──────────────────────────▼──────────────────────────────────────┐
│  External Services                                              │
│  (WebSocket servers, Socket.IO servers, MQTT brokers,           │
│   RabbitMQ clusters, or socket-server companion)               │
└─────────────────────────────────────────────────────────────────┘
```

The backend acts as a proxy: the browser communicates with NestJS over HTTP and a Socket.IO control channel, and NestJS manages the actual protocol connections to external targets. This sidesteps browser TLS, CORS, and header restrictions that affect direct browser-to-server connections.

---

## Prerequisites

- Node.js >= 20 LTS
- npm >= 10
- Docker + Docker Compose (for containerized deployment)

---

## Installation

### Development Mode

Two processes run in parallel: the NestJS backend (port 3000) and the Vite frontend dev server (port 5173). The Vite dev server proxies API calls and Socket.IO connections to the backend.

```bash
git clone https://github.com/abelrgr/socket-tester.git
cd socket-tester

# Install root dependencies (backend)
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Start backend in watch mode (terminal 1)
npm run dev

# Start frontend dev server (terminal 2)
npm run start:client
```

Access the UI at `http://localhost:5173`.

The Swagger/OpenAPI UI is available at `http://localhost:3000/api/docs` (disabled in production).

### Production Build (Node.js)

```bash
git clone https://github.com/abelrgr/socket-tester.git
cd socket-tester

npm install
cd client && npm install && cd ..

# Build React frontend (output: ./public/) and NestJS backend (output: ./dist/)
npm run build

# Run the production server
npm start
```

Access the UI at `http://localhost:3000`. The built React assets are served by NestJS via `ServeStaticModule`.

To override default options at runtime, set environment variables before starting:

```bash
PORT=8080 ALLOWED_ORIGINS=https://myapp.example.com npm start
```

### Docker Deployment

The repository includes a multi-stage `Dockerfile` and a `docker-compose.yml` that also starts optional Mosquitto (MQTT) and RabbitMQ (AMQP) brokers.

**Single container**

```bash
docker build -t socket-tester .
docker run -p 3000:3000 \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  socket-tester
```

**Full stack with Compose**

```bash
docker compose up --build
```

Services started by Compose:

| Service     | Image                          | Ports                   | Purpose                          |
|-------------|-------------------------------|-------------------------|----------------------------------|
| `app`       | local build                   | 3000:3000               | socket-tester application        |
| `mosquitto` | eclipse-mosquitto:2           | 1883:1883, 9001:9001    | MQTT broker (optional)           |
| `rabbitmq`  | rabbitmq:3-management-alpine  | 5672:5672, 15672:15672  | RabbitMQ + management UI         |

The `app` container has a health check that polls `GET /health` every 30 seconds.

To override environment variables without modifying `docker-compose.yml`, create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000
MAX_CONNECTIONS_PER_IP=10
MAX_MESSAGE_SIZE_BYTES=1048576
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
LOG_LEVEL=info
SHARE_CONFIG_TTL_SECONDS=604800
```

---

## Configuration

All configuration is supplied via environment variables. No config file is required.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `NODE_ENV` | `development` | Set to `production` to disable Swagger and enforce stricter settings |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated CORS allowed origins |
| `MAX_CONNECTIONS_PER_IP` | `10` | Maximum concurrent proxy connections per IP |
| `MAX_MESSAGE_SIZE_BYTES` | `1048576` | Maximum inbound payload size (1 MB) |
| `RATE_LIMIT_TTL` | `60` | Rate-limit window in seconds |
| `RATE_LIMIT_MAX` | `100` | Maximum requests per window per IP |
| `LOG_LEVEL` | `info` | NestJS logger verbosity (`error`, `warn`, `log`, `debug`, `verbose`) |
| `PROXY_URL_ALLOWLIST` | _(empty)_ | Comma-separated list of allowed proxy target URLs; empty means no restriction |
| `SHARE_CONFIG_TTL_SECONDS` | `604800` | TTL for shareable config tokens (default: 7 days) |

---

## Protocols and Features

### WebSocket

Manages native RFC 6455 WebSocket connections.

- Custom HTTP upgrade headers
- Protocol negotiation (`Sec-WebSocket-Protocol`)
- Manual ping frame with RTT measurement
- 1 MB payload limit (configurable via `MAX_MESSAGE_SIZE_BYTES`)
- Text, JSON, and binary message types

### Socket.IO

Proxies Socket.io v4 client connections to remote Socket.io servers.

- Namespace and path support
- Authentication payload (`auth` object injected at handshake)
- Custom query parameters
- Transport selection (polling, websocket)
- Auto-reconnect with configurable attempts and delay
- Per-event subscriptions forwarded to the control channel in real time
- Origin header spoofing for CORS bypass in Node.js proxy context

### MQTT

Full MQTT 3.1.1 client management.

- QoS levels 0, 1, and 2
- Topic wildcards (`+`, `#`)
- Will (LWT) message configuration (topic, payload, QoS, retain)
- TLS connections with custom CA, client certificate, and key
- Initial topic subscriptions set at connection time
- Buffer-based message replay for late-joining frontend clients
- Subscribe, unsubscribe, and publish operations over the REST API

### AMQP / RabbitMQ

AMQP 0.9.1 connection management via `amqplib`.

- Exchange types: `direct`, `fanout`, `topic`, `headers`
- Queue and exchange declaration with durability and auto-delete flags
- Queue-to-exchange binding with routing key
- Consumer with ack/nack support (per delivery tag)
- Publisher to exchange or queue with content type
- TLS with custom certificates
- Heartbeat configuration and vhost support

### Performance Testing

A built-in performance module runs controlled tests against any open connection.

**Latency test**: sends a configurable number of ping-pong round trips and collects RTT measurements.

- Parameters: `count` (1–1000), `intervalMs` (10–5000 ms)
- Results: min, max, avg, p95, p99 RTT in milliseconds, histogram

**Throughput test**: sends messages at a target rate and measures actual delivery rate and latency distribution.

- Parameters: `messagesPerSecond` (1–1000), `durationSeconds` (1–60), `payloadSize` (1–65536 bytes)
- Results: sent count, received count, actual rate, latency distribution

Tests can be aborted mid-run. Results are archived per test ID and retrievable via REST.

### Network Condition Simulation

Applies per-connection artificial impairments for realistic testing.

| Condition | Description |
|---|---|
| `latencyMs` | Fixed one-way latency added to all outbound messages |
| `jitterMs` | Random latency variance (±jitterMs) |
| `packetLossRate` | Probability of dropping each outbound message (0.0–1.0) |
| `throughputBytesPerSec` | Maximum outbound byte rate |
| `flappingIntervalMs` | Forces disconnection every N milliseconds |

Conditions are applied server-side and do not require modifying the target server.

### Statistics and Logging

**Statistics** aggregated per connection and globally:

- Total sent/received message counts and bytes
- Latency: last, avg, min, max, p95, p99 (milliseconds)
- Error count and reconnection count
- Time-series data (60-second rolling window) for charting

The frontend renders live charts via Recharts:
- Messages per second
- Latency trends (p95, p99, avg)
- Error rate (per-minute buckets)
- Message size histogram

**Logging** stores structured log entries per connection (max 5000 entries):

- Levels: `info`, `warn`, `error`, `debug`
- Log viewer with level filter
- Export to NDJSON format via `GET /api/logs/:connectionId/export`

### Share Configurations

Generate a short token that encodes a connection configuration for sharing.

- Tokens are 12-character hex strings
- TTL: 7 days by default (configurable)
- Credentials (passwords, tokens, API keys) are stripped before encoding
- Token resolves to a URL that pre-populates the connection form
- QR code generated in the frontend for mobile scanning

---

## REST API Reference

All routes are prefixed with `/api`. Swagger documentation is available at `/api/docs` in development mode.

### WebSocket

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/connections/websocket` | Create connection |
| `POST` | `/api/connections/:id/send` | Send message |
| `POST` | `/api/connections/:id/ping` | Send ping frame |
| `DELETE` | `/api/connections/:id` | Close connection |
| `GET` | `/api/connections` | List all connections |
| `GET` | `/api/connections/:id` | Get connection details |
| `GET` | `/api/connections/:id/stats` | Get per-connection stats |

### Socket.IO

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/connections/socketio` | Create connection |
| `POST` | `/api/connections/socketio/:id/subscribe` | Subscribe to event |
| `POST` | `/api/connections/socketio/:id/send` | Emit event |

### MQTT

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/connections/mqtt` | Create connection |
| `POST` | `/api/connections/mqtt/:id/subscribe` | Subscribe to topic |
| `DELETE` | `/api/connections/mqtt/:id/subscribe` | Unsubscribe from topic |
| `POST` | `/api/connections/mqtt/:id/publish` | Publish message |

### AMQP

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/connections/amqp` | Create connection |
| `POST` | `/api/connections/amqp/:id/setup` | Declare exchange/queue/binding |
| `POST` | `/api/connections/amqp/:id/consume` | Start consuming from queue |
| `POST` | `/api/connections/amqp/:id/ack` | Ack or nack a delivery |
| `POST` | `/api/connections/amqp/:id/publish` | Publish to exchange or queue |

### Statistics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats` | Global stats across all connections |
| `GET` | `/api/stats/:connectionId` | Per-connection stats with percentiles |

### Performance

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/connections/:connectionId/perf/latency` | Start latency test |
| `POST` | `/api/connections/:connectionId/perf/throughput` | Start throughput test |
| `DELETE` | `/api/connections/:connectionId/perf` | Abort running test |
| `GET` | `/api/connections/:connectionId/perf/active` | Get active test |
| `GET` | `/api/connections/:connectionId/perf/results/:testId` | Get archived test results |

### Network Conditions

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/connections/:connectionId/network` | Get current conditions |
| `PUT` | `/api/connections/:connectionId/network` | Set conditions |
| `DELETE` | `/api/connections/:connectionId/network` | Clear conditions |

### Logs

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/logs/:connectionId` | Get logs (query param: `level`) |
| `GET` | `/api/logs/:connectionId/export` | Export logs as NDJSON |
| `DELETE` | `/api/logs/:connectionId` | Clear logs |

### Share

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/share/config` | Create shareable config token |
| `GET` | `/api/share/:token` | Retrieve shared config |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check (status, uptime, timestamp) |

---

## Real-time Control Channel

The frontend connects to the backend via a Socket.IO control connection. This channel carries real-time events for all proxied connections.

Clients join a room per connection: `conn:{connectionId}`.

Events emitted by the backend to the room:

| Event | Trigger |
|---|---|
| `connection:open` | Proxy connection established |
| `connection:close` | Proxy connection closed |
| `connection:error` | Error on the proxy connection |
| `connection:message` | Inbound message from the remote server |
| `mqtt:subscribed` | MQTT subscription confirmed by broker |
| `stats:update` | Updated stats snapshot |

The backend buffers events for a brief window after connection is created to handle race conditions where the frontend has not yet joined the room.

---

## Socket-Server (Companion Echo Server)

The repository at [socket-server](../socket-server) is a multi-protocol echo server intended for local and CI testing.

It runs four endpoints simultaneously:

| Protocol | URL | Notes |
|---|---|---|
| Native WebSocket | `ws://localhost:4500` | Echoes all messages |
| Socket.IO | `http://localhost:4502` | Event: `message` -> `response` |
| MQTT/TCP | `mqtt://localhost:1883` | Embedded Aedes broker |
| MQTT/WebSocket | `ws://localhost:4500/mqtt` | Same HTTP port via path |

MQTT topic convention: publish to `test/request` (configurable via `MQTT_REQUEST_TOPIC`), receive echo on `echo/{originalTopic}`.

**Run socket-server:**

```bash
cd socket-server
npm install
npm run dev
```

---

## Contributing

Contributions are welcome. Follow these steps:

1. Fork the repository at [https://github.com/abelrgr/socket-tester](https://github.com/abelrgr/socket-tester).
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Apply code style:
   ```bash
   npm run format
   npm run lint
   ```
4. Run the test suite before opening a PR:
   ```bash
   npm test
   npm run test:e2e
   ```
5. Write or update unit tests for any changed logic.
6. Open a pull request against `main` with a clear description of what was changed and why.

**Code style**: ESLint + Prettier configured in `eslint.config.mjs`. No manual config changes to these files are accepted; open an issue if style rules need discussion.

**Adding a new protocol proxy**: implement a NestJS module following the pattern in `src/websocket/` or `src/mqtt/`. Reuse `SessionService` for connection state and `EventsGateway` for real-time event emission. Add corresponding DTO classes and REST controller.

**Adding frontend features**: state lives in Zustand stores under `client/src/stores/`. Components follow the component/hook separation pattern. Avoid direct API calls from components; route through `services/api.ts`.

---

## License

MIT License. See [LICENSE](LICENSE) for the full text.

---

Developed by Abel Gallo Ruiz — [https://abelgalloruiz.me/](https://abelgalloruiz.me/)
