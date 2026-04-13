const gameUtils = require("./utils");
const constants = require("../utilities/constants");

const log = (tag, msg) =>
  console.log(`[COUP][${new Date().toISOString()}] ${tag} | ${msg}`);

class CoupGame {
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

  resetGame(startingPlayer = 0) {
    clearTimeout(this.challengeTimer);
    clearTimeout(this.blockTimer);
    clearTimeout(this.blockChallengeTimer);
    clearTimeout(this.turnTimer);
    clearTimeout(this.exchangeTimer);
    this.currentPlayer = startingPlayer;
    this.isChallengeBlockOpen = false;
    this.isRevealOpen = false;
    this.isChooseInfluenceOpen = false;
    this.isExchangeOpen = false;
    this.aliveCount = this.players.length;
    this.votes = 0;
    this.pendingActionAfterInfluence = null;
    this.challengeTimer = null;
    this.blockTimer = null;
    this.blockChallengeTimer = null;
    this.pendingBlockAction = null;
    this.blockEligibleVoters = 0;
    this.turnTimer = null;
    this.isTurnOpen = false;
    this.exchangeTimer = null;
    this.pendingExchange = null;
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
  }

  listen() {
    this.players.map((x) => {
      const socket = this.gameSocket.sockets[x.socketID];
      let bind = this;

      socket.on("g-playAgain", () => {
        if (bind.isPlayAgainOpen) {
          bind.isPlayAgainOpen = false;
          this.resetGame(Math.floor(Math.random() * this.players.length));
          this.updatePlayers();
          this.playTurn();
        }
      });

      // BUG-05: g-deductCoins removed — coin deduction now happens server-side in g-actionDecision

      socket.on("g-actionDecision", (res) => {
        log(
          "g-actionDecision",
          `source=${res.action?.source} action=${res.action?.action} target=${res.action?.target}`
        );

        // Guard: only accept action if turn is currently open
        if (!bind.isTurnOpen) return;

        // res.action.target, res.action.action, res.action.source
        const sourceIndex = bind.nameIndexMap[res.action.source];
        const player = bind.players[sourceIndex];

        // BUG-06: enforce forced Coup at 10+ coins (check before deduction)
        if (player.money >= 10 && res.action.action !== "coup") {
          console.log(
            `Rejected: ${res.action.source} has ${player.money} coins but chose ${res.action.action}`
          );
          return;
        }

        // Clear turn timer — player acted in time
        clearTimeout(bind.turnTimer);
        bind.turnTimer = null;
        bind.isTurnOpen = false;
        bind.players[sourceIndex].missedTurns = 0;
        bind.gameSocket.emit("g-closeTurnTimer");

        // BUG-05: deduct coins server-side with validation
        if (res.action.action === "coup") {
          if (player.money < 7) return;
          player.money -= 7;
          bind.updatePlayers();
        } else if (res.action.action === "assassinate") {
          if (player.money < 3) return;
          player.money -= 3;
          bind.updatePlayers();
        }

        if (bind.actions[res.action.action].isChallengeable) {
          bind.openChallenge(
            res.action,
            bind.actions[res.action.action].blockableBy.length > 0
          );
        } else if (res.action.action === "foreign_aid") {
          bind.openBlockPhase(res.action);
        } else {
          bind.applyAction(res.action);
        }
      });

      socket.on("g-challengeDecision", (res) => {
        log(
          "g-challengeDecision",
          `challenger=${res.challenger} challengee=${res.challengee} isChallenging=${res.isChallenging}`
        );
        // res.action, res.challengee, res.challenger, res.isChallenging
        if (!bind.isChallengeBlockOpen) return;

        if (res.isChallenging) {
          clearTimeout(bind.challengeTimer);
          bind.challengeTimer = null;
          bind.closeChallenge();
          bind.gameSocket.emit(
            "g-addLog",
            `${res.challenger} challenged ${res.challengee}`
          );
          bind.reveal(res.action, null, res.challengee, res.challenger, false);
        } else if (bind.votes + 1 >= bind.aliveCount - 1) {
          clearTimeout(bind.challengeTimer);
          bind.challengeTimer = null;
          const action = bind.pendingBlockAction;
          const isBlockable =
            bind.actions[action.action].blockableBy.length > 0;
          bind.closeChallenge();
          if (isBlockable) {
            bind.openBlockPhase(action);
          } else {
            bind.applyAction(action);
          }
        } else {
          bind.votes += 1;
        }
      });

      socket.on("g-blockChallengeDecision", (res) => {
        log(
          "g-blockChallengeDecision",
          `challenger=${res.challenger} challengee=${res.challengee} isChallenging=${res.isChallenging}`
        );
        // res.counterAction, res.prevAction, res.challengee, res.challenger, res.isChallenging
        if (!bind.isChallengeBlockOpen) return;

        if (res.isChallenging) {
          clearTimeout(bind.blockChallengeTimer);
          bind.blockChallengeTimer = null;
          bind.closeChallenge();
          bind.gameSocket.emit(
            "g-addLog",
            `${res.challenger} challenged ${res.challengee}'s block`
          );
          bind.reveal(
            res.prevAction,
            res.counterAction,
            res.challengee,
            res.challenger,
            true
          );
        } else if (bind.votes + 1 >= bind.aliveCount - 1) {
          clearTimeout(bind.blockChallengeTimer);
          bind.blockChallengeTimer = null;
          bind.closeChallenge();
          bind.nextTurn();
        } else {
          bind.votes += 1;
        }
      });

      socket.on("g-blockDecision", (res) => {
        log(
          "g-blockDecision",
          `blocker=${res.blocker} blockee=${res.blockee} isBlocking=${res.isBlocking}`
        );
        // res.prevAction, res.counterAction, res.blockee, res.blocker, res.isBlocking
        if (!bind.isChallengeBlockOpen) return;

        if (res.isBlocking) {
          clearTimeout(bind.blockTimer);
          bind.blockTimer = null;
          bind.closeChallenge();
          bind.gameSocket.emit(
            "g-addLog",
            `${res.blocker} blocked ${res.blockee}`
          );
          bind.openBlockChallenge(
            res.counterAction,
            res.blockee,
            res.prevAction
          );
        } else if (bind.votes + 1 >= bind.blockEligibleVoters) {
          clearTimeout(bind.blockTimer);
          bind.blockTimer = null;
          bind.closeChallenge();
          bind.applyAction(bind.pendingBlockAction);
        } else {
          bind.votes += 1;
        }
      });

      socket.on("g-revealDecision", (res) => {
        log(
          "g-revealDecision",
          `challengee=${res.challengee} challenger=${res.challenger} revealedCard=${res.revealedCard} isBlock=${res.isBlock}`
        );
        // res.revealedCard, prevAction, counterAction, challengee, challenger, isBlock
        const challengeeIndex = bind.nameIndexMap[res.challengee];
        const challengerIndex = bind.nameIndexMap[res.challenger];
        if (bind.isRevealOpen) {
          bind.isRevealOpen = false;
          if (res.isBlock) {
            // block challenge
            if (
              res.revealedCard == res.counterAction.claim ||
              (res.counterAction.counterAction == "block_steal" &&
                (res.revealedCard == "ambassador" ||
                  res.revealedCard == "captain"))
            ) {
              // challenge failed — block stands
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee}'s block failed`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  bind.players[challengeeIndex].influences.push(
                    bind.deck.pop()
                  );
                  break;
                }
              }
              bind.updatePlayers();
              bind.isChooseInfluenceOpen = true;
              bind.gameSocket
                .to(bind.nameSocketMap[res.challenger])
                .emit("g-chooseInfluence");
              bind.nextTurn();
            } else {
              // challenge succeeded — block fails, original action applies
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee}'s block succeeded`
              );
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challengee} lost their ${res.revealedCard}`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  break;
                }
              }
              bind.applyAction(res.prevAction);
            }
          } else {
            // normal challenge
            if (
              res.revealedCard == bind.actions[res.prevAction.action].influence
            ) {
              // challenge failed — action stands
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee} failed`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  bind.players[challengeeIndex].influences.push(
                    bind.deck.pop()
                  );
                  break;
                }
              }
              // BUG-03: defer the action so challenger first chooses their influence loss,
              // THEN the action executes (handles both double-loss and normal cases)
              bind.pendingActionAfterInfluence = res.prevAction;
              bind.updatePlayers();
              bind.isChooseInfluenceOpen = true;
              bind.gameSocket
                .to(bind.nameSocketMap[res.challenger])
                .emit("g-chooseInfluence");
            } else {
              // challenge succeeded — action fails
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challenger}'s challenge on ${res.challengee} succeeded`
              );
              bind.gameSocket.emit(
                "g-addLog",
                `${res.challengee} lost their ${res.revealedCard}`
              );
              for (
                let i = 0;
                i < bind.players[challengeeIndex].influences.length;
                i++
              ) {
                if (
                  bind.players[challengeeIndex].influences[i] ==
                  res.revealedCard
                ) {
                  bind.deck.push(bind.players[challengeeIndex].influences[i]);
                  bind.deck = gameUtils.shuffleArray(bind.deck);
                  bind.players[challengeeIndex].influences.splice(i, 1);
                  break;
                }
              }
              // BUG-02: return coins paid for assassination if the challenge succeeded
              if (res.prevAction.action === "assassinate") {
                bind.players[challengeeIndex].money += 3;
              }
              bind.nextTurn();
            }
          }
        }
      });

      socket.on("g-chooseInfluenceDecision", (res) => {
        log(
          "g-chooseInfluenceDecision",
          `player=${res.playerName} influence=${res.influence}`
        );
        // res.influence, res.playerName
        const playerIndex = bind.nameIndexMap[res.playerName];
        if (bind.isChooseInfluenceOpen) {
          bind.gameSocket.emit(
            "g-addLog",
            `${res.playerName} lost their ${res.influence}`
          );
          for (
            let i = 0;
            i < bind.players[playerIndex].influences.length;
            i++
          ) {
            if (bind.players[playerIndex].influences[i] == res.influence) {
              bind.deck.push(bind.players[playerIndex].influences[i]);
              bind.deck = gameUtils.shuffleArray(bind.deck);
              bind.players[playerIndex].influences.splice(i, 1);
              break;
            }
          }
          bind.isChooseInfluenceOpen = false;

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
        // res.playerName, res.kept, res.putBack = ["influence","influence"]
        const playerIndex = bind.nameIndexMap[res.playerName];
        if (bind.isExchangeOpen) {
          clearTimeout(bind.exchangeTimer);
          bind.exchangeTimer = null;
          bind.pendingExchange = null;
          bind.players[playerIndex].influences = res.kept;
          bind.deck.push(res.putBack[0]);
          bind.deck.push(res.putBack[1]);
          bind.deck = gameUtils.shuffleArray(bind.deck);
          bind.isExchangeOpen = false;
          bind.nextTurn();
        }
      });
    });
  }

  updatePlayers() {
    this.gameSocket.emit(
      "g-updatePlayers",
      gameUtils.exportPlayers(JSON.parse(JSON.stringify(this.players)))
    );
  }

  reveal(action, counterAction, challengee, challenger, isBlock) {
    const res = {
      action: action,
      counterAction: counterAction,
      challengee: challengee,
      challenger: challenger,
      isBlock: isBlock,
    };
    log(
      "reveal",
      `challengee=${res.challengee} challenger=${res.challenger} isBlock=${res.isBlock}`
    );
    this.isRevealOpen = true;
    this.gameSocket
      .to(this.nameSocketMap[res.challengee])
      .emit("g-chooseReveal", res);
  }

  closeChallenge() {
    clearTimeout(this.challengeTimer);
    clearTimeout(this.blockTimer);
    clearTimeout(this.blockChallengeTimer);
    this.challengeTimer = null;
    this.blockTimer = null;
    this.blockChallengeTimer = null;
    this.isChallengeBlockOpen = false;
    this.votes = 0;
    this.gameSocket.emit("g-closeChallenge");
    this.gameSocket.emit("g-closeBlock");
    this.gameSocket.emit("g-closeBlockChallenge");
  }

  // Phase 1: challenge window (challengeable actions only)
  openChallenge(action, isBlockable) {
    log(
      "openChallenge",
      `action=${action.action} source=${action.source} isBlockable=${isBlockable} aliveCount=${this.aliveCount}`
    );
    const timeoutMs = this.settings.challengeTimeLimit * 1000;
    this.isChallengeBlockOpen = true;
    this.pendingBlockAction = action;
    this.gameSocket.emit("g-openChallenge", { action, timeLimit: timeoutMs });

    const bind = this;
    this.challengeTimer = setTimeout(() => {
      if (bind.isChallengeBlockOpen) {
        bind.closeChallenge();
        if (isBlockable) {
          bind.openBlockPhase(action);
        } else {
          bind.applyAction(action);
        }
      }
    }, timeoutMs);
  }

  // Phase 2: block window (after challenge phase, or directly for foreign_aid)
  openBlockPhase(action) {
    log(
      "openBlockPhase",
      `action=${action.action} source=${action.source} target=${action.target}`
    );
    const timeoutMs = this.settings.challengeTimeLimit * 1000;
    this.isChallengeBlockOpen = true;
    this.votes = 0;
    this.pendingBlockAction = action;

    if (action.action === "foreign_aid") {
      this.blockEligibleVoters = this.aliveCount - 1;
      this.gameSocket.emit("g-openBlock", { action, timeLimit: timeoutMs });
    } else {
      // Only the target can block (steal / assassinate)
      this.blockEligibleVoters = 1;
      this.gameSocket
        .to(this.nameSocketMap[action.target])
        .emit("g-openBlock", { action, timeLimit: timeoutMs });
    }

    const bind = this;
    this.blockTimer = setTimeout(() => {
      if (bind.isChallengeBlockOpen) {
        bind.closeChallenge();
        bind.applyAction(action);
      }
    }, timeoutMs);
  }

  // Phase 3: challenge the block
  openBlockChallenge(counterAction, blockee, prevAction) {
    log(
      "openBlockChallenge",
      `counterAction=${counterAction.claim} blockee=${blockee}`
    );
    const timeoutMs = this.settings.challengeTimeLimit * 1000;
    this.isChallengeBlockOpen = true;
    this.votes = 0;
    this.gameSocket.emit("g-openBlockChallenge", {
      counterAction,
      prevAction,
      timeLimit: timeoutMs,
    });

    const bind = this;
    this.blockChallengeTimer = setTimeout(() => {
      if (bind.isChallengeBlockOpen) {
        bind.closeChallenge();
        bind.nextTurn(); // block succeeds, action fails
      }
    }, timeoutMs);
  }

  onTurnTimeout(playerName) {
    log("onTurnTimeout", `player=${playerName}`);
    this.isTurnOpen = false;
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
      // Return cards to deck
      player.influences.forEach((card) => {
        this.deck.push(card);
      });
      this.deck = gameUtils.shuffleArray(this.deck);
      player.influences = [];
      player.money = 0;
      this.nextTurn();
    } else {
      // First miss — award coin (max 10)
      player.missedTurns++;
      if (player.money < 10) {
        player.money++;
      }
      this.gameSocket.emit(
        "g-addLog",
        `${playerName} timed out — awarded 1 coin (${player.money} total)`
      );
      this.updatePlayers();
      this.nextTurn();
    }
  }

  applyAction(action) {
    log(
      "applyAction",
      `action=${action.action} source=${action.source} target=${action.target}`
    );
    let logTarget = "";

    if (action.target) {
      logTarget = ` on ${action.target}`;
    }
    this.gameSocket.emit(
      "g-addLog",
      `${action.source} used ${action.action}${logTarget}`
    );
    const execute = action.action;
    const target = action.target;
    const source = action.source;

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
          this.isChooseInfluenceOpen = true;
          this.gameSocket
            .to(this.nameSocketMap[target])
            .emit("g-chooseInfluence");
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
          // BUG-03: guard — target may already be dead (lost last influence on challenge)
          if (this.players[i].influences.length > 0) {
            this.isChooseInfluenceOpen = true;
            this.gameSocket
              .to(this.nameSocketMap[target])
              .emit("g-chooseInfluence");
          } else {
            this.nextTurn();
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
      log("applyAction", `ERROR: unknown action "${execute}"`);
    }
  }

  nextTurn() {
    log(
      "nextTurn",
      `guards: challengeBlock=${this.isChallengeBlockOpen} chooseInfluence=${this.isChooseInfluenceOpen} exchange=${this.isExchangeOpen} reveal=${this.isRevealOpen}`
    );
    if (
      !this.isChallengeBlockOpen &&
      !this.isChooseInfluenceOpen &&
      !this.isExchangeOpen &&
      !this.isRevealOpen
    ) {
      this.players.forEach((x) => {
        if (x.influences.length == 0 && !x.isDead) {
          this.gameSocket.emit("g-addLog", `${x.name} is out!`);
          this.aliveCount -= 1;
          x.isDead = true;
          x.money = 0;
        }
      });
      this.updatePlayers();
      if (this.aliveCount == 1) {
        let winner = null;
        for (let i = 0; i < this.players.length; i++) {
          if (this.players[i].influences.length > 0) {
            winner = this.players[i].name;
          }
        }
        this.isPlayAgainOpen = true;
        this.gameSocket.emit("g-gameOver", winner);
      } else {
        do {
          this.currentPlayer += 1;
          this.currentPlayer %= this.players.length;
        } while (this.players[this.currentPlayer].isDead == true);
        this.playTurn();
      }
    }
  }

  playTurn() {
    log(
      "playTurn",
      `player=${this.players[this.currentPlayer].name} index=${this.currentPlayer}`
    );
    const timeoutMs = this.settings.turnTimeLimit * 1000;
    this.isTurnOpen = true;
    this.gameSocket.emit("g-updateCurrentPlayer", {
      name: this.players[this.currentPlayer].name,
      timeLimit: timeoutMs,
    });
    this.gameSocket
      .to(this.players[this.currentPlayer].socketID)
      .emit("g-chooseAction");

    const bind = this;
    const playerName = this.players[this.currentPlayer].name;
    this.turnTimer = setTimeout(() => {
      bind.onTurnTimeout(playerName);
    }, timeoutMs);
  }

  start() {
    this.resetGame();
    this.listen();
    this.updatePlayers();
    log(
      "start",
      `Game started with ${this.players.length} players: [${this.players.map((p) => p.name).join(", ")}]`
    );
    this.playTurn();
  }
}

module.exports = CoupGame;
