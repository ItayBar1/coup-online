// server/game/coup.js

const gameUtils = require("./utils");
const constants = require("../utilities/constants");
const {
  createCoupStateMachine,
  PHASES,
  EVENTS,
} = require("./CoupStateMachine");

const log = (tag, msg) =>
  console.log(`[COUP][${new Date().toISOString()}] ${tag} | ${msg}`);

class CoupGame {
  // ─────────────────────────────────────────
  // Block 1 — Constructor
  // ─────────────────────────────────────────
  constructor(players, gameSocket, settings) {
    this.nameSocketMap = gameUtils.buildNameSocketMap(players);
    this.nameIndexMap = gameUtils.buildNameIndexMap(players);
    this.players = gameUtils.buildPlayers(players);
    this.gameSocket = gameSocket;
    this.settings = settings || constants.DefaultSettings;
    this.currentPlayer = 0;
    this.deck = gameUtils.buildDeck();
    this.winner = "";
    this.actions = constants.Actions;
    this.counterActions = constants.CounterActions;
    this.aliveCount = players.length;
    this.isPlayAgainOpen = false;

    // One named slot per phase that needs a timer.
    // Lives on the instance — NOT in frozen context — to avoid re-transition loops.
    this._timers = {
      turn: null,
      challenge: null,
      block: null,
      blockChallenge: null,
      exchange: null,
    };

    this.sm = createCoupStateMachine({
      emit: (event, data) => this.gameSocket.emit(event, data),
      emitTo: (name, event, data) =>
        this.gameSocket.to(this.nameSocketMap[name]).emit(event, data),
    });

    this._registerHooks();
  }

  // ─────────────────────────────────────────
  // Block 2 — resetGame
  // ─────────────────────────────────────────
  resetGame(startingPlayer = 0) {
    // Clear all timers before resetting state
    Object.values(this._timers).forEach((t) => clearTimeout(t));
    this._timers = {
      turn: null,
      challenge: null,
      block: null,
      blockChallenge: null,
      exchange: null,
    };

    this.currentPlayer = startingPlayer;
    this.aliveCount = this.players.length;
    this.isPlayAgainOpen = false;
    this.deck = gameUtils.buildDeck();

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].money = 2;
      this.players[i].influences = [this.deck.pop(), this.deck.pop()];
      this.players[i].isDead = false;
      this.players[i].missedTurns = 0;
    }

    // BUG-04: in a 2-player game the starting player gets only 1 coin
    if (this.players.length === 2) {
      this.players[startingPlayer].money = 1;
    }

    this.sm.transition(PHASES.IDLE, {});
  }

  // ─────────────────────────────────────────
  // Block 3 — listen
  // ─────────────────────────────────────────
  listen() {
    this.players.map((x) => {
      const socket = this.gameSocket.sockets[x.socketID];

      socket.on("g-playAgain", () => {
        if (this.isPlayAgainOpen) {
          this.isPlayAgainOpen = false;
          this.resetGame(Math.floor(Math.random() * this.players.length));
          this.updatePlayers();
          this.sm.transition(PHASES.ACTION_PENDING, {});
        }
      });

      socket.on("g-actionDecision", (res) => {
        log(
          "g-actionDecision",
          `source=${res.action?.source} action=${res.action?.action} target=${res.action?.target}`
        );

        if (!this.sm.in(PHASES.ACTION_PENDING)) return;

        const sourceIndex = this.nameIndexMap[res.action.source];
        const player = this.players[sourceIndex];

        // BUG-06: enforce forced coup at 10+ coins
        if (player.money >= 10 && res.action.action !== "coup") {
          log(
            "g-actionDecision",
            `Rejected: ${res.action.source} has ${player.money} coins but chose ${res.action.action}`
          );
          return;
        }

        // BUG-05: deduct coins server-side with validation
        if (res.action.action === "coup") {
          if (player.money < 7) return;
          player.money -= 7;
          this.updatePlayers();
        } else if (res.action.action === "assassinate") {
          if (player.money < 3) return;
          player.money -= 3;
          this.updatePlayers();
        }

        const isChallengeable = this.actions[res.action.action].isChallengeable;
        const isBlockable =
          this.actions[res.action.action].blockableBy.length > 0;

        if (isChallengeable) {
          this.sm.dispatch(EVENTS.ACTION_CHOSEN, {
            action: res.action,
            isBlockable: isBlockable,
          });
        } else if (res.action.action === "foreign_aid") {
          // foreign_aid: not challengeable but blockable — skip to block phase
          this.sm.transition(PHASES.BLOCK_OPEN, {
            action: res.action,
            votes: 0,
            eligibleVoters: 0, // set in onEnter
          });
        } else {
          this.applyAction(res.action);
        }
      });

      socket.on("g-challengeDecision", (res) => {
        log(
          "g-challengeDecision",
          `challenger=${res.challenger} challengee=${res.challengee} isChallenging=${res.isChallenging}`
        );
        this.sm.dispatch(EVENTS.CHALLENGE_VOTE, res);
      });

      socket.on("g-blockDecision", (res) => {
        log(
          "g-blockDecision",
          `blocker=${res.blocker} blockee=${res.blockee} isBlocking=${res.isBlocking}`
        );
        this.sm.dispatch(EVENTS.BLOCK_VOTE, res);
      });

      socket.on("g-blockChallengeDecision", (res) => {
        log(
          "g-blockChallengeDecision",
          `challenger=${res.challenger} challengee=${res.challengee} isChallenging=${res.isChallenging}`
        );
        this.sm.dispatch(EVENTS.BLOCK_CHALLENGE_VOTE, res);
      });

      socket.on("g-revealDecision", (res) => {
        log(
          "g-revealDecision",
          `challengee=${res.challengee} challenger=${res.challenger} revealedCard=${res.revealedCard} isBlock=${res.isBlock}`
        );
        this.sm.dispatch(EVENTS.REVEAL_SUBMITTED, res);
      });

      socket.on("g-chooseInfluenceDecision", (res) => {
        log(
          "g-chooseInfluenceDecision",
          `player=${res.playerName} influence=${res.influence}`
        );
        this.sm.dispatch(EVENTS.INFLUENCE_CHOSEN, res);
      });

      socket.on("g-chooseExchangeDecision", (res) => {
        log(
          "g-chooseExchangeDecision",
          `player=${res.playerName} kept=[${res.kept}] putBack=[${res.putBack}]`
        );
        this.sm.dispatch(EVENTS.EXCHANGE_CHOSEN, res);
      });
    });
  }

  // ─────────────────────────────────────────
  // Block 4 — _registerHooks
  // ─────────────────────────────────────────
  _registerHooks() {
    const sm = this.sm;

    // ── ACTION_PENDING ──────────────────────────────
    // Entered at the start of every turn.
    // Emits to all players who the current player is, and privately tells
    // that player to choose their action. Starts the turn timer.
    sm.onEnter(PHASES.ACTION_PENDING, (ctx) => {
      const timeoutMs = this.settings.turnTimeLimit * 1000;
      const playerName = this.players[this.currentPlayer].name;

      this.gameSocket.emit("g-updateCurrentPlayer", {
        name: playerName,
        timeLimit: timeoutMs,
      });
      this.gameSocket
        .to(this.players[this.currentPlayer].socketID)
        .emit("g-chooseAction");

      this._timers.turn = setTimeout(() => {
        this.onTurnTimeout(playerName);
      }, timeoutMs);
    });

    sm.onExit(PHASES.ACTION_PENDING, () => {
      clearTimeout(this._timers.turn);
      this._timers.turn = null;
      this.gameSocket.emit("g-closeTurnTimer");
    });

    // ── CHALLENGE_OPEN ──────────────────────────────
    // Entered when a challengeable action is played.
    // votes > 0 means dispatch re-entered this phase to increment the vote
    // counter — in that case we skip re-emitting and re-starting the timer.
    sm.onEnter(PHASES.CHALLENGE_OPEN, (ctx) => {
      if (ctx.votes > 0) return;
      const timeoutMs = this.settings.challengeTimeLimit * 1000;

      // Now that we're in the hook we know aliveCount, so patch eligibleVoters
      // directly into context via a plain assignment (context is frozen but
      // we own the variable — re-freeze after patching).
      context_patch: {
        const patched = { ...ctx, eligibleVoters: this.aliveCount - 1 };
        // We cannot call sm.transition() here (would cause a loop),
        // so we reach into the machine's mutable closure via the
        // returned setContext helper if available, or we accept that
        // eligibleVoters stays 0 until the first vote arrives and
        // handle it in dispatch instead (see dispatch CHALLENGE_VOTE).
        // For simplicity we store it on the instance for this phase.
        this._challengeEligibleVoters = this.aliveCount - 1;
      }

      this.gameSocket.emit("g-openChallenge", {
        action: ctx.action,
        timeLimit: timeoutMs,
      });

      this._timers.challenge = setTimeout(() => {
        if (!sm.in(PHASES.CHALLENGE_OPEN)) return;
        if (ctx.isBlockable) {
          sm.transition(PHASES.BLOCK_OPEN, {
            action: ctx.action,
            votes: 0,
            eligibleVoters: 0,
          });
        } else {
          sm.transition(PHASES.IDLE, { pendingAction: ctx.action });
        }
      }, timeoutMs);
    });

    sm.onExit(PHASES.CHALLENGE_OPEN, () => {
      clearTimeout(this._timers.challenge);
      this._timers.challenge = null;
      this._challengeEligibleVoters = 0;
      this.gameSocket.emit("g-closeChallenge");
    });

    // ── BLOCK_OPEN ──────────────────────────────────
    // Entered after the challenge phase passes, or directly for foreign_aid.
    // For foreign_aid all alive players (minus source) can block.
    // For steal/assassinate only the target can block.
    sm.onEnter(PHASES.BLOCK_OPEN, (ctx) => {
      if (ctx.votes > 0) return;
      const timeoutMs = this.settings.challengeTimeLimit * 1000;
      const action = ctx.action;

      if (action.action === "foreign_aid") {
        this._blockEligibleVoters = this.aliveCount - 1;
        this.gameSocket.emit("g-openBlock", { action, timeLimit: timeoutMs });
      } else {
        // Only the target can block (steal / assassinate)
        this._blockEligibleVoters = 1;
        this.gameSocket
          .to(this.nameSocketMap[action.target])
          .emit("g-openBlock", { action, timeLimit: timeoutMs });
      }

      this._timers.block = setTimeout(() => {
        if (!sm.in(PHASES.BLOCK_OPEN)) return;
        sm.transition(PHASES.IDLE, { pendingAction: ctx.action });
      }, timeoutMs);
    });

    sm.onExit(PHASES.BLOCK_OPEN, () => {
      clearTimeout(this._timers.block);
      this._timers.block = null;
      this._blockEligibleVoters = 0;
      this.gameSocket.emit("g-closeBlock");
    });

    // ── BLOCK_CHALLENGE_OPEN ────────────────────────
    // Entered when someone blocks. All other alive players can challenge the block.
    sm.onEnter(PHASES.BLOCK_CHALLENGE_OPEN, (ctx) => {
      if (ctx.votes > 0) return;
      const timeoutMs = this.settings.challengeTimeLimit * 1000;

      this._blockChallengeEligibleVoters = this.aliveCount - 1;

      this.gameSocket.emit("g-openBlockChallenge", {
        counterAction: ctx.counterAction,
        prevAction: ctx.prevAction,
        timeLimit: timeoutMs,
      });
      this.gameSocket.emit("g-addLog", `${ctx.blocker} blocked ${ctx.blockee}`);

      this._timers.blockChallenge = setTimeout(() => {
        if (!sm.in(PHASES.BLOCK_CHALLENGE_OPEN)) return;
        sm.transition(PHASES.IDLE, { pendingAction: null }); // block succeeded
      }, timeoutMs);
    });

    sm.onExit(PHASES.BLOCK_CHALLENGE_OPEN, () => {
      clearTimeout(this._timers.blockChallenge);
      this._timers.blockChallenge = null;
      this._blockChallengeEligibleVoters = 0;
      this.gameSocket.emit("g-closeBlockChallenge");
    });

    // ── REVEAL_PENDING ──────────────────────────────
    // Entered when a challenge is made. Privately asks the challenged player
    // to reveal one of their cards.
    sm.onEnter(PHASES.REVEAL_PENDING, (ctx) => {
      this.gameSocket
        .to(this.nameSocketMap[ctx.challengee])
        .emit("g-chooseReveal", ctx);
      this.gameSocket.emit(
        "g-addLog",
        ctx.isBlock
          ? `${ctx.challenger} challenged ${ctx.challengee}'s block`
          : `${ctx.challenger} challenged ${ctx.challengee}`
      );
    });

    // ── CHOOSE_INFLUENCE_PENDING ────────────────────
    // Entered when a player must lose an influence card
    // (coup, assassination, or failed challenge).
    sm.onEnter(PHASES.CHOOSE_INFLUENCE_PENDING, (ctx) => {
      this.gameSocket
        .to(this.nameSocketMap[ctx.playerName])
        .emit("g-chooseInfluence");
    });

    // ── EXCHANGE_PENDING ────────────────────────────
    // Entered when the Ambassador action is applied.
    // Sends the player their current cards plus 2 drawn cards to choose from.
    sm.onEnter(PHASES.EXCHANGE_PENDING, (ctx) => {
      const timeoutMs = this.settings.exchangeTimeLimit * 1000;

      this.gameSocket
        .to(this.nameSocketMap[ctx.source])
        .emit("g-openExchange", {
          allInfluences: ctx.allInfluences,
          timeLimit: timeoutMs,
        });

      this._timers.exchange = setTimeout(() => {
        if (!sm.in(PHASES.EXCHANGE_PENDING)) return;
        // Timeout: put drawn cards back, keep original hand
        sm.getContext().drawTwo.forEach((card) => this.deck.push(card));
        this.deck = gameUtils.shuffleArray(this.deck);
        this.gameSocket
          .to(this.nameSocketMap[ctx.source])
          .emit("g-closeExchange");
        this.gameSocket.emit(
          "g-addLog",
          `${ctx.source}'s exchange timed out — kept original cards`
        );
        sm.transition(PHASES.IDLE, {});
      }, timeoutMs);
    });

    sm.onExit(PHASES.EXCHANGE_PENDING, () => {
      clearTimeout(this._timers.exchange);
      this._timers.exchange = null;
    });

    // ── IDLE ────────────────────────────────────────
    // The junction after every phase. Decides what to do next based on
    // what context was passed in from the previous phase.
    sm.onEnter(PHASES.IDLE, (ctx) => {
      if (ctx.pendingAction) {
        this.applyAction(ctx.pendingAction);
      } else if (ctx.chosenInfluence) {
        this._afterInfluenceChosen(ctx);
      } else if (ctx.kept) {
        this._afterExchangeChosen(ctx);
      } else {
        this.nextTurn();
      }
    });
  }

  // ─────────────────────────────────────────
  // Block 5 — applyAction
  // ─────────────────────────────────────────
  applyAction(action) {
    log(
      "applyAction",
      `action=${action.action} source=${action.source} target=${action.target}`
    );

    const execute = action.action;
    const target = action.target;
    const source = action.source;
    const logTarget = target ? ` on ${target}` : "";

    this.gameSocket.emit("g-addLog", `${source} used ${execute}${logTarget}`);

    if (execute === "income") {
      this._findPlayer(source).money += 1;
      this.nextTurn();
    } else if (execute === "foreign_aid") {
      this._findPlayer(source).money += 2;
      this.nextTurn();
    } else if (execute === "tax") {
      this._findPlayer(source).money += 3;
      this.nextTurn();
    } else if (execute === "steal") {
      const t = this._findPlayer(target);
      const stolen = Math.min(t.money, 2);
      t.money -= stolen;
      this._findPlayer(source).money += stolen;
      this.nextTurn();
    } else if (execute === "coup") {
      this.sm.transition(PHASES.CHOOSE_INFLUENCE_PENDING, {
        playerName: target,
        pendingAction: null,
      });
    } else if (execute === "assassinate") {
      const t = this._findPlayer(target);
      if (t.influences.length > 0) {
        this.sm.transition(PHASES.CHOOSE_INFLUENCE_PENDING, {
          playerName: target,
          pendingAction: null,
        });
      } else {
        // BUG-03: target already lost last card — skip influence loss
        this.nextTurn();
      }
    } else if (execute === "exchange") {
      const sourceIndex = this.nameIndexMap[source];
      const drawTwo = [this.deck.pop(), this.deck.pop()];
      const allInfluences = [
        ...this.players[sourceIndex].influences,
        ...drawTwo,
      ];
      this.sm.transition(PHASES.EXCHANGE_PENDING, {
        source,
        drawTwo,
        allInfluences,
      });
    } else {
      log("applyAction", `ERROR: unknown action "${execute}"`);
    }
  }

  // ─────────────────────────────────────────
  // Block 6 — onTurnTimeout
  // ─────────────────────────────────────────
  onTurnTimeout(playerName) {
    log("onTurnTimeout", `player=${playerName}`);
    if (!this.sm.in(PHASES.ACTION_PENDING)) return;

    const playerIndex = this.nameIndexMap[playerName];
    if (playerIndex === undefined) return;
    const player = this.players[playerIndex];
    if (!player || player.isDead) return;

    if (player.missedTurns >= 1) {
      // Second consecutive miss — eliminate player
      const cardList = player.influences.join(", ") || "none";
      this.gameSocket.emit(
        "g-addLog",
        `${playerName} timed out — eliminated for inactivity`
      );
      this.gameSocket.emit("g-addLog", `${playerName}'s cards: ${cardList}`);
      player.influences.forEach((card) => this.deck.push(card));
      this.deck = gameUtils.shuffleArray(this.deck);
      player.influences = [];
      player.money = 0;
      this.sm.transition(PHASES.IDLE, {});
    } else {
      // First miss — award coin (max 10)
      player.missedTurns++;
      if (player.money < 10) player.money++;
      this.gameSocket.emit(
        "g-addLog",
        `${playerName} timed out — awarded 1 coin (${player.money} total)`
      );
      this.updatePlayers();
      this.sm.transition(PHASES.IDLE, {});
    }
  }

  // ─────────────────────────────────────────
  // Block 7 — nextTurn
  // ─────────────────────────────────────────
  nextTurn() {
    log("nextTurn", `currentPlayer=${this.players[this.currentPlayer]?.name}`);

    this.players.forEach((x) => {
      if (x.influences.length === 0 && !x.isDead) {
        this.gameSocket.emit("g-addLog", `${x.name} is out!`);
        this.aliveCount -= 1;
        x.isDead = true;
        x.money = 0;
      }
    });

    this.updatePlayers();

    if (this.aliveCount === 1) {
      const winner = this.players.find((p) => p.influences.length > 0);
      this.isPlayAgainOpen = true;
      this.gameSocket.emit("g-gameOver", winner.name);
      this.sm.transition(PHASES.GAME_OVER, { winner: winner.name });
    } else {
      do {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
      } while (this.players[this.currentPlayer].isDead);
      this.sm.transition(PHASES.ACTION_PENDING, {});
    }
  }

  // ─────────────────────────────────────────
  // Block 8 — start
  // ─────────────────────────────────────────
  start() {
    this.resetGame();
    this.listen();
    this.updatePlayers();
    log(
      "start",
      `Game started with ${this.players.length} players: [${this.players.map((p) => p.name).join(", ")}]`
    );
    this.sm.transition(PHASES.ACTION_PENDING, {});
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  updatePlayers() {
    this.gameSocket.emit(
      "g-updatePlayers",
      gameUtils.exportPlayers(JSON.parse(JSON.stringify(this.players)))
    );
  }

  _findPlayer(name) {
    return this.players[this.nameIndexMap[name]];
  }

  // Called from onEnter(IDLE) when a player has just chosen which influence to lose.
  // Removes the card, handles BUG-02 coin refund, then either applies a
  // pending deferred action (BUG-03) or advances to the next turn.
  _afterInfluenceChosen(ctx) {
    const playerIndex = this.nameIndexMap[ctx.playerName];
    const player = this.players[playerIndex];

    this.gameSocket.emit(
      "g-addLog",
      `${ctx.playerName} lost their ${ctx.chosenInfluence}`
    );

    for (let i = 0; i < player.influences.length; i++) {
      if (player.influences[i] === ctx.chosenInfluence) {
        this.deck.push(player.influences[i]);
        this.deck = gameUtils.shuffleArray(this.deck);
        player.influences.splice(i, 1);
        break;
      }
    }

    // BUG-02: refund 3 coins to source if assassination was successfully challenged
    if (ctx.refundAssassinate) {
      this._findPlayer(ctx.challengee).money += 3;
    }

    this.updatePlayers();

    // BUG-03: if an action was deferred (e.g. assassination after failed challenge),
    // apply it now that the challenger has lost their influence
    if (ctx.pendingAction) {
      this.applyAction(ctx.pendingAction);
    } else {
      this.nextTurn();
    }
  }

  // Called from onEnter(IDLE) when a player has finished their Ambassador exchange.
  // Replaces their hand with the kept cards and returns the rest to the deck.
  _afterExchangeChosen(ctx) {
    const playerIndex = this.nameIndexMap[ctx.source];
    this.players[playerIndex].influences = ctx.kept;
    ctx.putBack.forEach((card) => this.deck.push(card));
    this.deck = gameUtils.shuffleArray(this.deck);
    this.nextTurn();
  }
}

module.exports = CoupGame;
