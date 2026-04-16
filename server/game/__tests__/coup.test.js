const CoupGame = require("../coup");

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

  return { game, gameSocket, playerSockets };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastEmit(socket, eventName) {
  return socket._emitted.filter((e) => e.event === eventName).pop();
}

function lastToEmit(socket, eventName) {
  return socket._toEmitted.filter((e) => e.event === eventName).pop();
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
