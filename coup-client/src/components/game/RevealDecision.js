import React, { Component } from "react";
import InfluenceCard from "../shared/InfluenceCard";
import { CARD_IMAGES } from "../../assets/cards";

export default class RevealDecision extends Component {
  constructor(props) {
    super(props);

    this.act = this.props.res.isBlock
      ? this.props.res.counterAction.counterAction
      : this.props.res.action.action;

    this.actionMap = {
      tax: ["duke"],
      assassinate: ["assassin"],
      exchange: ["ambassador"],
      steal: ["captain"],
      block_foreign_aid: ["duke"],
      block_steal: ["ambassador", "captain"],
      block_assassinate: ["contessa"],
    };
  }

  selectInfluence = (influence) => {
    const res = {
      revealedCard: influence,
      prevAction: this.props.res.action,
      counterAction: this.props.res.counterAction,
      challengee: this.props.res.challengee,
      challenger: this.props.res.challenger,
      isBlock: this.props.res.isBlock,
    };
    console.log(res);
    this.props.socket.emit("g-revealDecision", res);
    this.props.doneReveal();
  };

  render() {
    const actLabel = this.act.replace(/_/g, " ").toUpperCase();
    const required = (this.actionMap[this.act] || [])
      .join(" or ")
      .toUpperCase();

    return (
      <div className="bg-surface-container border border-outline-variant/30 p-6 w-full max-w-xl mx-4 animate-card-draw">
        <div className="font-label text-[10px] tracking-[0.4em] uppercase text-error mb-2">
          CLAIM CHALLENGED
        </div>
        <p className="font-headline text-lg text-on-surface mb-1 tracking-tight">
          {actLabel} UNDER SCRUTINY
        </p>
        <p className="font-body text-xs text-outline mb-6 leading-relaxed">
          Reveal <span className="text-on-surface/80">{required}</span> to
          defend your claim — or lose influence.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          {this.props.influences.map((influence, index) => {
            const key = influence.toLowerCase();
            return (
              <InfluenceCard
                key={index}
                name={key}
                image={CARD_IMAGES[key] ?? null}
                size="md"
                interactive={true}
                footerLabel="REVEAL"
                onClick={() => this.selectInfluence(influence)}
                className="text-left"
              />
            );
          })}
        </div>
      </div>
    );
  }
}
