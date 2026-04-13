import React from "react";
import { INFLUENCE_DATA } from "../../data/influenceData";
import "../../styles/sovereign-ledger.css";

const SIZE_CLASSES = { lg: "w-40 h-56", md: "w-36 h-48" };
const PADDING = { lg: "p-4", md: "p-3" };
const NAME_TEXT = { lg: "text-base", md: "text-sm" };
const ICON_TEXT = { lg: "text-lg", md: "text-base" };
const LETTER_TEXT = { lg: "text-6xl", md: "text-5xl" };
const FOOTER_TEXT = { lg: "text-[9px]", md: "text-[8px]" };

export default function InfluenceCard({
  name,
  image,
  size = "lg",
  interactive = false,
  footerLabel,
  onClick,
  className = "",
}) {
  const key = name?.toLowerCase() || "";
  const data = INFLUENCE_DATA[key] || {};
  const color = data.color || "#a88a86";
  const icon = data.icon || "help";
  const desc = data.desc || "";

  const sz = SIZE_CLASSES[size] ? size : "lg";
  const Root = onClick ? "button" : "div";

  return (
    <Root
      className={`relative ${SIZE_CLASSES[sz]} bg-surface-container-highest shadow-2xl select-none group
        ${interactive ? "transition-transform duration-300 hover:-translate-y-3 cursor-pointer" : "cursor-default"}
        ${className}`}
      style={{ borderTop: `4px solid ${color}` }}
      onClick={onClick}
    >
      <div className="grain-overlay absolute inset-0 pointer-events-none" />
      <div className={`${PADDING[sz]} h-full flex flex-col relative z-10`}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <span
            className={`font-headline ${NAME_TEXT[sz]} leading-tight`}
            style={{ color }}
          >
            {key.toUpperCase()}
          </span>
          <span
            className={`material-symbols-outlined ${ICON_TEXT[sz]}`}
            style={{ color }}
          >
            {icon}
          </span>
        </div>

        {/* Image / placeholder area */}
        <div className="mt-2 flex-grow relative overflow-hidden">
          {image ? (
            <>
              <img
                src={image}
                alt={key}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 pointer-events-none">
                <p
                  className={`font-body ${FOOTER_TEXT[sz]} text-white text-center leading-snug`}
                >
                  {desc}
                </p>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container/50">
              <span
                className={`font-headline ${LETTER_TEXT[sz]} opacity-10 select-none`}
                style={{ color }}
              >
                {key[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2">
          <p
            className={`font-label ${FOOTER_TEXT[sz]} uppercase tracking-widest`}
            style={{ color }}
          >
            {footerLabel || key.toUpperCase()}
          </p>
        </div>
      </div>
    </Root>
  );
}
