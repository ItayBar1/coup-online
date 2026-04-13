import React from 'react';
import '../../styles/sovereign-ledger.css';

const INFLUENCE_COLORS = {
  duke:       '#bbcf83',
  captain:    '#a88a86',
  assassin:   '#9a1a1a',
  contessa:   '#ffb4ac',
  ambassador: '#cdc6b2',
};

const INFLUENCE_ICONS = {
  duke:       'shield_person',
  captain:    'vpn_key',
  assassin:   'person_remove',
  contessa:   'gavel',
  ambassador: 'currency_exchange',
};

const INFLUENCE_DESC = {
  duke:       'Take 3 coins from the treasury',
  captain:    'Steal 2 coins from another operative',
  assassin:   'Pay 3 coins to eliminate an influence',
  contessa:   'Blocks assassination',
  ambassador: 'Exchange cards with the court deck',
};

export default function PlayerHand({ influences }) {
  if (!influences || influences.length === 0) return null;

  return (
    <div className="absolute bottom-28 inset-x-0 flex justify-center pointer-events-auto">
      <div className="flex flex-row items-end gap-6">
        {influences.map((influence, index) => {
          const key = influence.toLowerCase();
          const color = INFLUENCE_COLORS[key] || '#a88a86';
          const icon  = INFLUENCE_ICONS[key]  || 'help';
          const desc  = INFLUENCE_DESC[key]   || '';

          return (
            <div
              key={index}
              className="relative w-40 h-56 bg-surface-container-highest shadow-2xl transition-transform duration-300 hover:-translate-y-4 cursor-default select-none"
              style={{ borderTop: `4px solid ${color}` }}
            >
              <div className="grain-overlay absolute inset-0 pointer-events-none" />
              <div className="p-4 h-full flex flex-col relative z-10">
                <div className="flex justify-between items-start">
                  <span className="font-headline text-base leading-tight" style={{ color }}>
                    {influence.toUpperCase()}
                  </span>
                  <span className="material-symbols-outlined text-lg" style={{ color }}>{icon}</span>
                </div>

                <div className="mt-2 flex-grow flex items-center justify-center bg-surface-container/50">
                  <span className="font-headline text-6xl opacity-10 select-none" style={{ color }}>
                    {influence[0].toUpperCase()}
                  </span>
                </div>

                <div className="mt-2">
                  <p className="font-label text-[9px] uppercase tracking-widest mb-1" style={{ color }}>
                    {influence.toUpperCase()}
                  </p>
                  <p className="font-body text-[9px] text-on-surface/60 leading-tight">{desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
