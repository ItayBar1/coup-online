import React, { Component } from 'react'
import ActionDecision from './ActionDecision';
import ChallengeDecision from './ChallengeDecision';
import BlockChallengeDecision from './BlockChallengeDecision';
import PlayerBoard from './PlayerBoard';
import RevealDecision from './RevealDecision';
import BlockDecision from './BlockDecision';
import ChooseInfluence from './ChooseInfluence';
import ExchangeInfluences from './ExchangeInfluences';
import './CoupStyles.css';
import EventLog from './EventLog';
import ReactModal from 'react-modal';
import CheatSheetModal from '../CheatSheetModal';
import RulesModal from '../RulesModal';

export default class Coup extends Component {

    constructor(props) {
        super(props)

        this.countdownInterval = null;

        this.state = {
             action: null,
             blockChallengeRes: null,
             players: [],
             playerIndex: null,
             currentPlayer: '',
             isChooseAction: false,
             revealingRes: null,
             blockingAction: null,
             isChoosingInfluence: false,
             exchangeInfluence: null,
             error: '',
             winner: '',
             playAgain: null,
             logs: [],
             isDead: false,
             waiting: true,
             disconnected: false,
             secondsLeft: null,
        }
        const bind = this;

        this.playAgainButton = <>
        <br></br>
        <button className="startGameButton" onClick={() => {
            this.props.socket.emit('g-playAgain');
        }}>Play Again</button>
        </>

        this.props.socket.on('disconnect', reason => {
            this.setState({ disconnected: true });
        })

        this.props.socket.on('g-gameOver', (winner) => {
            bind.setState({winner: `${winner} Wins!`})
            bind.setState({playAgain: bind.playAgainButton})
        })
        this.props.socket.on('g-updatePlayers', (players) => {
            bind.setState({playAgain: null})
            bind.setState({winner: null})
            players = players.filter(x => !x.isDead);
            let playerIndex = null;
            for(let i = 0; i < players.length; i++) {
                console.log(players[i].name, this.props.name)
                if(players[i].name === this.props.name) {
                    playerIndex = i;
                    break;
                }
            }
            if(playerIndex == null) {
                this.setState({ isDead: true })
            }else {
                this.setState({ isDead: false})
            }
            console.log(playerIndex)
            bind.setState({playerIndex, players});
        });
        this.props.socket.on('g-updateCurrentPlayer', (currentPlayer) => {
            console.log('currentPlayer: ', currentPlayer)
            bind.setState({ currentPlayer });
        });
        this.props.socket.on('g-addLog', (log) => {
            let splitLog=  log.split(' ');
            let coloredLog = [];
            coloredLog = splitLog.map((item, index) => {
                let found = null
                bind.state.players.forEach(player => {
                    if(item === player.name){
                        found = <b style={{color: player.color}}>{player.name} </b>;
                    }
                })
                if(found){
                    return found;
                }
                return <>{item+' '}</>
            })
            bind.state.logs = [...bind.state.logs, coloredLog]
            bind.setState({logs :bind.state.logs})
        })
        this.props.socket.on('g-chooseAction', () => {
            bind.setState({ isChooseAction: true})
        });
        this.props.socket.on('g-openExchange', (drawTwo) => {
            let influences = [...bind.state.players[bind.state.playerIndex].influences, ...drawTwo];
            bind.setState({ exchangeInfluence: influences });
        })

        // Sequential challenge phase — server sends { action, timeLimit }
        this.props.socket.on('g-openChallenge', ({ action, timeLimit }) => {
            if(this.state.isDead) return;
            if(action.source !== bind.props.name) {
                bind.setState({ action });
                bind.startCountdown(timeLimit);
            }
        });

        // Block challenge phase — server sends { counterAction, prevAction, timeLimit }
        this.props.socket.on('g-openBlockChallenge', ({ counterAction, prevAction, timeLimit }) => {
            if(this.state.isDead) return;
            if(counterAction.source !== bind.props.name) {
                bind.setState({ blockChallengeRes: { counterAction, prevAction } });
                bind.startCountdown(timeLimit);
            }
        });

        // Block phase — server sends { action, timeLimit }
        // For steal/assassinate: only the target receives this event.
        // For foreign_aid: all players except source receive it.
        this.props.socket.on('g-openBlock', ({ action, timeLimit }) => {
            if(this.state.isDead) return;
            if(action.source !== bind.props.name) {
                bind.setState({ blockingAction: action });
                bind.startCountdown(timeLimit);
            }
        });

        this.props.socket.on('g-chooseReveal', (res) => {
            console.log(res)
            bind.setState({ revealingRes: res});
        });
        this.props.socket.on('g-chooseInfluence', () => {
            bind.setState({ isChoosingInfluence: true });
        });
        this.props.socket.on('g-closeChallenge', () => {
            bind.setState({ action: null });
            bind.stopCountdown();
        });
        this.props.socket.on('g-closeBlock', () => {
            bind.setState({ blockingAction: null });
            bind.stopCountdown();
        });
        this.props.socket.on('g-closeBlockChallenge', () => {
            bind.setState({ blockChallengeRes: null });
            bind.stopCountdown();
        });
    }

    componentWillUnmount() {
        clearInterval(this.countdownInterval);
    }

    startCountdown = (timeLimit) => {
        clearInterval(this.countdownInterval);
        const endTime = Date.now() + timeLimit;
        this.setState({ secondsLeft: Math.ceil(timeLimit / 1000) });
        this.countdownInterval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000);
            if(remaining <= 0) {
                clearInterval(this.countdownInterval);
                this.setState({ secondsLeft: 0 });
            } else {
                this.setState({ secondsLeft: remaining });
            }
        }, 500);
    }

    stopCountdown = () => {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.setState({ secondsLeft: null });
    }

    doneAction = () => {
        this.setState({ isChooseAction: false })
    }

    doneChallengeBlockingVote = () => {
        this.setState({ action: null });
        this.setState({ blockChallengeRes: null });
        this.setState({ blockingAction: null });
        this.stopCountdown();
    }

    closeOtherVotes = (voteType) => {
        if(voteType === 'challenge') {
            this.setState({ blockChallengeRes: null });
            this.setState({ blockingAction: null });
        }else if(voteType === 'block') {
            this.setState({ action: null });
            this.setState({ blockChallengeRes: null });
        }else if(voteType === 'challenge-block') {
            this.setState({ action: null });
            this.setState({ blockingAction: null });
        }
        this.stopCountdown();
    }

    doneReveal = () => {
        this.setState({ revealingRes: null });
    }

    doneChooseInfluence = () => {
        this.setState({ isChoosingInfluence: false })
    }

    doneExchangeInfluence = () => {
        this.setState({ exchangeInfluence: null })
    }

    pass = () => {
        if(this.state.action != null) { //challengeDecision
            let res = {
                isChallenging: false,
                action: this.state.action
            }
            console.log(res)
            this.props.socket.emit('g-challengeDecision', res);
        }else if(this.state.blockChallengeRes != null) { //BlockChallengeDecision
            let res = {
                isChallenging: false
            }
            console.log(res)
            this.props.socket.emit('g-blockChallengeDecision', res);
        }else if(this.state.blockingAction !== null) { //BlockDecision
            const res = {
                action: this.state.blockingAction,
                isBlocking: false
            }
            console.log(res)
            this.props.socket.emit('g-blockDecision', res)
        }
        this.doneChallengeBlockingVote();
    }

    influenceColorMap = {
        duke: '#D55DC7',
        captain: '#80C6E5',
        assassin: '#2B2B2B',
        contessa: '#E35646',
        ambassador: '#B4CA1F'
    }

    render() {
        let actionDecision = null
        let currentPlayer = null
        let revealDecision = null
        let challengeDecision = null
        let blockChallengeDecision = null
        let chooseInfluenceDecision = null
        let blockDecision = null
        let influences = null
        let pass = null
        let coins = null
        let exchangeInfluences = null
        let playAgain = null
        let countdown = null
        let isWaiting = true
        let waiting = null

        if(this.state.isChooseAction && this.state.playerIndex != null) {
            isWaiting = false;
            actionDecision = <ActionDecision doneAction={this.doneAction} name={this.props.name} socket={this.props.socket} money={this.state.players[this.state.playerIndex].money} players={this.state.players}></ActionDecision>
        }
        if(this.state.currentPlayer) {
            currentPlayer = <p>It is <b>{this.state.currentPlayer}</b>'s turn</p>
        }
        if(this.state.revealingRes) {
            isWaiting = false;
            revealDecision = <RevealDecision doneReveal={this.doneReveal} name ={this.props.name} socket={this.props.socket} res={this.state.revealingRes} influences={this.state.players.filter(x => x.name === this.props.name)[0].influences}></RevealDecision>
        }
        if(this.state.isChoosingInfluence) {
            isWaiting = false;
            chooseInfluenceDecision = <ChooseInfluence doneChooseInfluence={this.doneChooseInfluence} name ={this.props.name} socket={this.props.socket} influences={this.state.players.filter(x => x.name === this.props.name)[0].influences}></ChooseInfluence>
        }
        if(this.state.action != null || this.state.blockChallengeRes != null || this.state.blockingAction !== null){
            pass = <button onClick={() => this.pass()}>Pass</button>
        }
        if(this.state.action != null) {
            isWaiting = false;
            challengeDecision = <ChallengeDecision closeOtherVotes={this.closeOtherVotes} doneChallengeVote={this.doneChallengeBlockingVote} name={this.props.name} action={this.state.action} socket={this.props.socket} ></ChallengeDecision>
        }
        if(this.state.exchangeInfluence) {
            isWaiting = false;
            exchangeInfluences = <ExchangeInfluences doneExchangeInfluence={this.doneExchangeInfluence} name={this.props.name} influences={this.state.exchangeInfluence} socket={this.props.socket}></ExchangeInfluences>
        }
        if(this.state.blockChallengeRes != null) {
            isWaiting = false;
            blockChallengeDecision = <BlockChallengeDecision closeOtherVotes={this.closeOtherVotes} doneBlockChallengeVote={this.doneChallengeBlockingVote} name={this.props.name} prevAction={this.state.blockChallengeRes.prevAction} counterAction={this.state.blockChallengeRes.counterAction} socket={this.props.socket} ></BlockChallengeDecision>
        }
        if(this.state.blockingAction !== null) {
            isWaiting = false;
            blockDecision = <BlockDecision closeOtherVotes={this.closeOtherVotes} doneBlockVote={this.doneChallengeBlockingVote} name={this.props.name} action={this.state.blockingAction} socket={this.props.socket} ></BlockDecision>
        }
        if(this.state.playerIndex != null && !this.state.isDead) {
            influences = <>
            <p>Your Influences</p>
                {this.state.players[this.state.playerIndex].influences.map((influence, index) => {
                    return  <div key={index} className="InfluenceUnitContainer">
                                <span className="circle" style={{backgroundColor: `${this.influenceColorMap[influence]}`}}></span>
                                <br></br>
                                <h3>{influence}</h3>
                            </div>
                    })
                }
            </>
            coins = <p>Coins: {this.state.players[this.state.playerIndex].money}</p>
        }
        if(isWaiting && !this.state.isDead) {
            waiting = <p>Waiting for other players...</p>
        }
        if(this.state.secondsLeft !== null && !this.state.isDead) {
            countdown = <p><b>{this.state.secondsLeft}s</b> to decide</p>
        }
        if(this.state.disconnected) {
            return (
                <div className="GameContainer">
                    <div className="GameHeader">
                        <div className="PlayerInfo">
                            <p>You are: {this.props.name}</p>
                            {coins}
                        </div>
                        <RulesModal/>
                        <CheatSheetModal/>
                    </div>
                    <p>You have been disconnected :c</p>
                    <p>Please recreate the game.</p>
                    <p>Sorry for the inconvenience (シ_ _)シ</p>
                </div>
            )
        }
        return (
            <div className="GameContainer">
                <div className="GameHeader">
                    <div className="PlayerInfo">
                        <p>You are: {this.props.name}</p>
                        {coins}
                    </div>
                    <div className="CurrentPlayer">
                        {currentPlayer}
                    </div>
                    <RulesModal/>
                    <CheatSheetModal/>
                    <EventLog logs={this.state.logs}></EventLog>
                </div>
                <div className="InfluenceSection">
                    {influences}
                </div>
                <PlayerBoard players={this.state.players}></PlayerBoard>
                <div className="DecisionsSection">
                    {waiting}
                    {countdown}
                    {revealDecision}
                    {chooseInfluenceDecision}
                    {actionDecision}
                    {exchangeInfluences}
                    {challengeDecision}
                    {blockChallengeDecision}
                    {blockDecision}
                    {pass}
                    {playAgain}
                </div>
                <b>{this.state.winner}</b>
                {this.state.playAgain}
            </div>
        )
    }
}
