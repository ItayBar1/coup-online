import React, { Component } from "react";
import { INFLUENCE_DATA } from "../../data/influenceData";

const ACTION_INFLUENCE = {
  steal: "captain",
  tax: "duke",
  assassinate: "assassin",
  exchange: "ambassador",
};

export default class ChallengeDecision extends Component {
  vote = (isChallenging) => {
    this.props.closeOtherVotes("challenge");

    const res = {
      action: this.props.action,
      isChallenging,
      challengee: this.props.action.source,
      challenger: this.props.name,
    };
    console.log(res);
    this.props.socket.emit("g-challengeDecision", res);
    this.props.doneChallengeVote();
  };

  challengeText = (action, source, target) => {
    const name = (n) => (
      <span style={{ color: "#ffb4ac" }} className="font-label">
        {n}
      </span>
    );
    if (action === "steal") {
      return (
        <span>
          {name(source)} claims CAPTAIN — stealing from {name(target)}
        </span>
      );
    } else if (action === "tax") {
      return (
        <span>
          {name(source)} claims DUKE — collecting 3 coins from treasury
        </span>
      );
    } else if (action === "assassinate") {
      return (
        <span>
          {name(source)} claims ASSASSIN — targeting {name(target)}
        </span>
      );
    } else if (action === "exchange") {
      return (
        <span>{name(source)} claims AMBASSADOR — exchanging influences</span>
      );
    }
    return null;
  };

  render() {
    const { action } = this.props;
    const influenceKey = ACTION_INFLUENCE[action.action];
    const influenceColor =
      (INFLUENCE_DATA[influenceKey] || {}).color || "#a88a86";

    return (
      <div>
        <div
          className="font-label text-[10px] tracking-[0.4em] uppercase mb-3"
          style={{ color: influenceColor }}
        >
          INTELLIGENCE VERIFICATION
        </div>
        <p className="font-body text-sm text-on-surface/80 mb-4 leading-relaxed">
          {this.challengeText(action.action, action.source, action.target)}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => this.vote(true)}
            className="w-full bg-primary-container hover:bg-[#7a1414] text-[#f1e0ce] py-3 font-label text-xs tracking-widest uppercase transition-all"
          >
            CHALLENGE CLAIM
          </button>
          <button
            onClick={() => this.vote(false)}
            className="w-full border border-outline-variant/40 py-3 font-label text-xs tracking-widest uppercase text-outline hover:text-on-surface hover:bg-surface-container transition-all"
          >
            ACCEPT CLAIM
          </button>
        </div>
      </div>
    );
  }
}
