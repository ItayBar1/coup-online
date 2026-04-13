import React, { Component } from 'react'

export default class EventLog extends Component {

    scrollToBottom = () => {
        if (this.messagesEnd) {
            this.messagesEnd.scrollIntoView({ behavior: "smooth" });
        }
    }

    componentDidMount() {
        this.scrollToBottom();
    }

    componentDidUpdate() {
        this.scrollToBottom();
    }

    render() {
        const { logs } = this.props;
        return (
            <div className="space-y-px">
                {logs.map((x, index) => {
                    const isNew = index === logs.length - 1;
                    return (
                        <div
                            key={index}
                            className={`font-label text-xs leading-relaxed py-1.5 px-2 border-b border-outline-variant/10 ${
                                isNew
                                    ? 'animate-fade-slide-up text-on-surface/90 bg-surface-container-high/30'
                                    : 'text-on-surface/60'
                            }`}
                        >
                            <span className="text-outline/40 mr-2 select-none tabular-nums">
                                {String(index + 1).padStart(3, '0')}
                            </span>
                            {x}
                        </div>
                    );
                })}
                <div ref={(el) => { this.messagesEnd = el; }} />
            </div>
        )
    }
}
