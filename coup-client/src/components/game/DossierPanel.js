import React from 'react'

const INFLUENCE_COLORS = {
    duke: '#bbcf83', captain: '#a88a86', assassin: '#9a1a1a',
    contessa: '#ffb4ac', ambassador: '#cdc6b2',
};

const INFLUENCE_ICONS = {
    duke: 'shield_person', captain: 'vpn_key', assassin: 'person_remove',
    contessa: 'gavel', ambassador: 'currency_exchange',
};

const CHARACTERS = [
    {
        key: 'duke', name: 'DUKE',
        action: 'TAX', actionDesc: 'Collect 3 coins from the treasury.',
        blockDesc: 'Blocks FOREIGN AID.',
    },
    {
        key: 'captain', name: 'CAPTAIN',
        action: 'STEAL', actionDesc: 'Take 2 coins from a target operative. Blocked by Captain or Ambassador.',
        blockDesc: 'Blocks STEAL.',
    },
    {
        key: 'assassin', name: 'ASSASSIN',
        action: 'ASSASSINATE', actionDesc: 'Pay 3 coins to eliminate a target\'s influence. Blocked by Contessa.',
        blockDesc: null,
    },
    {
        key: 'contessa', name: 'CONTESSA',
        action: null, actionDesc: null,
        blockDesc: 'Blocks ASSASSINATE.',
    },
    {
        key: 'ambassador', name: 'AMBASSADOR',
        action: 'EXCHANGE', actionDesc: 'Draw 2 influences from the court deck, return 2.',
        blockDesc: 'Blocks STEAL.',
    },
];

export default function DossierPanel() {
    return (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-1">DOSSIER</div>
            <h2 className="font-headline text-xl text-on-surface tracking-tight mb-6">FIELD PROTOCOLS</h2>

            {/* General Directives */}
            <section className="mb-8">
                <div className="font-label text-[10px] tracking-[0.4em] uppercase text-tertiary mb-3 pb-2 border-b border-outline-variant/20">
                    GENERAL DIRECTIVES
                </div>
                <div className="space-y-3">
                    {[
                        ['Operatives', '2–6 players. Each operative begins with 2 influences and 2 coins.'],
                        ['Actions', 'On your turn, declare any action. You may bluff — claiming an influence you do not hold.'],
                        ['Challenge', 'Any operative may challenge a claimed action or block. The challenged party reveals an influence. Correct: challenger loses influence. Incorrect: challenged loses the revealed influence.'],
                        ['Block', 'Foreign Aid, Steal, and Assassinate may be blocked. Blocks can also be challenged.'],
                        ['Elimination', 'An operative with no influences remaining is eliminated. Last operative standing wins.'],
                        ['Forced Coup', 'If you begin your turn with 10 or more coins, you must Coup.'],
                    ].map(([label, text]) => (
                        <p key={label} className="font-body text-xs text-on-surface/70 leading-relaxed">
                            <span className="font-label text-[10px] tracking-wide text-on-surface/90">{label}: </span>
                            {text}
                        </p>
                    ))}
                </div>
            </section>

            {/* Operative Registry */}
            <section className="mb-8">
                <div className="font-label text-[10px] tracking-[0.4em] uppercase text-tertiary mb-3 pb-2 border-b border-outline-variant/20">
                    OPERATIVE REGISTRY
                </div>
                <div className="space-y-2">
                    {CHARACTERS.map(char => {
                        const color = INFLUENCE_COLORS[char.key];
                        const icon  = INFLUENCE_ICONS[char.key];
                        return (
                            <div
                                key={char.key}
                                className="border border-outline-variant/20 bg-surface-container-low p-3"
                                style={{ borderLeft: `3px solid ${color}` }}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-sm" style={{ color }}>{icon}</span>
                                    <span className="font-label text-xs tracking-widest" style={{ color }}>{char.name}</span>
                                </div>
                                {char.action && (
                                    <p className="font-body text-[11px] text-on-surface/70 mb-1">
                                        <span className="font-label text-[10px] tracking-wide" style={{ color }}>{char.action}: </span>
                                        {char.actionDesc}
                                    </p>
                                )}
                                {char.blockDesc && (
                                    <p className="font-body text-[11px] text-on-surface/50">
                                        <span className="font-label text-[10px] tracking-wide text-outline/70">BLOCKS: </span>
                                        {char.blockDesc.replace('Blocks ', '')}
                                    </p>
                                )}
                                {!char.action && !char.blockDesc && (
                                    <p className="font-body text-[11px] text-on-surface/40 italic">Defensive only.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Standard Operations */}
            <section className="mb-4">
                <div className="font-label text-[10px] tracking-[0.4em] uppercase text-tertiary mb-3 pb-2 border-b border-outline-variant/20">
                    STANDARD OPERATIONS
                </div>
                <div className="space-y-2">
                    {[
                        ['INCOME',       '1 coin from treasury. Always available. Not blockable or challengeable.'],
                        ['FOREIGN AID',  '2 coins from treasury. Blockable by Duke. Not challengeable.'],
                        ['COUP',         'Pay 7 coins to eliminate a target\'s influence. Not blockable or challengeable. Mandatory at 10+ coins.'],
                    ].map(([label, text]) => (
                        <div key={label} className="border border-outline-variant/20 bg-surface-container-low p-3">
                            <p className="font-label text-[10px] tracking-wide text-on-surface/80 mb-1">{label}</p>
                            <p className="font-body text-[11px] text-on-surface/55">{text}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
