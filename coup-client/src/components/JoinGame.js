import React, { Component } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import Coup from "./game/Coup";
import LandingBackground from "./shared/LandingBackground";
import logger from "../utils/logger";

import axios from "axios";
const baseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export default class JoinGame extends Component {
  constructor(props) {
    super(props);

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code") || "";

    this.state = {
      name: "",
      roomCode: codeFromUrl,
      players: [],
      isInRoom: false,
      isReady: false,
      isLoading: false,
      isError: false,
      isGameStarted: false,
      errorMsg: "",
      socket: null,
      settings: {
        maxPlayers: 6,
        turnTimeLimit: 30,
        challengeTimeLimit: 10,
        exchangeTimeLimit: 30,
      },
    };
  }

  onNameChange = (name) => {
    this.setState({ name });
  };

  onCodeChange = (roomCode) => {
    this.setState({ roomCode });
  };

  joinParty = () => {
    const bind = this;
    const socket = io(`${baseUrl}/${this.state.roomCode}`);
    this.setState({ socket });
    logger.socket.connected(`/${this.state.roomCode}`);
    socket.emit("setName", this.state.name);

    socket.on("joinSuccess", function () {
      logger.info("Join successful", { component: "JoinGame" });
      bind.setState({ isInRoom: true, isLoading: false });
    });

    socket.on("joinFailed", function (err) {
      logger.warn("Join failed", { component: "JoinGame", cause: err });
      bind.setState({
        errorMsg: err,
        isError: true,
        isLoading: false,
      });
      socket.disconnect();
    });

    socket.on("startGame", () => {
      this.setState({ isGameStarted: true });
    });

    socket.on("settingsUpdate", (settings) => {
      bind.setState({ settings });
    });

    socket.on("partyUpdate", (players) => {
      logger.debug("Party update received", {
        component: "JoinGame",
        count: players.length,
      });
      this.setState({ players });
      if (
        players.length >= 3 &&
        players.map((x) => x.isReady).filter((x) => x === true).length ===
          players.length
      ) {
        this.setState({ canStart: true });
      } else {
        this.setState({ canStart: false });
      }
    });

    socket.on("disconnected", function () {
      logger.socket.disconnected("server_disconnect");
    });
  };

  attemptJoinParty = () => {
    if (this.state.name === "") {
      this.setState({ errorMsg: "Please enter a name", isError: true });
      return;
    }
    if (this.state.roomCode === "") {
      this.setState({ errorMsg: "Please enter a room code", isError: true });
      return;
    }

    this.setState({ isLoading: true });
    const bind = this;
    axios
      .get(`${baseUrl}/exists/${this.state.roomCode}`)
      .then(function (res) {
        if (res.data.exists) {
          bind.setState({ errorMsg: "" });
          bind.joinParty();
        } else {
          bind.setState({
            isLoading: false,
            errorMsg: "Invalid Party Code",
            isError: true,
          });
        }
      })
      .catch(function (err) {
        logger.error("Server error checking room", {
          component: "JoinGame",
          error: err?.message ?? String(err),
        });
        bind.setState({
          isLoading: false,
          errorMsg: "Server error",
          isError: true,
        });
      });
  };

  reportReady = () => {
    this.state.socket.emit("setReady", true);
    this.state.socket.on("readyConfirm", () => {
      this.setState({ isReady: true });
    });
  };

  render() {
    if (this.state.isGameStarted) {
      return <Coup name={this.state.name} socket={this.state.socket} />;
    }

    return (
      <div className="dark min-h-screen bg-surface flex flex-col overflow-hidden">
        <LandingBackground dimmed={true} />

        {/* Header */}
        <header className="bg-[#1a1208]/90 backdrop-blur-xl border-b border-[#a88a86]/10 fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4">
          <div className="text-xl font-bold tracking-[0.2em] text-[#f5edd8] font-headline uppercase">
            THE SOVEREIGN LEDGER
          </div>
          <Link
            to="/"
            className="font-label text-xs tracking-widest text-outline hover:text-primary transition-colors uppercase"
          >
            ← TERMINAL
          </Link>
        </header>

        {/* Modal Panel */}
        <div className="relative z-40 flex-grow flex items-center justify-center pt-24 pb-8 px-4">
          <div className="w-full max-w-md bg-surface-container/80 backdrop-blur-xl border border-outline-variant p-8 space-y-6">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-grow bg-outline-variant/50"></div>
              <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline">
                ACCESS TERMINAL
              </span>
              <div className="h-[1px] flex-grow bg-outline-variant/50"></div>
            </div>

            {/* Name Input */}
            <div>
              <label className="font-label text-[10px] tracking-widest uppercase text-outline block mb-2">
                OPERATOR DESIGNATION
              </label>
              <input
                type="text"
                value={this.state.name}
                disabled={this.state.isLoading}
                placeholder="Enter name..."
                className="w-full bg-surface border border-outline-variant text-on-surface font-label text-sm px-4 py-3 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                onChange={(e) => {
                  if (e.target.value.length <= 8) {
                    this.setState({ errorMsg: "", isError: false });
                    this.onNameChange(e.target.value);
                  } else {
                    this.setState({
                      errorMsg: "Name must be less than 9 characters",
                      isError: true,
                    });
                  }
                }}
              />
            </div>

            {/* Room Code Input */}
            <div>
              <label className="font-label text-[10px] tracking-widest uppercase text-outline block mb-2">
                ACCESS CODE
              </label>
              <input
                type="text"
                value={this.state.roomCode}
                disabled={this.state.isLoading || this.state.isInRoom}
                placeholder="Enter 6-digit code..."
                className="w-full bg-surface border border-outline-variant text-on-surface font-label text-sm px-4 py-3 focus:border-primary focus:outline-none transition-colors uppercase tracking-widest disabled:opacity-50"
                onChange={(e) => this.onCodeChange(e.target.value)}
              />
            </div>

            {/* Error */}
            {this.state.isError && (
              <p className="font-label text-xs text-error tracking-widest">
                {this.state.errorMsg}
              </p>
            )}

            {/* Join / Ready Button */}
            {!this.state.isReady && (
              <button
                className="w-full border border-primary bg-primary-container/20 hover:bg-primary-container py-3 font-label text-sm tracking-[0.3em] font-bold text-on-primary-container transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={
                  this.state.isInRoom ? this.reportReady : this.attemptJoinParty
                }
                disabled={this.state.isLoading}
              >
                {this.state.isLoading
                  ? "CONNECTING..."
                  : this.state.isInRoom
                    ? "CONFIRM READY"
                    : "JOIN GAME"}
              </button>
            )}

            {/* Ready State */}
            {this.state.isReady && (
              <div className="border border-tertiary/50 bg-tertiary/10 p-4 text-center">
                <p className="font-label text-sm tracking-[0.3em] text-tertiary">
                  STATUS: READY FOR DEPLOYMENT
                </p>
                <p className="font-label text-[10px] text-outline tracking-widest mt-1">
                  Awaiting all operatives...
                </p>
              </div>
            )}

            {/* Protocol Parameters (read-only) */}
            {this.state.isInRoom && (
              <div className="border border-outline-variant/50 p-4 bg-surface-container-low space-y-3">
                <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline block mb-1">
                  PROTOCOL PARAMETERS
                </span>
                {[
                  { key: "maxPlayers", label: "MAX OPERATIVES", suffix: "" },
                  { key: "turnTimeLimit", label: "TURN WINDOW", suffix: "s" },
                  {
                    key: "challengeTimeLimit",
                    label: "CHALLENGE WINDOW",
                    suffix: "s",
                  },
                  {
                    key: "exchangeTimeLimit",
                    label: "EXCHANGE WINDOW",
                    suffix: "s",
                  },
                ].map(({ key, label, suffix }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="font-label text-[10px] tracking-widest text-outline/80 uppercase">
                      {label}
                    </span>
                    <span className="font-label text-sm text-on-surface/70">
                      {this.state.settings[key]}
                      {suffix}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Player List */}
            {this.state.players.length > 0 && (
              <div>
                <div className="font-label text-[10px] tracking-widest uppercase text-outline mb-3">
                  OPERATIVE ROSTER
                </div>
                <div className="space-y-1">
                  {this.state.players.map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between px-4 py-3 border-l-2 ${
                        item.isReady
                          ? "border-tertiary bg-tertiary/5"
                          : "border-error bg-error/5"
                      }`}
                    >
                      <span className="font-label text-sm text-on-surface">
                        <span className="text-outline mr-2">{index + 1}.</span>
                        {item.name}
                      </span>
                      <span
                        className={`font-label text-[10px] tracking-widest ${
                          item.isReady ? "text-tertiary" : "text-error"
                        }`}
                      >
                        {item.isReady ? "READY" : "WAITING"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
