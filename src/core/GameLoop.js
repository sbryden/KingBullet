import * as THREE from 'three';
import { Renderer } from './Renderer.js';
import { Player } from '../entities/Player.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { TargetManager } from '../systems/TargetManager.js';
import { InputManager } from './InputManager.js';
import { GameState } from './GameState.js';
import { ARENA_SIZE } from '../config/constants.js';

export const GameLoop = {
  clock: new THREE.Clock(),

  start() {
    this.animate();
  },

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!InputManager.isLocked) {
      Renderer.render();
      return;
    }

    GameState.gameTime += delta;
    this.updateTimer();

    Player.update(delta);
    
    if (InputManager.mouseHeld) {
      WeaponSystem.shoot();
    }
    
    WeaponSystem.update(delta);
    
    if (InputManager.isPressed('Digit1')) WeaponSystem.switchWeapon('primary');
    if (InputManager.isPressed('Digit2')) WeaponSystem.switchWeapon('secondary');
    if (InputManager.isPressed('Digit3')) WeaponSystem.switchWeapon('melee');
    
    if (InputManager.isPressed('KeyE')) WeaponSystem.startReload();

    TargetManager.update(delta);

    if (Player.direction.lengthSq() > 0 && Player.canJump) {
      const bs = Player.isSprinting ? 14 : 10;
      Renderer.camera.position.y += Math.sin(GameState.gameTime * bs) * (Player.isSprinting ? 0.06 : 0.03);
    }

    this.drawMinimap();
    Renderer.render();
  },

  updateTimer() {
    const m = Math.floor(GameState.gameTime / 60);
    const s = Math.floor(GameState.gameTime % 60);
    const el = document.getElementById('timer-val');
    if (el) el.textContent = m + ':' + String(s).padStart(2, '0');
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

    TargetManager.targets.forEach(t => {
      if (!t.userData.alive) return;
      ctx.fillStyle = t.userData.isMoving ? '#ffd740' : '#ff3d5a';
      ctx.beginPath();
      ctx.arc((t.position.x + ARENA_SIZE/2) * scale, (t.position.z + ARENA_SIZE/2) * scale, 2.5, 0, Math.PI*2);
      ctx.fill();
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
