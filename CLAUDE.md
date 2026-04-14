# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online multiplayer implementation of the board game "Coup" (social deduction card game). Players join rooms via a 6-digit code and play in real-time.

## Commands

### Root (production / Docker build)

```bash
npm run build      # Installs deps + builds Vite frontend (output: coup-client/dist/)
npm start          # Runs the server (serves built frontend + API on port 8000)
```

### Backend (`server/`)

```bash
npm start          # node index.js (port 8000 or process.env.PORT)
npm test           # Jest unit tests
```

### Frontend (`coup-client/`)

```bash
npm start          # Vite dev server on port 3000
npm run build      # Production build → dist/
npm test           # Vitest (single run)
npm run test:watch # Vitest interactive watch mode
```

### Formatting

```bash
# Prettier runs automatically on commit via Husky + lint-staged.
# Run manually:
npx prettier --write .
```

### Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable           | Where               | Purpose                                                       |
| ------------------ | ------------------- | ------------------------------------------------------------- |
| `VITE_BACKEND_URL` | Frontend build-time | Backend URL; leave empty when server serves frontend (Docker) |
| `VITE_LOG_LEVEL`   | Frontend build-time | `DEBUG\|INFO\|WARN\|ERROR` (default: `INFO` dev, `WARN` prod) |
| `PORT`             | Server runtime      | HTTP port (default 8000)                                      |
| `LOG_LEVEL`        | Server runtime      | `DEBUG\|INFO\|WARN\|ERROR` (default: `info`)                  |
| `NODE_ENV`         | Server runtime      | `production` or `development`                                 |

## Architecture

### Structure

- `coup-client/` — React 18 frontend (Vite + Tailwind CSS)
- `server/` — Express + Socket.IO 2.5.0 backend (no build step, plain `node index.js`)
- Built frontend lands in `coup-client/dist/`; Express serves it as static files in production.

### Frontend

- **Vite** build tool; all `.js` files in `src/` are treated as JSX (no need to rename to `.jsx`).
- **React Router v6** with 5 routes: `/` (Home), `/create` (CreateGame), `/join` (JoinGame), `/rules` (InstructionsPage), `/characters` (CharactersPage).
- **No global state management.** Each component owns its own state via `useState`/`setState`.
- **Socket.IO listeners** registered in component constructors/effects; trigger re-renders via `setState`.
- **Tailwind CSS** for styling (co-located `sovereign-ledger.css` for custom overrides).
- Game UI lives in `src/components/game/`, driven by `Coup.js` as the main controller.
- **Logging:** `src/utils/logger.js` — structured logger; in dev, WARN+ forwarded to Vite terminal via `POST /dev-log`.

### Backend

- **Namespace-per-room:** Each game room gets a dynamically created Socket.IO namespace (e.g., `/ABCDEF`). The `namespaces` object maps code → `CoupGame` instance (or `null` pre-start).
- **Garbage collection:** 10-second interval cleans up namespaces with 0 connections.
- **`server/game/coup.js`** — Core `CoupGame` class: all turn logic, voting, coin management, card reveals, win detection.
- **`server/utilities/constants.js`** — `CardNames`, `Actions` (influence + blockability per action), `CounterActions`, `DefaultSettings`.
- **`server/utilities/logger.js`** — Structured JSON logger (one JSON line per log entry); level controlled by `LOG_LEVEL` env var.
- **Settings validation:** `validateSettings()` in `server/index.js` clamps player-configurable values (maxPlayers 2–6, timeouts 3–60s).

### Game Flow

1. **Party phase:** Players join namespace, set names, first joiner becomes leader (drag-and-drop turn order), all ready up. Leader can adjust settings.
2. **Game start:** `startGameSignal` → server creates `CoupGame`, deals 2 cards + 2 coins per player.
3. **Turn loop:** Action → optional challenge/block voting → optional reveal → apply effects → next turn.
4. **Win:** Last player with at least one influence remaining.

### Real-Time Communication Pattern

- Server sends **targeted** socket messages to individual clients (not pure broadcast).
- Key server→client events: `g-updatePlayers`, `g-openBlock`, `g-openChallenge`, `g-openReveal`, `g-actionDecision`.
- Client decision components (`ActionDecision`, `BlockDecision`, `ChallengeDecision`, etc.) emit player responses back.
- `g-updatePlayers` is the primary state sync; server filters out eliminated players before sending.
- `joinFailed` reasons: `"game_already_started"`, `"party_full"`, `"name_taken"`.

### Socket.IO Version Compatibility

- Server uses Socket.IO **2.5.0**, client uses **2.3.0** — keep both on v2.x.

## Docker & Deployment

Multi-stage Dockerfile: Stage 1 builds Vite frontend → Stage 2 runs Express serving the built files.

```bash
docker compose up -d    # Start app + Watchtower (auto-updates from GHCR)
docker compose logs -f coup | jq '.'  # Structured log output
```

**CI/CD:** Push to `main` → GitHub Actions builds image → pushes `latest` + `sha-<commit>` tags to GHCR → Watchtower on home server pulls within 5 minutes. PRs only build (no push).

See `README_DEPLOY.md` for full home-server + Cloudflare Tunnel setup.
