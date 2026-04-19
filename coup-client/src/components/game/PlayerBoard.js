import React from "react";
import { OPPONENT_POSITIONS, POSITION_CLASSES } from "./playerPositions";
import { CARD_IMAGES } from "../../assets/cards";

function RevealedInfluenceMini({ name }) {
  const key = name?.toLowerCase();
  const image = key ? CARD_IMAGES[key] : null;
  if (!image) return null;
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "";

  return (
    <div
      title={label}
      className="w-10 h-14 border border-outline/25 overflow-hidden bg-surface-container-highest"
    >
      <img
        src={image}
        alt={key}
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}

function OpponentCard({ player, isActive }) {
  const revealedInfluences = player.revealedInfluences || [];
  const influenceCount = player.influences?.length ?? 0;
  const isDead = player.isDead;
  const statusText =
    influenceCount === 1
      ? "1 card left"
      : influenceCount > 1
        ? `${influenceCount} cards left`
        : "eliminated";

  return (
    <div
      className="bg-surface-container-low w-48 p-4 border-l-2"
      style={{
        borderLeftColor: isActive ? "#ffb4ac" : "#59413e",
        opacity: isDead ? 0.85 : 1,
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className="font-label text-xs truncate mr-2"
          style={{ color: isActive ? "#ffb4ac" : "#a88a86" }}
        >
          {player.name}
        </span>
        <div className="flex gap-1 shrink-0">
          {Array.from({ length: influenceCount }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-4 h-6 bg-surface-container-highest border border-outline/20"
            />
          ))}
        </div>
      </div>
      <div className="mb-3 min-h-14">
        <span className="font-label text-[10px] tracking-wider uppercase text-outline block mb-2">
          {statusText}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {revealedInfluences.map((influence, idx) => (
            <RevealedInfluenceMini
              key={`${influence}-${idx}`}
              name={influence}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-sm"
          style={{ color: isActive ? "#ffb4ac" : "#cdc6b2" }}
        >
          payments
        </span>
        <span
          className="font-headline text-xl"
          style={{ color: isActive ? "#ffb4ac" : "#f1e0ce" }}
        >
          {player.money}
        </span>
      </div>
    </div>
  );
}

export default function PlayerBoard({ players, currentPlayer }) {
  if (!players || players.length === 0) return null;

  const count = Math.min(players.length, 5);
  const positionKeys = OPPONENT_POSITIONS[count] || OPPONENT_POSITIONS[5];

  return (
    <>
      {players.map((player, index) => {
        const posKey = positionKeys[index];
        if (!posKey) return null;
        const posClass = POSITION_CLASSES[posKey] || "";
        const isActive = player.name === currentPlayer;
        const playerElementId = `coup-player-${encodeURIComponent(player.name)}`;
        return (
          <div key={player.name} className={posClass} id={playerElementId}>
            <OpponentCard player={player} isActive={isActive} />
          </div>
        );
      })}
    </>
  );
}
