import React, { Component } from "react";
import logger from "../../utils/logger";
import ActionDecision from "./ActionDecision";
import ChallengeDecision from "./ChallengeDecision";
import BlockChallengeDecision from "./BlockChallengeDecision";
import PlayerBoard from "./PlayerBoard";
import RevealDecision from "./RevealDecision";
import BlockDecision from "./BlockDecision";
import ChooseInfluence from "./ChooseInfluence";
import ExchangeInfluences from "./ExchangeInfluences";
import "../../styles/sovereign-ledger.css";
import SideNav from "./SideNav";
import GameStatusHeader from "./GameStatusHeader";
import CentralDeck from "./CentralDeck";
import PlayerHand from "./PlayerHand";
import DossierPanel from "./DossierPanel";
import LogsPanel from "./LogsPanel";
import IntelPanel from "./IntelPanel";
import CoinAnimation from "./CoinAnimation";

export default class Coup extends Component {
  constructor(props) {
    super(props);

    this.countdownInterval = null;

    this.state = {
      action: null,
      blockChallengeRes: null,
      players: [],
      playerIndex: null,
      currentPlayer: "",
      isChooseAction: false,
      revealingRes: null,
      blockingAction: null,
      isChoosingInfluence: false,
      exchangeInfluence: null,
      error: "",
      winner: "",
      playAgain: null,
      logs: [],
      isDead: false,
      waiting: true,
      disconnected: false,
      secondsLeft: null,
      sideNavTab: "command",
      coinAnims: [],
      glitchActive: false,
    };
    const bind = this;

    this.playAgainButton = (
      <>
        <br></br>
        <button
          className="startGameButton"
          onClick={() => {
            this.props.socket.emit("g-playAgain");
          }}
        >
          Play Again
        </button>
      </>
    );

    this.props.socket.on("disconnect", (reason) => {
      logger.socket.disconnected(reason);
      this.setState({ disconnected: true });
    });

    this.props.socket.on("g-gameOver", (winner) => {
      logger.info("Game over", { winner });
      bind.setState({ winner: `${winner} Wins!` });
      bind.setState({ playAgain: bind.playAgainButton });
    });
    this.props.socket.on("g-updatePlayers", (players) => {
      logger.info("Players updated", { count: players.length });
      bind.setState({ playAgain: null });
      bind.setState({ winner: null });
      players = players.filter((x) => !x.isDead);
      let playerIndex = null;
      for (let i = 0; i < players.length; i++) {
        if (players[i].name === this.props.name) {
          playerIndex = i;
          break;
        }
      }
      if (playerIndex == null) {
        this.setState({ isDead: true });
      } else {
        this.setState({ isDead: false });
      }
      logger.debug("Player index resolved", {
        playerIndex,
        isDead: playerIndex == null,
      });
      bind.setState({ playerIndex, players });
    });
    this.props.socket.on("g-updateCurrentPlayer", ({ name, timeLimit }) => {
      logger.info("Current player updated", { name, timeLimit });
      bind.setState({ currentPlayer: name });
      if (timeLimit > 0) {
        bind.startCountdown(timeLimit);
      }
    });
    this.props.socket.on("g-closeTurnTimer", () => {
      logger.debug("Turn timer closed");
      bind.stopCountdown();
    });
    this.props.socket.on("g-addLog", (log) => {
      bind.triggerCoinAnimation(log);
      let splitLog = log.split(" ");
      let coloredLog = [];
      coloredLog = splitLog.map((item, index) => {
        let found = null;
        bind.state.players.forEach((player) => {
          if (item === player.name) {
            found = <b style={{ color: player.color }}>{player.name} </b>;
          }
        });
        if (found) {
          return found;
        }
        return <>{item + " "}</>;
      });
      bind.state.logs = [...bind.state.logs, coloredLog];
      bind.setState({ logs: bind.state.logs });
    });
    this.props.socket.on("g-chooseAction", () => {
      logger.info("My turn — choose action");
      bind.setState({ isChooseAction: true });
    });
    this.props.socket.on("g-openExchange", ({ allInfluences, timeLimit }) => {
      logger.info("Exchange opened", {
        influenceCount: allInfluences?.length,
        timeLimit,
      });
      bind.setState({ exchangeInfluence: allInfluences });
      bind.startCountdown(timeLimit);
    });
    this.props.socket.on("g-closeExchange", () => {
      logger.debug("Exchange closed");
      bind.setState({ exchangeInfluence: null });
      bind.stopCountdown();
    });

    // Sequential challenge phase — server sends { action, timeLimit }
    this.props.socket.on("g-openChallenge", ({ action, timeLimit }) => {
      logger.info("Challenge opened", {
        source: action?.source,
        type: action?.action,
        timeLimit,
      });
      if (this.state.isDead) return;
      if (action.source !== bind.props.name) {
        bind.setState({ action });
        bind.startCountdown(timeLimit);
        bind.setState({ glitchActive: true });
        setTimeout(() => bind.setState({ glitchActive: false }), 600);
      }
    });

    // Block challenge phase — server sends { counterAction, prevAction, timeLimit }
    this.props.socket.on(
      "g-openBlockChallenge",
      ({ counterAction, prevAction, timeLimit }) => {
        logger.info("Block-challenge opened", {
          source: counterAction?.source,
          timeLimit,
        });
        if (this.state.isDead) return;
        if (counterAction.source !== bind.props.name) {
          bind.setState({ blockChallengeRes: { counterAction, prevAction } });
          bind.startCountdown(timeLimit);
        }
      }
    );

    // Block phase — server sends { action, timeLimit }
    // For steal/assassinate: only the target receives this event.
    // For foreign_aid: all players except source receive it.
    this.props.socket.on("g-openBlock", ({ action, timeLimit }) => {
      logger.info("Block phase opened", {
        source: action?.source,
        type: action?.action,
        timeLimit,
      });
      if (this.state.isDead) return;
      if (action.source !== bind.props.name) {
        bind.setState({ blockingAction: action });
        bind.startCountdown(timeLimit);
      }
    });

    this.props.socket.on("g-chooseReveal", (res) => {
      logger.info("Must reveal influence", { res });
      bind.setState({ revealingRes: res });
    });
    this.props.socket.on("g-chooseInfluence", () => {
      logger.info("Must choose influence to lose");
      bind.setState({ isChoosingInfluence: true });
    });
    this.props.socket.on("g-closeChallenge", () => {
      logger.debug("Challenge closed");
      bind.setState({ action: null });
      bind.stopCountdown();
    });
    this.props.socket.on("g-closeBlock", () => {
      logger.debug("Block phase closed");
      bind.setState({ blockingAction: null });
      bind.stopCountdown();
    });
    this.props.socket.on("g-closeBlockChallenge", () => {
      logger.debug("Block-challenge closed");
      bind.setState({ blockChallengeRes: null });
      bind.stopCountdown();
    });
  }

  componentWillUnmount() {
    clearInterval(this.countdownInterval);
  }

  startCountdown = (timeLimit) => {
    clearInterval(this.countdownInterval);
    const endTime = Date.now() + timeLimit;
    this.setState({ secondsLeft: Math.ceil(timeLimit / 1000) });
    this.countdownInterval = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.setState({ secondsLeft: 0 });
      } else {
        this.setState({ secondsLeft: remaining });
      }
    }, 500);
  };

  stopCountdown = () => {
    clearInterval(this.countdownInterval);
    this.countdownInterval = null;
    this.setState({ secondsLeft: null });
  };

  doneAction = () => {
    this.setState({ isChooseAction: false });
  };

  doneChallengeBlockingVote = () => {
    this.setState({ action: null });
    this.setState({ blockChallengeRes: null });
    this.setState({ blockingAction: null });
    this.stopCountdown();
  };

  closeOtherVotes = (voteType) => {
    if (voteType === "challenge") {
      this.setState({ blockChallengeRes: null });
      this.setState({ blockingAction: null });
    } else if (voteType === "block") {
      this.setState({ action: null });
      this.setState({ blockChallengeRes: null });
    } else if (voteType === "challenge-block") {
      this.setState({ action: null });
      this.setState({ blockingAction: null });
    }
    this.stopCountdown();
  };

  doneReveal = () => {
    this.setState({ revealingRes: null });
  };

  doneChooseInfluence = () => {
    this.setState({ isChoosingInfluence: false });
  };

  doneExchangeInfluence = () => {
    this.setState({ exchangeInfluence: null });
  };

  pass = () => {
    if (this.state.action != null) {
      //challengeDecision
      const res = {
        isChallenging: false,
        action: this.state.action,
      };
      logger.debug("Emit g-challengeDecision (pass)", { res });
      this.props.socket.emit("g-challengeDecision", res);
    } else if (this.state.blockChallengeRes != null) {
      //BlockChallengeDecision
      const res = {
        isChallenging: false,
      };
      logger.debug("Emit g-blockChallengeDecision (pass)", { res });
      this.props.socket.emit("g-blockChallengeDecision", res);
    } else if (this.state.blockingAction !== null) {
      //BlockDecision
      const res = {
        action: this.state.blockingAction,
        isBlocking: false,
      };
      logger.debug("Emit g-blockDecision (pass)", { res });
      this.props.socket.emit("g-blockDecision", res);
    }
    this.doneChallengeBlockingVote();
  };

  getElementCenter = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  getPlayerAnchor = (playerName) => {
    const playerId = `coup-player-${encodeURIComponent(playerName)}`;
    return this.getElementCenter(playerId);
  };

  triggerCoinAnimation = (log) => {
    const match = log.match(
      /^(.+) used (income|tax|foreign_aid|steal)(?: on (.+))?$/
    );
    if (!match) return;
    const [, source, action, target] = match;

    const treasury = this.getElementCenter("coup-treasury-area") || {
      x: window.innerWidth * 0.65,
      y: 120,
    };
    const boardCenter = this.getElementCenter("coup-board-area") || {
      x: window.innerWidth * 0.6,
      y: window.innerHeight * 0.38,
    };
    const sourcePos = this.getPlayerAnchor(source) || boardCenter;
    const targetPos = target
      ? this.getPlayerAnchor(target) || boardCenter
      : null;

    const coinCountByAction = {
      income: 1,
      foreign_aid: 2,
      tax: 3,
    };

    let start = treasury;
    let end = sourcePos;
    let coinCount = coinCountByAction[action] ?? 0;

    if (action === "steal") {
      if (!targetPos) return;
      const targetPlayer = this.state.players.find(
        (player) => player.name === target
      );
      coinCount = Math.min(2, targetPlayer?.money ?? 0);
      if (coinCount <= 0) return;
      start = targetPos;
      end = sourcePos;
    }

    const now = Date.now();
    this.setState((prev) => ({
      coinAnims: [
        ...prev.coinAnims,
        ...Array.from({ length: coinCount }).map((_, index) => ({
          id: `${now}-${index}-${Math.random()}`,
          sx: start.x + (index - (coinCount - 1) / 2) * 8,
          sy: start.y - index * 6,
          ex: end.x + (index - (coinCount - 1) / 2) * 8,
          ey: end.y,
          delay: index * 120,
        })),
      ],
    }));
  };

  removeCoinAnim = (id) => {
    this.setState((prev) => ({
      coinAnims: prev.coinAnims.filter((a) => a.id !== id),
    }));
  };

  render() {
    const {
      players,
      playerIndex,
      isDead,
      isChooseAction,
      action,
      blockChallengeRes,
      blockingAction,
      revealingRes,
      isChoosingInfluence,
      exchangeInfluence,
      currentPlayer,
      winner,
      playAgain,
      logs,
      secondsLeft,
      sideNavTab,
      disconnected,
      coinAnims,
      glitchActive,
    } = this.state;

    const myPlayer = playerIndex != null ? players[playerIndex] : null;
    const opponents = players.filter((p) => p.name !== this.props.name);
    const hasVote =
      action != null || blockChallengeRes != null || blockingAction !== null;
    const hasOverlay =
      hasVote || !!revealingRes || isChoosingInfluence || !!exchangeInfluence;

    // ── Disconnected ──────────────────────────────────────────────────────
    if (disconnected) {
      return (
        <div className="dark min-h-screen bg-surface text-on-background font-body flex items-center justify-center">
          <div className="grain-overlay fixed inset-0 pointer-events-none" />
          <div className="bg-surface-container border border-outline-variant/30 p-12 text-center max-w-md">
            <span className="material-symbols-outlined text-5xl text-error block mb-4">
              wifi_off
            </span>
            <h2 className="font-headline text-2xl text-on-surface tracking-tighter mb-2">
              CONNECTION LOST
            </h2>
            <p className="font-body text-sm text-outline">
              Please recreate the game.
            </p>
          </div>
        </div>
      );
    }

    // ── Main game layout ──────────────────────────────────────────────────
    return (
      <div className="dark bg-surface text-on-background font-body flex flex-col h-screen overflow-hidden">
        {/* Grain overlay (top layer, pointer-events-none) */}
        <div className="grain-overlay fixed inset-0 z-[90] pointer-events-none" />

        {/* Challenge glitch effect */}
        {glitchActive && (
          <div
            className="fixed inset-0 z-[89] pointer-events-none animate-glitch"
            style={{
              background: "rgba(154,26,26,0.08)",
              mixBlendMode: "screen",
            }}
          />
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="bg-[#1a1208]/90 backdrop-blur-md sticky top-0 z-50 h-16 flex items-center justify-between px-8 border-b border-[#59413e]/15 shrink-0">
          <h1 className="font-headline font-bold uppercase tracking-widest text-[#f5edd8] text-xl">
            THE SOVEREIGN LEDGER
          </h1>
          {winner && (
            <span className="font-label text-sm text-primary tracking-widest">
              {winner}
            </span>
          )}
        </header>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* SideNav */}
          <SideNav
            name={this.props.name}
            activeTab={sideNavTab}
            onTabChange={(tab) => this.setState({ sideNavTab: tab })}
          />

          {/* Content area */}
          <div className="ml-64 [@media(max-height:500px)]:ml-14 flex-1 flex flex-col overflow-hidden">
            {/* Game status header (shown in all tabs) */}
            <div
              id="coup-treasury-area"
              className="px-8 pt-6 [@media(max-height:500px)]:pt-2 shrink-0"
            >
              <GameStatusHeader
                currentPlayer={currentPlayer}
                myName={this.props.name}
                winner={winner}
                secondsLeft={isDead ? null : secondsLeft}
              />
            </div>

            {/* ── COMMAND tab ─────────────────────────────────── */}
            {sideNavTab === "command" && (
              <div
                id="coup-board-area"
                className="flex-1 relative overflow-hidden"
              >
                {/* Spatial board: opponents + deck + hand */}
                <PlayerBoard
                  players={opponents}
                  currentPlayer={currentPlayer}
                />
                <CentralDeck />
                <div id="coup-hand-area" style={{ display: "contents" }}>
                  {myPlayer && <PlayerHand influences={myPlayer.influences} />}
                </div>

                {/* Waiting indicator */}
                {!hasOverlay && !isDead && !isChooseAction && (
                  <div className="absolute bottom-32 inset-x-0 flex justify-center pointer-events-none">
                    <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline/40">
                      MONITORING OPERATIONS...
                    </span>
                  </div>
                )}

                {/* Dead overlay */}
                {isDead && (
                  <div className="fixed inset-0 z-30 bg-surface/70 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="font-label text-sm tracking-widest text-error/60 uppercase">
                        OPERATIVE ELIMINATED
                      </p>
                      <p className="font-label text-[10px] text-outline mt-2">
                        Observing remaining operatives...
                      </p>
                    </div>
                  </div>
                )}

                {/* Vote decision overlay (challenge / block / block-challenge) */}
                {hasVote && !isDead && (
                  <div className="fixed inset-0 z-30 bg-surface/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-surface-container border border-outline-variant/30 p-6 w-full max-w-md mx-4 space-y-3">
                      {/* Countdown */}
                      {secondsLeft !== null && (
                        <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/20">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${secondsLeft <= 5 ? "bg-error animate-pulse" : "bg-outline/50"}`}
                          />
                          <span className="font-label text-[10px] tracking-widest text-outline uppercase">
                            Auto-pass in{" "}
                            <span
                              className={
                                secondsLeft <= 5
                                  ? "text-error"
                                  : "text-on-surface"
                              }
                            >
                              {secondsLeft}s
                            </span>
                          </span>
                        </div>
                      )}
                      {action != null && (
                        <ChallengeDecision
                          closeOtherVotes={this.closeOtherVotes}
                          doneChallengeVote={this.doneChallengeBlockingVote}
                          name={this.props.name}
                          action={action}
                          socket={this.props.socket}
                        />
                      )}
                      {blockChallengeRes != null && (
                        <BlockChallengeDecision
                          closeOtherVotes={this.closeOtherVotes}
                          doneBlockChallengeVote={
                            this.doneChallengeBlockingVote
                          }
                          name={this.props.name}
                          prevAction={blockChallengeRes.prevAction}
                          counterAction={blockChallengeRes.counterAction}
                          socket={this.props.socket}
                        />
                      )}
                      {blockingAction !== null && (
                        <BlockDecision
                          closeOtherVotes={this.closeOtherVotes}
                          doneBlockVote={this.doneChallengeBlockingVote}
                          name={this.props.name}
                          action={blockingAction}
                          socket={this.props.socket}
                        />
                      )}
                      <button
                        className="w-full border border-outline-variant/30 bg-surface-container-low py-2 font-label text-xs tracking-widest text-outline hover:text-on-surface hover:bg-surface-container transition-all"
                        onClick={this.pass}
                      >
                        PASS
                      </button>
                    </div>
                  </div>
                )}

                {/* Reveal decision overlay */}
                {revealingRes && !isDead && (
                  <div className="fixed inset-0 z-30 bg-surface/50 backdrop-blur-sm flex items-center justify-center">
                    <RevealDecision
                      doneReveal={this.doneReveal}
                      name={this.props.name}
                      socket={this.props.socket}
                      res={revealingRes}
                      influences={
                        players.filter((x) => x.name === this.props.name)[0]
                          ?.influences || []
                      }
                    />
                  </div>
                )}

                {/* Choose influence overlay */}
                {isChoosingInfluence && !isDead && (
                  <div className="fixed inset-0 z-30 bg-surface/50 backdrop-blur-sm flex items-center justify-center">
                    <ChooseInfluence
                      doneChooseInfluence={this.doneChooseInfluence}
                      name={this.props.name}
                      socket={this.props.socket}
                      influences={
                        players.filter((x) => x.name === this.props.name)[0]
                          ?.influences || []
                      }
                    />
                  </div>
                )}

                {/* Exchange overlay */}
                {exchangeInfluence && !isDead && (
                  <div className="fixed inset-0 z-30 bg-surface/50 backdrop-blur-sm flex items-center justify-center">
                    <ExchangeInfluences
                      doneExchangeInfluence={this.doneExchangeInfluence}
                      name={this.props.name}
                      influences={exchangeInfluence}
                      socket={this.props.socket}
                      secondsLeft={secondsLeft}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── LOGS tab ────────────────────────────────────── */}
            {sideNavTab === "logs" && <LogsPanel logs={logs} />}

            {/* ── DOSSIER tab ──────────────────────────────────── */}
            {sideNavTab === "dossier" && <DossierPanel />}

            {/* ── INTEL tab ────────────────────────────────────── */}
            {sideNavTab === "intel" && <IntelPanel />}
          </div>
        </div>

        {/* ── Action bar (fixed bottom, command tab, alive) ───────── */}
        {sideNavTab === "command" && !isDead && (
          <ActionDecision
            doneAction={this.doneAction}
            name={this.props.name}
            socket={this.props.socket}
            money={myPlayer ? myPlayer.money : 0}
            players={players}
            isActive={isChooseAction && playerIndex != null}
          />
        )}

        {/* ── Play again ─────────────────────────────────────────── */}
        {playAgain && (
          <div className="fixed bottom-28 inset-x-0 flex justify-center z-40 pointer-events-none">
            <button
              className="border border-tertiary bg-tertiary/10 hover:bg-tertiary/20 px-12 py-3 font-label text-sm tracking-[0.3em] text-tertiary transition-all pointer-events-auto"
              onClick={() => this.props.socket.emit("g-playAgain")}
            >
              INITIATE NEW PROTOCOL
            </button>
          </div>
        )}

        {/* ── Coin animations ────────────────────────────────────── */}
        {coinAnims.map((anim) => (
          <CoinAnimation
            key={anim.id}
            startX={anim.sx}
            startY={anim.sy}
            endX={anim.ex}
            endY={anim.ey}
            delay={anim.delay}
            onDone={() => this.removeCoinAnim(anim.id)}
          />
        ))}
      </div>
    );
  }
}
