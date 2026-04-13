import React from 'react'

const CHARACTERS = [
    {
        key: 'duke',
        name: 'DUKE',
        color: '#bbcf83',
        icon: 'shield_person',
        flavor: 'Master of fiscal control. Commands the treasury.',
        action: 'TAX',
        actionDesc: 'Collect 3 coins from the treasury.',
        blocks: 'FOREIGN AID',
        blockedBy: null,
    },
    {
        key: 'captain',
        name: 'CAPTAIN',
        color: '#a88a86',
        icon: 'vpn_key',
        flavor: 'Enforces compliance through asset seizure.',
        action: 'STEAL',
        actionDesc: 'Take 2 coins from any operative.',
        blocks: 'STEAL',
        blockedBy: 'Captain or Ambassador',
    },
    {
        key: 'assassin',
        name: 'ASSASSIN',
        color: '#9a1a1a',
        icon: 'person_remove',
        flavor: 'Eliminates problems discreetly — for a price.',
        action: 'ASSASSINATE',
        actionDesc: 'Pay 3 coins. Target loses 1 influence.',
        blocks: null,
        blockedBy: 'Contessa',
    },
    {
        key: 'contessa',
        name: 'CONTESSA',
        color: '#ffb4ac',
        icon: 'gavel',
        flavor: 'Authority that renders all assassination attempts null.',
        action: null,
        actionDesc: null,
        blocks: 'ASSASSINATE',
        blockedBy: null,
    },
    {
        key: 'ambassador',
        name: 'AMBASSADOR',
        color: '#cdc6b2',
        icon: 'currency_exchange',
        flavor: 'Diplomatic immunity grants access to the court archives.',
        action: 'EXCHANGE',
        actionDesc: 'Draw 2 influences from court deck, return 2.',
        blocks: 'STEAL',
        blockedBy: null,
    },
];

export default function IntelPanel() {
    return (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-1">INTEL</div>
            <h2 className="font-headline text-xl text-on-surface tracking-tight mb-6">CHARACTER REGISTRY</h2>

            <div className="space-y-4">
                {CHARACTERS.map(char => (
                    <div
                        key={char.key}
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
                                    {char.name[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-base" style={{ color: char.color }}>
                                        {char.icon}
                                    </span>
                                    <span className="font-headline text-sm tracking-wider" style={{ color: char.color }}>
                                        {char.name}
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
                                        <span className="font-label text-[10px] tracking-wide" style={{ color: char.color }}>
                                            {char.action}{' '}
                                        </span>
                                        {char.actionDesc}
                                        {char.blockedBy && (
                                            <span className="text-on-surface/40"> Blocked by {char.blockedBy}.</span>
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex gap-3 items-start">
                                    <span className="font-label text-[9px] tracking-widest uppercase text-outline/50 w-14 shrink-0 pt-0.5">
                                        ACTION
                                    </span>
                                    <p className="font-body text-[10px] text-on-surface/35 italic">None — defensive only.</p>
                                </div>
                            )}

                            {char.blocks && (
                                <div className="flex gap-3 items-start">
                                    <span className="font-label text-[9px] tracking-widest uppercase text-outline/50 w-14 shrink-0 pt-0.5">
                                        BLOCKS
                                    </span>
                                    <p className="font-body text-[10px] text-on-surface/60">
                                        {char.blocks}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
