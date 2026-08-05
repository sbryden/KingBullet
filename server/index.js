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

const GUN_GAME_TIERS = [
  'pistol', 'tecdc9', 'mp5', 'ak47', 'machinegun', 'sniper', 'knife'
];

// Global game state
const gameState = {
  gameMode: 'battle_royale', // battle_royale, team_deathmatch, gun_game
  players: {},
  matchState: 'WAITING', // WAITING, STARTING, PLAYING, FINISHED
  queueTimer: 0,
  aliveCount: 0,
  storm: { radius: 350, x: 0, z: 0 },
  teamScores: { red: 0, blue: 0 }
};

// Tick rate (e.g., 30 updates per second)
const TICK_RATE = 1000 / 30;

function getRandomRespawnPosition() {
  // Simple random spawn point within a reasonable area
  return {
    x: (Math.random() - 0.5) * 200,
    y: 0,
    z: (Math.random() - 0.5) * 200
  };
}

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // Mode selection (only during WAITING)
  socket.on('selectMode', (mode) => {
    if (gameState.matchState === 'WAITING') {
      if (['battle_royale', 'team_deathmatch', 'gun_game'].includes(mode)) {
        gameState.gameMode = mode;
        io.emit('modeChanged', mode);
      }
    }
  });

  // When a player joins the game session
  socket.on('joinGame', (playerData) => {
    console.log(`Player joined: ${socket.id}`, playerData);
    
    // Assign team for TDM
    let team = null;
    if (gameState.gameMode === 'team_deathmatch') {
      let redCount = 0;
      let blueCount = 0;
      Object.values(gameState.players).forEach(p => {
        if (p.team === 'red') redCount++;
        else if (p.team === 'blue') blueCount++;
      });
      team = (redCount <= blueCount) ? 'red' : 'blue';
    }

    // Add player to game state
    gameState.players[socket.id] = {
      id: socket.id,
      position: playerData.position || { x: 0, y: 0, z: 0 },
      rotation: playerData.rotation || 0,
      outfitIndex: playerData.outfitIndex || 0,
      weapon: gameState.gameMode === 'gun_game' ? GUN_GAME_TIERS[0] : (playerData.weapon || 'pistol'),
      health: 100,
      isShooting: false,
      isJumping: false,
      isAlive: true,
      team: team,
      gunGameTier: 0,
      kills: 0
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
      gameState.players[socket.id].position = inputData.position;
      gameState.players[socket.id].rotation = inputData.rotation;
      gameState.players[socket.id].isShooting = inputData.isShooting;
      gameState.players[socket.id].isJumping = inputData.isJumping;
    }
  });

  socket.on('playerKill', (data) => {
    if (gameState.matchState !== 'PLAYING') return;
    
    const killer = gameState.players[socket.id];
    if (killer) {
      killer.kills++;
      
      if (gameState.gameMode === 'team_deathmatch') {
        if (killer.team === 'red') gameState.teamScores.red++;
        else if (killer.team === 'blue') gameState.teamScores.blue++;
      } else if (gameState.gameMode === 'gun_game') {
        killer.gunGameTier++;
        if (killer.gunGameTier < GUN_GAME_TIERS.length) {
          killer.weapon = GUN_GAME_TIERS[killer.gunGameTier];
        }
      }
      checkWinCondition();
    }
  });

  socket.on('playerDeath', () => {
    if (gameState.players[socket.id] && gameState.players[socket.id].isAlive) {
      gameState.players[socket.id].isAlive = false;
      
      if (gameState.gameMode === 'battle_royale') {
        gameState.aliveCount = Math.max(0, gameState.aliveCount - 1);
        io.emit('playerDied', { id: socket.id, aliveCount: gameState.aliveCount });
        checkWinCondition();
      } else {
        // TDM or Gun Game - Respawn
        io.emit('playerDied', { id: socket.id });
        
        setTimeout(() => {
          if (gameState.players[socket.id] && gameState.matchState === 'PLAYING') {
            gameState.players[socket.id].isAlive = true;
            gameState.players[socket.id].health = 100;
            gameState.players[socket.id].position = getRandomRespawnPosition();
            io.to(socket.id).emit('respawn', gameState.players[socket.id].position);
            io.emit('playerRespawned', gameState.players[socket.id]);
          }
        }, 3000);
      }
    }
  });

  socket.on('botDeath', () => {
    // A bot was killed by someone.
    if (gameState.matchState === 'PLAYING') {
      if (gameState.gameMode === 'battle_royale') {
        gameState.aliveCount = Math.max(0, gameState.aliveCount - 1);
        io.emit('botDied', { aliveCount: gameState.aliveCount });
        checkWinCondition();
      } else {
        // TDM or Gun Game
        io.emit('botDied', {});
      }
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
      
      if (wasAlive && gameState.matchState === 'PLAYING' && gameState.gameMode === 'battle_royale') {
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
    let finished = false;
    
    if (gameState.gameMode === 'battle_royale') {
      if (gameState.aliveCount <= 1) finished = true;
    } else if (gameState.gameMode === 'team_deathmatch') {
      if (gameState.teamScores.red >= 50 || gameState.teamScores.blue >= 50) finished = true;
    } else if (gameState.gameMode === 'gun_game') {
      for (const pId in gameState.players) {
        if (gameState.players[pId].gunGameTier >= GUN_GAME_TIERS.length) {
          finished = true;
          break;
        }
      }
    }

    if (finished) {
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
  gameState.storm = { radius: 350, x: 0, z: 0 };
  gameState.teamScores = { red: 0, blue: 0 };
  
  Object.values(gameState.players).forEach(p => { 
    p.isAlive = true; 
    p.health = 100;
    p.kills = 0;
    p.gunGameTier = 0;
    if (gameState.gameMode === 'gun_game') p.weapon = GUN_GAME_TIERS[0];
  });
  
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
      let botsToSpawn = 0;
      
      if (gameState.gameMode === 'battle_royale') {
        gameState.aliveCount = 30; // 30 combatants total
        botsToSpawn = Math.max(0, 30 - playerCount);
      } else if (gameState.gameMode === 'team_deathmatch') {
        gameState.aliveCount = 20; 
        botsToSpawn = Math.max(0, 20 - playerCount);
      } else if (gameState.gameMode === 'gun_game') {
        gameState.aliveCount = 15;
        botsToSpawn = Math.max(0, 15 - playerCount);
      }
      
      io.emit('matchStateChanged', { 
        state: gameState.matchState, 
        timer: 0,
        botsToSpawn: botsToSpawn
      });
    }
  } else if (gameState.matchState === 'PLAYING') {
    // Shrink storm from 350 to 0 over 3 minutes (180 seconds) only in BR
    if (gameState.gameMode === 'battle_royale') {
      gameState.storm.radius = Math.max(0, gameState.storm.radius - (350 / 180) * dt);
    }
  }

  // Broadcast the authoritative state to all clients
  io.emit('gameStateUpdate', gameState);
}, TICK_RATE);

server.listen(PORT, () => {
  console.log(`HOUSEPARTY Multiplayer Server running on port ${PORT}`);
});
