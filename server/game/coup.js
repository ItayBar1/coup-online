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
    this.isChallengeBlockOpen = false;
    this.isRevealOpen = false;
    this.isChooseInfluenceOpen = false;
    this.isExchangeOpen = false;
    this.pendingInfluencePlayerIndex = null;
    this.votes = 0;
    // BUG-03: deferred action after a choose-influence phase
    this.pendingActionAfterInfluence = null;
    // Sequential challenge → block flow
    this.challengeTimer = null;
    this.blockTimer = null;
    this.blockChallengeTimer = null;
    this.pendingBlockAction = null;
    this.blockEligibleVoters = 0;
    // Turn timer
    this.turnTimer = null;
    this.isTurnOpen = false;
    // Exchange timer
    this.exchangeTimer = null;
    this.pendingExchange = null;
  }

  // ─────────────────────────────────────────
  // Block 2 — resetGame
  // ─────────────────────────────────────────
  resetGame(startingPlayer = 0) {
    this.currentPlayer = startingPlayer;
    this.isChallengeBlockOpen = false;
    this.isRevealOpen = false;
    this.isChooseInfluenceOpen = false;
    this.isExchangeOpen = false;
    this.pendingInfluencePlayerIndex = null;
    this.aliveCount = this.players.length;
    this.deck = gameUtils.buildDeck();

    for (let i = 0; i < this.players.length; i++) {
      this.players[i].money = 2;
      this.players[i].influences = [this.deck.pop(), this.deck.pop()];
      this.players[i].revealedInfluences = [];
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
          this.sm.dispatch(EVENTS.PLAY_AGAIN);
        }
      });

      socket.on("g-actionDecision", (res) => {
        log(
          "g-actionDecision",
          `source=${res.action?.source} action=${res.action?.action} target=${res.action?.target}`
        );
        this.sm.dispatch(EVENTS.ACTION_CHOSEN, { action: res.action });
      });

      socket.on("g-terminatePlayer", ({ playerName }) => {
        const playerIndex = bind.nameIndexMap[playerName];
        if (playerIndex === undefined) return;
        const player = bind.players[playerIndex];
        if (!player || player.isDead) return;

        bind.gameSocket.emit(
          "g-addLog",
          `${playerName} terminated their session and left the game`
        );
        bind.eliminatePlayer(playerIndex, "terminated");
        bind.updatePlayers();
        bind.gameSocket.to(bind.nameSocketMap[playerName]).emit("g-terminated");
        bind.nextTurn();
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

      socket.on("g-chooseInfluenceDecision", (res) => {
        log(
          "g-chooseInfluenceDecision",
          `player=${res.playerName} influence=${res.influence}`
        );
        // res.influence, res.playerName
        const playerIndex = bind.nameIndexMap[res.playerName];
        if (
          bind.isChooseInfluenceOpen &&
          bind.pendingInfluencePlayerIndex === playerIndex
        ) {
          bind.gameSocket.emit(
            "g-addLog",
            `${res.playerName} lost their ${res.influence}`
          );
          bind.loseInfluence(playerIndex, res.influence);
          bind.isChooseInfluenceOpen = false;
          bind.pendingInfluencePlayerIndex = null;

          // BUG-03: if there's a pending action (e.g. assassination after a failed challenge),
          // apply it now instead of ending the turn
          if (bind.pendingActionAfterInfluence) {
            const pendingAction = bind.pendingActionAfterInfluence;
            bind.pendingActionAfterInfluence = null;
            bind.applyAction(pendingAction);
          } else {
            bind.nextTurn();
          }
        }
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

  updatePlayers() {
    this.gameSocket.emit(
      "g-updatePlayers",
      gameUtils.exportPlayers(JSON.parse(JSON.stringify(this.players)))
    );
    this.gameSocket.emit("g-updateDeckCount", this.deck.length);
  }

  loseInfluence(playerIndex, revealedCard) {
    const player = this.players[playerIndex];
    if (!player || !revealedCard) return;

    const cardIndex = player.influences.findIndex(
      (card) => card == revealedCard
    );
    if (cardIndex < 0) return;

    this.deck.push(player.influences[cardIndex]);
    this.deck = gameUtils.shuffleArray(this.deck);
    player.influences.splice(cardIndex, 1);
    player.revealedInfluences = player.revealedInfluences || [];
    player.revealedInfluences.push(revealedCard);
  }

  replaceInfluenceWithTopDeck(playerIndex, revealedCard) {
    const player = this.players[playerIndex];
    if (!player) return false;
    const cardIndex = player.influences.findIndex(
      (card) => card == revealedCard
    );
    if (cardIndex < 0) return false;

    this.deck.push(player.influences[cardIndex]);
    this.deck = gameUtils.shuffleArray(this.deck);
    player.influences.splice(cardIndex, 1);
    player.influences.push(this.deck.pop());
    return true;
  }

  eliminatePlayer(playerIndex, reason = "eliminated") {
    const player = this.players[playerIndex];
    if (!player || player.isDead) return;
    const cardList = player.influences.join(", ") || "none";
    this.gameSocket.emit("g-addLog", `${player.name}'s cards: ${cardList}`);
    player.revealedInfluences = [
      ...(player.revealedInfluences || []),
      ...player.influences,
    ];
    player.influences.forEach((card) => this.deck.push(card));
    this.deck = gameUtils.shuffleArray(this.deck);
    player.influences = [];
    player.money = 0;
    player.isDead = true;
    this.aliveCount = Math.max(
      0,
      this.players.filter((p) => !p.isDead && p.influences.length > 0).length
    );

    if (reason === "terminated") {
      this.gameSocket.emit("g-addLog", `${player.name} is out!`);
    }
  }

  openInfluenceLoss(playerIndex) {
    const player = this.players[playerIndex];
    if (!player || player.isDead || player.influences.length === 0)
      return false;

    if (player.influences.length === 1) {
      const onlyCard = player.influences[0];
      this.gameSocket.emit("g-addLog", `${player.name} lost their ${onlyCard}`);
      this.loseInfluence(playerIndex, onlyCard);
      this.updatePlayers();
      return false;
    }

    this.isChooseInfluenceOpen = true;
    this.pendingInfluencePlayerIndex = playerIndex;
    this.gameSocket
      .to(this.nameSocketMap[player.name])
      .emit("g-chooseInfluence");
    return true;
  }

  resolveChallenge(action, counterAction, challengee, challenger, isBlock) {
    const challengeeIndex = this.nameIndexMap[challengee];
    const challengerIndex = this.nameIndexMap[challenger];
    if (challengeeIndex === undefined || challengerIndex === undefined) return;

    const claimedCards =
      isBlock && counterAction.counterAction === "block_steal"
        ? ["ambassador", "captain"]
        : [
            isBlock
              ? counterAction.claim
              : this.actions[action.action].influence,
          ];
    const foundCard = this.players[challengeeIndex].influences.find((card) =>
      claimedCards.includes(card)
    );

    if (foundCard) {
      const contextText = isBlock ? `${challengee}'s block` : challengee;
      this.gameSocket.emit(
        "g-addLog",
        `${challenger}'s challenge on ${contextText} failed`
      );
      this.replaceInfluenceWithTopDeck(challengeeIndex, foundCard);
      this.pendingActionAfterInfluence = isBlock ? null : action;
      this.updatePlayers();
      const needsChoice = this.openInfluenceLoss(challengerIndex);
      if (!needsChoice) {
        if (isBlock) {
          this.nextTurn();
        } else if (this.pendingActionAfterInfluence) {
          const pendingAction = this.pendingActionAfterInfluence;
          this.pendingActionAfterInfluence = null;
          this.applyAction(pendingAction);
        }
      }
      return;
    }

    const contextText = isBlock ? `${challengee}'s block` : challengee;
    this.gameSocket.emit(
      "g-addLog",
      `${challenger}'s challenge on ${contextText} succeeded`
    );
    const needsChoice = this.openInfluenceLoss(challengeeIndex);
    if (!needsChoice) {
      if (!isBlock && action.action === "assassinate") {
        this.players[challengeeIndex].money += 3;
      }
      if (isBlock) {
        this.applyAction(action);
      } else {
        this.nextTurn();
      }
    } else if (!isBlock && action.action === "assassinate") {
      this.players[challengeeIndex].money += 3;
    }
  }

  reveal(action, counterAction, challengee, challenger, isBlock) {
    log(
      "reveal",
      `challengee=${challengee} challenger=${challenger} isBlock=${isBlock}`
    );
    this.isRevealOpen = false;
    this.resolveChallenge(
      action,
      counterAction,
      challengee,
      challenger,
      isBlock
    );
  }

      this.gameSocket.emit("g-updateCurrentPlayer", {
        name: playerName,
        timeLimit: timeoutMs,
      });
      this.gameSocket
        .to(this.players[this.currentPlayer].socketID)
        .emit("g-chooseAction");

      const timer = setTimeout(() => {
        this.onTurnTimeout(playerName);
      }, timeoutMs);

      sm.transition(PHASES.ACTION_PENDING, { ...ctx, turnTimer: timer });
    });

    sm.onExit(PHASES.ACTION_PENDING, (ctx) => {
      clearTimeout(ctx.turnTimer);
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

      const timer = setTimeout(() => {
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

      sm.transition(PHASES.EXCHANGE_PENDING, { ...ctx, exchangeTimer: timer });
    });

    sm.onExit(PHASES.EXCHANGE_PENDING, (ctx) => {
      clearTimeout(ctx.exchangeTimer);
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
        // BUG-03: target already dead — skip influence loss
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
      this.eliminatePlayer(playerIndex);
      this.nextTurn();
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

    if (execute == "income") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += 1;
          break;
        }
      }
      this.nextTurn();
    } else if (execute == "foreign_aid") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += 2;
          break;
        }
      }
      this.nextTurn();
    } else if (execute == "coup") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == target) {
          this.openInfluenceLoss(i);
          break;
        }
      }
      // no nextTurn() — called from g-chooseInfluenceDecision
    } else if (execute == "tax") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += 3;
          break;
        }
      }
      this.nextTurn();
    } else if (execute == "assassinate") {
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == target) {
          if (this.players[i].influences.length <= 0) {
            this.nextTurn();
          } else {
            const needsChoice = this.openInfluenceLoss(i);
            if (!needsChoice) this.nextTurn();
          }
          break;
        }
      }
      // no nextTurn() — called from g-chooseInfluenceDecision (or above when already dead)
    } else if (execute == "exchange") {
      const sourceIndex = this.nameIndexMap[source];
      const originalInfluences = [...this.players[sourceIndex].influences];
      const drawTwo = [this.deck.pop(), this.deck.pop()];
      const allInfluences = [...originalInfluences, ...drawTwo];
      this.pendingExchange = { playerIndex: sourceIndex, drawTwo };
      const timeoutMs = this.settings.exchangeTimeLimit * 1000;
      this.isExchangeOpen = true;
      log(
        "applyAction",
        `exchange: sending ${allInfluences.length} combined cards [${allInfluences}] to ${source}`
      );
      this.gameSocket
        .to(this.nameSocketMap[source])
        .emit("g-openExchange", { allInfluences, timeLimit: timeoutMs });

      const bind = this;
      this.exchangeTimer = setTimeout(() => {
        if (!bind.isExchangeOpen) return;
        // Timeout: keep original cards, put back drawn cards
        log("exchangeTimeout", `player=${source} keeping original cards`);
        bind.isExchangeOpen = false;
        if (bind.pendingExchange) {
          bind.pendingExchange.drawTwo.forEach((card) => bind.deck.push(card));
          bind.deck = gameUtils.shuffleArray(bind.deck);
          bind.pendingExchange = null;
        }
        bind.gameSocket.to(bind.nameSocketMap[source]).emit("g-closeExchange");
        bind.gameSocket.emit(
          "g-addLog",
          `${source}'s exchange timed out — kept original cards`
        );
        bind.nextTurn();
      }, timeoutMs);
      // no nextTurn() — called from g-chooseExchangeDecision or exchange timeout
    } else if (execute == "steal") {
      let stolen = 0;
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == target) {
          if (this.players[i].money >= 2) {
            this.players[i].money -= 2;
            stolen = 2;
          } else if (this.players[i].money == 1) {
            this.players[i].money -= 1;
            stolen = 1;
          }
          break;
        }
      }
      for (let i = 0; i < this.players.length; i++) {
        if (this.players[i].name == source) {
          this.players[i].money += stolen;
          break;
        }
      }
      this.nextTurn();
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
        this.deck.push(player.influences[i]);
        this.deck = gameUtils.shuffleArray(this.deck);
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
