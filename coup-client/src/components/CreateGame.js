import React, { Component } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import { ReactSortable } from "react-sortablejs";
import Coup from "./game/Coup";
import LandingBackground from "./shared/LandingBackground";

import axios from "axios";
const baseUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

const DEFAULT_SETTINGS = {
  maxPlayers: 6,
  turnTimeLimit: 30,
  challengeTimeLimit: 10,
  exchangeTimeLimit: 30,
};

export default class CreateGame extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: "",
      roomCode: "",
      copied: false,
      copiedLink: false,
      isInRoom: false,
      isLoading: false,
      players: [],
      isError: false,
      isGameStarted: false,
      errorMsg: "",
      canStart: false,
      socket: null,
      isLeader: false,
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  onNameChange = (name) => {
    this.setState({ name });
  };

  joinParty = (roomCode) => {
    const bind = this;
    const socket = io(`${baseUrl}/${roomCode}`);
    this.setState({ socket });
    console.log("socket created");
    socket.emit("setName", this.state.name);

    socket.on("joinSuccess", function () {
      console.log("join successful");
      bind.setState({
        isLoading: false,
        isInRoom: true,
      });
    });

    socket.on("joinFailed", function (err) {
      console.log("join failed, cause: " + err);
      bind.setState({ isLoading: false });
    });

    socket.on("leader", function () {
      console.log("You are the leader");
      bind.setState({ isLeader: true });
    });

    socket.on("settingsUpdate", (settings) => {
      bind.setState({ settings });
    });

    socket.on("partyUpdate", (players) => {
      console.log(players);
      this.setState({ players });
      if (
        players.length >= 2 &&
        players.map((x) => x.isReady).filter((x) => x === true).length ===
          players.length
      ) {
        this.setState({ canStart: true });
      } else {
        this.setState({ canStart: false });
      }
    });

    socket.on("disconnected", function () {
      console.log("You've lost connection with the server");
    });
  };

  createParty = () => {
    if (this.state.name === "") {
      this.setState({ errorMsg: "Please enter a name", isError: true });
      return;
    }

    this.setState({ isLoading: true });
    const bind = this;
    axios
      .get(`${baseUrl}/createNamespace`)
      .then(function (res) {
        bind.setState({ roomCode: res.data.namespace, errorMsg: "" });
        bind.joinParty(res.data.namespace);
      })
      .catch(function (err) {
        console.log("error in creating namespace", err);
        bind.setState({
          isLoading: false,
          errorMsg: "Error creating room, server is unreachable",
          isError: true,
        });
      });
  };

  startGame = () => {
    this.state.socket.emit("startGameSignal", this.state.players);

    this.state.socket.on("startGame", () => {
      this.setState({ isGameStarted: true });
    });
  };

  updateSetting = (key, rawVal) => {
    const ranges = {
      maxPlayers: { min: 2, max: 6 },
      turnTimeLimit: { min: 3, max: 60 },
      challengeTimeLimit: { min: 3, max: 60 },
      exchangeTimeLimit: { min: 3, max: 60 },
    };
    const n = parseInt(rawVal);
    if (isNaN(n)) return;
    const { min, max } = ranges[key];
    const val = Math.max(min, Math.min(max, n));
    const newSettings = { ...this.state.settings, [key]: val };
    this.setState({ settings: newSettings });
    this.state.socket.emit("updateSettings", newSettings);
  };

  copyCode = () => {
    var dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = this.state.roomCode;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    this.setState({ copied: true });
  };

  copyLink = () => {
    const link = `${window.location.origin}/join?code=${this.state.roomCode}`;
    navigator.clipboard.writeText(link).catch(() => {
      var dummy = document.createElement("textarea");
      document.body.appendChild(dummy);
      dummy.value = link;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
    });
    this.setState({ copiedLink: true });
  };

  render() {
    if (this.state.isGameStarted) {
      return <Coup name={this.state.name} socket={this.state.socket} />;
    }

    const { settings, isLeader, isInRoom } = this.state;

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
                ESTABLISH COMMAND
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
                disabled={this.state.isLoading || isInRoom}
                placeholder="Enter name..."
                className="w-full bg-surface border border-outline-variant text-on-surface font-label text-sm px-4 py-3 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                onChange={(e) => {
                  if (e.target.value.length <= 10) {
                    this.setState({ errorMsg: "", isError: false });
                    this.onNameChange(e.target.value);
                  } else {
                    this.setState({
                      errorMsg: "Name must be less than 11 characters",
                      isError: true,
                    });
                  }
                }}
              />
            </div>

            {/* Create Button */}
            {!isInRoom && (
              <button
                className="w-full border border-primary bg-primary-container/20 hover:bg-primary-container py-3 font-label text-sm tracking-[0.3em] font-bold text-on-primary-container transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={this.createParty}
                disabled={this.state.isLoading}
              >
                {this.state.isLoading ? "ESTABLISHING..." : "CREATE ROOM"}
              </button>
            )}

            {/* Error */}
            {this.state.isError && (
              <p className="font-label text-xs text-error tracking-widest">
                {this.state.errorMsg}
              </p>
            )}

            {/* Room Code */}
            {this.state.roomCode !== "" && !this.state.isLoading && (
              <div className="border border-outline-variant/50 p-4 bg-surface-container-low">
                <div className="font-label text-[10px] tracking-widest uppercase text-outline mb-2">
                  ACCESS CODE
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-headline text-3xl text-primary tracking-[0.3em]">
                    {this.state.roomCode}
                  </span>
                  <button
                    className="text-outline hover:text-primary transition-colors"
                    onClick={this.copyCode}
                    title="Copy to clipboard"
                  >
                    <span className="material-symbols-outlined text-xl">
                      content_copy
                    </span>
                  </button>
                </div>
                {this.state.copied && (
                  <p className="font-label text-[10px] tracking-widest text-tertiary mt-2">
                    COPIED TO CLIPBOARD
                  </p>
                )}
                <div className="mt-3 border-t border-outline-variant/20 pt-3">
                  <div className="font-label text-[10px] tracking-widest uppercase text-outline mb-1">
                    INVITE LINK
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-body text-xs text-on-surface/60 truncate">
                      {`${window.location.origin}/join?code=${this.state.roomCode}`}
                    </span>
                    <button
                      className="text-outline hover:text-primary transition-colors shrink-0"
                      onClick={this.copyLink}
                      title="Copy invite link"
                    >
                      <span className="material-symbols-outlined text-xl">
                        link
                      </span>
                    </button>
                  </div>
                  {this.state.copiedLink && (
                    <p className="font-label text-[10px] tracking-widest text-tertiary mt-1">
                      LINK COPIED
                    </p>
                  )}
                </div>
                <p className="font-label text-[10px] text-outline/60 mt-3 tracking-widest">
                  DRAG OPERATIVES TO SET TURN ORDER
                </p>
              </div>
            )}

            {/* Protocol Parameters (Settings) */}
            {isInRoom && (
              <div className="border border-outline-variant/50 p-4 bg-surface-container-low space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline">
                    PROTOCOL PARAMETERS
                  </span>
                  {isLeader && (
                    <span className="font-label text-[9px] tracking-widest text-tertiary/70 uppercase">
                      COMMANDER
                    </span>
                  )}
                </div>

                {[
                  {
                    key: "maxPlayers",
                    label: "MAX OPERATIVES",
                    suffix: "",
                    min: 2,
                    max: 6,
                  },
                  {
                    key: "turnTimeLimit",
                    label: "TURN WINDOW",
                    suffix: "s",
                    min: 3,
                    max: 60,
                  },
                  {
                    key: "challengeTimeLimit",
                    label: "CHALLENGE WINDOW",
                    suffix: "s",
                    min: 3,
                    max: 60,
                  },
                  {
                    key: "exchangeTimeLimit",
                    label: "EXCHANGE WINDOW",
                    suffix: "s",
                    min: 3,
                    max: 60,
                  },
                ].map(({ key, label, suffix, min, max }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-label text-[10px] tracking-widest text-outline/80 uppercase flex-1">
                      {label}
                    </span>
                    {isLeader ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={settings[key]}
                          onChange={(e) =>
                            this.updateSetting(key, e.target.value)
                          }
                          className="w-16 bg-surface border border-outline-variant text-on-surface font-label text-sm px-2 py-1 text-center focus:border-primary focus:outline-none transition-colors"
                        />
                        {suffix && (
                          <span className="font-label text-[10px] text-outline">
                            {suffix}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-label text-sm text-on-surface/70">
                        {settings[key]}
                        {suffix}
                      </span>
                    )}
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
                  <ReactSortable
                    list={this.state.players}
                    setList={(newState) => this.setState({ players: newState })}
                  >
                    {this.state.players.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between px-4 py-3 border-l-2 cursor-grab select-none ${
                          item.isReady
                            ? "border-tertiary bg-tertiary/5"
                            : "border-error bg-error/5"
                        }`}
                      >
                        <span className="font-label text-sm text-on-surface">
                          <span className="text-outline mr-2">
                            {index + 1}.
                          </span>
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
                  </ReactSortable>
                </div>
              </div>
            )}

            {/* Start Game */}
            {this.state.canStart && (
              <button
                className="w-full bg-tertiary/20 border border-tertiary hover:bg-tertiary hover:text-surface py-4 font-label text-sm tracking-[0.3em] font-bold text-tertiary transition-all duration-300"
                onClick={this.startGame}
              >
                INITIATE PROTOCOL
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
