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

export default class RevealDecision extends Component {

    constructor(props) {
        super(props)

        this.act = this.props.res.isBlock
            ? this.props.res.counterAction.counterAction
            : this.props.res.action.action

        this.actionMap = {
            tax:               ["duke"],
            assassinate:       ["assassin"],
            exchange:          ["ambassador"],
            steal:             ["captain"],
            block_foreign_aid: ["duke"],
            block_steal:       ["ambassador", "captain"],
            block_assassinate: ["contessa"],
        }
    }

    selectInfluence = (influence) => {
        const res = {
            revealedCard: influence,
            prevAction: this.props.res.action,
            counterAction: this.props.res.counterAction,
            challengee: this.props.res.challengee,
            challenger: this.props.res.challenger,
            isBlock: this.props.res.isBlock
        }
        console.log(res)
        this.props.socket.emit('g-revealDecision', res);
        this.props.doneReveal();
    }

    render() {
        const actLabel = this.act.replace(/_/g, ' ').toUpperCase();
        const required = (this.actionMap[this.act] || []).join(' or ').toUpperCase();

        return (
            <div className="bg-surface-container border border-outline-variant/30 p-6 w-full max-w-xl mx-4 animate-card-draw">
                <div className="font-label text-[10px] tracking-[0.4em] uppercase text-error mb-2">
                    CLAIM CHALLENGED
                </div>
                <p className="font-headline text-lg text-on-surface mb-1 tracking-tight">
                    {actLabel} UNDER SCRUTINY
                </p>
                <p className="font-body text-xs text-outline mb-6 leading-relaxed">
                    Reveal{' '}
                    <span className="text-on-surface/80">{required}</span>{' '}
                    to defend your claim — or lose influence.
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
                                className="relative w-36 h-48 bg-surface-container-highest shadow-lg transition-transform duration-300 hover:-translate-y-3 cursor-pointer select-none text-left"
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
                                            REVEAL
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
