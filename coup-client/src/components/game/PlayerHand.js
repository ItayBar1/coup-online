import React from "react";
import InfluenceCard from "../shared/InfluenceCard";
import { CARD_IMAGES } from "../../assets/cards";

export default function PlayerHand({
  influences = [],
  revealedInfluences = [],
  isDead = false,
}) {
  if (
    (!influences || influences.length === 0) &&
    revealedInfluences.length === 0
  )
    return null;

  return (
    <div className="absolute bottom-28 inset-x-0 flex justify-center pointer-events-auto">
      <div className="flex flex-row items-end gap-6">
        {influences.map((influence, index) => (
          <InfluenceCard
            key={`live-${index}-${influence}`}
            name={influence.toLowerCase()}
            image={CARD_IMAGES[influence.toLowerCase()] ?? null}
            size="lg"
            className="transition-transform duration-300 hover:-translate-y-4"
          />
        ))}
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
