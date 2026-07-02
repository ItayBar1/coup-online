const constants = require("../utilities/constants");

const COPIES_PER_CARD = 3;

const PLAYER_COLORS = [
  "#73C373",
  "#7AB8D3",
  "#DD6C75",
  "#8C6CE6",
  "#EA9158",
  "#CB8F8F",
  "#FFC303",
];

const shuffleArray = (arr) => {
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildDeck = () => {
  const deck = [];
  for (const card of constants.CardNames.values()) {
    for (let i = 0; i < COPIES_PER_CARD; i++) {
      deck.push(card);
    }
  }
  return shuffleArray(deck);
};

const buildNameSocketMap = (players) => {
  const map = {};
  players.forEach((x) => {
    map[x.name] = x.socketID;
  });
  return map;
};

const buildNameIndexMap = (players) => {
  const map = {};
  players.forEach((x, index) => {
    map[x.name] = index;
  });
  return map;
};

const buildPlayers = (players) => {
  const colors = shuffleArray([...PLAYER_COLORS]);

  players.forEach((x) => {
    delete x.chosen;
    delete x.isReady;
    x.money = 2;
    x.influences = [];
    x.revealedInfluences = [];
    x.isDead = false;
    x.color = colors.pop();
  });
  return players;
};

const exportPlayers = (players) => {
  players.forEach((x) => {
    delete x.socketID;
  });
  return players;
};

module.exports = {
  buildDeck,
  buildPlayers,
  exportPlayers,
  shuffleArray,
  buildNameSocketMap,
  buildNameIndexMap,
};
