import * as THREE from 'three';
import { Renderer } from '../core/Renderer.js';
import { GameState } from '../core/GameState.js';
import { TargetManager } from './TargetManager.js';
import { ViewModelFactory } from './ViewModelFactory.js';
import { WEAPON_RARITIES } from '../config/weapons.js';
import { ARENA_SIZE } from '../config/constants.js';
import { SoundManager } from '../core/SoundManager.js';
import { ParticleSystem } from './ParticleSystem.js';

export const WeaponSystem = {
  viewModel: null,
  viewModelRecoil: 0,
  fireCooldown: 0,
  meleeCooldown: 0,
  isReloading: false,
  reloadTimer: 0,
  isSwitching: false,
  switchTimer: 0,
  SWITCH_TIME: 0.3,
  isScoped: false,
  grenadeProjectiles: [],
  raycaster: new THREE.Raycaster(),

  init() {
    this.createPlayerViewModel();
    this.updateAmmoDisplay();
    this.updateWeaponInfo();
    this.updateSlotIndicators();
  },

  activeWeapon() {
    return GameState.activeWeapon();
  },

  createPlayerViewModel() {
    if (this.viewModel) {
      Renderer.camera.remove(this.viewModel);
      this.viewModel = null;
    }
    this.viewModel = ViewModelFactory.createPlayerViewModel(Renderer.camera);
  },

  update(delta) {
    if (this.fireCooldown > 0) this.fireCooldown -= delta;
    if (this.meleeCooldown > 0) this.meleeCooldown -= delta;

    if (this.isSwitching) {
      this.switchTimer -= delta;
      if (this.switchTimer <= 0) {
        this.isSwitching = false;
        this.createPlayerViewModel();
        this.updateWeaponInfo();
        this.updateAmmoDisplay();
      } else {
        if (this.viewModel) {
          const p = this.switchTimer / this.SWITCH_TIME;
          this.viewModel.position.y = -p * 0.5;
        }
      }
    }

    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) this.finishReload();
    }

    if (this.viewModelRecoil > 0) {
      this.viewModelRecoil -= delta * 5;
      if (this.viewModelRecoil < 0) this.viewModelRecoil = 0;
      if (this.viewModel) this.viewModel.rotation.x = this.viewModelRecoil * 0.2;
    }

    for (let i = this.grenadeProjectiles.length - 1; i >= 0; i--) {
      const g = this.grenadeProjectiles[i];
      g.timer -= delta;
      
      if (g.timer <= 0) {
        this.explodeGrenade(g);
        this.grenadeProjectiles.splice(i, 1);
        continue;
      }

      g.vel.y -= 15 * delta;
      g.mesh.position.add(g.vel.clone().multiplyScalar(delta));
      g.mesh.rotation.x += delta * 10;
      g.mesh.rotation.z += delta * 5;
      
      const half = ARENA_SIZE / 2;
      if (g.mesh.position.x < -half || g.mesh.position.x > half) g.vel.x *= -0.6;
      if (g.mesh.position.z < -half || g.mesh.position.z > half) g.vel.z *= -0.6;
      if (g.mesh.position.y < 0.1) {
        g.mesh.position.y = 0.1;
        g.vel.y *= -0.5;
        g.vel.x *= 0.8;
        g.vel.z *= 0.8;
      }
    }
  },

  shoot() {
    if (this.fireCooldown > 0 || this.isReloading || this.isSwitching) return;
    
    const w = this.activeWeapon();
    if (!w) return;

    if (w.type === 'melee') {
      if (this.meleeCooldown <= 0) this.meleeAttack();
      return;
    }

    if (w.isGrenade) {
      this.throwGrenade();
      return;
    }

    const ammo = GameState.weaponAmmo[GameState.activeWeaponId()];
    if (ammo.current <= 0) {
      if (ammo.reserve > 0) setTimeout(() => this.startReload(), 300);
      return;
    }

    ammo.current--;
    this.fireCooldown = w.fireRate;
    this.updateAmmoDisplay();
    
    // Play sound and shake camera
    const isHeavy = w.name === 'Shotgun' || w.name === 'Sniper' || w.name === 'Rocket Launcher';
    SoundManager.playShoot(isHeavy ? 0.7 : 1.0 + (Math.random() * 0.2 - 0.1), isHeavy);
    Renderer.shake(w.recoil * 0.8 || 0.1, 0.15);
    
    const mf = document.getElementById('muzzle-flash');
    if (mf) {
      mf.classList.remove('flash');
      void mf.offsetWidth;
      mf.classList.add('flash');
    }

    this.viewModelRecoil = w.recoil || 0.1;

    this.raycaster.camera = Renderer.camera;
    this.raycaster.set(Renderer.camera.position, Renderer.camera.getWorldDirection(new THREE.Vector3()));
    
    // 3D Muzzle Flash
    const gunTip = new THREE.Vector3(0.15, -0.15, -0.5);
    gunTip.applyMatrix4(Renderer.camera.matrixWorld);
    ParticleSystem.spawnMuzzleFlash(gunTip, Renderer.camera.getWorldDirection(new THREE.Vector3()), isHeavy ? 1.5 : 1.0);

    const hits = this.raycaster.intersectObjects(Renderer.scene.children, true);

    let finalHitPt = Renderer.camera.position.clone().add(Renderer.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(100));

    for (const hit of hits) {
      if (hit.object.type === 'Points' || hit.object.type === 'Sprite' || (hit.object.material && hit.object.material.visible === false)) continue;
      
      let tg = hit.object;
      while (tg && !tg.userData.isTarget) tg = tg.parent;
      if (tg && tg.userData.isTarget && tg.userData.alive) {
        const rarityKey = GameState.activeWeaponRarity() || 'common';
        const rarityDef = WEAPON_RARITIES[rarityKey];
        const mult = rarityDef ? rarityDef.damageMult : 1.0;
        
        TargetManager.targetHit(tg, hit.point, w.damage * mult);
        SoundManager.playHitMarker();
        finalHitPt = hit.point;
        break;
      }
      
      if (!tg || !tg.userData.isTarget) {
        TargetManager.spawnImpact(hit.point, 0x5577cc, 6);
        ParticleSystem.spawnSparks(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0), 0xffff88);
        finalHitPt = hit.point;
        break;
      }
    }

    TargetManager.spawnTracer(gunTip, finalHitPt);

    if (ammo.current <= 0 && ammo.reserve > 0) setTimeout(() => this.startReload(), 300);
  },

  meleeAttack() {
    const w = this.activeWeapon();
    this.meleeCooldown = w.speed || 0.5;
    
    if (this.viewModel) {
      const startPos = this.viewModel.position.clone();
      this.viewModel.position.z -= 0.3;
      setTimeout(() => { if (this.viewModel) this.viewModel.position.copy(startPos); }, 100);
    }
    
    this.raycaster.camera = Renderer.camera;
    this.raycaster.set(Renderer.camera.position, Renderer.camera.getWorldDirection(new THREE.Vector3()));
    const hits = this.raycaster.intersectObjects(Renderer.scene.children, true);
    for (const hit of hits) {
      if (hit.object.type === 'Points' || hit.object.type === 'Sprite' || (hit.object.material && hit.object.material.visible === false)) continue;

      if (hit.distance <= w.range) {
        let tg = hit.object;
        while (tg && !tg.userData.isTarget) tg = tg.parent;
        if (tg && tg.userData.isTarget && tg.userData.alive) {
          const rarityKey = GameState.activeWeaponRarity() || 'common';
          const rarityDef = WEAPON_RARITIES[rarityKey];
          const mult = rarityDef ? rarityDef.damageMult : 1.0;

          TargetManager.targetHit(tg, hit.point, w.damage * mult);
          break;
        }
      }
    }
  },

  throwGrenade() {
    const ammo = GameState.weaponAmmo[GameState.activeWeaponId()];
    if (ammo.current <= 0) return;
    ammo.current--;
    this.fireCooldown = 1.0;
    this.updateAmmoDisplay();

    const w = this.activeWeapon();
    
    if (this.viewModel) {
      const startPos = this.viewModel.position.clone();
      this.viewModel.position.z -= 0.2;
      this.viewModel.position.y += 0.2;
      setTimeout(() => { if (this.viewModel) this.viewModel.position.copy(startPos); }, 150);
    }
    
    const pos = new THREE.Vector3(0.15, -0.15, -0.5);
    pos.applyMatrix4(Renderer.camera.matrixWorld);
    const vel = Renderer.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(15);
    vel.y += 4;
    
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.8 })
    );
    mesh.position.copy(pos);
    Renderer.scene.add(mesh);
    
    const rarityKey = GameState.activeWeaponRarity() || 'common';
    const rarityDef = WEAPON_RARITIES[rarityKey];
    const mult = rarityDef ? rarityDef.damageMult : 1.0;

    this.grenadeProjectiles.push({
      mesh: mesh,
      vel: vel,
      timer: 2.0,
      damage: w.damage * mult,
      range: w.range
    });
  },

  explodeGrenade(g) {
    Renderer.scene.remove(g.mesh);
    g.mesh.geometry.dispose();
    g.mesh.material.dispose();
    
    TargetManager.spawnImpact(g.mesh.position, 0xffaa00, 40);
    ParticleSystem.spawnExplosion(g.mesh.position, 0xffaa00, 2.0);
    SoundManager.playExplosion();
    Renderer.shake(0.3, 0.4);
    
    TargetManager.targets.forEach(t => {
      if (!t.userData.alive) return;
      const dist = t.position.distanceTo(g.mesh.position);
      if (dist <= g.range) {
        const dmg = (1 - dist / g.range) * g.damage;
        TargetManager.targetHit(t, t.position, dmg);
      }
    });
  },

  startReload() {
    const ammo = GameState.weaponAmmo[GameState.activeWeaponId()];
    if (!ammo || this.isReloading || ammo.current === this.activeWeapon().magSize || ammo.reserve <= 0) return;
    this.isReloading = true;
    this.setScope(false);
    this.reloadTimer = this.activeWeapon().reloadTime || 1.8;
    SoundManager.playReload();
    const ad = document.getElementById('ammo-display');
    if (ad) ad.classList.add('reloading');
    
    if (this.viewModel) {
      const startPos = this.viewModel.position.clone();
      const startRot = this.viewModel.rotation.clone();
      this.viewModel.position.y -= 0.15;
      this.viewModel.rotation.x = -0.4;
      setTimeout(() => {
        if (this.viewModel) {
          this.viewModel.position.copy(startPos);
          this.viewModel.rotation.copy(startRot);
        }
      }, this.reloadTimer * 1000 - 100);
    }
  },

  finishReload() {
    const w = this.activeWeapon();
    const ammo = GameState.weaponAmmo[GameState.activeWeaponId()];
    const needed = w.magSize - ammo.current;
    const toLoad = Math.min(needed, ammo.reserve);
    ammo.current += toLoad;
    ammo.reserve -= toLoad;
    this.isReloading = false;
    const ad = document.getElementById('ammo-display');
    if (ad) ad.classList.remove('reloading');
    this.updateAmmoDisplay();
  },

  setScope(val) {
    if (this.isScoped === val) return;
    this.isScoped = val;
    Renderer.camera.fov = this.isScoped ? 20 : 75;
    Renderer.camera.updateProjectionMatrix();
    if (this.viewModel) this.viewModel.visible = !this.isScoped;
    
    const scopeEl = document.getElementById('sniper-scope');
    const crosshairEl = document.getElementById('crosshair');
    if (scopeEl) scopeEl.classList.toggle('hidden', !this.isScoped);
    if (crosshairEl) crosshairEl.classList.toggle('hidden', this.isScoped);
  },

  toggleScope() {
    const w = this.activeWeapon();
    // Only allow sniper to scope (can expand logic later)
    if (w && w.name === 'Sniper' && !this.isReloading && !this.isSwitching) {
      this.setScope(!this.isScoped);
    }
  },

  switchWeapon(slot, force = false) {
    if (!GameState.loadout[slot] || GameState.loadout[slot] === 'locked') return;
    if (!force && (GameState.currentSlot === slot || this.isSwitching)) return;
    
    if (this.isReloading) {
      this.isReloading = false;
      const ad = document.getElementById('ammo-display');
      if (ad) ad.classList.remove('reloading');
    }
    
    this.setScope(false);

    GameState.currentSlot = slot;
    this.isSwitching = true;
    this.switchTimer = this.SWITCH_TIME;
    this.updateSlotIndicators();
  },

  updateAmmoDisplay() {
    const w = this.activeWeapon();
    if (!w) return;
    const currEl = document.getElementById('ammo-current');
    const resEl = document.getElementById('ammo-reserve');
    const sepEl = document.getElementById('ammo-sep');
    const hintEl = document.getElementById('reload-hint');

    if (w.type === 'melee') {
      if (currEl) currEl.textContent = '∞';
      if (resEl) resEl.textContent = '';
      if (sepEl) sepEl.style.display = 'none';
      if (hintEl) hintEl.style.display = 'none';
    } else if (w.isGrenade) {
      const ammo = GameState.weaponAmmo[GameState.activeWeaponId()];
      if (currEl) currEl.textContent = ammo.current;
      if (resEl) resEl.textContent = '';
      if (sepEl) sepEl.style.display = 'none';
      if (hintEl) hintEl.style.display = 'none';
    } else {
      const ammo = GameState.weaponAmmo[GameState.activeWeaponId()];
      if (currEl) currEl.textContent = ammo.current;
      if (resEl) resEl.textContent = ammo.reserve;
      if (sepEl) sepEl.style.display = 'inline';
      if (hintEl) hintEl.style.display = 'block';
    }
  },

  updateWeaponInfo() {
    const w = this.activeWeapon();
    if (!w) return;
    const info = document.getElementById('weapon-info');
    if (info) {
      const rarityKey = GameState.activeWeaponRarity() || 'common';
      const rarityDef = WEAPON_RARITIES[rarityKey];
      const color = rarityDef ? rarityDef.color : '#ffffff';
      const name = rarityDef ? rarityDef.name : 'Common';
      
      // If it's a knife/melee, rarity doesn't matter as much, but we can still show it.
      if (w.type === 'melee') {
         info.textContent = `${w.name}`;
      } else {
         info.innerHTML = `<span style="color:${color}; font-weight:bold;">${name}</span> ${w.name} — ${w.caliber}`;
      }
    }
  },

  updateSlotIndicators() {
    document.querySelectorAll('.slot-ind').forEach(el => el.classList.remove('active'));
    let id = 'slot-1';
    if (GameState.currentSlot === 'secondary') id = 'slot-2';
    if (GameState.currentSlot === 'melee') id = 'slot-3';
    const activeEl = document.getElementById(id);
    if (activeEl) activeEl.classList.add('active');
  }
};
