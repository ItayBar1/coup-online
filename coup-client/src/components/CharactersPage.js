import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/sovereign-ledger.css';

const CHARACTERS = [
  {
    name: 'DUKE',
    color: '#bbcf83',
    icon: 'shield_person',
    action: 'TAX',
    actionDesc: 'Take 3 coins from the treasury.',
    blockDesc: 'Blocks Foreign Aid.',
  },
  {
    name: 'ASSASSIN',
    color: '#9a1a1a',
    icon: 'person_remove',
    action: 'ASSASSINATE',
    actionDesc: 'Pay 3 coins to force an operative to lose an influence.',
    blockDesc: null,
  },
  {
    name: 'AMBASSADOR',
    color: '#cdc6b2',
    icon: 'currency_exchange',
    action: 'EXCHANGE',
    actionDesc: 'Draw 2 cards from the Court Deck, keep up to 2, return the rest.',
    blockDesc: 'Blocks Steal.',
  },
  {
    name: 'CAPTAIN',
    color: '#a88a86',
    icon: 'vpn_key',
    action: 'STEAL',
    actionDesc: 'Take 2 coins from another operative.',
    blockDesc: 'Blocks Steal.',
  },
  {
    name: 'CONTESSA',
    color: '#ffb4ac',
    icon: 'gavel',
    action: null,
    actionDesc: null,
    blockDesc: 'Blocks Assassination.',
  },
];

export default function CharactersPage() {
  return (
    <div className="dark min-h-screen bg-surface text-on-background font-body">
      <div className="grain-overlay fixed inset-0 z-0 pointer-events-none"></div>

      <header className="bg-[#1a1208]/90 backdrop-blur-xl border-b border-[#a88a86]/10 fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4">
        <div className="text-xl font-bold tracking-[0.2em] text-[#f5edd8] font-headline uppercase">
          THE SOVEREIGN LEDGER
        </div>
        <nav className="flex items-center gap-6 font-serif-accent tracking-tighter uppercase text-sm">
          <Link to="/" className="text-[#a88a86] hover:text-[#ffb4ac] transition-colors">TERMINAL</Link>
          <Link to="/rules" className="text-[#a88a86] hover:text-[#ffb4ac] transition-colors">ARCHIVES</Link>
          <span className="text-[#ffb4ac] font-bold">FACTIONS</span>
        </nav>
      </header>

      <main className="relative z-10 pt-24 px-8 max-w-5xl mx-auto pb-16">
        <div className="flex items-center gap-4 mb-8 opacity-50">
          <div className="h-[1px] w-8 bg-outline-variant"></div>
          <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline">CHARACTER REGISTRY</span>
        </div>

        <h1 className="font-headline text-5xl text-on-surface mb-2 tracking-tighter text-glow">FACTIONS</h1>
        <p className="font-serif-accent text-primary italic text-lg opacity-70 mb-12">
          The Five Powers of the Sovereign Court
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHARACTERS.map(char => (
            <div
              key={char.name}
              className="border bg-surface-container/50 backdrop-blur-sm p-6 space-y-4 transition-all duration-300 hover:bg-surface-container"
              style={{ borderColor: char.color + '40', borderLeftColor: char.color, borderLeftWidth: '3px' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline/60 mb-1">OPERATIVE</div>
                  <h2 className="font-headline text-2xl tracking-tighter" style={{ color: char.color }}>
                    {char.name}
                  </h2>
                </div>
                <span className="material-symbols-outlined text-3xl opacity-40" style={{ color: char.color }}>
                  {char.icon}
                </span>
              </div>

              {char.action && (
                <div className="border-t border-outline-variant/20 pt-4">
                  <div className="font-label text-[10px] tracking-widest uppercase text-outline/60 mb-1">ACTION</div>
                  <div className="font-label text-xs font-bold mb-1" style={{ color: char.color }}>{char.action}</div>
                  <p className="font-body text-xs text-on-surface/70 leading-relaxed">{char.actionDesc}</p>
                </div>
              )}

              {char.blockDesc && (
                <div className="border-t border-outline-variant/20 pt-4">
                  <div className="font-label text-[10px] tracking-widest uppercase text-outline/60 mb-1">COUNTERACTION</div>
                  <p className="font-body text-xs text-on-surface/70 leading-relaxed">{char.blockDesc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
