import React, { Component } from "react";
import { INFLUENCE_DATA } from "../../data/influenceData";

export default class BlockChallengeDecision extends Component {
  vote = (isChallenging) => {
    this.props.closeOtherVotes("challenge-block");

    const res = {
      counterAction: this.props.counterAction,
      prevAction: this.props.prevAction,
      isChallenging,
      challengee: this.props.counterAction.source,
      challenger: this.props.name,
    };
    console.log(res);
    this.props.socket.emit("g-blockChallengeDecision", res);
    this.props.doneBlockChallengeVote();
  };

  render() {
    const { counterAction, prevAction } = this.props;
    const claimColor =
      (INFLUENCE_DATA[counterAction.claim] || {}).color || "#a88a86";
    const name = (n) => (
      <span style={{ color: "#ffb4ac" }} className="font-label">
        {n}
      </span>
    );

    return (
      <div>
        <div
          className="font-label text-[10px] tracking-[0.4em] uppercase mb-3"
          style={{ color: claimColor }}
        >
          BLOCK VERIFICATION
        </div>
        <p className="font-body text-sm text-on-surface/80 mb-4 leading-relaxed">
          {name(counterAction.source)} claims{" "}
          <span style={{ color: claimColor }} className="font-label">
            {counterAction.claim.toUpperCase()}
          </span>{" "}
          to block {prevAction.action.replace(/_/g, " ")} from{" "}
          {name(prevAction.source)}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => this.vote(true)}
            className="w-full bg-primary-container hover:bg-[#7a1414] text-[#f1e0ce] py-3 font-label text-xs tracking-widest uppercase transition-all"
          >
            CHALLENGE BLOCK
          </button>
          <button
            onClick={() => this.vote(false)}
            className="w-full border border-outline-variant/40 py-3 font-label text-xs tracking-widest uppercase text-outline hover:text-on-surface hover:bg-surface-container transition-all"
          >
            ACCEPT BLOCK
          </button>
        </div>
      </div>
    );
  }
}
