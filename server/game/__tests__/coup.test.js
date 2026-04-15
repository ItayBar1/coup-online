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
    // helpers for assertions
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

  // Patch sockets map so listen() can find individual sockets
  const playerSockets = {};
  playerNames.forEach((name, i) => {
    const s = makeSocketMock();
    playerSockets[`sock-${i}`] = s;
  });
  gameSocket.sockets = playerSockets;

  const players = makePlayers(playerNames);
  const game = new CoupGame(players, gameSocket);
  game.start();

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CoupGame — coin validation", () => {
  test("coup rejected when player has fewer than 7 coins", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingSock = playerSockets[game.players[game.currentPlayer].socketID];
    const actingName = game.players[game.currentPlayer].name;
    const beforeMoney = game.players[game.currentPlayer].money;

    actingSock._trigger("g-actionDecision", {
      action: { action: "coup", source: actingName, target: "Bob" },
    });

    // coup rejected — money unchanged
    expect(game.players[game.currentPlayer].money).toBe(beforeMoney);
  });

  test("assassinate rejected when player has fewer than 3 coins", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];
    const beforeMoney = game.players[actingIdx].money;

    actingSock._trigger("g-actionDecision", {
      action: { action: "assassinate", source: actingName, target: "Bob" },
    });

    // rejected — money unchanged from starting value (1 in 2-player game per BUG-04)
    expect(game.players[actingIdx].money).toBe(beforeMoney);
  });

  test("forced coup at 10+ coins — non-coup actions rejected", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];

    game.players[actingIdx].money = 10;

    actingSock._trigger("g-actionDecision", {
      action: { action: "income", source: actingName, target: null },
    });

    // income should be rejected — money stays at 10
    expect(game.players[actingIdx].money).toBe(10);
  });
});

describe("CoupGame — exchange flow", () => {
  test("exchange: g-openExchange emitted with combined influences to acting player", () => {
    const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];
    const actingSocketId = game.players[actingIdx].socketID;
    const existingInfluences = [...game.players[actingIdx].influences];

    actingSock._trigger("g-actionDecision", {
      action: { action: "exchange", source: actingName, target: null },
    });

    // Challenge window opens
    expect(game.isChallengeBlockOpen).toBe(true);
    expect(lastEmit(gameSocket, "g-openChallenge")).toBeTruthy();

    // Fast-forward only the challenge timer (not the exchange timer created after)
    jest.runOnlyPendingTimers();

    // exchange should be applied now
    expect(game.isExchangeOpen).toBe(true);
    const openExchangeEvent = lastToEmit(gameSocket, "g-openExchange");
    expect(openExchangeEvent).toBeTruthy();
    expect(openExchangeEvent.to).toBe(actingSocketId);

    const sentInfluences = openExchangeEvent.args[0].allInfluences;
    // Should be existing cards + 2 drawn = existingInfluences.length + 2
    expect(sentInfluences).toHaveLength(existingInfluences.length + 2);
    // Existing influences should be included
    existingInfluences.forEach((inf) => {
      expect(sentInfluences).toContain(inf);
    });
  });

  test("exchange: g-chooseExchangeDecision updates player influences and calls nextTurn", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];
    const originalTurn = game.currentPlayer;

    actingSock._trigger("g-actionDecision", {
      action: { action: "exchange", source: actingName, target: null },
    });
    jest.runOnlyPendingTimers();

    // Now respond to exchange
    actingSock._trigger("g-chooseExchangeDecision", {
      playerName: actingName,
      kept: ["duke", "captain"],
      putBack: ["ambassador", "contessa"],
    });

    expect(game.isExchangeOpen).toBe(false);
    expect(game.players[actingIdx].influences).toEqual(["duke", "captain"]);
    // Turn should have advanced
    expect(game.currentPlayer).not.toBe(originalTurn);
  });
});

describe("CoupGame — challenge flow", () => {
  test("income (non-challengeable) applies immediately without challenge phase", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];
    const before = game.players[actingIdx].money;

    actingSock._trigger("g-actionDecision", {
      action: { action: "income", source: actingName, target: null },
    });

    expect(game.isChallengeBlockOpen).toBe(false);
    expect(game.players[actingIdx].money).toBe(before + 1);
  });

  test("tax opens challenge phase", () => {
    const { game, gameSocket, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];

    actingSock._trigger("g-actionDecision", {
      action: { action: "tax", source: actingName, target: null },
    });

    expect(game.isChallengeBlockOpen).toBe(true);
    const challengeEvent = lastEmit(gameSocket, "g-openChallenge");
    expect(challengeEvent).toBeTruthy();
    expect(challengeEvent.args[0].action.action).toBe("tax");
  });

  test("passing challenge (all votes) applies tax", () => {
    const { game, playerSockets } = buildGame(["Alice", "Bob"]);
    const actingIdx = game.currentPlayer;
    const actingName = game.players[actingIdx].name;
    const actingSock = playerSockets[game.players[actingIdx].socketID];
    const otherIdx = actingIdx === 0 ? 1 : 0;
    const otherSock = playerSockets[game.players[otherIdx].socketID];
    const before = game.players[actingIdx].money;

    actingSock._trigger("g-actionDecision", {
      action: { action: "tax", source: actingName, target: null },
    });

    // Other player passes
    otherSock._trigger("g-challengeDecision", {
      action: { action: "tax", source: actingName, target: null },
      isChallenging: false,
      challengee: actingName,
      challenger: game.players[otherIdx].name,
    });

    // tax should apply (+ 3 coins) after block phase timer fires (tax is not blockable → no block phase)
    expect(game.players[actingIdx].money).toBe(before + 3);
  });
});

describe("CoupGame — nextTurn guards", () => {
  test("nextTurn does nothing while isExchangeOpen", () => {
    const { game } = buildGame(["Alice", "Bob"]);
    game.isExchangeOpen = true;
    const currentBefore = game.currentPlayer;
    game.nextTurn();
    expect(game.currentPlayer).toBe(currentBefore);
  });

  test("nextTurn advances turn when no guards active", () => {
    const { game } = buildGame(["Alice", "Bob"]);
    const currentBefore = game.currentPlayer;
    game.nextTurn();
    expect(game.currentPlayer).not.toBe(currentBefore);
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
