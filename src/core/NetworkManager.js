import { io } from 'socket.io-client';
import { GameState } from './GameState.js';
import { Player } from '../entities/Player.js';

export class NetworkManager {
  static socket = null;
  static isConnected = false;
  static serverUrl = 'http://localhost:3001';
  static players = {}; // Local copy of all players (excluding local player)

  static init() {
    console.log('[NetworkManager] Connecting to server...');
    this.socket = io(this.serverUrl);

    this.socket.on('connect', () => {
      console.log(`[NetworkManager] Connected as ${this.socket.id}`);
      this.isConnected = true;
      
      // Join the game
      this.socket.emit('joinGame', {
        position: Player.position ? { x: Player.position.x, y: Player.position.y, z: Player.position.z } : { x: 0, y: 0, z: 0 },
        rotation: Player.euler ? Player.euler.y : 0,
        outfitIndex: GameState.outfitIndex,
        weapon: GameState.equippedWeapon || 'pistol'
      });
    });

    this.socket.on('currentPlayers', (players) => {
      console.log('[NetworkManager] Received current players:', players);
      Object.keys(players).forEach(id => {
        if (id !== this.socket.id) {
          this.addPlayer(players[id]);
        }
      });
    });

    this.socket.on('playerJoined', (playerData) => {
      console.log('[NetworkManager] Player joined:', playerData);
      this.addPlayer(playerData);
    });

    this.socket.on('playerDisconnected', (playerId) => {
      console.log('[NetworkManager] Player disconnected:', playerId);
      this.removePlayer(playerId);
    });

    this.socket.on('gameStateUpdate', (serverState) => {
      if (!this.isConnected) return;
      
      // Update our local representation of players
      Object.keys(serverState.players).forEach(id => {
        if (id === this.socket.id) return; // Skip ourselves
        
        if (this.players[id]) {
          // Update target position/rotation for interpolation (Phase 2)
          this.players[id].targetPosition = serverState.players[id].position;
          this.players[id].targetRotation = serverState.players[id].rotation;
          this.players[id].isShooting = serverState.players[id].isShooting;
          this.players[id].isJumping = serverState.players[id].isJumping;
        } else {
           // We might have missed the join event, add them
           this.addPlayer(serverState.players[id]);
        }
      });
    });
  }

  static addPlayer(playerData) {
    // Basic setup for now. In Phase 2 we will spawn actual meshes.
    this.players[playerData.id] = {
      ...playerData,
      targetPosition: playerData.position,
      targetRotation: playerData.rotation
    };
  }

  static removePlayer(playerId) {
    if (this.players[playerId]) {
      // In Phase 2 we will remove the mesh from the scene here
      delete this.players[playerId];
    }
  }

  static sendInput(inputData) {
    if (!this.isConnected) return;
    this.socket.emit('playerInput', inputData);
  }
}
