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
    this.currentPlayer = startingPlayer;
    this.aliveCount = this.players.length;
    this.deck = gameUtils.buildDeck();

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].money = 2;
      this.players[i].influences = [this.deck.pop(), this.deck.pop()];
      this.players[i].isDead = false;
      this.players[i].missedTurns = 0;
    }

    // In a 2-player game, the first player to act gets only 1 coin.
    // nextTurn() increments currentPlayer once before the first action,
    // so the actual first player is at (startingPlayer + 1) % 2.
    if (this.players.length === 2) {
      this.players[(startingPlayer + 1) % this.players.length].money = 1;
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
          this.sm.dispatch(EVENTS.PLAY_AGAIN);
        }
      });

      socket.on("g-actionDecision", (res) => {
        log(
          "g-actionDecision",
          `source=${res.action?.source} action=${res.action?.action} target=${res.action?.target}`
        );
        const actionDef = this.actions[res.action?.action];
        const isChallengeable = actionDef?.isChallengeable ?? false;
        const isBlockable = (actionDef?.blockableBy?.length ?? 0) > 0;
        this.sm.dispatch(EVENTS.ACTION_CHOSEN, {
          action: res.action,
          isChallengeable,
          isBlockable,
        });
      });

      socket.on("g-challengeDecision", (res) => {
        log(
          "g-challengeDecision",
          `challenger=${res.challenger} challengee=${res.challengee} isChallenging=${res.isChallenging}`
        );
        if (!this.sm.in(PHASES.CHALLENGE_OPEN)) {
          if (res.isChallenging) {
            this._resolveChallengeDirect(res);
          }
          return;
        }
        this.sm.dispatch(EVENTS.CHALLENGE_VOTE, res);
      });

      socket.on("g-terminatePlayer", (res) => {
        const playerIdx = this.nameIndexMap[res.playerName];
        if (playerIdx === undefined) return;
        const player = this.players[playerIdx];
        if (!player || player.isDead) return;
        player.revealedInfluences = [
          ...player.revealedInfluences,
          ...player.influences,
        ];
        player.influences = [];
        player.isDead = true;
        this.aliveCount -= 1;
        this.gameSocket.emit("g-addLog", `${res.playerName} has left the game`);
        this.gameSocket.to(player.socketID).emit("g-terminated");
        this.updatePlayers();

        if (this.aliveCount <= 1) {
          const winner = this.players.find((p) => p.influences.length > 0);
          if (winner) {
            this.isPlayAgainOpen = true;
            this.gameSocket.emit("g-gameOver", winner.name);
            this.sm.transition(PHASES.GAME_OVER, { winner: winner.name });
          }
        } else if (playerIdx === this.currentPlayer) {
          this.sm.transition(PHASES.IDLE, {});
        }
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
        if (!this.sm.in(PHASES.REVEAL_PENDING)) return;
        this._resolveReveal(res);
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

      this._turnTimer = setTimeout(() => {
        this.onTurnTimeout(playerName);
      }, timeoutMs);
    });

    sm.onExit(PHASES.ACTION_PENDING, (_ctx) => {
      clearTimeout(this._turnTimer);
      this.gameSocket.emit("g-closeTurnTimer");
    });

    // ── CHALLENGE_OPEN ──────────────────────────────
    sm.onEnter(PHASES.CHALLENGE_OPEN, (ctx) => {
      if (ctx.votes !== undefined) return; // vote increment re-entry — skip re-emit
      const timeoutMs = this.settings.challengeTimeLimit * 1000;

      this.gameSocket.emit("g-openChallenge", {
        action: ctx.action,
        timeLimit: timeoutMs,
      });

      const timer = setTimeout(() => {
        if (!sm.in(PHASES.CHALLENGE_OPEN)) return;
        if (ctx.isBlockable) {
          sm.transition(PHASES.BLOCK_OPEN, { action: ctx.action });
        } else {
          sm.transition(PHASES.IDLE, { pendingAction: ctx.action });
        }
      }, timeoutMs);

      sm.transition(PHASES.CHALLENGE_OPEN, {
        ...ctx,
        votes: 0,
        eligibleVoters: this.aliveCount - 1,
        challengeTimer: timer,
      });
    });

    sm.onExit(PHASES.CHALLENGE_OPEN, (ctx) => {
      clearTimeout(ctx.challengeTimer);
      this.gameSocket.emit("g-closeChallenge");
    });

    // ── BLOCK_OPEN ──────────────────────────────────
    sm.onEnter(PHASES.BLOCK_OPEN, (ctx) => {
      if (ctx.votes !== undefined) return;
      const timeoutMs = this.settings.challengeTimeLimit * 1000;
      const action = ctx.action;

      if (action.action === "foreign_aid") {
        this.gameSocket.emit("g-openBlock", { action, timeLimit: timeoutMs });
        sm.transition(PHASES.BLOCK_OPEN, {
          ...ctx,
          votes: 0,
          eligibleVoters: this.aliveCount - 1,
        });
      } else {
        //only the target can block (steal / assassinate)
        this.gameSocket
          .to(this.nameSocketMap[action.target])
          .emit("g-openBlock", { action, timeLimit: timeoutMs });
        sm.transition(PHASES.BLOCK_OPEN, {
          ...ctx,
          votes: 0,
          eligibleVoters: 1,
        });
      }

      const timer = setTimeout(() => {
        if (!sm.in(PHASES.BLOCK_OPEN)) return;
        sm.transition(PHASES.IDLE, { pendingAction: ctx.action });
      }, timeoutMs);

      sm.transition(PHASES.BLOCK_OPEN, {
        ...sm.getContext(),
        blockTimer: timer,
      });
    });

    sm.onExit(PHASES.BLOCK_OPEN, (ctx) => {
      clearTimeout(ctx.blockTimer);
      this.gameSocket.emit("g-closeBlock");
    });

    // ── BLOCK_CHALLENGE_OPEN ────────────────────────
    sm.onEnter(PHASES.BLOCK_CHALLENGE_OPEN, (ctx) => {
      if (ctx.votes !== undefined) return;
      const timeoutMs = this.settings.challengeTimeLimit * 1000;

      this.gameSocket.emit("g-openBlockChallenge", {
        counterAction: ctx.counterAction,
        prevAction: ctx.prevAction,
        timeLimit: timeoutMs,
      });
      this.gameSocket.emit("g-addLog", `${ctx.blocker} blocked ${ctx.blockee}`);

      const timer = setTimeout(() => {
        if (!sm.in(PHASES.BLOCK_CHALLENGE_OPEN)) return;
        sm.transition(PHASES.IDLE, { pendingAction: null }); // block succeeded
      }, timeoutMs);

      sm.transition(PHASES.BLOCK_CHALLENGE_OPEN, {
        ...ctx,
        votes: 0,
        eligibleVoters: this.aliveCount - 1,
        blockChallengeTimer: timer,
      });
    });

    sm.onExit(PHASES.BLOCK_CHALLENGE_OPEN, (ctx) => {
      clearTimeout(ctx.blockChallengeTimer);
      this.gameSocket.emit("g-closeBlockChallenge");
    });

    // ── REVEAL_PENDING ──────────────────────────────
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
    sm.onEnter(PHASES.CHOOSE_INFLUENCE_PENDING, (ctx) => {
      this.gameSocket
        .to(this.nameSocketMap[ctx.playerName])
        .emit("g-chooseInfluence");
    });

    // ── EXCHANGE_PENDING ────────────────────────────
    sm.onEnter(PHASES.EXCHANGE_PENDING, (ctx) => {
      const timeoutMs = this.settings.exchangeTimeLimit * 1000;

      this.gameSocket
        .to(this.nameSocketMap[ctx.source])
        .emit("g-openExchange", {
          allInfluences: ctx.allInfluences,
          timeLimit: timeoutMs,
        });

      this._exchangeTimer = setTimeout(() => {
        if (!sm.in(PHASES.EXCHANGE_PENDING)) return;
        ctx.drawTwo.forEach((card) => this.deck.push(card));
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

    sm.onExit(PHASES.EXCHANGE_PENDING, (_ctx) => {
      clearTimeout(this._exchangeTimer);
    });

    // ── IDLE ────────────────────────────────────────
    // Called after every phase ends — decides what happens next
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
      const t = this._findPlayer(target);
      if (t.influences.length === 1) {
        t.revealedInfluences.push(t.influences[0]);
        t.influences = [];
        this.nextTurn();
      } else {
        this.sm.transition(PHASES.CHOOSE_INFLUENCE_PENDING, {
          playerName: target,
          pendingAction: null,
        });
      }
    } else if (execute === "assassinate") {
      const t = this._findPlayer(target);
      if (t.influences.length === 1) {
        t.revealedInfluences.push(t.influences[0]);
        t.influences = [];
        this.nextTurn();
      } else if (t.influences.length > 1) {
        this.sm.transition(PHASES.CHOOSE_INFLUENCE_PENDING, {
          playerName: target,
          pendingAction: null,
        });
      } else {
        // target already dead — skip influence loss
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

  // Called from onEnter(IDLE) after INFLUENCE_CHOSEN
  _afterInfluenceChosen(ctx) {
    const playerIndex = this.nameIndexMap[ctx.playerName];
    const player = this.players[playerIndex];

    this.gameSocket.emit(
      "g-addLog",
      `${ctx.playerName} lost their ${ctx.chosenInfluence}`
    );

    for (let i = 0; i < player.influences.length; i++) {
      if (player.influences[i] === ctx.chosenInfluence) {
        player.revealedInfluences.push(player.influences[i]);
        player.influences.splice(i, 1);
        break;
      }
    }

    // BUG-02: refund coins if assassination challenge succeeded
    if (ctx.refundAssassinate) {
      this._findPlayer(ctx.challengee).money += 3;
    }

    // BUG-03: if there's a pending action waiting, apply it now
    if (ctx.pendingAction) {
      this.applyAction(ctx.pendingAction);
    } else {
      this.nextTurn();
    }
  }

  // Direct challenge resolution used when state machine is not active (e.g. tests).
  // In normal play the sm handles CHALLENGE_OPEN → this path is never reached.
  _resolveChallengeDirect(res) {
    const claimedCard = this.actions[res.action?.action]?.influence;
    if (!claimedCard || claimedCard === "all") return;

    const challengeeIdx = this.nameIndexMap[res.challengee];
    const challengerIdx = this.nameIndexMap[res.challenger];
    const challengee = this.players[challengeeIdx];
    const challenger = this.players[challengerIdx];
    if (!challengee || !challenger) return;

    const challengeeHasCard = challengee.influences.includes(claimedCard);

    if (challengeeHasCard) {
      // Failed challenge — challenger loses an influence
      if (challenger.influences.length === 1) {
        const card = challenger.influences[0];
        challenger.revealedInfluences.push(card);
        challenger.influences = [];
        this.isChooseInfluenceOpen = false;
      } else {
        this.isChooseInfluenceOpen = true;
        this.pendingInfluencePlayerIndex = challengerIdx;
      }
    } else {
      // Successful challenge — challengee loses an influence
      if (challengee.influences.length === 1) {
        const card = challengee.influences[0];
        challengee.revealedInfluences.push(card);
        challengee.influences = [];
        this.isChooseInfluenceOpen = false;
      } else {
        this.isChooseInfluenceOpen = true;
        this.pendingInfluencePlayerIndex = challengeeIdx;
      }
    }
  }

  // Resolves a challenge after the challengee reveals a card.
  // Called directly from the g-revealDecision socket handler (replaces REVEAL_SUBMITTED dispatch).
  _resolveReveal(res) {
    const {
      revealedCard,
      challenger,
      challengee,
      isBlock,
      prevAction,
      counterAction,
    } = res;

    const challengerPlayer = this._findPlayer(challenger);
    const challengeePlayer = this._findPlayer(challengee);
    if (!challengerPlayer || !challengeePlayer) return;

    // Determine which card(s) would prove the claim
    let claimedCards;
    if (isBlock) {
      const blockActionName = counterAction?.counterAction;
      claimedCards = this.counterActions[blockActionName]?.influences || [];
    } else {
      const actionName = prevAction?.action;
      const influence = actionName ? this.actions[actionName]?.influence : null;
      claimedCards = influence && influence !== "all" ? [influence] : [];
    }

    const claimProven = claimedCards.includes(revealedCard);

    log(
      "_resolveReveal",
      `challengee=${challengee} revealedCard=${revealedCard} claimProven=${claimProven}`
    );
    this.gameSocket.emit(
      "g-addLog",
      `${challengee} revealed ${revealedCard} — ${claimProven ? "claim proven" : "bluff called"}`
    );

    if (claimProven) {
      // Challengee proved their card → replace their card with a fresh one from deck
      const cardIdx = challengeePlayer.influences.indexOf(revealedCard);
      if (cardIdx !== -1 && this.deck.length > 0) {
        this.deck.push(challengeePlayer.influences[cardIdx]);
        this.deck = gameUtils.shuffleArray(this.deck);
        challengeePlayer.influences[cardIdx] = this.deck.pop();
      }

      // Special case: assassination target challenged the assassin and lost.
      // The target faces both the failed-challenge penalty AND the assassination → lose all cards.
      const isAssassinTarget =
        !isBlock &&
        prevAction?.action === "assassinate" &&
        prevAction?.target === challenger;

      if (isAssassinTarget && challengerPlayer.influences.length > 0) {
        challengerPlayer.revealedInfluences.push(
          ...challengerPlayer.influences
        );
        challengerPlayer.influences = [];
        this.gameSocket.emit(
          "g-addLog",
          `${challenger} loses all influences (failed challenge + assassination)`
        );
        this.updatePlayers();
        this.nextTurn();
        return;
      }

      // Normal failed-challenge: challenger loses one influence
      // After that, the pending action (if any) still applies
      const pendingAction = isBlock ? null : prevAction;

      if (challengerPlayer.influences.length <= 1) {
        if (challengerPlayer.influences.length === 1) {
          challengerPlayer.revealedInfluences.push(
            challengerPlayer.influences[0]
          );
          challengerPlayer.influences = [];
        }
        this.updatePlayers();
        if (pendingAction) {
          this.sm.transition(PHASES.IDLE, { pendingAction });
        } else {
          this.sm.transition(PHASES.IDLE, {});
        }
      } else {
        this.sm.transition(PHASES.CHOOSE_INFLUENCE_PENDING, {
          playerName: challenger,
          pendingAction,
        });
      }
    } else {
      // Challengee was bluffing → challengee loses one influence
      // If it was a block that was bluffed: the original action still proceeds
      const pendingAction = isBlock ? prevAction : null;

      // Special case: assassination target bluffed the contessa block → loses all cards.
      const isAssassinTargetBlockBluff =
        isBlock &&
        prevAction?.action === "assassinate" &&
        prevAction?.target === challengee;

      if (
        isAssassinTargetBlockBluff &&
        challengeePlayer.influences.length > 0
      ) {
        challengeePlayer.revealedInfluences.push(
          ...challengeePlayer.influences
        );
        challengeePlayer.influences = [];
        this.gameSocket.emit(
          "g-addLog",
          `${challengee} loses all influences (failed contessa block + assassination)`
        );
        this.updatePlayers();
        this.nextTurn();
        return;
      }

      if (challengeePlayer.influences.length <= 1) {
        if (challengeePlayer.influences.length === 1) {
          challengeePlayer.revealedInfluences.push(
            challengeePlayer.influences[0]
          );
          challengeePlayer.influences = [];
        }
        this.updatePlayers();
        if (pendingAction) {
          this.sm.transition(PHASES.IDLE, { pendingAction });
        } else {
          this.sm.transition(PHASES.IDLE, {});
        }
      } else {
        this.sm.transition(PHASES.CHOOSE_INFLUENCE_PENDING, {
          playerName: challengee,
          pendingAction,
        });
      }
    }
  }

  // Called from onEnter(IDLE) after EXCHANGE_CHOSEN
  _afterExchangeChosen(ctx) {
    const playerIndex = this.nameIndexMap[ctx.source];
    this.players[playerIndex].influences = ctx.kept;
    ctx.putBack.forEach((card) => this.deck.push(card));
    this.deck = gameUtils.shuffleArray(this.deck);
    this.nextTurn();
  }
}

module.exports = CoupGame;
