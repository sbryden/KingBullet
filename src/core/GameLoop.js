import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { Player } from '../entities/Player.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { TargetManager } from '../systems/TargetManager.js';
import { EnemyManager } from '../systems/EnemyManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { InputManager } from './InputManager.js';
import { GameState } from './GameState.js';
import { ARENA_SIZE } from '../config/constants.js';
import { WEAPONS } from '../config/weapons.js';
import { LootSystem } from '../systems/LootSystem.js';
import { Arena } from '../entities/Arena.js';
import { NetworkPlayerManager } from '../systems/NetworkPlayerManager.js';
import { NetworkManager } from './NetworkManager.js';
export const GameLoop = {
  timer: new THREE.Timer(),
  interactionRaycaster: new THREE.Raycaster(),
  currentInteractable: null,
  stormDamageTimer: 0,

  start() {
    this.animate();
  },

  animate(timestamp) {
    requestAnimationFrame(this.animate.bind(this));
    
    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), 0.1);

    // Wardrobe animation
    if (this.currentWardrobe) {
      if (this.wardrobeAnimProgress === undefined) this.wardrobeAnimProgress = 0;
      const target = this.wardrobeOpen ? 1 : 0;
      this.wardrobeAnimProgress += (target - this.wardrobeAnimProgress) * 10 * delta;
      
      const angle = this.wardrobeAnimProgress * (Math.PI / 1.8);
      if (this.currentWardrobe.leftHinge) this.currentWardrobe.leftHinge.rotation.y = angle;
      if (this.currentWardrobe.rightHinge) this.currentWardrobe.rightHinge.rotation.y = -angle;
    }

    if (!InputManager.isLocked) {
      Renderer.render();
      return;
    }

    if (GameState.isArenaActive) {
      GameState.gameTime += delta;
      this.updateTimer();
      
      // Storm only in Battle Royale
      if (GameState.gameMode === 'battle_royale') {
        Arena.updateStorm(GameState.storm.radius, GameState.storm.x, GameState.storm.z);
        
        if (GameState.isAlive) {
          const dx = Player.position.x - GameState.storm.x;
          const dz = Player.position.z - GameState.storm.z;
          const dist = Math.hypot(dx, dz);
          if (dist > GameState.storm.radius) {
            this.stormDamageTimer += delta;
            if (this.stormDamageTimer >= 1.0) {
              EnemyManager._damagePlayer(15);
              this.stormDamageTimer = 0;
            }
          } else {
            this.stormDamageTimer = 0;
          }
        }
      }
    }

    this.updateInteraction();

    if (InputManager.isPressed('KeyQ') && this.currentInteractable) {
      this.handleInteraction();
      InputManager.keys['KeyQ'] = false; // consume input
    }

    Player.update(delta);
    
    // Arena start is now managed by the Match State from the server, 
    // so we don't automatically trigger it on crossing the threshold.
    
    if (InputManager.mouseHeld) {
      WeaponSystem.shoot();
    }
    
    WeaponSystem.update(delta);
    LootSystem.update(delta);
    
    if (InputManager.isPressed('Digit1')) WeaponSystem.switchWeapon('primary');
    if (InputManager.isPressed('Digit2')) WeaponSystem.switchWeapon('secondary');
    if (InputManager.isPressed('Digit3')) WeaponSystem.switchWeapon('melee');
    
    if (InputManager.isPressed('KeyE')) WeaponSystem.startReload();
    
    if (InputManager.isPressed('KeyZ')) {
      WeaponSystem.toggleScope();
      InputManager.keys['KeyZ'] = false; // consume
    }

    EnemyManager.update(delta, Renderer.camera);
    NetworkPlayerManager.tick(delta);
    
    // Send network input
    if (NetworkManager.isConnected) {
      NetworkManager.sendInput({
        position: Player.position,
        rotation: Player.euler.y,
        isShooting: InputManager.mouseHeld,
        isJumping: !Player.canJump // Basic jump state
      });
    }

    if (Player.direction.lengthSq() > 0 && Player.canJump) {
      const bs = Player.isSprinting ? 14 : 10;
      Renderer.camera.position.y += Math.sin(GameState.gameTime * bs) * (Player.isSprinting ? 0.06 : 0.03);
    }

    ParticleSystem.update(delta);
    Renderer.update(delta);

    this.drawMinimap();
    Renderer.render();
  },

  updateTimer() {
    const m = Math.floor(GameState.gameTime / 60);
    const s = Math.floor(GameState.gameTime % 60);
    const el = document.getElementById('timer-val');
    if (el) el.textContent = m + ':' + String(s).padStart(2, '0');

    const aliveEl = document.getElementById('alive-val');
    if (aliveEl) {
      if (GameState.gameMode === 'battle_royale') {
        aliveEl.textContent = GameState.aliveCount + "/30";
      } else if (GameState.gameMode === 'team_deathmatch') {
        aliveEl.textContent = GameState.aliveCount;
      } else if (GameState.gameMode === 'gun_game') {
        aliveEl.textContent = GameState.aliveCount;
      }
    }

    // Update mode-specific HUD
    const tdmScores = document.getElementById('tdm-scores');
    const ggHud = document.getElementById('gun-game-hud');
    
    if (GameState.gameMode === 'team_deathmatch' && GameState.isArenaActive) {
      if (tdmScores) tdmScores.classList.remove('hidden');
      if (ggHud) ggHud.classList.add('hidden');
      const redScore = document.getElementById('tdm-red-score');
      const blueScore = document.getElementById('tdm-blue-score');
      if (redScore) redScore.textContent = GameState.teamScores.red;
      if (blueScore) blueScore.textContent = GameState.teamScores.blue;
    } else if (GameState.gameMode === 'gun_game' && GameState.isArenaActive) {
      if (ggHud) ggHud.classList.remove('hidden');
      if (tdmScores) tdmScores.classList.add('hidden');
      const weaponName = document.getElementById('gg-weapon-name');
      const tierCurrent = document.getElementById('gg-tier-current');
      const tierTotal = document.getElementById('gg-tier-total');
      const currentWeapon = GameState.gunGameTiers[GameState.gunGameTier];
      if (weaponName) weaponName.textContent = currentWeapon ? currentWeapon.toUpperCase() : 'DONE';
      if (tierCurrent) tierCurrent.textContent = GameState.gunGameTier + 1;
      if (tierTotal) tierTotal.textContent = GameState.gunGameTiers.length;
    } else {
      if (tdmScores) tdmScores.classList.add('hidden');
      if (ggHud) ggHud.classList.add('hidden');
    }

    // Match status
    const statusEl = document.getElementById('match-status');
    const textEl = document.getElementById('match-status-text');
    const statusTimerEl = document.getElementById('match-status-timer');
    if (statusEl && textEl && statusTimerEl) {
      if (GameState.matchState === 'WAITING' || GameState.matchState === 'STARTING') {
        statusEl.classList.remove('hidden');
        if (GameState.matchState === 'WAITING') {
           textEl.textContent = 'WAITING FOR PLAYERS';
           statusTimerEl.textContent = '';
        } else {
           textEl.textContent = 'MATCH STARTS IN';
           statusTimerEl.textContent = Math.ceil(GameState.queueTimer) + 's';
        }
      } else {
        statusEl.classList.add('hidden');
      }
    }
  },

  updateInteraction() {
    this.interactionRaycaster.camera = Renderer.camera;
    this.interactionRaycaster.set(Renderer.camera.position, Renderer.camera.getWorldDirection(new THREE.Vector3()));
    const hits = this.interactionRaycaster.intersectObjects(Renderer.scene.children, true);
    
    let hitInteractable = null;
    for (const hit of hits) {
      if (hit.distance > 6) break; // Only interact within 6 units
      const obj = hit.object;
      if (obj.userData && (obj.userData.isWeaponSlot || obj.userData.isWardrobeInteract || obj.userData.isChest || obj.userData.isWeaponDrop)) {
        hitInteractable = obj;
        break;
      }
    }

    if (hitInteractable !== this.currentInteractable) {
      this.currentInteractable = hitInteractable;
      const prompt = document.getElementById('interact-prompt');

      if (this.currentInteractable) {
        prompt.classList.remove('hidden');
        if (this.currentInteractable.userData.isWeaponSlot) {
          prompt.textContent = "[Q] Equip " + WEAPONS[this.currentInteractable.userData.weaponId].name;
        } else if (this.currentInteractable.userData.isWardrobeInteract) {
          prompt.textContent = "[Q] Change Outfit";
        } else if (this.currentInteractable.userData.isChest) {
          if (!this.currentInteractable.userData.opened) {
            prompt.textContent = "[Q] Open Chest";
          } else {
            prompt.classList.add('hidden'); // hide if already opened
          }
        } else if (this.currentInteractable.userData.isWeaponDrop) {
          const rarity = this.currentInteractable.userData.rarity || 'common';
          const rarityName = rarity.charAt(0).toUpperCase() + rarity.slice(1);
          prompt.textContent = `[Q] Pick up ${rarityName} ` + WEAPONS[this.currentInteractable.userData.weaponId].name;
        }
      } else {
        prompt.classList.add('hidden');
      }
    }
  },

  clearInteraction() {
    this.currentInteractable = null;
    const prompt = document.getElementById('interact-prompt');
    if (prompt) prompt.classList.add('hidden');
  },

  handleInteraction() {
    const obj = this.currentInteractable;
    if (!obj) return;

    if (obj.userData.isWeaponSlot) {
      GameState.loadout[obj.userData.slot] = obj.userData.weaponId;
      GameState.initAmmo();
      WeaponSystem.switchWeapon(obj.userData.slot, true);
    } else if (obj.userData.isChest) {
      LootSystem.openChest(obj.userData);
      this.clearInteraction();
    } else if (obj.userData.isWeaponDrop) {
      const slot = obj.userData.slot;
      const newWep = obj.userData.weaponId;
      const newRarity = obj.userData.rarity || 'common';
      const currentWep = GameState.loadout[slot];
      const currentRarity = GameState.loadoutRarities[slot] || 'common';
      
      // Equip new weapon
      GameState.loadout[slot] = newWep;
      GameState.loadoutRarities[slot] = newRarity;
      GameState.initAmmo();
      WeaponSystem.switchWeapon(slot, true);
      
      // Remove it from the ground
      LootSystem.removeGroundWeapon(obj.userData);
      
      // Drop current weapon if we had one and it's not a knife
      if (currentWep && currentWep !== 'locked' && currentWep !== 'knife' && currentWep !== 'bayonet') {
        const dropPos = Player.position.clone();
        dropPos.y = 0.5;
        // Shift a bit forward so it doesn't spawn exactly in us
        const fwd = new THREE.Vector3();
        Renderer.camera.getWorldDirection(fwd);
        fwd.y = 0; fwd.normalize();
        dropPos.add(fwd.multiplyScalar(1.5));
        
        LootSystem.spawnGroundWeapon(currentWep, dropPos, currentRarity);
      }
      this.clearInteraction();
    } else if (obj.userData.isWardrobeInteract) {
      // Open Wardrobe UI
      this.currentWardrobe = obj.userData;
      this.wardrobeOpen = true;
      document.exitPointerLock();
      
      const ui = document.getElementById('wardrobe-ui');
      ui.classList.remove('hidden');
      
      const grid = document.getElementById('outfit-grid');
      grid.innerHTML = '';
      GameState.outfits.forEach((outfit, index) => {
        const div = document.createElement('div');
        div.className = 'outfit-swatch' + (index === GameState.outfitIndex ? ' selected' : '');
        if (outfit.camo) {
          import('../systems/OutfitFactory.js').then(mod => {
            div.style.background = mod.OutfitFactory.getCamoCSS(outfit.camo);
          });
        } else {
          div.style.background = '#' + outfit.shirt.toString(16).padStart(6, '0');
        }
        div.onclick = () => {
          GameState.outfitIndex = index;
          Player.updateOutfit();
          WeaponSystem.createPlayerViewModel();
          this.closeWardrobe();
        };
        grid.appendChild(div);
      });
      
      document.getElementById('close-wardrobe-btn').onclick = () => this.closeWardrobe();
    }
  },

  closeWardrobe() {
    this.wardrobeOpen = false;
    document.getElementById('wardrobe-ui').classList.add('hidden');
    InputManager.requestPointerLock();
  },

  drawMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz = 140;
    const scale = sz / ARENA_SIZE;
    
    ctx.clearRect(0, 0, sz, sz);
    ctx.fillStyle = 'rgba(10,10,18,0.7)';
    ctx.fillRect(0, 0, sz, sz);

    EnemyManager.enemies.forEach(e => {
      if (e.state === 'dead') return;
      ctx.fillStyle = e.state === 'aggro' ? '#ff3d5a' : (e.isMoving ? '#ffd740' : '#ff6b6b');
      ctx.beginPath();
      ctx.arc((e.group.position.x + ARENA_SIZE/2) * scale, (e.group.position.z + ARENA_SIZE/2) * scale, 3, 0, Math.PI*2);
      ctx.fill();
      // Aggro indicator
      if (e.state === 'aggro') {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc((e.group.position.x + ARENA_SIZE/2) * scale, (e.group.position.z + ARENA_SIZE/2) * scale, 5, 0, Math.PI*2);
        ctx.stroke();
      }
    });

    const px = (Player.position.x + ARENA_SIZE/2) * scale;
    const py = (Player.position.z + ARENA_SIZE/2) * scale;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI*2);
    ctx.fill();

    const dir = new THREE.Vector3();
    Renderer.camera.getWorldDirection(dir);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + dir.x * 12, py + dir.z * 12);
    ctx.stroke();
  }
};
