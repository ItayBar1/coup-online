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
        let controls = null
        if(this.state.isPickingTarget) {
            controls = this.props.players.filter(x => !x.isDead).filter(x => x.name !== this.props.name).map((x, index) => {
                return <button style={{ backgroundColor: x.color}} key={index} onClick={() => this.pickTarget(x.name)}>{x.name}</button>
            })
        } else if(this.props.money < 10) {
           controls = ( 
           <>   
                <button onClick={() => this.chooseAction('income')}>Income</button>
                <button onClick={() => this.pickingTarget('coup')}>Coup</button>
                <button onClick={() => this.chooseAction('foreign_aid')}>Foreign Aid</button>
                <button id="captain" onClick={() => this.pickingTarget('steal')}>Steal</button>
                <button id="assassin" onClick={() => this.pickingTarget('assassinate')}>Assassinate</button>
                <button id="duke" onClick={() => this.chooseAction('tax')}>Tax</button>
                <button id="ambassador" onClick={() => this.chooseAction('exchange')}>Exchange</button>
           </> 
           )
        } else { //money over 10, has to coup
            controls = <button onClick={() => this.pickingTarget('coup')}>Coup</button>
        }
        return (<>
            <p className="DecisionTitle">Choose an action</p>
            <div className="DecisionButtonsContainer">
               {controls}
               <p>{this.state.actionError}</p>
            </div>
            </>
        )
    }
}
