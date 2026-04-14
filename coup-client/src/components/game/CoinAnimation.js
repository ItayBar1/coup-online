import React, { useEffect } from "react";

export default function CoinAnimation({
  startX,
  startY,
  endX,
  endY,
  delay = 0,
  onDone,
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 950 + delay);
    return () => clearTimeout(timer);
  }, [delay, onDone]);

  return (
    <div
      className="fixed pointer-events-none z-[95] animate-coin-transfer"
      style={{
        left: startX - 12,
        top: startY - 12,
        "--tx": `${endX - startX}px`,
        "--ty": `${endY - startY}px`,
        "--coin-delay": `${delay}ms`,
      }}
    >
      <div className="relative">
        <div className="coin-pulse-ring" />
        <span
          className="material-symbols-outlined text-[30px] drop-shadow-[0_0_12px_rgba(187,207,131,0.6)]"
          style={{ color: "#d6be74" }}
        >
          paid
        </span>
      </div>
    </div>
  );
}
