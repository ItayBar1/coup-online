import React, { useEffect } from 'react'

export default function CoinAnimation({ startX, startY, endX, endY, onDone }) {
    useEffect(() => {
        const timer = setTimeout(onDone, 850);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <div
            className="fixed pointer-events-none z-[95] animate-coin-transfer"
            style={{
                left: startX - 12,
                top:  startY - 12,
                '--tx': `${endX - startX}px`,
                '--ty': `${endY - startY}px`,
            }}
        >
            <span
                className="material-symbols-outlined text-2xl drop-shadow-lg"
                style={{ color: '#bbcf83' }}
            >
                payments
            </span>
        </div>
    );
}
