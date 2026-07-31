import * as THREE from 'three';
import { Renderer } from '../core/Renderer.js';
import { NetworkManager } from '../core/NetworkManager.js';
import { EnemyFactory } from '../entities/EnemyFactory.js';
import { GameState } from '../core/GameState.js';
import { ParticleSystem } from './ParticleSystem.js';

export class NetworkPlayerManager {
  static players = {}; // id -> { mesh, data, name }

  static init() {
    // We will poll NetworkManager for updates in the tick() function
  }

  static tick(delta) {
    if (!NetworkManager.isConnected) return;

    // Add new players that appeared in NetworkManager
    for (const id in NetworkManager.players) {
      if (!this.players[id]) {
        this.spawnPlayer(id, NetworkManager.players[id]);
      }
    }

    // Remove players that disconnected
    for (const id in this.players) {
      if (!NetworkManager.players[id]) {
        this.removePlayer(id);
      }
    }

    // Update existing players (Interpolation)
    for (const id in this.players) {
      const netPlayer = NetworkManager.players[id];
      const p = this.players[id];

      // Interpolate position
      if (netPlayer.targetPosition) {
        const targetPos = new THREE.Vector3(
          netPlayer.targetPosition.x,
          netPlayer.targetPosition.y,
          netPlayer.targetPosition.z
        );
        p.mesh.position.lerp(targetPos, 0.2); // Smoothing factor
      }

      // Interpolate rotation
      if (netPlayer.targetRotation !== undefined) {
        // Find the shortest path for rotation
        let diff = netPlayer.targetRotation - p.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        p.mesh.rotation.y += diff * 0.2; // Smoothing factor
      }
      
      // Animate legs if moving
      if (netPlayer.targetPosition) {
         const moveDist = p.mesh.position.distanceTo(
            new THREE.Vector3(netPlayer.targetPosition.x, netPlayer.targetPosition.y, netPlayer.targetPosition.z)
         );
         
         if (moveDist > 0.1) {
             p.walkTime = (p.walkTime || 0) + delta * 15;
             const lLeg = p.mesh.getObjectByName('legL');
             const rLeg = p.mesh.getObjectByName('legR');
             if (lLeg && rLeg) {
                 lLeg.rotation.x = Math.sin(p.walkTime) * 0.5;
                 rLeg.rotation.x = Math.sin(p.walkTime + Math.PI) * 0.5;
             }
         } else {
             const lLeg = p.mesh.getObjectByName('legL');
             const rLeg = p.mesh.getObjectByName('legR');
             if (lLeg && rLeg) {
                 lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0, 0.1);
                 rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, 0, 0.1);
             }
         }
      }

      // Handle shooting visuals (Phase 3 mostly, but basic implementation here)
      if (netPlayer.isShooting) {
          // Play muzzle flash if weapon supports it
          // Wait to properly implement in Phase 3
      }
    }
  }

  static spawnPlayer(id, data) {
    console.log(`[NetworkPlayerManager] Spawning player ${id}`);
    const outfit = GameState.outfits[data.outfitIndex] || EnemyFactory.randomOutfit();
    const weaponType = data.weapon || 'pistol';
    const name = `Player-${id.substring(0, 4)}`;

    const group = EnemyFactory.buildEnemy(outfit, weaponType, name);
    
    if (data.position) {
      group.position.set(data.position.x, data.position.y, data.position.z);
    }
    if (data.rotation !== undefined) {
      group.rotation.y = data.rotation;
    }

    Renderer.scene.add(group);

    this.players[id] = {
      mesh: group,
      data: data,
      name: name,
      walkTime: 0
    };
  }

  static removePlayer(id) {
    console.log(`[NetworkPlayerManager] Removing player ${id}`);
    const p = this.players[id];
    if (p && p.mesh) {
      Renderer.scene.remove(p.mesh);
    }
    delete this.players[id];
  }
}
