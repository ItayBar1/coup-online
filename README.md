# Coup Online

Online multiplayer implementation of the board game [Coup](https://boardgamegeek.com/boardgame/131357/coup). Players create or join a room with a 6-digit code and play in real-time.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Socket.IO client 2.3.0
- **Backend:** Node.js, Express, Socket.IO 2.5.0
- **Deployment:** Docker, GitHub Actions CI/CD → GHCR, Watchtower auto-updates

## Local Development

**Prerequisites:** Node.js 20+

```bash
# Backend (port 8000)
cd server && npm install && npm start

# Frontend (port 3000, separate terminal)
cd coup-client && npm install && npm start
```

The client defaults to `http://localhost:8000` as the backend. Override with `VITE_BACKEND_URL` if needed.

## Running Tests

```bash
# Backend (Jest)
cd server && npm test

# Frontend (Vitest)
cd coup-client && npm test
```

## Production Build

```bash
# From repo root — installs all deps and builds frontend into coup-client/dist/
npm run build
npm start   # Express serves frontend + API on port 8000
```

Or with Docker:

```bash
docker compose up -d
```

## Features

- **Room system:** 6-digit codes, drag-and-drop turn order, configurable settings (max players, time limits)
- **Individualized connections:** Server sends targeted socket messages; clients never receive other players' hidden cards
- **Voting system:** Challenge/block windows with per-player voting; resolves immediately on decisive vote
- **Game event log:** Last 4 actions visible to all players
- **Structured logging:** JSON server logs, browser console + Vite terminal forwarding in dev
- **Auto-cleanup:** Empty namespaces garbage-collected after 10 seconds

## Deployment

See [README_DEPLOY.md](./README_DEPLOY.md) for home-server setup with Docker Compose, GHCR authentication, Watchtower auto-updates, and optional Cloudflare Tunnel (no port-forwarding required).

## CI/CD

Every push to `main` builds and pushes a Docker image to GHCR with two tags:

- `latest` — always the newest main-branch build
- `sha-<commit>` — immutable, for rollbacks

Pull requests build only (no push) as a CI gate.
