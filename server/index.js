const express = require("express");
const moment = require("moment");

// Server/express setup
const app = express();
const cors = require("cors");
app.use(cors());
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const CoupGame = require("./game/coup");
const utilities = require("./utilities/utilities");
const { DefaultSettings } = require("./utilities/constants");

// Constants
const port = 8000;

let namespaces = {}; //AKA party rooms

function validateSettings(s) {
  const clamp = (v, min, max, def) => {
    const n = parseInt(v);
    return isNaN(n) ? def : Math.max(min, Math.min(max, n));
  };
  return {
    maxPlayers: clamp(s.maxPlayers, 2, 6, DefaultSettings.maxPlayers),
    turnTimeLimit: clamp(s.turnTimeLimit, 3, 60, DefaultSettings.turnTimeLimit),
    challengeTimeLimit: clamp(
      s.challengeTimeLimit,
      3,
      60,
      DefaultSettings.challengeTimeLimit
    ),
    exchangeTimeLimit: clamp(
      s.exchangeTimeLimit,
      3,
      60,
      DefaultSettings.exchangeTimeLimit
    ),
  };
}

app.get("/createNamespace", function (req, res) {
  let newNamespace = "";
  while (newNamespace === "" || newNamespace in namespaces) {
    newNamespace = utilities.generateNamespace(); //default length 6
  }
  const newSocket = io.of(`/${newNamespace}`);
  openSocket(newSocket, `/${newNamespace}`);
  namespaces[newNamespace] = null;
  console.log(newNamespace + " CREATED");
  res.json({ namespace: newNamespace });
});

app.get("/exists/:namespace", function (req, res) {
  //returns bool
  const namespace = req.params.namespace;
  res.json({ exists: namespace in namespaces });
});

//game namespace: oneRoom
openSocket = (gameSocket, namespace) => {
  let players = []; //includes deleted for index purposes
  let partyMembers = []; //actual members
  let partyLeader = "";
  let started = false;
  let settings = { ...DefaultSettings };

  gameSocket.on("connection", (socket) => {
    console.log("id: " + socket.id);
    players.push({
      player: "",
      socket_id: `${socket.id}`,
      isReady: false,
    });
    console.log(`player ${players.length} has connected`);
    socket.join(socket.id);
    console.log("socket joined " + socket.id);
    const index = players.length - 1;

    const updatePartyList = () => {
      partyMembers = players
        .map((x) => {
          return { name: x.player, socketID: x.socket_id, isReady: x.isReady };
        })
        .filter((x) => x.name != "");
      console.log(partyMembers);
      gameSocket.emit("partyUpdate", partyMembers);
    };

    socket.on("setName", (name) => {
      //when client joins, it will immediately set its name
      console.log(started);
      if (started) {
        gameSocket
          .to(players[index].socket_id)
          .emit("joinFailed", "game_already_started");
        return;
      }
      if (!players.map((x) => x.player).includes(name)) {
        if (partyMembers.length >= settings.maxPlayers) {
          gameSocket
            .to(players[index].socket_id)
            .emit("joinFailed", "party_full");
        } else {
          if (partyMembers.length == 0) {
            partyLeader = players[index].socket_id;
            players[index].isReady = true;
            gameSocket.to(players[index].socket_id).emit("leader");
            console.log("PARTY LEADER IS: " + partyLeader);
          }
          players[index].player = name;
          console.log(players[index]);
          updatePartyList();
          gameSocket
            .to(players[index].socket_id)
            .emit("joinSuccess", players[index].socket_id);
          gameSocket
            .to(players[index].socket_id)
            .emit("settingsUpdate", settings);
        }
      } else {
        gameSocket
          .to(players[index].socket_id)
          .emit("joinFailed", "name_taken");
      }
    });
    socket.on("setReady", (isReady) => {
      //when client is ready, they will update this
      console.log(`${players[index].player} is ready`);
      players[index].isReady = isReady;
      updatePartyList();
      gameSocket.to(players[index].socket_id).emit("readyConfirm");
    });

    socket.on("updateSettings", (newSettings) => {
      if (socket.id !== partyLeader) return; // only leader can change settings
      settings = validateSettings(newSettings);
      console.log("Settings updated:", settings);
      gameSocket.emit("settingsUpdate", settings);
    });

    socket.on("startGameSignal", (players) => {
      started = true;
      gameSocket.emit("startGame");
      startGame(players, gameSocket, namespace, settings);
    });

    socket.on("disconnect", () => {
      console.log("disconnected: " + socket.id);
      players.map((x, index) => {
        if (x.socket_id == socket.id) {
          gameSocket.emit(
            "g-addLog",
            `${JSON.stringify(players[index].player)} has disconnected`
          );
          gameSocket.emit("g-addLog", "Please recreate the game.");
          gameSocket.emit("g-addLog", "Sorry for the inconvenience (シ_ _)シ");
          players[index].player = "";
          if (socket.id === partyLeader) {
            console.log("Leader has disconnected");
            gameSocket.emit("leaderDisconnect", "leader_disconnected");
            socket.removeAllListeners();
            delete io.nsps[namespace];
            delete namespaces[namespace.substring(1)];
            players = [];
            partyMembers = [];
          }
        }
      });
      console.log(Object.keys(gameSocket["sockets"]).length);
      updatePartyList();
    });
  });
  let checkEmptyInterval = setInterval(() => {
    if (Object.keys(gameSocket["sockets"]).length == 0) {
      delete io.nsps[namespace];
      if (namespaces[namespace] != null) {
        delete namespaces[namespace.substring(1)];
      }
      clearInterval(checkEmptyInterval);
      console.log(namespace + "deleted");
    }
  }, 10000);
};

startGame = (players, gameSocket, namespace, settings) => {
  namespaces[namespace.substring(1)] = new CoupGame(
    players,
    gameSocket,
    settings
  );
  namespaces[namespace.substring(1)].start();
};

server.listen(process.env.PORT || port, function () {
  console.log(`listening on ${process.env.PORT || port}`);
});
