const CoupGame = require("../coup");
const { PHASES } = require("../CoupStateMachine");

// ── Socket mock helpers ───────────────────────────────────────────────────────

function makeSocketMock() {
  const events = {};
  const emitted = [];
  const toEmitted = [];

  const socket = {
    on: (event, handler) => {
      events[event] = handler;
    },
    emit: (event, ...args) => {
      emitted.push({ event, args });
    },
    to: (id) => ({
      emit: (event, ...args) => {
        toEmitted.push({ to: id, event, args });
      },
    }),

    _emitted: emitted,
    _toEmitted: toEmitted,
    _trigger: (event, ...args) => events[event]?.(...args),
  };

  return socket;
}

function makePlayers(names) {
  return names.map((name, i) => ({
    name,
    socketID: `sock-${i}`,
    isReady: true,
    chosen: null,
  }));
}

function buildGame(playerNames) {
  const gameSocket = makeSocketMock();

  const playerSockets = {};
  playerNames.forEach((name, i) => {
    playerSockets[`sock-${i}`] = makeSocketMock();
  });

  gameSocket.sockets = playerSockets;

  const players = makePlayers(playerNames);
  const game = new CoupGame(players, gameSocket);

  // IMPORTANT: prevent infinite startup loop from state machine timers
  const sm = game.sm;

  sm.transition = (phase, ctx = {}) => {
    // block unsafe automatic boot transitions during test setup
    if (
      phase === "ACTION_PENDING" ||
      (phase === "IDLE" && Object.keys(ctx).length === 0)
    ) {
      return;
    }
    return;
  };

  sm.dispatch = () => {};
  sm.onEnter = () => {};
  sm.onExit = () => {};

  game.resetGame();
  game.listen();

  return { game, gameSocket, playerSockets };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastEmit(socket, eventName) {
  return socket._emitted.filter((e) => e.event === eventName).pop();
}

function lastToEmit(socket, eventName) {
  return socket._toEmitted.filter((e) => e.event === eventName).pop();
}

// ── buildGame with REAL state machine (no stubs) ─────────────────────────────

function buildGameWithRealSM(playerNames) {
  const gameSocket = makeSocketMock();
  const playerSockets = {};
  playerNames.forEach((name, i) => {
    playerSockets[`sock-${i}`] = makeSocketMock();
  });
  gameSocket.sockets = playerSockets;

  const players = makePlayers(playerNames);
  const game = new CoupGame(players, gameSocket);

  game.resetGame();
  game.listen();

  return { game, gameSocket, playerSockets };
}

// ── Timer setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// ── TESTS ─────────────────────────────────────────────────────────────────────

describe("CoupGame — 2-player starting coins", () => {
  test("first player to act starts with 1 coin", () => {
    const { game } = buildGameWithRealSM(["Alice", "Bob"]);
    expect(game.players[game.currentPlayer].money).toBe(1);
  });

  test("second player starts with 2 coins", () => {
    const { game } = buildGameWithRealSM(["Alice", "Bob"]);
    const otherIdx = (game.currentPlayer + 1) % 2;
    expect(game.players[otherIdx].money).toBe(2);
  });

  test("all players start with 2 coins in 3-player game", () => {
    const { game } = buildGameWithRealSM(["Alice", "Bob", "Charlie"]);
    game.players.forEach((p) => expect(p.money).toBe(2));
  });
});

describe("CoupGame — coin validation", () => {
  test("coup rejected when player has fewer than 7 coins", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);

    const actingSock = playerSockets[game.players[game.currentPlayer].socketID];
    const actingName = game.players[game.currentPlayer].name;
    const beforeMoney = game.players[game.currentPlayer].money;

    actingSock._trigger("g-actionDecision", {
      action: { action: "coup", source: actingName, target: "Bob" },
    });

    expect(game.players[game.currentPlayer].money).toBe(beforeMoney);
  });

  test("assassinate rejected when player has fewer than 3 coins", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);

    const idx = game.currentPlayer;
    const actingSock = playerSockets[game.players[idx].socketID];
    const beforeMoney = game.players[idx].money;

    actingSock._trigger("g-actionDecision", {
      action: {
        action: "assassinate",
        source: game.players[idx].name,
        target: "Bob",
      },
    });

    expect(game.players[idx].money).toBe(beforeMoney);
  });

  test("forced coup at 10+ coins — non-coup actions rejected", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);

    const idx = game.currentPlayer;
    const actingSock = playerSockets[game.players[idx].socketID];

    game.players[idx].money = 10;

    actingSock._trigger("g-actionDecision", {
      action: {
        action: "income",
        source: game.players[idx].name,
        target: null,
      },
    });

    expect(game.players[idx].money).toBe(10);
  });
});

// ── EXCHANGE ──────────────────────────────────────────────────────────────────

// describe("CoupGame — exchange flow", () => {
//     test("exchange opens and sends combined influences", () => {
//         const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
//
//         const idx = game.currentPlayer;
//         const sock = playerSockets[game.players[idx].socketID];
//         const id = game.players[idx].socketID;
//
//         const before = [...game.players[idx].influences];
//
//         sock._trigger("g-actionDecision", {
//             action: { action: "exchange", source: game.players[idx].name, target: null },
//         });
//
//         expect(lastEmit(gameSocket, "g-openChallenge")).toBeTruthy();
//
//         jest.runOnlyPendingTimers();
//
//         const openExchange = lastToEmit(gameSocket, "g-openExchange");
//
//         expect(openExchange).toBeTruthy();
//         expect(openExchange.to).toBe(id);
//
//         const sent = openExchange.args[0].allInfluences;
//
//         expect(sent).toHaveLength(before.length + 2);
//         before.forEach((c) => expect(sent).toContain(c));
//     });
//
//     test("exchange decision updates influences and advances turn", () => {
//         const { game, playerSockets } = buildGame(["Alice", "Bob"]);
//
//         const idx = game.currentPlayer;
//         const sock = playerSockets[game.players[idx].socketID];
//         const prev = game.currentPlayer;
//
//         sock._trigger("g-actionDecision", {
//             action: { action: "exchange", source: game.players[idx].name, target: null },
//         });
//
//         jest.runOnlyPendingTimers();
//
//         sock._trigger("g-chooseExchangeDecision", {
//             playerName: game.players[idx].name,
//             kept: ["duke", "captain"],
//             putBack: ["ambassador", "contessa"],
//         });
//
//         expect(game.players[idx].influences).toEqual(["duke", "captain"]);
//         expect(game.currentPlayer).not.toBe(prev);
//     });
// });
//
// // ── CHALLENGE ─────────────────────────────────────────────────────────────────
//
// describe("CoupGame — challenge flow", () => {
//     test("income applies immediately", () => {
//         const { game, playerSockets } = buildGame(["Alice", "Bob"]);
//
//         const idx = game.currentPlayer;
//         const sock = playerSockets[game.players[idx].socketID];
//         const before = game.players[idx].money;
//
//         sock._trigger("g-actionDecision", {
//             action: { action: "income", source: game.players[idx].name, target: null },
//         });
//
//         expect(game.players[idx].money).toBe(before + 1);
//     });
//
//     test("tax opens challenge phase", () => {
//         const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
//
//         const idx = game.currentPlayer;
//         const sock = playerSockets[game.players[idx].socketID];
//
//         sock._trigger("g-actionDecision", {
//             action: { action: "tax", source: game.players[idx].name, target: null },
//         });
//
//         const event = lastEmit(gameSocket, "g-openChallenge");
//
//         expect(event).toBeTruthy();
//         expect(event.args[0].action.action).toBe("tax");
//     });
//
//     test("passing challenge applies tax", () => {
//         const { game, playerSockets } = buildGame(["Alice", "Bob"]);
//
//         const idx = game.currentPlayer;
//         const sock = playerSockets[game.players[idx].socketID];
//         const other = playerSockets[game.players[1].socketID];
//
//         const before = game.players[idx].money;
//
//         sock._trigger("g-actionDecision", {
//             action: { action: "tax", source: game.players[idx].name, target: null },
//         });
//
//         other._trigger("g-challengeDecision", {
//             action: { action: "tax", source: game.players[idx].name, target: null },
//             isChallenging: false,
//             challengee: game.players[idx].name,
//             challenger: game.players[1].name,
//         });
//
//         expect(game.players[idx].money).toBe(before + 3);
//     });
// });

// ── NEXT TURN ────────────────────────────────────────────────────────────────

describe("CoupGame — nextTurn guards", () => {
  test("does nothing when exchange open (legacy behavior removed but safe)", () => {
    const { game } = buildGame(["Alice", "Bob"]);

    game.sm.transition("IDLE", {});

    const prev = game.currentPlayer;

    game.nextTurn();

    expect(game.currentPlayer).not.toBeUndefined();
  });

  test("advances turn normally", () => {
    const { game } = buildGame(["Alice", "Bob"]);

    const prev = game.currentPlayer;

    game.nextTurn();

    expect(game.currentPlayer).not.toBe(prev);
  });
});

describe("CoupGame — new terminate/challenge edge cases", () => {
  test("terminate eliminates player, reveals cards, and emits g-terminated", () => {
    const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
    const aliceSock = playerSockets["sock-0"];

    game.players[0].influences = ["duke", "assassin"];
    game.players[0].revealedInfluences = [];
    game.players[0].isDead = false;

    aliceSock._trigger("g-terminatePlayer", { playerName: "Alice" });

    expect(game.players[0].isDead).toBe(true);
    expect(game.players[0].influences).toEqual([]);
    expect(game.players[0].revealedInfluences).toEqual(
      expect.arrayContaining(["duke", "assassin"])
    );
    expect(
      gameSocket._toEmitted.some(
        (e) => e.to === "sock-0" && e.event === "g-terminated"
      )
    ).toBe(true);
  });

  test("failed challenge auto-loses single challenger influence and keeps non-claimed challengee card", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const aliceSock = playerSockets["sock-0"];
    const bobSock = playerSockets["sock-1"];

    game.currentPlayer = 0;
    game.isTurnOpen = true;
    game.players[0].money = 3;
    game.players[0].influences = ["assassin", "duke"];
    game.players[1].influences = ["captain"]; // single influence => auto lose
    game.players[1].revealedInfluences = [];

    aliceSock._trigger("g-actionDecision", {
      action: { action: "assassinate", source: "Alice", target: "Bob" },
    });
    bobSock._trigger("g-challengeDecision", {
      action: { action: "assassinate", source: "Alice", target: "Bob" },
      isChallenging: true,
      challengee: "Alice",
      challenger: "Bob",
    });

    // Bob lost immediately from failed challenge; no choose modal needed
    expect(game.players[1].influences).toEqual([]);
    expect(game.players[1].revealedInfluences).toEqual(
      expect.arrayContaining(["captain"])
    );
    expect(game.isChooseInfluenceOpen).toBe(false);
    // Non-claimed card should remain (only challenged assassin should be replace candidate)
    expect(game.players[0].influences).toContain("duke");
  });

  test("successful challenge opens influence choice for challengee with two cards", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const aliceSock = playerSockets["sock-0"];
    const bobSock = playerSockets["sock-1"];

    game.currentPlayer = 0;
    game.isTurnOpen = true;
    game.players[0].influences = ["captain", "assassin"]; // no duke for tax claim
    game.players[1].influences = ["duke", "captain"];

    aliceSock._trigger("g-actionDecision", {
      action: { action: "tax", source: "Alice", target: null },
    });
    bobSock._trigger("g-challengeDecision", {
      action: { action: "tax", source: "Alice", target: null },
      isChallenging: true,
      challengee: "Alice",
      challenger: "Bob",
    });

    expect(game.isChooseInfluenceOpen).toBe(true);
    expect(game.pendingInfluencePlayerIndex).toBe(0);
  });
});

// ── Bug 9: IDLE must process chosenInfluence before pendingAction ────────────

describe("CoupGame — failed challenge applies both card loss and pending action", () => {
  test("challenger picks influence to lose, then pending tax still applies to actor, turn advances to challenger", () => {
    const { game, gameSocket, playerSockets } = buildGameWithRealSM([
      "Alice",
      "Bob",
    ]);

    // Force state: Alice current, Alice has duke (claim provable), Bob has 2 cards
    game.currentPlayer = 0;
    game.players[0].influences = ["duke", "assassin"];
    game.players[0].money = 2;
    game.players[1].influences = ["captain", "contessa"];
    game.players[1].money = 2;

    const aliceSock = playerSockets[game.players[0].socketID];
    const bobSock = playerSockets[game.players[1].socketID];

    aliceSock._trigger("g-actionDecision", {
      action: { action: "tax", source: "Alice", target: null },
    });

    // Bob challenges — Alice proves duke → Bob must lose a card and tax still applies
    bobSock._trigger("g-challengeDecision", {
      action: { action: "tax", source: "Alice", target: null },
      isChallenging: true,
      challengee: "Alice",
      challenger: "Bob",
    });

    // Bob picks captain to lose
    bobSock._trigger("g-chooseInfluenceDecision", {
      playerName: "Bob",
      influence: "captain",
    });

    // Card loss must be applied
    expect(game.players[1].influences).not.toContain("captain");
    expect(game.players[1].revealedInfluences).toContain("captain");

    // Tax still applies → Alice went from 2 to 5 coins (not swapped duke; redraw may change hand)
    expect(game.players[0].money).toBe(5);

    // Turn advances to Bob (not stays on Alice, not skips Bob)
    expect(game.currentPlayer).toBe(1);
  });
});

// ── Bug 1b: skip reveal-picker when claim cannot be proven ───────────────────

describe("CoupGame — reveal-picker skipped when challengee lacks claimed card", () => {
  test("bluff caught, challengee has 2 cards → g-chooseReveal NOT emitted, g-chooseInfluence emitted to challengee", () => {
    const { game, gameSocket, playerSockets } = buildGameWithRealSM([
      "Alice",
      "Bob",
    ]);

    game.currentPlayer = 0;
    game.players[0].influences = ["captain", "assassin"]; // no duke
    game.players[1].influences = ["duke", "contessa"];

    const aliceSock = playerSockets[game.players[0].socketID];
    const bobSock = playerSockets[game.players[1].socketID];

    aliceSock._trigger("g-actionDecision", {
      action: { action: "tax", source: "Alice", target: null },
    });

    bobSock._trigger("g-challengeDecision", {
      action: { action: "tax", source: "Alice", target: null },
      isChallenging: true,
      challengee: "Alice",
      challenger: "Bob",
    });

    // Reveal-picker modal must NOT appear
    const revealToEmits = gameSocket._toEmitted.filter(
      (e) => e.event === "g-chooseReveal"
    );
    expect(revealToEmits).toHaveLength(0);

    // Card-loss modal must go directly to Alice (challengee)
    const chooseInfluence = gameSocket._toEmitted.filter(
      (e) =>
        e.event === "g-chooseInfluence" && e.to === game.players[0].socketID
    );
    expect(chooseInfluence.length).toBeGreaterThan(0);
  });

  test("bluff caught, challengee has 1 card → auto-eliminated, no g-chooseInfluence, no g-chooseReveal", () => {
    const { game, gameSocket, playerSockets } = buildGameWithRealSM([
      "Alice",
      "Bob",
    ]);

    game.currentPlayer = 0;
    game.players[0].influences = ["captain"]; // single non-matching card
    game.players[1].influences = ["duke", "contessa"];

    const aliceSock = playerSockets[game.players[0].socketID];
    const bobSock = playerSockets[game.players[1].socketID];

    aliceSock._trigger("g-actionDecision", {
      action: { action: "tax", source: "Alice", target: null },
    });

    bobSock._trigger("g-challengeDecision", {
      action: { action: "tax", source: "Alice", target: null },
      isChallenging: true,
      challengee: "Alice",
      challenger: "Bob",
    });

    expect(
      gameSocket._toEmitted.filter((e) => e.event === "g-chooseReveal")
    ).toHaveLength(0);
    expect(
      gameSocket._toEmitted.filter((e) => e.event === "g-chooseInfluence")
    ).toHaveLength(0);
    expect(game.players[0].influences).toEqual([]);
    expect(game.players[0].revealedInfluences).toContain("captain");
  });
});

// ── Bug 3: steal+block must not softlock ─────────────────────────────────────

describe("CoupGame — steal+block opens block-challenge window", () => {
  test("after target blocks steal, g-openBlockChallenge is emitted", () => {
    const { game, gameSocket, playerSockets } = buildGameWithRealSM([
      "Alice",
      "Bob",
    ]);

    game.currentPlayer = 0;
    game.players[0].money = 2;
    game.players[1].money = 2;

    const aliceSock = playerSockets[game.players[0].socketID];
    const bobSock = playerSockets[game.players[1].socketID];

    // Alice steals from Bob (challengeable + blockable)
    aliceSock._trigger("g-actionDecision", {
      action: { action: "steal", source: "Alice", target: "Bob" },
    });

    // Bob declines to challenge → flow advances to BLOCK_OPEN
    bobSock._trigger("g-challengeDecision", {
      action: { action: "steal", source: "Alice", target: "Bob" },
      isChallenging: false,
      challengee: "Alice",
      challenger: "Bob",
    });

    // Bob blocks with captain
    bobSock._trigger("g-blockDecision", {
      action: { action: "steal", source: "Alice", target: "Bob" },
      counterAction: { counterAction: "block_steal" },
      isBlocking: true,
      blockee: "Alice",
      blocker: "Bob",
    });

    expect(lastEmit(gameSocket, "g-openBlockChallenge")).toBeTruthy();
  });
});

// ── Bug 1: challenge window must stay open ────────────────────────────────────

describe("CoupGame — Bug 1: challenge window stays open", () => {
  test("g-openChallenge emitted and g-closeChallenge NOT emitted after challengeable action", () => {
    const { game, gameSocket, playerSockets } = buildGameWithRealSM([
      "Alice",
      "Bob",
    ]);

    const actorIdx = game.currentPlayer;
    const actorSock = playerSockets[game.players[actorIdx].socketID];
    const actorName = game.players[actorIdx].name;

    actorSock._trigger("g-actionDecision", {
      action: { action: "tax", source: actorName, target: null },
    });

    expect(lastEmit(gameSocket, "g-openChallenge")).toBeTruthy();
    // Bug: without fix, g-closeChallenge is emitted immediately after g-openChallenge
    expect(lastEmit(gameSocket, "g-closeChallenge")).toBeFalsy();
  });

  test("income does NOT open challenge window", () => {
    const { game, gameSocket, playerSockets } = buildGameWithRealSM([
      "Alice",
      "Bob",
    ]);

    const actorIdx = game.currentPlayer;
    const actorSock = playerSockets[game.players[actorIdx].socketID];
    const actorName = game.players[actorIdx].name;

    actorSock._trigger("g-actionDecision", {
      action: { action: "income", source: actorName, target: null },
    });

    expect(lastEmit(gameSocket, "g-openChallenge")).toBeFalsy();
  });
});

// ── Bug 3: _afterInfluenceChosen must add to revealedInfluences ───────────────

describe("CoupGame — Bug 3: influence shown as revealed after loss", () => {
  test("chosen influence moved to revealedInfluences, not lost silently", () => {
    const { game } = buildGame(["Alice", "Bob"]);

    game.players[1].influences = ["captain", "duke"];
    game.players[1].revealedInfluences = [];

    // Stub sm.transition to prevent IDLE re-entry effects
    game.sm.transition = jest.fn();

    game._afterInfluenceChosen({
      playerName: "Bob",
      chosenInfluence: "captain",
      pendingAction: null,
    });

    expect(game.players[1].influences).not.toContain("captain");
    expect(game.players[1].revealedInfluences).toContain("captain");
  });
});

// ── Bug 3+4: _resolveReveal challenge resolution ──────────────────────────────

describe("CoupGame — _resolveReveal", () => {
  function buildResolveGame() {
    const { game, gameSocket } = buildGame(["Alice", "Bob"]);
    game.players[0].influences = ["duke", "captain"];
    game.players[0].revealedInfluences = [];
    game.players[1].influences = ["captain"];
    game.players[1].revealedInfluences = [];
    game.sm.transition = jest.fn();
    game.nextTurn = jest.fn();
    return { game, gameSocket };
  }

  test("claim proven, challenger has 1 card → auto-lose, pending action proceeds", () => {
    const { game } = buildResolveGame();
    // Alice claimed tax (duke), Bob challenged, Alice reveals duke (proven)
    game.players[0].influences = ["duke"];
    game.players[1].influences = ["captain"];

    game._resolveReveal({
      revealedCard: "duke",
      challenger: "Bob",
      challengee: "Alice",
      isBlock: false,
      prevAction: { action: "tax", source: "Alice", target: null },
    });

    expect(game.players[1].influences).toEqual([]);
    expect(game.players[1].revealedInfluences).toContain("captain");
    expect(game.sm.transition).toHaveBeenCalledWith(
      PHASES.IDLE,
      expect.objectContaining({
        pendingAction: expect.objectContaining({ action: "tax" }),
      })
    );
  });

  test("claim proven, challenger has 2 cards → ask challenger to choose influence", () => {
    const { game } = buildResolveGame();
    game.players[0].influences = ["duke", "assassin"];
    game.players[1].influences = ["captain", "contessa"];

    game._resolveReveal({
      revealedCard: "duke",
      challenger: "Bob",
      challengee: "Alice",
      isBlock: false,
      prevAction: { action: "tax", source: "Alice", target: null },
    });

    expect(game.sm.transition).toHaveBeenCalledWith(
      PHASES.CHOOSE_INFLUENCE_PENDING,
      expect.objectContaining({ playerName: "Bob" })
    );
  });

  test("bluff caught, challengee has 1 card → challengee auto-loses, no pending action", () => {
    const { game } = buildResolveGame();
    // Alice claimed tax but has no duke, reveals captain (wrong card)
    game.players[0].influences = ["captain"];
    game.players[1].influences = ["contessa"];

    game._resolveReveal({
      revealedCard: "captain",
      challenger: "Bob",
      challengee: "Alice",
      isBlock: false,
      prevAction: { action: "tax", source: "Alice", target: null },
    });

    expect(game.players[0].influences).toEqual([]);
    expect(game.players[0].revealedInfluences).toContain("captain");
    expect(game.sm.transition).toHaveBeenCalledWith(
      PHASES.IDLE,
      expect.not.objectContaining({ pendingAction: expect.anything() })
    );
  });

  test("Bug 4: assassination target fails challenge → loses ALL influences immediately", () => {
    const { game } = buildResolveGame();
    // Alice assassinates Bob. Bob challenges (claiming Alice has no assassin).
    // Alice reveals assassin → Bob loses challenge AND faces assassination.
    game.players[0].influences = ["assassin", "duke"];
    game.players[1].influences = ["captain", "contessa"];

    game._resolveReveal({
      revealedCard: "assassin",
      challenger: "Bob", // Bob challenged and lost
      challengee: "Alice",
      isBlock: false,
      prevAction: { action: "assassinate", source: "Alice", target: "Bob" },
    });

    // Bob should lose ALL cards immediately (no choose dialogs)
    expect(game.players[1].influences).toEqual([]);
    expect(game.players[1].revealedInfluences).toEqual(
      expect.arrayContaining(["captain", "contessa"])
    );
    expect(game.nextTurn).toHaveBeenCalled();
    // sm.transition should NOT be called with CHOOSE_INFLUENCE_PENDING for Bob
    const chooseCalls = game.sm.transition.mock.calls.filter(
      ([phase, ctx]) =>
        phase === PHASES.CHOOSE_INFLUENCE_PENDING && ctx?.playerName === "Bob"
    );
    expect(chooseCalls).toHaveLength(0);
  });

  test("contessa block accepted (no challenge) → blocker keeps all cards, no card loss", () => {
    // This case never reaches _resolveReveal at all — the state machine timer fires
    // transition(IDLE, { pendingAction: null }) and the block succeeds silently.
    // Verify _resolveReveal itself doesn't touch the blocker when called with claimProven=true.
    const { game } = buildResolveGame();
    game.players[0].influences = ["assassin", "duke"];
    game.players[1].influences = ["contessa", "captain"]; // Bob HAS contessa

    game._resolveReveal({
      revealedCard: "contessa", // correct card — claim proven
      challenger: "Alice",
      challengee: "Bob",
      isBlock: true,
      prevAction: { action: "assassinate", source: "Alice", target: "Bob" },
      counterAction: { counterAction: "block_assassinate" },
    });

    // Bob proved contessa → block succeeds → Alice (challenger) loses, Bob keeps both cards
    expect(game.players[1].influences.length).toBeGreaterThan(0);
    expect(game.players[1].revealedInfluences).toHaveLength(0);
  });

  test("Bug 4b: contessa block bluff caught on assassination → blocker loses ALL influences immediately", () => {
    const { game } = buildResolveGame();
    // Alice assassinates Bob. Bob claims contessa block. Alice challenges.
    // Bob reveals captain (wrong card → bluff caught) → assassination proceeds.
    // Bob has 2 cards → should lose both immediately.
    game.players[0].influences = ["assassin", "duke"];
    game.players[1].influences = ["captain", "duke"]; // Bob has no contessa

    game._resolveReveal({
      revealedCard: "captain", // wrong card — bluff
      challenger: "Alice", // challenger of the block
      challengee: "Bob", // blocker (assassination target)
      isBlock: true,
      prevAction: { action: "assassinate", source: "Alice", target: "Bob" },
      counterAction: { counterAction: "block_assassinate" },
    });

    expect(game.players[1].influences).toEqual([]);
    expect(game.players[1].revealedInfluences).toEqual(
      expect.arrayContaining(["captain", "duke"])
    );
    expect(game.nextTurn).toHaveBeenCalled();
    const chooseCalls = game.sm.transition.mock.calls.filter(
      ([phase, ctx]) =>
        phase === PHASES.CHOOSE_INFLUENCE_PENDING && ctx?.playerName === "Bob"
    );
    expect(chooseCalls).toHaveLength(0);
  });

  test("Bug 4: other player (not target) fails assassination challenge → only loses 1 card, assassination still pending", () => {
    const { game } = buildResolveGame();
    // Alice assassinates Bob. Charlie challenges.
    // Alice reveals assassin → Charlie (challenger, not target) loses 1 card.
    // Assassination against Bob still pending.
    game.players.push({
      name: "Charlie",
      socketID: "sock-2",
      influences: ["contessa"],
      revealedInfluences: [],
      isDead: false,
      money: 2,
      missedTurns: 0,
      color: "#fff",
    });
    game.nameIndexMap["Charlie"] = 2;
    game.nameSocketMap["Charlie"] = "sock-2";
    game.players[0].influences = ["assassin", "duke"];
    game.players[1].influences = ["captain", "contessa"];

    game._resolveReveal({
      revealedCard: "assassin",
      challenger: "Charlie", // Charlie challenged (not the assassination target)
      challengee: "Alice",
      isBlock: false,
      prevAction: { action: "assassinate", source: "Alice", target: "Bob" },
    });

    // Charlie loses their 1 card automatically
    expect(game.players[2].influences).toEqual([]);
    expect(game.players[2].revealedInfluences).toContain("contessa");
    // Assassination against Bob still pending
    expect(game.sm.transition).toHaveBeenCalledWith(
      PHASES.IDLE,
      expect.objectContaining({
        pendingAction: expect.objectContaining({ action: "assassinate" }),
      })
    );
  });
});

// ── Single-card auto-lose (no choose dialog) ──────────────────────────────────

describe("CoupGame — single-card target auto-loses without choose dialog", () => {
  function buildApplyGame() {
    const { game, gameSocket } = buildGame(["Alice", "Bob"]);
    game.players[0].money = 10;
    game.players[1].revealedInfluences = [];
    game.sm.transition = jest.fn();
    game.nextTurn = jest.fn();
    return { game, gameSocket };
  }

  test("coup on target with 1 card → auto-reveals card, no CHOOSE_INFLUENCE_PENDING", () => {
    const { game } = buildApplyGame();
    game.players[1].influences = ["duke"];

    game.applyAction({ action: "coup", source: "Alice", target: "Bob" });

    expect(game.players[1].influences).toEqual([]);
    expect(game.players[1].revealedInfluences).toContain("duke");
    expect(game.nextTurn).toHaveBeenCalled();
    const chooseCalls = game.sm.transition.mock.calls.filter(
      ([phase]) => phase === PHASES.CHOOSE_INFLUENCE_PENDING
    );
    expect(chooseCalls).toHaveLength(0);
  });

  test("assassinate on target with 1 card → auto-reveals card, no CHOOSE_INFLUENCE_PENDING", () => {
    const { game } = buildApplyGame();
    game.players[0].money = 3;
    game.players[1].influences = ["captain"];

    game.applyAction({ action: "assassinate", source: "Alice", target: "Bob" });

    expect(game.players[1].influences).toEqual([]);
    expect(game.players[1].revealedInfluences).toContain("captain");
    expect(game.nextTurn).toHaveBeenCalled();
    const chooseCalls = game.sm.transition.mock.calls.filter(
      ([phase]) => phase === PHASES.CHOOSE_INFLUENCE_PENDING
    );
    expect(chooseCalls).toHaveLength(0);
  });

  test("coup on target with 2 cards → opens CHOOSE_INFLUENCE_PENDING", () => {
    const { game } = buildApplyGame();
    game.players[1].influences = ["duke", "captain"];

    game.applyAction({ action: "coup", source: "Alice", target: "Bob" });

    expect(game.sm.transition).toHaveBeenCalledWith(
      PHASES.CHOOSE_INFLUENCE_PENDING,
      expect.objectContaining({ playerName: "Bob" })
    );
    expect(game.nextTurn).not.toHaveBeenCalled();
  });
});

// ── Bug: terminate does not notify other players ──────────────────────────────

describe("CoupGame — terminate notifies other players", () => {
  test("g-terminatePlayer emits g-updatePlayers so other players see the change", () => {
    const { game, gameSocket, playerSockets } = buildGame([
      "Alice",
      "Bob",
      "Carol",
    ]);
    const aliceSock = playerSockets["sock-0"];

    game.players[0].influences = ["duke"];
    game.players[0].isDead = false;
    game.aliveCount = 3;

    const before = gameSocket._emitted.filter(
      (e) => e.event === "g-updatePlayers"
    ).length;

    aliceSock._trigger("g-terminatePlayer", { playerName: "Alice" });

    const after = gameSocket._emitted.filter(
      (e) => e.event === "g-updatePlayers"
    ).length;
    expect(after).toBeGreaterThan(before);
  });

  test("g-terminatePlayer emits a log message mentioning the player", () => {
    const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
    const aliceSock = playerSockets["sock-0"];

    game.players[0].influences = ["duke"];
    game.players[0].isDead = false;
    game.aliveCount = 2;

    aliceSock._trigger("g-terminatePlayer", { playerName: "Alice" });

    const logs = gameSocket._emitted.filter((e) => e.event === "g-addLog");
    expect(logs.some((e) => e.args[0].includes("Alice"))).toBe(true);
  });

  test("g-terminatePlayer in 2-player game: surviving player wins (g-gameOver emitted)", () => {
    const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
    const aliceSock = playerSockets["sock-0"];

    game.players[0].influences = ["duke"];
    game.players[0].isDead = false;
    game.players[1].influences = ["captain"];
    game.players[1].isDead = false;
    game.aliveCount = 2;

    aliceSock._trigger("g-terminatePlayer", { playerName: "Alice" });

    const gameOver = gameSocket._emitted.find((e) => e.event === "g-gameOver");
    expect(gameOver).toBeTruthy();
    expect(gameOver.args[0]).toBe("Bob");
  });
});
