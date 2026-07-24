# Ripple

Ripple is a WhatsApp-style realtime chat application built on a **PHP WebSocket server** with a **React 19 + TypeScript** frontend. Messages are pushed over WebSockets; authentication runs over plain HTTP; everything is persisted in MySQL.

## Features

- Realtime messaging over WebSockets with per-message delivery status (`sent`, `delivered`)
- Username/password auth (signup + login) with hashed passwords
- Private and public chats, plus inviting users into a chat
- Chat history replay - recent messages are re-sent when a user (re)connects
- Automatic client reconnection with randomized exponential backoff
- Optimistic message rendering with `tempId` acknowledgements

## Tech stack

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand           |
| Backend  | PHP 8.2+ (raw `ext-sockets` WebSocket server + HTTP endpoints) |
| Database | MySQL (`mysqli`)                                               |
| Testing  | Vitest + Testing Library (frontend), PHPUnit (backend)         |

## Architecture

```
Browser (React)
  |
  |  HTTP        login.php / signup.php   (auth, returns user id + username)
  |
  |  WebSocket   server.php (ws://localhost:8080)
                   |
                   |  src/WebSocketServer.php   handshake, framing, routing
                   |  src/SocketTransport.php   raw socket read/write/encode/decode
                   |  src/Events/*.php          Event objects serialized to clients
                   |  src/Database.php          mysqli seam (chats / messages / users)
```

### Frontend (`src/`)

- `lib/client.ts` - single WebSocket connection, reconnect/backoff logic, `sendData`
- `lib/handlers.ts` - routes incoming server events into the store
- `store/index.ts` - Zustand store (auth state, chats, messages, connection status)
- `components/` - UI: `AuthForm`, `Sidebar`, `ChatPanel`, `MessageList`, `MessageInput`, etc.
- `types.d.ts` - shared message/chat/event contracts

### Backend (`backend/`)

- `bootstrap.php` - loads the Composer autoloader and the `.env` environment
- `server.php` - WebSocket entry point; wires up the transport + database and runs the loop
- `login.php` / `signup.php` - HTTP auth endpoints (thin wrappers around `Ripple\Auth`)
- `src/WebSocketServer.php` - performs the RFC handshake, maps sockets to users, and handles `auth`, `message:send`, `chat:create`, and `invite` messages
- `src/SocketTransport.php`, `src/Database.php`, `src/Auth.php`, `src/Events/` - transport, DB seam, auth logic, and outbound event objects
- `db.sql` - schema (`users`, `chats`, `chats_users`, `messages`)

## Getting started

### Prerequisites

- Node.js 18+
- PHP 8.2+ with the `sockets` and `mysqli` extensions
- MySQL

### 1. Database

Create the database and load the schema:

```bash
mysql -u <user> -p -e "CREATE DATABASE chat"
mysql -u <user> -p chat < backend/db.sql
```

### 2. Configuration

Copy the template and fill in your own values:

```bash
cp backend/.env.example backend/.env
```

```ini
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=chat
```

### 3. Install dependencies

```bash
npm install                               # frontend
composer install --working-dir=backend    # backend
```

### 4. Run

```bash
npm run dev
```

This starts the PHP WebSocket server (`php backend/server.php`, listening on `ws://localhost:8080`) and the Vite dev server concurrently. The app is served at `http://localhost:5173`.

> **Note:** the HTTP auth endpoints are expected at `http://localhost/websockets/backend/` (see `src/components/AuthForm.tsx`), so `backend/` must also be reachable through a PHP-capable web server such as Apache. Update that URL if your setup differs.

## Scripts

### Frontend (`npm run ...`)

| Script     | Description                                |
| ---------- | ------------------------------------------ |
| `dev`      | Run the WebSocket server and Vite together |
| `build`    | Type-check and build for production        |
| `preview`  | Preview the production build               |
| `test`     | Run Vitest in watch mode                   |
| `test:run` | Run the test suite once                    |
| `coverage` | Run tests with coverage report             |
| `lint`     | Lint with ESLint                           |
| `prettier` | Check formatting                           |

### Backend

```bash
composer test --working-dir=backend            # PHPUnit
composer test:coverage --working-dir=backend   # with HTML coverage
```

## Testing

The frontend enforces coverage thresholds (90% lines/functions/statements, 85% branches - see `vite.config.ts`). Backend logic is covered by PHPUnit tests in `backend/tests/`, which use fakes/seams (`FakeDatabase`, `ResultSeam`) to exercise the socket server without a live database or network.
