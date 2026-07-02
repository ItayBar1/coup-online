import React, { useState } from "react";
import InfluenceCard from "../shared/InfluenceCard";
import { CARD_IMAGES } from "../../assets/cards";

// Compact revealed card — same visual language as the opponents' mini cards
function RevealedCardMini({ name }) {
  const key = name?.toLowerCase();
  const image = key ? CARD_IMAGES[key] : null;

  return (
    <div className="flex flex-col items-center gap-1" title={key}>
      <div className="w-14 h-20 border border-error/40 overflow-hidden bg-surface-container-highest opacity-60 saturate-50 relative">
        {image ? (
          <img
            src={image}
            alt={key}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-headline text-2xl text-outline/30 select-none">
              {key?.[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <span className="font-label text-[8px] tracking-widest uppercase text-error/70">
        {key}
      </span>
    </div>
  );
}

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

  const statusText = isDead
    ? "OUT OF GAME"
    : influences.length === 1
      ? "1 CARD LEFT"
      : null;

  return (
    <div className="absolute bottom-28 inset-x-0 flex justify-center pointer-events-auto z-10">
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
        {revealedInfluences.length > 0 && (
          <div
            data-testid="own-revealed-area"
            className="flex flex-col items-center gap-2 pb-1"
          >
            {statusText && (
              <span className="font-label text-[9px] tracking-[0.3em] uppercase text-error/80 whitespace-nowrap">
                {statusText}
              </span>
            )}
            <div className="flex gap-2">
              {revealedInfluences.map((influence, index) => (
                <RevealedCardMini
                  key={`revealed-${index}-${influence}`}
                  name={influence}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
