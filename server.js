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
    console.log(data.playerName);
    currentUser.playerName = data.playerName; // Use consistent property naming
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

  socket.on("disconnect", () => {
    if (allUsers[socket.id]) {
      console.log("User disconnected: " + socket.id);
      delete allUsers[socket.id]; // Properly remove user from the list
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server listening on port 3000");
});
