import React, { Component } from "react";
import InfluenceCard from "../shared/InfluenceCard";
import { CARD_IMAGES } from "../../assets/cards";

export default class ExchangeInfluences extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: new Set(), // indices of cards chosen to KEEP
      toKeep: props.influences.length - 2,
    };
  }

  toggleSelect = (index) => {
    const { selected, toKeep } = this.state;
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else if (newSelected.size < toKeep) {
      newSelected.add(index);
    }
    this.setState({ selected: newSelected });
  };

  confirm = () => {
    const { selected } = this.state;
    const all = this.props.influences;
    const kept = all.filter((_, i) => selected.has(i));
    const putBack = all.filter((_, i) => !selected.has(i));
    this.props.socket.emit("g-chooseExchangeDecision", {
      playerName: this.props.name,
      kept,
      putBack,
    });
    this.props.doneExchangeInfluence();
  };

  render() {
    const { selected, toKeep } = this.state;
    const all = this.props.influences;
    const remaining = toKeep - selected.size;
    const ready = selected.size === toKeep;

    const { secondsLeft } = this.props;

    return (
      <div className="bg-surface-container border border-tertiary/30 p-6 w-full max-w-2xl mx-4 animate-card-draw">
        {secondsLeft !== null && secondsLeft !== undefined && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/20">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${secondsLeft <= 5 ? "bg-error animate-pulse" : "bg-outline/50"}`}
            />
            <span className="font-label text-[10px] tracking-widest text-outline uppercase">
              Auto-keep in{" "}
              <span
                className={secondsLeft <= 5 ? "text-error" : "text-on-surface"}
              >
                {secondsLeft}s
              </span>
            </span>
          </div>
        )}
        <div className="font-label text-[10px] tracking-[0.4em] uppercase text-tertiary mb-2">
          COURT EXCHANGE
        </div>
        <p className="font-headline text-lg text-on-surface mb-1 tracking-tight">
          SELECT INFLUENCES TO RETAIN
        </p>
        <p className="font-body text-xs text-outline mb-6 leading-relaxed">
          {remaining > 0 ? (
            <>
              Choose <span className="text-on-surface/80">{remaining}</span>{" "}
              more influence{remaining !== 1 ? "s" : ""} to keep.
            </>
          ) : (
            <>Selection complete. Confirm to proceed.</>
          )}{" "}
          Unchosen cards return to the court deck.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-6">
          {all.map((influence, index) => {
            const key = influence.toLowerCase();
            const isSelected = selected.has(index);
            return (
              <InfluenceCard
                key={index}
                name={key}
                image={CARD_IMAGES[key] ?? null}
                size="md"
                interactive={true}
                footerLabel={isSelected ? "SELECTED" : "SELECT"}
                onClick={() => this.toggleSelect(index)}
                className={[
                  "text-left transition-all",
                  isSelected
                    ? "border-2 border-tertiary/80 ring-2 ring-tertiary/40"
                    : "border border-tertiary/20 hover:border-tertiary/50 opacity-60",
                ].join(" ")}
              />
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={this.confirm}
            disabled={!ready}
            className={[
              "font-label text-[11px] tracking-[0.3em] uppercase px-8 py-3 transition-all",
              ready
                ? "bg-tertiary text-on-tertiary hover:opacity-90 cursor-pointer"
                : "bg-surface-variant text-outline cursor-not-allowed opacity-40",
            ].join(" ")}
          >
            CONFIRM EXCHANGE
          </button>
        </div>
      </div>
    );
  }
}
