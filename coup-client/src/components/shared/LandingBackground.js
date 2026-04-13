import React from 'react';
import '../../styles/sovereign-ledger.css';

export default function LandingBackground({ dimmed = false }) {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/80"></div>
      {dimmed && <div className="absolute inset-0 bg-surface/70"></div>}
      <div className="grain-overlay absolute inset-0"></div>
      <div className="scanline absolute inset-0"></div>
    </div>
  );
}
