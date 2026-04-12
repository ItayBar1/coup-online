# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online multiplayer implementation of the board game "Coup" (social deduction card game). Players join rooms via a 6-digit code and play in real-time.

## Commands

### Backend (`server/`)
```bash
npm start          # Run the server (Node.js, port 8000 or process.env.PORT)
```

### Frontend (`coup-client/`)
```bash
npm start          # Dev server on port 3000 (Mac/Linux)
npm run start-pc   # Dev server on port 3000 (Windows)
npm run build      # Production build
npm test           # Jest (interactive watch mode)
```

### Environment Variables (frontend)
- `REACT_APP_BACKEND_URL` — defaults to `http://localhost:8000`
- `REACT_APP_GOOGLE_TRACKING_ID` — optional Google Analytics

## Architecture

### Structure
- `coup-client/` — React 16 frontend (Create React App, no custom Webpack/Babel)
- `server/` — Express + Socket.IO backend (no build step, plain `node index.js`)

### Frontend
- **React Router** with 3 routes: `/` (Home), `/create` (CreateGame), `/join` (JoinGame)
- **No global state management** (no Redux/Context). Each component manages its own state via `setState()`.
- **Socket.IO listeners** are registered directly in component constructors and trigger re-renders via `setState()`.
- **Styling** via co-located CSS files (no CSS-in-JS).
- Game UI lives entirely in `src/components/game/`, driven by `Coup.js` as the main controller.

### Backend
- **Namespace-per-room pattern:** Each party gets a dynamically created Socket.IO namespace (e.g., `/ABCDEF`). The `namespaces` object maps namespace codes to `CoupGame` instances.
- **Garbage collection:** A 10-second interval cleans up empty namespaces.
- **`server/game/coup.js`** — Core `CoupGame` class: all turn logic, voting, coin management, card reveals, win detection.
- **`server/utilities/constants.js`** — Card names, action→influence mappings, counter-action mappings.

### Game Flow
1. **Party phase:** Players join namespace, set names, leader arranges turn order (drag-and-drop), all ready up.
2. **Game start:** `startGameSignal` → server creates `CoupGame`, deals 2 cards + 2 coins per player.
3. **Turn loop:** Action → optional challenge/block voting → optional reveal → apply effects → next turn.
4. **Win:** Last player with at least one influence remaining.

### Real-Time Communication Pattern
- Server sends **targeted** socket messages to individual clients (not pure broadcast).
- Key server→client events: `g-updatePlayers`, `g-openBlock`, `g-openChallenge`, `g-openReveal`, `g-actionDecision`.
- Client decision components (`ActionDecision`, `BlockDecision`, `ChallengeDecision`, etc.) emit player responses back to the server.
- `g-updatePlayers` is the primary state sync event; it filters out eliminated players before sending.

### Socket.IO Version Compatibility
- Server uses Socket.IO **2.5.0**, client uses **2.3.0** — keep these compatible (v2.x on both sides).
