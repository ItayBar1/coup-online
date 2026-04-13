import React, { Component } from 'react'

export default class ActionDecision extends Component {

    constructor(props) {
        super(props)
    
        this.state = {
            isDecisionMade: false,
            decision: '',
            isPickingTarget: false,
            targetAction: '',
            actionError: ''
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

    pickingTarget = (action) => {
        if(action === 'coup' && this.props.money < 7) {
            this.setState({ actionError: 'Not enough coins to coup!' });
            return;
        }
        if(action === 'assassinate' && this.props.money < 3) {
            this.setState({ actionError: 'Not enough coins to assassinate!' });
            return;
        }
        this.setState({
            isPickingTarget: true,
            targetAction: action,
            actionError: ''
        });
    }

    pickTarget = (target) => {
        this.chooseAction(this.state.targetAction, target);
    }

    render() {
        const { money, players, name, isActive } = this.props;
        const disabled = !isActive;
        const isForced = money >= 10;

        // Target picker overlay
        if (this.state.isPickingTarget) {
            const targets = (players || []).filter(x => !x.isDead && x.name !== name);
            return (
                <>
                    {/* Dimmed action bar placeholder */}
                    <footer className="fixed bottom-0 left-64 [@media(max-height:500px)]:left-14 right-0 h-24 [@media(max-height:500px)]:h-12 backdrop-blur-xl border-t border-[#59413e]/30 bg-[#231a0f]/80 z-20 flex items-center justify-center">
                        <span className="font-label text-[10px] tracking-[0.4em] uppercase text-outline">SELECT TARGET OPERATIVE</span>
                    </footer>
                    {/* Target picker */}
                    <div className="fixed inset-0 z-30 bg-surface/50 backdrop-blur-sm flex items-end justify-center pb-28">
                        <div className="bg-surface-container border border-outline-variant/30 p-6 w-full max-w-lg mx-4">
                            <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-4">
                                SELECT TARGET OPERATIVE
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {targets.map((player, index) => (
                                    <button
                                        key={index}
                                        className="border border-primary-container/50 bg-primary-container/10 hover:bg-primary-container/30 p-4 font-label text-sm tracking-widest text-on-surface transition-all"
                                        onClick={() => this.pickTarget(player.name)}
                                    >
                                        {player.name}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="w-full font-label text-xs tracking-widest text-outline hover:text-on-surface transition-colors p-2 border border-outline-variant/20"
                                onClick={() => this.setState({ isPickingTarget: false, actionError: '' })}
                            >
                                CANCEL
                            </button>
                            {this.state.actionError && (
                                <p className="font-label text-xs text-error mt-2 tracking-widest">{this.state.actionError}</p>
                            )}
                        </div>
                    </div>
                </>
            );
        }

        return (
            <footer
                className={`fixed bottom-0 left-64 [@media(max-height:500px)]:left-14 right-0 flex flex-row items-center h-24 [@media(max-height:500px)]:h-12 backdrop-blur-xl border-t border-[#59413e]/30 bg-[#231a0f]/80 z-20 transition-opacity ${
                    disabled ? 'opacity-40' : 'opacity-100'
                }`}
            >
                {/* Coin balance */}
                <div className="flex items-center gap-4 [@media(max-height:500px)]:gap-2 px-6 [@media(max-height:500px)]:px-3 border-r border-outline/10 h-full shrink-0">
                    <div className="w-10 h-10 [@media(max-height:500px)]:hidden bg-primary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-primary text-xl">person</span>
                    </div>
                    <div>
                        <span className="font-label text-[10px] text-outline uppercase block tracking-widest [@media(max-height:500px)]:hidden">BALANCE</span>
                        <span className="font-headline text-2xl [@media(max-height:500px)]:text-lg text-primary leading-none">
                            {String(money ?? 0).padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Standard actions */}
                <div className="flex gap-1 px-6 [@media(max-height:500px)]:px-2 border-r border-outline/10 h-full items-center shrink-0">
                    {!isForced && (
                        <>
                            <button
                                disabled={disabled}
                                onClick={() => this.chooseAction('income')}
                                className="flex flex-col items-center justify-center text-[#a88a86] py-2 px-4 hover:bg-[#3d3327] transition-all disabled:pointer-events-none"
                            >
                                <span className="material-symbols-outlined">payments</span>
                                <span className="font-label text-[9px] font-bold uppercase tracking-widest mt-1 [@media(max-height:500px)]:hidden">INCOME</span>
                            </button>
                            <button
                                disabled={disabled}
                                onClick={() => this.chooseAction('foreign_aid')}
                                className="flex flex-col items-center justify-center text-[#a88a86] py-2 px-4 hover:bg-[#3d3327] transition-all disabled:pointer-events-none"
                            >
                                <span className="material-symbols-outlined">vpn_key</span>
                                <span className="font-label text-[9px] font-bold uppercase tracking-widest mt-1 [@media(max-height:500px)]:hidden">FOREIGN AID</span>
                            </button>
                        </>
                    )}
                    <button
                        disabled={disabled}
                        onClick={() => this.pickingTarget('coup')}
                        className="flex flex-col items-center justify-center bg-[#9a1a1a] text-[#f5edd8] py-2 px-5 active:scale-95 transition-all shadow-[0_0_20px_rgba(154,26,26,0.4)] disabled:pointer-events-none"
                    >
                        <span className="material-symbols-outlined">gavel</span>
                        <span className="font-label text-[9px] font-bold uppercase tracking-widest mt-1 [@media(max-height:500px)]:hidden">COUP</span>
                    </button>
                </div>

                {/* Character actions */}
                {!isForced && (
                    <div className="flex gap-1 px-6 h-full items-center overflow-x-auto">
                        <button
                            disabled={disabled}
                            onClick={() => this.chooseAction('tax')}
                            className="flex flex-col items-center justify-center border border-[#bbcf83]/30 px-4 py-2 hover:bg-[#bbcf83]/10 transition-all min-w-[72px] disabled:pointer-events-none"
                        >
                            <span className="material-symbols-outlined text-[#bbcf83]">account_balance</span>
                            <span className="font-label text-[9px] text-[#bbcf83] mt-1 uppercase tracking-widest [@media(max-height:500px)]:hidden">TAX</span>
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => this.pickingTarget('assassinate')}
                            className="flex flex-col items-center justify-center border border-[#9a1a1a]/30 px-4 py-2 hover:bg-[#9a1a1a]/10 transition-all min-w-[72px] disabled:pointer-events-none"
                        >
                            <span className="material-symbols-outlined text-[#9a1a1a]">person_remove</span>
                            <span className="font-label text-[9px] text-[#9a1a1a] mt-1 uppercase tracking-widest [@media(max-height:500px)]:hidden">ASSASSINATE</span>
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => this.pickingTarget('steal')}
                            className="flex flex-col items-center justify-center border border-[#a88a86]/30 px-4 py-2 hover:bg-[#a88a86]/10 transition-all min-w-[72px] disabled:pointer-events-none"
                        >
                            <span className="material-symbols-outlined text-[#a88a86]">handshake</span>
                            <span className="font-label text-[9px] text-[#a88a86] mt-1 uppercase tracking-widest [@media(max-height:500px)]:hidden">STEAL</span>
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => this.chooseAction('exchange')}
                            className="flex flex-col items-center justify-center border border-[#cdc6b2]/30 px-4 py-2 hover:bg-[#cdc6b2]/10 transition-all min-w-[72px] disabled:pointer-events-none"
                        >
                            <span className="material-symbols-outlined text-[#cdc6b2]">currency_exchange</span>
                            <span className="font-label text-[9px] text-[#cdc6b2] mt-1 uppercase tracking-widest [@media(max-height:500px)]:hidden">EXCHANGE</span>
                        </button>
                    </div>
                )}

                {this.state.actionError && (
                    <p className="font-label text-xs text-error ml-4 tracking-widest shrink-0">{this.state.actionError}</p>
                )}
            </footer>
        );
    }
}
