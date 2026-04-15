import React from "react";
import "../../styles/sovereign-ledger.css";

export default function CentralDeck({ deckCount }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative flex flex-col items-center gap-4">
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        {/* Card back */}
        <div className="relative w-32 h-44 bg-surface-container-high border border-outline/20 transform -rotate-3 flex items-center justify-center overflow-hidden">
          <div className="grain-overlay absolute inset-0" />
          <span className="text-outline/10 text-7xl font-headline italic select-none">
            C
          </span>
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#140d04] to-transparent" />
          <span className="font-label text-[10px] tracking-[0.4em] text-outline opacity-40 absolute bottom-3 select-none">
            COURT DECK
          </span>
        </div>
        <div className="px-4 py-2 bg-surface-container-high border border-outline/20">
          <p className="font-label text-[10px] tracking-[0.25em] uppercase text-outline">
            Deck Cards
          </p>
          <p className="font-headline text-2xl text-primary text-center">
            {deckCount ?? "?"}
          </p>
        </div>
      </div>
    </div>
  );
}
