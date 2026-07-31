const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Global game state
const gameState = {
  players: {}
};

// Tick rate (e.g., 30 updates per second)
const TICK_RATE = 1000 / 30;

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // When a player joins the game session
  socket.on('joinGame', (playerData) => {
    console.log(`Player joined: ${socket.id}`, playerData);
    
    // Add player to game state
    gameState.players[socket.id] = {
      id: socket.id,
      position: playerData.position || { x: 0, y: 0, z: 0 },
      rotation: playerData.rotation || 0,
      outfitIndex: playerData.outfitIndex || 0,
      weapon: playerData.weapon || 'pistol',
      health: 100,
      isShooting: false,
      isJumping: false
    };

    // Tell the new player about all existing players
    socket.emit('currentPlayers', gameState.players);

    // Tell everyone else that a new player joined
    socket.broadcast.emit('playerJoined', gameState.players[socket.id]);
  });

  // Handle player inputs/movement
  socket.on('playerInput', (inputData) => {
    if (gameState.players[socket.id]) {
      // Update server state with client's new position/rotation
      // Note: In Phase 3, this will be validated by the server
      gameState.players[socket.id].position = inputData.position;
      gameState.players[socket.id].rotation = inputData.rotation;
      gameState.players[socket.id].isShooting = inputData.isShooting;
      gameState.players[socket.id].isJumping = inputData.isJumping;
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    
    if (gameState.players[socket.id]) {
      delete gameState.players[socket.id];
      // Tell all clients to remove this player
      io.emit('playerDisconnected', socket.id);
    }
  });
});

// Server Tick Loop
setInterval(() => {
  // Broadcast the authoritative state to all clients
  io.emit('gameStateUpdate', gameState);
}, TICK_RATE);

server.listen(PORT, () => {
  console.log(`HOUSEPARTY Multiplayer Server running on port ${PORT}`);
});
