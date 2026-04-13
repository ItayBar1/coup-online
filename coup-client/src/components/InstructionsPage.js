import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/sovereign-ledger.css';

export default function InstructionsPage() {
  return (
    <div className="dark min-h-screen bg-surface text-on-background font-body">
      <div className="grain-overlay fixed inset-0 z-0 pointer-events-none"></div>

      <header className="bg-[#1a1208]/90 backdrop-blur-xl border-b border-[#a88a86]/10 fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4">
        <div className="text-xl font-bold tracking-[0.2em] text-[#f5edd8] font-headline uppercase">
          THE SOVEREIGN LEDGER
        </div>
        <nav className="flex items-center gap-6 font-serif-accent tracking-tighter uppercase text-sm">
          <Link to="/" className="text-[#a88a86] hover:text-[#ffb4ac] transition-colors">TERMINAL</Link>
          <span className="text-[#ffb4ac] font-bold">ARCHIVES</span>
          <Link to="/characters" className="text-[#a88a86] hover:text-[#ffb4ac] transition-colors">FACTIONS</Link>
        </nav>
      </header>

      <main className="relative z-10 pt-24 px-8 max-w-4xl mx-auto pb-16">
        <div className="flex items-center gap-4 mb-8 opacity-50">
          <div className="h-[1px] w-8 bg-outline-variant"></div>
          <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline">CLASSIFIED DOSSIER</span>
        </div>

        <h1 className="font-headline text-5xl text-on-surface mb-2 tracking-tighter text-glow">ARCHIVES</h1>
        <p className="font-serif-accent text-primary italic text-lg opacity-70 mb-12">
          General Directives &amp; Field Protocol
        </p>

        <div className="border border-outline-variant/30 p-8 bg-surface-container/50 backdrop-blur-sm space-y-8">
          <p className="font-label text-[10px] tracking-[0.4em] uppercase text-outline/60 border-l border-primary/30 pl-4">
            CONTENT CLASSIFIED — FULL DOSSIER INCOMING IN PHASE 2
          </p>

          <div className="space-y-4 text-on-surface/80 font-body text-sm leading-relaxed">
            <h2 className="font-headline text-2xl text-on-surface tracking-tighter">GENERAL DIRECTIVES</h2>
            <p>Each operative maintains two influence cards face-down. These cards represent power within the government. Lose both and you are eliminated.</p>
            <p>On your turn, choose an action. Other operatives may challenge your claim or block your action depending on their own influence.</p>
          </div>

          <div className="space-y-4 text-on-surface/80 font-body text-sm leading-relaxed">
            <h2 className="font-headline text-2xl text-on-surface tracking-tighter">STANDARD ACTIONS</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'INCOME', desc: 'Take 1 coin. Cannot be blocked or challenged.' },
                { name: 'FOREIGN AID', desc: 'Take 2 coins. Can be blocked by the Duke.' },
                { name: 'COUP', desc: 'Pay 7 coins to eliminate an operative. Cannot be blocked. Mandatory at 10+ coins.' },
              ].map(action => (
                <div key={action.name} className="border border-outline-variant/30 p-4 bg-surface-container-low">
                  <div className="font-label text-xs tracking-widest text-primary mb-2">{action.name}</div>
                  <div className="font-body text-xs text-on-surface/70">{action.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-on-surface/80 font-body text-sm leading-relaxed">
            <h2 className="font-headline text-2xl text-on-surface tracking-tighter">CHARACTER ACTIONS</h2>
            <p className="font-label text-[10px] text-outline/60 tracking-widest">See FACTIONS for full character details.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
