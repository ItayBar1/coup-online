import React from "react";
import { INFLUENCE_DATA, CLASSIC_CARDS } from "../../data/influenceData";

export default function IntelPanel() {
  return (
    <div className="flex-1 overflow-y-auto px-8 pb-8">
      <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-1">
        INTEL
      </div>
      <h2 className="font-headline text-xl text-on-surface tracking-tight mb-6">
        CHARACTER REGISTRY
      </h2>

      <div className="space-y-4">
        {CLASSIC_CARDS.map((key) => {
          const char = INFLUENCE_DATA[key];
          const blocks = char.blockDesc
            ? char.blockDesc.replace("Blocks ", "").replace(".", "")
            : null;
          return (
            <div
              key={key}
              className="bg-surface-container-low border border-outline-variant/20 overflow-hidden"
              style={{ borderTop: `3px solid ${char.color}` }}
            >
              {/* Card header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <div
                  className="w-14 h-14 flex items-center justify-center bg-surface-container shrink-0"
                  style={{ borderRight: `1px solid ${char.color}20` }}
                >
                  <span
                    className="font-headline text-4xl select-none"
                    style={{ color: char.color, opacity: 0.15 }}
                  >
                    {key[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ color: char.color }}
                    >
                      {char.icon}
                    </span>
                    <span
                      className="font-headline text-sm tracking-wider"
                      style={{ color: char.color }}
                    >
                      {key.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-body text-[10px] text-on-surface/35 leading-relaxed italic">
                    {char.flavor}
                  </p>
                </div>
              </div>

              {/* Ability rows */}
              <div className="px-4 pb-4 space-y-1.5 border-t border-outline-variant/10 pt-3">
                {char.action ? (
                  <div className="flex gap-3 items-start">
                    <span className="font-label text-[9px] tracking-widest uppercase text-outline/50 w-14 shrink-0 pt-0.5">
                      ACTION
                    </span>
                    <p className="font-body text-[10px] text-on-surface/70 leading-relaxed">
                      <span
                        className="font-label text-[10px] tracking-wide"
                        style={{ color: char.color }}
                      >
                        {char.action}{" "}
                      </span>
                      {char.actionDesc}
                      {char.blockedBy && (
                        <span className="text-on-surface/40">
                          {" "}
                          Blocked by {char.blockedBy}.
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3 items-start">
                    <span className="font-label text-[9px] tracking-widest uppercase text-outline/50 w-14 shrink-0 pt-0.5">
                      ACTION
                    </span>
                    <p className="font-body text-[10px] text-on-surface/35 italic">
                      None — defensive only.
                    </p>
                  </div>
                )}

                {blocks && (
                  <div className="flex gap-3 items-start">
                    <span className="font-label text-[9px] tracking-widest uppercase text-outline/50 w-14 shrink-0 pt-0.5">
                      BLOCKS
                    </span>
                    <p className="font-body text-[10px] text-on-surface/60">
                      {blocks}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
