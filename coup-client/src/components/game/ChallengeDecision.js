import React, { Component } from 'react'

const INFLUENCE_COLORS = {
    duke: '#bbcf83', captain: '#a88a86', assassin: '#9a1a1a',
    contessa: '#ffb4ac', ambassador: '#cdc6b2',
};

const ACTION_INFLUENCE = {
    steal: 'captain', tax: 'duke', assassinate: 'assassin', exchange: 'ambassador',
};

export default class ChallengeDecision extends Component {

    vote = (isChallenging) => {
        this.props.closeOtherVotes('challenge')

        const res = {
            action: this.props.action,
            isChallenging,
            challengee: this.props.action.source,
            challenger: this.props.name
        }
        console.log(res)
        this.props.socket.emit('g-challengeDecision', res);
        this.props.doneChallengeVote();
    }

    challengeText = (action, source, target) => {
        const name = (n) => (
            <span style={{ color: '#ffb4ac' }} className="font-label">{n}</span>
        );
        if (action === 'steal') {
            return <span>{name(source)} claims CAPTAIN — stealing from {name(target)}</span>
        } else if (action === 'tax') {
            return <span>{name(source)} claims DUKE — collecting 3 coins from treasury</span>
        } else if (action === 'assassinate') {
            return <span>{name(source)} claims ASSASSIN — targeting {name(target)}</span>
        } else if (action === 'exchange') {
            return <span>{name(source)} claims AMBASSADOR — exchanging influences</span>
        }
        return null;
    }

    render() {
        const { action } = this.props;
        const influenceKey = ACTION_INFLUENCE[action.action];
        const influenceColor = INFLUENCE_COLORS[influenceKey] || '#a88a86';

        return (
            <div>
                <div
                    className="font-label text-[10px] tracking-[0.4em] uppercase mb-3"
                    style={{ color: influenceColor }}
                >
                    INTELLIGENCE VERIFICATION
                </div>
                <p className="font-body text-sm text-on-surface/80 mb-4 leading-relaxed">
                    {this.challengeText(action.action, action.source, action.target)}
                </p>
                <button
                    onClick={() => this.vote(true)}
                    className="w-full bg-primary-container hover:bg-[#7a1414] text-[#f1e0ce] py-3 font-label text-xs tracking-widest uppercase transition-all"
                >
                    CHALLENGE CLAIM
                </button>
            </div>
        )
    }
}
