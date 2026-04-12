# State Machine Refactor RFC — CoupGame

## Context

`server/game/coup.js` tracks game phase via 9 mutable boolean flags scattered across 527 lines. These flags are read/written in 20+ places with no transition enforcement:

```js
this.isChallengeBlockOpen = false;        // used as phase guard for 3 different phases
this.isRevealOpen = false;
this.isChooseInfluenceOpen = false;
this.isExchangeOpen = false;
this.pendingActionAfterInfluence = null;  // deferred action — nullable, leaks across rounds
this.challengeTimer = null;               // 3 unowned timer refs on the class
this.blockTimer = null;
this.blockChallengeTimer = null;
this.pendingBlockAction = null;
this.blockEligibleVoters = 0;
```

The valid phases are well-defined in the code:
`IDLE → ACTION_PENDING → CHALLENGE_OPEN → BLOCK_OPEN → BLOCK_CHALLENGE_OPEN → REVEAL_PENDING → CHOOSE_INFLUENCE_PENDING / EXCHANGE_PENDING → IDLE`

There is zero test coverage for game logic. The state machine approach would enable pure unit tests (no sockets) for every turn transition.

---

## Three Designs

### Design 1 — Minimal (single `dispatch` entry point)

```js
// server/game/stateMachine.js
function createStateMachine(context, emit, emitTo) {
    return {
        dispatch(eventType, payload) { /* all logic here */ },
        get state() { /* readonly snapshot */ }
    };
}
const EVENTS = { ACTION_CHOSEN, CHALLENGE_VOTE, BLOCK_VOTE, ... };
```

`listen()` shrinks from 235 lines to 10:
```js
socket.on('g-challengeDecision', (res) => this.sm.dispatch(EVENTS.CHALLENGE_VOTE, res));
socket.on('g-blockDecision',     (res) => this.sm.dispatch(EVENTS.BLOCK_VOTE,     res));
// ... etc
```

All routing, vote counting, timer clearing, and phase transition logic lives inside `dispatch`.
Deps injected: `emit` and `emitTo` callbacks.

**Trade-offs:** Deep call stacks — when something breaks, `dispatch → _handleVote → _transition → emit` makes it hard to pinpoint which socket event caused what. No escape hatch for one-off logic.

---

### Design 2 — Flexible (listener + middleware + `addPhase`)

```js
function createStateMachine({ validPhases, transitions, onTransition }) {}
// machine.transition(toPhase, context), machine.on(phase, handler), machine.onAny(handler)
// machine.use(middlewareFn), machine.addPhase(name, from, to)
```

Pure state container — zero socket refs. I/O registered via `machine.on(PHASES.X, handler)` at startup. Supports dynamic phase extension and analytics middleware.

**Trade-offs:** Self-transition verbosity (vote increment needs a full `transition()` call); serialization problem with timer refs in frozen context; middleware `next()` footgun.

---

### Design 3 — Common-caller optimized (`vote()` helper + `onEnter/onExit`)

```js
const sm = { phase(), context(), in(phase), vote(threshold, onPass), transition(phase, ctx),
             reset(), onEnter(phase, fn), onExit(phase, fn) };
```

Key insight: `sm.vote(ctx.eligibleVoters, onPass)` atomically handles "increment or transition", which is the most common handler pattern. I/O in `onEnter/onExit` hooks registered at startup.

```js
socket.on('g-challengeDecision', (res) => {
    if (!sm.in(Phase.CHALLENGE_OPEN)) return;
    if (res.isChallenging) {
        sm.transition(Phase.REVEAL_PENDING, { ...ctx, challenger: res.challenger });
    } else {
        sm.vote(sm.context().eligibleVoters, () =>
            sm.transition(Phase.BLOCK_OPEN, { action: ctx.action }));
    }
});
```

**Trade-offs:** No transition validity enforcement; context is untyped plain objects (silent misbehavior if field names are wrong).

---

## Recommendation: Hybrid of Design 1 + Design 3

**Recommended interface:**

```js
// server/game/CoupStateMachine.js

function createCoupStateMachine({ emit, emitTo }) {
    return {
        // Phase
        getPhase(),              // () => PHASES.*
        in(phase),               // boolean guard — replaces isChallengeBlockOpen etc.

        // Input (one entry point per socket event for testability)
        dispatch(event, payload),  // CHALLENGE_VOTE, BLOCK_VOTE, etc.

        // Side-effect hooks (all socket emissions live here)
        onEnter(phase, fn),      // fn(context) — called when phase becomes active
        onExit(phase, fn),       // fn(context) — called before phase exits

        // Snapshot for reconnect/debug
        getContext(),            // frozen context for current phase
    };
}

const PHASES = { IDLE, ACTION_PENDING, CHALLENGE_OPEN, BLOCK_OPEN,
                 BLOCK_CHALLENGE_OPEN, REVEAL_PENDING, CHOOSE_INFLUENCE_PENDING,
                 EXCHANGE_PENDING, GAME_OVER };

const EVENTS = { ACTION_CHOSEN, CHALLENGE_VOTE, BLOCK_VOTE, BLOCK_CHALLENGE_VOTE,
                 REVEAL_SUBMITTED, INFLUENCE_CHOSEN, EXCHANGE_CHOSEN, PLAY_AGAIN };
```

**Why this hybrid wins:**

- `dispatch` makes `listen()` trivially testable — unit tests call `sm.dispatch(EVENTS.CHALLENGE_VOTE, { isChallenging: true, ... })` and assert `sm.getPhase() === PHASES.REVEAL_PENDING`
- `onEnter/onExit` hooks keep all socket emissions co-located with their phase (not buried in handler branches), but the machine itself has no socket reference → easy to mock in tests
- `in(phase)` is one readable guard instead of 4 boolean flags
- Simpler than Design 2 (no middleware chain, no dynamic phases — YAGNI)
- Less magical than Design 3 (no `vote()` helper that hides the threshold logic — explicit `dispatch` is easier to read in a stack trace)

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `server/game/CoupStateMachine.js` | **New file** — the state machine module |
| `server/game/coup.js` | Remove 9 flag fields (lines 16–28); replace `listen()` body with `dispatch` calls; register `onEnter/onExit` hooks in constructor |
| `server/game/coup.js` — `resetGame()` | Call `sm.reset()` instead of manually nulling flags |

---

## Verification

1. Start server: `cd server && npm start`
2. Start client: `cd coup-client && npm run start-pc`
3. Play through a full game round triggering each phase manually:
   - Action → let challenge timer expire (no challenge) → block → let block expire → action applies
   - Action → player challenges → reveal → challenger loses influence
   - Action → block → block-challenge → blocker reveals → action applies
4. Verify `pendingActionAfterInfluence` flow: assassinate → target challenges → challenger loses influence → assassination executes
5. Run `npm test` in `coup-client/` — baseline should stay green
6. (Stretch) Write a unit test in `server/` that creates a `CoupStateMachine`, calls `dispatch` with a sequence of events, and asserts the final phase and context

---

## GitHub Issue

Will be filed as a refactor RFC with the above interface design and migration path.
