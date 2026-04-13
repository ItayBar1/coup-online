const CardNames = {
  DUKE: "duke",
  ASSASSIN: "assassin",
  CAPTAIN: "captain",
  AMBASSADOR: "ambassador",
  CONTESSA: "contessa",
  values: function () {
    return [
      this.DUKE,
      this.ASSASSIN,
      this.CAPTAIN,
      this.AMBASSADOR,
      this.CONTESSA,
    ];
  },
};

const Actions = {
  income: {
    influence: "all",
    blockableBy: [],
    isChallengeable: false,
    moneyDelta: 1,
  },
  foreign_aid: {
    influence: "all",
    blockableBy: [CardNames.DUKE],
    isChallengeable: false,
    moneyDelta: 2,
  },
  coup: {
    influence: "all",
    blockableBy: [],
    isChallengeable: false,
    moneyDelta: -7,
  },
  tax: {
    influence: CardNames.DUKE,
    blockableBy: [],
    isChallengeable: true,
    moneyDelta: 3,
  },
  assassinate: {
    influence: CardNames.ASSASSIN,
    blockableBy: [CardNames.CONTESSA],
    isChallengeable: true,
    moneyDelta: -3,
  },
  exchange: {
    influence: CardNames.AMBASSADOR,
    blockableBy: [],
    isChallengeable: true,
    moneyDelta: 0,
  },
  steal: {
    influence: CardNames.CAPTAIN,
    blockableBy: [CardNames.AMBASSADOR, CardNames.CAPTAIN],
    isChallengeable: true,
    moneyDelta: 2, // EDGE CASE: if victim only has 1 or 0 coins
  },
};

const CounterActions = {
  block_foreign_aid: {
    influences: [CardNames.DUKE],
  },
  block_steal: {
    influences: [CardNames.AMBASSADOR, CardNames.CAPTAIN],
  },
  block_assassinate: {
    influences: [CardNames.CONTESSA],
  },
};

const Timeouts = {
  CHALLENGE: 5000, // ms for challenge window
  BLOCK: 5000, // ms for block window
  BLOCK_CHALLENGE: 5000, // ms for block-challenge window
};

const DefaultSettings = {
  maxPlayers: 6, // 2–6
  turnTimeLimit: 30, // seconds, 3–60
  challengeTimeLimit: 10, // seconds, 3–60
  exchangeTimeLimit: 30, // seconds, 3–60
};

module.exports = {
  CardNames: CardNames,
  Actions: Actions,
  CounterActions: CounterActions,
  Timeouts: Timeouts,
  DefaultSettings: DefaultSettings,
};
