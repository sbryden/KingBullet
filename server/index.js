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
  players: {},
  matchState: 'WAITING', // WAITING, STARTING, PLAYING, FINISHED
  queueTimer: 0,
  aliveCount: 0
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
      isJumping: false,
      isAlive: true
    };

    // Tell the new player about all existing players
    socket.emit('currentPlayers', gameState.players);

    // Tell everyone else that a new player joined
    socket.broadcast.emit('playerJoined', gameState.players[socket.id]);

    // Check if we should start the queue
    if (gameState.matchState === 'WAITING' && Object.keys(gameState.players).length > 0) {
      gameState.matchState = 'STARTING';
      gameState.queueTimer = 30.0;
      io.emit('matchStateChanged', { state: gameState.matchState, timer: gameState.queueTimer });
    }
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
      gameState.players[socket.id].isJumping = inputData.isJumping;
    }
  });

  socket.on('playerDeath', () => {
    if (gameState.players[socket.id] && gameState.players[socket.id].isAlive) {
      gameState.players[socket.id].isAlive = false;
      gameState.aliveCount = Math.max(0, gameState.aliveCount - 1);
      io.emit('playerDied', { id: socket.id, aliveCount: gameState.aliveCount });
      checkWinCondition();
    }
  });

  socket.on('botDeath', () => {
    // A bot was killed by someone.
    if (gameState.matchState === 'PLAYING') {
      gameState.aliveCount = Math.max(0, gameState.aliveCount - 1);
      io.emit('botDied', { aliveCount: gameState.aliveCount });
      checkWinCondition();
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`);
    
    if (gameState.players[socket.id]) {
      const wasAlive = gameState.players[socket.id].isAlive;
      delete gameState.players[socket.id];
      // Tell all clients to remove this player
      io.emit('playerDisconnected', socket.id);
      
      if (wasAlive && gameState.matchState === 'PLAYING') {
        gameState.aliveCount = Math.max(0, gameState.aliveCount - 1);
        checkWinCondition();
      }

      if (Object.keys(gameState.players).length === 0 && gameState.matchState !== 'WAITING') {
        // Reset match if everyone leaves
        resetMatch();
      }
    }
  });
});

function checkWinCondition() {
  if (gameState.matchState === 'PLAYING') {
    if (gameState.aliveCount <= 1) {
      gameState.matchState = 'FINISHED';
      io.emit('matchStateChanged', { state: gameState.matchState, timer: 0 });
      
      // Reset match after 10 seconds
      setTimeout(() => {
        resetMatch();
      }, 10000);
    }
  }
}

function resetMatch() {
  gameState.matchState = 'WAITING';
  gameState.queueTimer = 0;
  gameState.aliveCount = 0;
  Object.values(gameState.players).forEach(p => { p.isAlive = true; p.health = 100; });
  io.emit('matchStateChanged', { state: gameState.matchState, timer: 0 });

  if (Object.keys(gameState.players).length > 0) {
    gameState.matchState = 'STARTING';
    gameState.queueTimer = 30.0;
    io.emit('matchStateChanged', { state: gameState.matchState, timer: gameState.queueTimer });
  }
}

// Server Tick Loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  if (gameState.matchState === 'STARTING') {
    gameState.queueTimer -= dt;
    if (gameState.queueTimer <= 0) {
      // Start the match
      gameState.matchState = 'PLAYING';
      gameState.queueTimer = 0;
      
      const playerCount = Object.keys(gameState.players).length;
      gameState.aliveCount = 30; // 30 combatants total
      
      io.emit('matchStateChanged', { 
        state: gameState.matchState, 
        timer: 0,
        botsToSpawn: Math.max(0, 30 - playerCount)
      });
    }
  }

  // Broadcast the authoritative state to all clients
  io.emit('gameStateUpdate', gameState);
}, TICK_RATE);

server.listen(PORT, () => {
  console.log(`HOUSEPARTY Multiplayer Server running on port ${PORT}`);
});
