const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const allUsers = {};

io.on("connection", (socket) => {
  console.log("Joined new websocket " + socket.id);

  allUsers[socket.id] = {
    socket: socket,
    online: true,
    playing: false,
    playerName: null,
  };

  socket.on("request_to_play", (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;
    let opponentPlayer = null;

    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      opponentPlayer.playing = true;
      currentUser.playing = true;

      opponentPlayer.socket.emit("opponentFound", {
        opponentName: currentUser.playerName,
        playingAs: "cross",
      });
      currentUser.socket.emit("opponentFound", {
        opponentName: opponentPlayer.playerName,
        playingAs: "circle",
      });

      console.log(
        `Opponent found: ${currentUser.playerName} vs ${opponentPlayer.playerName}`
      );
    } else {
      currentUser.socket.emit("opponentNotFound");
      console.log("Opponent not found for " + currentUser.playerName);
    }
  });

  socket.on("playerMoveFromClient", (data) => {
    const currentUser = allUsers[socket.id];
    if (!currentUser.playing) return;

    // Find the opponent
    let opponentPlayer = null;
    for (const key in allUsers) {
      if (allUsers[key].playing && key !== socket.id) {
        opponentPlayer = allUsers[key];
        break;
      }
    }

    if (opponentPlayer) {
      opponentPlayer.socket.emit("playerMoveFromServer", data.board);
    }
  });

  socket.on("gameOver", () => {
    const currentUser = allUsers[socket.id];
    if (currentUser && currentUser.playing) {
      currentUser.playing = false;

      let opponentPlayer = null;
      for (const key in allUsers) {
        if (allUsers[key].playing && key !== socket.id) {
          opponentPlayer = allUsers[key];
          break;
        }
      }

      if (opponentPlayer) {
        opponentPlayer.playing = false;
      }
    }
  });

  socket.on("disconnect", () => {
    const currentUser = allUsers[socket.id];
    if (currentUser) {
      if (currentUser.playing) {
        let opponentPlayer = null;
        for (const key in allUsers) {
          if (allUsers[key].playing && key !== socket.id) {
            opponentPlayer = allUsers[key];
            break;
          }
        }

        if (opponentPlayer) {
          opponentPlayer.playing = false;
          opponentPlayer.socket.emit("opponentDisconnected");
        }
      }
      console.log("User disconnected: " + socket.id);
      delete allUsers[socket.id];
    }
  });
});

// httpServer.listen(3000, () => {
//   console.log("Server listening on port 3000");
// });


module.exports = (req, res) => {
  if (!res.socket.server.io) {
    res.socket.server.io = io;
    io.attach(res.socket.server);
    console.log("Socket.io server started");
  } else {
    console.log("Socket.io server already running");
  }
  res.end();
};