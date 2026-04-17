const PHASES = {
  IDLE: "IDLE",
  ACTION_PENDING: "ACTION_PENDING",
  CHALLENGE_OPEN: "CHALLENGE_OPEN",
  BLOCK_OPEN: "BLOCK_OPEN",
  BLOCK_CHALLENGE_OPEN: "BLOCK_CHALLENGE_OPEN",
  REVEAL_PENDING: "REVEAL_PENDING",
  CHOOSE_INFLUENCE_PENDING: "CHOOSE_INFLUENCE_PENDING",
  EXCHANGE_PENDING: "EXCHANGE_PENDING",
  GAME_OVER: "GAME_OVER",
};

const EVENTS = {
  TURN_STARTED: "TURN_STARTED",
  ACTION_CHOSEN: "ACTION_CHOSEN",
  CHALLENGE_VOTE: "CHALLENGE_VOTE",
  BLOCK_VOTE: "BLOCK_VOTE",
  BLOCK_CHALLENGE_VOTE: "BLOCK_CHALLENGE_VOTE",
  REVEAL_SUBMITTED: "REVEAL_SUBMITTED",
  INFLUENCE_CHOSEN: "INFLUENCE_CHOSEN",
  EXCHANGE_CHOSEN: "EXCHANGE_CHOSEN",
  PLAY_AGAIN: "PLAY_AGAIN",
};

function createCoupStateMachine({ emit, emitTo }) {
  let phase = PHASES.IDLE;
  let context = {};
  const enterHandlers = {};
  const exitHandlers = {};

  function transition(toPhase, newContext = {}) {
    // Only fire exit when actually leaving the current phase
    if (phase !== toPhase && exitHandlers[phase]) exitHandlers[phase](context);
    phase = toPhase;
    context = Object.freeze({ ...newContext });
    if (enterHandlers[phase]) enterHandlers[phase](context);
  }

  function dispatch(event, payload) {
    switch (event) {
      case EVENTS.ACTION_CHOSEN: {
        if (phase !== PHASES.ACTION_PENDING) return;
        const { action, isChallengeable, isBlockable } = payload;
        if (isChallengeable) {
          transition(PHASES.CHALLENGE_OPEN, { action, isBlockable });
        } else if (isBlockable) {
          transition(PHASES.BLOCK_OPEN, { action });
        } else {
          transition(PHASES.IDLE, { pendingAction: action });
        }
        break;
      }

      case EVENTS.CHALLENGE_VOTE: {
        if (phase !== PHASES.CHALLENGE_OPEN) return;
        const ctx = context;
        if (payload.isChallenging) {
          transition(PHASES.REVEAL_PENDING, {
            action: ctx.action,
            challenger: payload.challenger,
            challengee: payload.challengee,
            isBlock: false,
          });
        } else if (context.votes + 1 >= context.eligibleVoters) {
          if (ctx.isBlockable) {
            transition(PHASES.BLOCK_OPEN, { action: ctx.action });
          } else {
            transition(PHASES.IDLE, { pendingAction: ctx.action });
          }
        } else {
          transition(PHASES.CHALLENGE_OPEN, {
            ...ctx,
            votes: ctx.votes + 1,
          });
        }
        break;
      }

      case EVENTS.BLOCK_VOTE: {
        if (phase !== PHASES.BLOCK_OPEN) return;
        const ctx = context;
        if (payload.isBlocking) {
          transition(PHASES.BLOCK_CHALLENGE_OPEN, {
            counterAction: payload.counterAction,
            prevAction: ctx.action,
            blockee: payload.blockee,
            blocker: payload.blocker,
            votes: 0,
            eligibleVoters: ctx.eligibleVoters,
          });
        } else if (ctx.votes + 1 >= ctx.eligibleVoters) {
          transition(PHASES.IDLE, { pendingAction: ctx.action });
        } else {
          transition(PHASES.BLOCK_OPEN, {
            ...ctx,
            votes: ctx.votes + 1,
          });
        }
        break;
      }

      case EVENTS.BLOCK_CHALLENGE_VOTE: {
        if (phase !== PHASES.BLOCK_CHALLENGE_OPEN) return;
        const ctx = context;
        if (payload.isChallenging) {
          transition(PHASES.REVEAL_PENDING, {
            action: ctx.prevAction,
            counterAction: ctx.counterAction,
            challenger: payload.challenger,
            challengee: ctx.blocker,
            isBlock: true,
          });
        } else if (ctx.votes + 1 >= ctx.eligibleVoters) {
          transition(PHASES.IDLE, { pendingAction: null }); // block succeeded
        } else {
          transition(PHASES.BLOCK_CHALLENGE_OPEN, {
            ...ctx,
            votes: ctx.votes + 1,
          });
        }
        break;
      }

      case EVENTS.REVEAL_SUBMITTED: {
        if (phase !== PHASES.REVEAL_PENDING) return;
        transition(PHASES.CHOOSE_INFLUENCE_PENDING, { ...context, ...payload });
        break;
      }

      case EVENTS.INFLUENCE_CHOSEN: {
        if (phase !== PHASES.CHOOSE_INFLUENCE_PENDING) return;
        transition(PHASES.IDLE, {
          ...context,
          chosenInfluence: payload.influence,
        });
        break;
      }

      case EVENTS.EXCHANGE_CHOSEN: {
        if (phase !== PHASES.EXCHANGE_PENDING) return;
        transition(PHASES.IDLE, {
          ...context,
          kept: payload.kept,
          putBack: payload.putBack,
        });
        break;
      }

      case EVENTS.PLAY_AGAIN: {
        transition(PHASES.IDLE, {});
        break;
      }
    }
  }

  return {
    getPhase: () => phase,
    getContext: () => context,
    in: (p) => phase === p,
    dispatch,
    onEnter: (p, fn) => {
      enterHandlers[p] = fn;
    },
    onExit: (p, fn) => {
      exitHandlers[p] = fn;
    },
    transition,
  };
}

module.exports = { createCoupStateMachine, PHASES, EVENTS };
