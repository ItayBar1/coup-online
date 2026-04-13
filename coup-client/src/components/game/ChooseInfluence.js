import React, { Component } from 'react'

const INFLUENCE_COLORS = {
    duke: '#bbcf83', captain: '#a88a86', assassin: '#9a1a1a',
    contessa: '#ffb4ac', ambassador: '#cdc6b2',
};

const INFLUENCE_ICONS = {
    duke: 'shield_person', captain: 'vpn_key', assassin: 'person_remove',
    contessa: 'gavel', ambassador: 'currency_exchange',
};

const INFLUENCE_DESC = {
    duke:       'Take 3 coins from the treasury',
    captain:    'Steal 2 coins from another operative',
    assassin:   'Pay 3 coins to eliminate an influence',
    contessa:   'Blocks assassination',
    ambassador: 'Exchange cards with the court deck',
};

export default class ChooseInfluence extends Component {

    selectInfluence = (influence) => {
        const res = {
            influence: influence,
            playerName: this.props.name
        }
        console.log(res)
        this.props.socket.emit('g-chooseInfluenceDecision', res);
        this.props.doneChooseInfluence();
    }

    render() {
        return (
            <div className="bg-surface-container border border-error/40 p-6 w-full max-w-xl mx-4 animate-card-draw">
                <div className="font-label text-[10px] tracking-[0.4em] uppercase text-error mb-2">
                    INFLUENCE COMPROMISED
                </div>
                <p className="font-headline text-lg text-on-surface mb-1 tracking-tight">
                    CHOOSE INFLUENCE TO SACRIFICE
                </p>
                <p className="font-body text-xs text-outline mb-6 leading-relaxed">
                    Select one operative identity to eliminate permanently.
                </p>

                <div className="flex gap-4 justify-center flex-wrap">
                    {this.props.influences.map((influence, index) => {
                        const key   = influence.toLowerCase();
                        const color = INFLUENCE_COLORS[key] || '#a88a86';
                        const icon  = INFLUENCE_ICONS[key]  || 'help';
                        const desc  = INFLUENCE_DESC[key]   || '';
                        return (
                            <button
                                key={index}
                                onClick={() => this.selectInfluence(influence)}
                                className="relative w-36 h-48 bg-surface-container-highest shadow-lg transition-transform duration-300 hover:-translate-y-3 hover:border-error/50 cursor-pointer select-none text-left border border-error/20"
                                style={{ borderTop: `4px solid ${color}` }}
                            >
                                <div className="p-3 h-full flex flex-col relative z-10">
                                    <div className="flex justify-between items-start">
                                        <span className="font-headline text-sm leading-tight" style={{ color }}>
                                            {influence.toUpperCase()}
                                        </span>
                                        <span className="material-symbols-outlined text-base" style={{ color }}>
                                            {icon}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex-grow flex items-center justify-center bg-surface-container/50">
                                        <span className="font-headline text-5xl opacity-10 select-none" style={{ color }}>
                                            {influence[0].toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        <p className="font-label text-[8px] uppercase tracking-widest mb-1" style={{ color }}>
                                            SACRIFICE
                                        </p>
                                        <p className="font-body text-[8px] text-on-surface/60 leading-tight">{desc}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )
    }
}
