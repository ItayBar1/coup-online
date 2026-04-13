import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import '../styles/sovereign-ledger.css';

export default class Home extends Component {
  render() {
    return (
      <div className="dark bg-surface text-on-background font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col overflow-x-hidden">

        {/* Header */}
        <header className="bg-[#1a1208]/90 backdrop-blur-xl border-b border-[#a88a86]/10 fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4 transition-all duration-300">
          <div className="text-2xl font-bold tracking-[0.2em] text-[#f5edd8] font-headline uppercase">
            THE SOVEREIGN LEDGER
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex gap-6 font-serif-accent tracking-tighter uppercase">
              <span className="text-[#ffb4ac] font-bold transition-all duration-300">TERMINAL</span>
              <Link to="/rules" className="text-[#a88a86] hover:bg-[#9a1a1a]/20 hover:text-[#f5edd8] px-2 transition-all duration-300">ARCHIVES</Link>
              <Link to="/characters" className="text-[#a88a86] hover:bg-[#9a1a1a]/20 hover:text-[#f5edd8] px-2 transition-all duration-300">FACTIONS</Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-grow flex flex-col items-center justify-center relative pt-20 px-6">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/80"></div>
            <div className="grain-overlay absolute inset-0"></div>
            <div className="scanline absolute inset-0"></div>
          </div>

          {/* Central Terminal UI */}
          <div className="relative z-10 w-full max-w-4xl text-center space-y-12">

            {/* Decorative Accent */}
            <div className="flex justify-center items-center gap-4 opacity-50">
              <div className="h-[1px] w-12 bg-outline-variant"></div>
              <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline">Protocol 2241-A</span>
              <div className="h-[1px] w-12 bg-outline-variant"></div>
            </div>

            {/* Main Title */}
            <div className="space-y-4">
              <h1 className="font-headline text-6xl md:text-8xl lg:text-9xl tracking-tighter text-[#f5edd8] text-glow leading-none">COUP</h1>
              <p className="font-serif-accent text-primary italic text-lg md:text-2xl tracking-tight opacity-80">
                Calculated Betrayal in the Neo-Baroque Era
              </p>
            </div>

            {/* Action Cluster */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-16">
              <Link
                to="/create"
                className="group relative px-10 py-5 w-full md:w-64 border border-primary bg-primary-container/20 overflow-hidden transition-all duration-500 hover:bg-primary-container text-center block"
              >
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <span className="relative z-10 font-label text-sm tracking-[0.3em] font-bold text-on-primary-container">CREATE GAME</span>
                <div className="absolute bottom-0 left-0 w-1 h-full bg-primary group-hover:w-full transition-all duration-300 opacity-20"></div>
              </Link>
              <Link
                to="/join"
                className="group relative px-10 py-5 w-full md:w-64 border border-outline-variant hover:border-on-surface transition-all duration-500 text-center block"
              >
                <span className="relative z-10 font-label text-sm tracking-[0.3em] text-on-surface">JOIN GAME</span>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
            </div>

            {/* Secondary Actions */}
            <div className="pt-8">
              <Link
                to="/rules"
                className="font-label text-[11px] tracking-[0.5em] text-tertiary hover:text-on-surface uppercase transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <span className="material-symbols-outlined text-sm">description</span>
                VIEW RULES DOSSIER
              </Link>
            </div>

            {/* Data HUD Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mt-24 max-w-2xl mx-auto border-t border-outline-variant/10 pt-8">
              <div className="p-4 text-left border-l border-primary/20">
                <div className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">Active Nodes</div>
                <div className="font-headline text-2xl text-on-surface">1,402</div>
              </div>
              <div className="p-4 text-left border-l border-primary/20">
                <div className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">Market Volatility</div>
                <div className="font-headline text-2xl text-tertiary">HIGH</div>
              </div>
              <div className="p-4 text-left border-l border-primary/20">
                <div className="font-label text-[10px] text-outline uppercase tracking-widest mb-1">System Status</div>
                <div className="font-headline text-2xl text-primary animate-pulse">ENFORCED</div>
              </div>
            </div>
          </div>
        </main>

        {/* Decorative Corner Accents */}
        <div className="fixed bottom-12 left-12 w-24 h-24 pointer-events-none opacity-20 border-l border-b border-outline hidden md:block"></div>
        <div className="fixed top-24 right-12 w-24 h-24 pointer-events-none opacity-20 border-r border-t border-outline hidden md:block"></div>

        {/* Footer */}
        <footer className="bg-[#1a1208] w-full border-t border-[#a88a86]/5 flex flex-col md:flex-row justify-between items-center px-12 py-8 gap-4">
          <div className="font-label text-[10px] uppercase tracking-widest text-[#59413e] opacity-80 hover:opacity-100 transition-all">
            © 2241 AETERNA-TECH INDUSTRIES. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-8">
            <Link to="/" className="font-label text-[10px] uppercase tracking-widest text-[#59413e] hover:text-[#ffb4ac] transition-all">TERMINAL ACCESS</Link>
            <Link to="/rules" className="font-label text-[10px] uppercase tracking-widest text-[#59413e] hover:text-[#ffb4ac] transition-all">OBLIGATION TERMS</Link>
            <Link to="/characters" className="font-label text-[10px] uppercase tracking-widest text-[#59413e] hover:text-[#ffb4ac] transition-all">REDACTION POLICY</Link>
          </div>
        </footer>

      </div>
    );
  }
}
