import React, { Component } from 'react'

const INFLUENCE_COLORS = {
    duke: '#bbcf83', captain: '#a88a86', assassin: '#9a1a1a',
    contessa: '#ffb4ac', ambassador: '#cdc6b2',
};

const INFLUENCE_ICONS = {
    duke: 'shield_person', captain: 'vpn_key', assassin: 'person_remove',
    contessa: 'gavel', ambassador: 'currency_exchange',
};

export default class BlockDecision extends Component {

    constructor(props) {
        super(props)

        this.state = {
            isDecisionMade: false,
            decision: '',
            isPickingClaim: false,
            targetAction: ''
        }
    }

    chooseAction = (action, target = null) => {
        const res = {
            action: {
                action: action,
                target: target,
                source: this.props.name
            }
        }
        console.log(res)

        this.props.socket.emit('g-actionDecision', res)
        this.props.doneAction();
    }

    block = (block, claim = null) => {
        this.props.closeOtherVotes('block')
        let resClaim
        if (claim != null) {
            resClaim = claim;
        } else if (block === 'block_foreign_aid') {
            resClaim = 'duke'
        } else if (block === 'block_assassinate') {
            resClaim = 'contessa'
        } else {
            console.error('unknown claim, line 40')
        }

        const res = {
            prevAction: this.props.action,
            counterAction: {
                counterAction: block,
                claim: resClaim,
                source: this.props.name
            },
            blockee: this.props.action.source,
            blocker: this.props.name,
            isBlocking: true
        }
        console.log(res)
        this.props.socket.emit('g-blockDecision', res)
        this.props.doneBlockVote();
    }

    pass = () => {
        const res = {
            action: this.props.action,
            isBlocking: false
        }
        console.log(res)
        this.props.socket.emit('g-blockDecision', res)
        this.props.doneBlockVote();
    }

    pickClaim = (block) => {
        this.props.closeOtherVotes('block')
        this.setState({ decision: block })
        this.setState({ isPickingClaim: true })
    }

    render() {
        const { action } = this.props;

        if (this.state.isPickingClaim) {
            return (
                <div>
                    <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-3">
                        CLAIM YOUR ROLE
                    </div>
                    <p className="font-body text-sm text-on-surface/60 mb-4 leading-relaxed">
                        Which influence do you claim to block the steal?
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        {[
                            { claim: 'ambassador', label: 'AMBASSADOR', icon: 'currency_exchange' },
                            { claim: 'captain',    label: 'CAPTAIN',    icon: 'vpn_key' },
                        ].map(({ claim, label, icon }) => {
                            const color = INFLUENCE_COLORS[claim];
                            return (
                                <button
                                    key={claim}
                                    onClick={() => this.block(this.state.decision, claim)}
                                    className="flex flex-col items-center gap-2 p-4 border transition-all hover:opacity-90"
                                    style={{ borderColor: color + '50', backgroundColor: color + '18' }}
                                >
                                    <span className="material-symbols-outlined text-2xl" style={{ color }}>
                                        {icon}
                                    </span>
                                    <span className="font-label text-xs tracking-widest" style={{ color }}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        className="w-full font-label text-[10px] tracking-widest text-outline hover:text-on-surface transition-colors p-2 border border-outline-variant/20"
                        onClick={() => this.setState({ isPickingClaim: false })}
                    >
                        BACK
                    </button>
                </div>
            );
        }

        if (action.action === 'foreign_aid') {
            const color = INFLUENCE_COLORS.duke;
            return (
                <div>
                    <div className="font-label text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color }}>
                        COUNTERMEASURE AVAILABLE
                    </div>
                    <p className="font-body text-sm text-on-surface/80 mb-4 leading-relaxed">
                        <span style={{ color: '#ffb4ac' }} className="font-label">{action.source}</span>{' '}
                        attempts Foreign Aid. Claim DUKE to block.
                    </p>
                    <button
                        onClick={() => this.block('block_foreign_aid')}
                        className="w-full py-3 font-label text-xs tracking-widest uppercase transition-all border hover:opacity-90"
                        style={{ borderColor: color + '60', backgroundColor: color + '18', color }}
                    >
                        <span className="material-symbols-outlined text-sm align-middle mr-2">
                            {INFLUENCE_ICONS.duke}
                        </span>
                        BLOCK AS DUKE
                    </button>
                </div>
            );
        }

        if (action.action === 'steal') {
            return (
                <div>
                    <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-3">
                        COUNTERMEASURE AVAILABLE
                    </div>
                    <p className="font-body text-sm text-on-surface/80 mb-4 leading-relaxed">
                        <span style={{ color: '#ffb4ac' }} className="font-label">{action.source}</span>{' '}
                        attempts to steal from you. Claim AMBASSADOR or CAPTAIN to block.
                    </p>
                    <button
                        onClick={() => this.pickClaim('block_steal')}
                        className="w-full py-3 font-label text-xs tracking-widest uppercase transition-all border border-[#a88a86]/40 bg-[#a88a86]/10 text-[#a88a86] hover:bg-[#a88a86]/20"
                    >
                        BLOCK STEAL
                    </button>
                </div>
            );
        }

        if (action.action === 'assassinate') {
            const color = INFLUENCE_COLORS.contessa;
            return (
                <div>
                    <div className="font-label text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color }}>
                        COUNTERMEASURE AVAILABLE
                    </div>
                    <p className="font-body text-sm text-on-surface/80 mb-4 leading-relaxed">
                        <span style={{ color: '#ffb4ac' }} className="font-label">{action.source}</span>{' '}
                        attempts to assassinate you. Claim CONTESSA to block.
                    </p>
                    <button
                        onClick={() => this.block('block_assassinate')}
                        className="w-full py-3 font-label text-xs tracking-widest uppercase transition-all border hover:opacity-90"
                        style={{ borderColor: color + '60', backgroundColor: color + '18', color }}
                    >
                        <span className="material-symbols-outlined text-sm align-middle mr-2">
                            {INFLUENCE_ICONS.contessa}
                        </span>
                        BLOCK AS CONTESSA
                    </button>
                </div>
            );
        }

        return null;
    }
}
