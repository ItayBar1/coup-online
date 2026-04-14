import React from "react";
import { OPPONENT_POSITIONS, POSITION_CLASSES } from "./playerPositions";

function OpponentCard({ player, isActive }) {
  return (
    <div
      className="bg-surface-container-low w-44 p-4 border-l-2"
      style={{ borderLeftColor: isActive ? "#ffb4ac" : "#59413e" }}
    >
      <div className="flex justify-between items-start mb-3">
        <span
          className="font-label text-xs truncate mr-2"
          style={{ color: isActive ? "#ffb4ac" : "#a88a86" }}
        >
          {player.name}
        </span>
        <div className="flex gap-1 shrink-0">
          {Array.from({ length: player.influences.length }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-4 h-6 bg-surface-container-highest border border-outline/20"
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
