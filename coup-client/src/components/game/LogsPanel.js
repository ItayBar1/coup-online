import React from 'react'
import EventLog from './EventLog'

export default function LogsPanel({ logs }) {
    return (
        <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="font-label text-[10px] tracking-[0.4em] uppercase text-outline mb-1">LOGS</div>
            <h2 className="font-headline text-xl text-on-surface tracking-tight mb-4">OPERATION LOGS</h2>
            {logs.length === 0 ? (
                <p className="font-label text-[10px] tracking-widest text-outline/40 uppercase">
                    NO EVENTS RECORDED
                </p>
            ) : (
                <EventLog logs={logs} />
            )}
        </div>
    );
}
