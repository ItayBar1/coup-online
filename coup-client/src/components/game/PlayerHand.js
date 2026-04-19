import React, { useState } from "react";
import InfluenceCard from "../shared/InfluenceCard";
import { CARD_IMAGES } from "../../assets/cards";

export default function PlayerHand({
  influences = [],
  revealedInfluences = [],
  isDead = false,
}) {
  const [flipped, setFlipped] = useState(() => new Set());

  if (
    (!influences || influences.length === 0) &&
    revealedInfluences.length === 0
  )
    return null;

  const toggleFlip = (index) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="absolute bottom-28 inset-x-0 flex justify-center pointer-events-auto">
      <div className="flex flex-row items-end gap-6">
        {influences.map((influence, index) => {
          const isFlipped = flipped.has(index);
          return (
            <div
              key={`live-${index}-${influence}`}
              data-testid="own-influence"
              onClick={() => toggleFlip(index)}
              className="cursor-pointer"
            >
              {isFlipped ? (
                <div className="w-40 h-56 bg-surface-container-highest border-t-4 border-outline/40 shadow-2xl flex items-center justify-center select-none">
                  <span className="material-symbols-outlined text-6xl text-outline/30">
                    lock
                  </span>
                </div>
              ) : (
                <InfluenceCard
                  name={influence.toLowerCase()}
                  image={CARD_IMAGES[influence.toLowerCase()] ?? null}
                  size="lg"
                  className="transition-transform duration-300 hover:-translate-y-4"
                />
              )}
            </div>
          );
        })}
        {revealedInfluences.map((influence, index) => {
          const key = influence.toLowerCase();
          return (
            <InfluenceCard
              key={`revealed-${index}-${influence}`}
              name={key}
              image={CARD_IMAGES[key] ?? null}
              size="lg"
              isRevealed={true}
              revealedLabel={isDead ? "OUT OF GAME" : "DEAD CARD"}
              footerLabel="REVEALED"
            />
          );
        })}
      </div>
    </div>
  );
}
