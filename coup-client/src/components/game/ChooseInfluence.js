import React, { Component } from "react";
import InfluenceCard from "../shared/InfluenceCard";
import { CARD_IMAGES } from "../../assets/cards";

export default class ChooseInfluence extends Component {
  selectInfluence = (influence) => {
    const res = {
      influence: influence,
      playerName: this.props.name,
    };
    console.log(res);
    this.props.socket.emit("g-chooseInfluenceDecision", res);
    this.props.doneChooseInfluence();
  };

  render() {
    return (
      <div className="bg-surface-container border border-error/40 p-6 w-full max-w-xl mx-4 animate-card-draw">
        <div className="font-label text-[10px] tracking-[0.4em] uppercase text-error mb-2">
          INFLUENCE COMPROMISED
        </div>
        <p className="font-headline text-lg text-on-surface mb-1 tracking-tight">
          CHOOSE INFLUENCE TO SACRIFICE
        </p>
        <p className="font-body text-xs text-outline mb-6 leading-relaxed">
          Select one operative identity to eliminate permanently.
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
                footerLabel="SACRIFICE"
                onClick={() => this.selectInfluence(influence)}
                className="border border-error/20 hover:border-error/50 text-left"
              />
            );
          })}
        </div>
      </div>
    );
  }
}
