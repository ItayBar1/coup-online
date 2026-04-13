import React from 'react';

export default function GameStatusHeader({ currentPlayer, myName, winner, secondsLeft }) {
  const isMyTurn = currentPlayer === myName;

  return (
    <div className="flex justify-between items-start mb-6 shrink-0">
      <div>
        <h2 className="font-headline text-3xl font-extrabold text-on-background tracking-tighter uppercase mb-1">
          GAME STATUS
        </h2>
        <div className="flex items-center gap-2">
          {winner ? (
            <p className="font-label text-sm text-primary tracking-widest">{winner}</p>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isMyTurn ? 'bg-tertiary animate-pulse' : 'bg-outline'
                }`}
              />
              <p className={`font-label text-sm tracking-widest ${isMyTurn ? 'text-tertiary' : 'text-outline'}`}>
                {isMyTurn
                  ? 'YOUR TURN: SELECT ACTION'
                  : currentPlayer
                  ? `${currentPlayer}'S TURN`
                  : 'WAITING...'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Countdown badge */}
      {secondsLeft !== null && secondsLeft !== undefined && (
        <div className="flex items-center gap-2 bg-error-container/80 px-4 py-2 border border-error/30">
          <span className={`w-2 h-2 rounded-full bg-error shrink-0 ${secondsLeft <= 5 ? 'animate-pulse' : ''}`} />
          <span className="font-label text-sm text-error tracking-widest">{secondsLeft}s TO DECIDE</span>
        </div>
      )}
    </div>
  );
}
