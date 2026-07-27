import * as THREE from 'three';
import { NUM_STATIC_TARGETS, NUM_MOVING_TARGETS, TARGET_RESPAWN_TIME, ARENA_SIZE } from '../config/constants.js';
import { Renderer } from '../core/Renderer.js';
import { GameState } from '../core/GameState.js';

export const TargetManager = {
  targets: [],
  particles: [],

  init() {
    this.spawnTargets();
  },

  createTarget(pos, isMoving) {
    const group = new THREE.Group();

    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), new THREE.MeshStandardMaterial({ color: 0x222244, side: THREE.DoubleSide }));
    plate.position.z = -0.03; group.add(plate);

    const outer = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 32), new THREE.MeshStandardMaterial({ color: 0xff3d5a, emissive: 0xff2222, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
    group.add(outer);

    const mid = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.55, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2, side: THREE.DoubleSide }));
    group.add(mid);

    const bull = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshStandardMaterial({ color: 0xff3d5a, emissive: 0xff3d5a, emissiveIntensity: 0.8, side: THREE.DoubleSide }));
    group.add(bull);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, pos.y, 8), new THREE.MeshStandardMaterial({ color: 0x555577 }));
    stand.position.y = -pos.y / 2; group.add(stand);

    group.position.copy(pos);

    group.userData = {
      isTarget: true,
      isMoving: isMoving,
      alive: true,
      health: 100,
      basePos: pos.clone(),
      movePhase: Math.random() * Math.PI * 2,
      moveAxis: Math.random() > 0.5 ? 'x' : 'z',
      moveRange: 8 + Math.random() * 10,
      moveSpeed: 1 + Math.random() * 2,
      respawnTimer: 0,
      points: isMoving ? 150 : 100,
    };

    Renderer.scene.add(group);
    this.targets.push(group);
  },

  spawnTargets() {
    for (let i = 0; i < NUM_STATIC_TARGETS; i++) {
      this.createTarget(new THREE.Vector3((Math.random() - 0.5) * ARENA_SIZE * 0.8, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * ARENA_SIZE * 0.8), false);
    }
    for (let i = 0; i < NUM_MOVING_TARGETS; i++) {
      this.createTarget(new THREE.Vector3((Math.random() - 0.5) * ARENA_SIZE * 0.6, 2 + Math.random() * 2, (Math.random() - 0.5) * ARENA_SIZE * 0.6), true);
    }
  },

  targetHit(tg, pt, damage) {
    tg.userData.health -= damage;
    
    const hm = document.getElementById('hitmarker');
    if (hm) {
      hm.classList.add('flash');
      setTimeout(() => hm.classList.remove('flash'), 120);
    }

    this.spawnImpact(pt, 0xff3d5a, 12);

    if (tg.userData.health <= 0 && tg.userData.alive) {
      tg.userData.alive = false;
      GameState.score += tg.userData.points;
      GameState.kills++;
      this.updateHUD();
      this.addKillEntry(tg.userData.isMoving ? 'Moving Target' : 'Static Target', tg.userData.points);

      let p = 0;
      const des = () => {
        p += 0.05;
        tg.scale.setScalar(Math.max(0, 1 - p));
        if (p < 1) { requestAnimationFrame(des); }
        else {
          tg.visible = false;
          tg.userData.respawnTimer = TARGET_RESPAWN_TIME;
        }
      };
      des();
    }
  },

  spawnImpact(position, color, count) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      mesh.position.copy(position);
      Renderer.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random()-0.5)*6, Math.random()*4, (Math.random()-0.5)*6),
        life: 1
      });
    }
  },

  updateHUD() {
    const scoreEl = document.getElementById('score-val');
    const killsEl = document.getElementById('kills-val');
    if (scoreEl) scoreEl.textContent = GameState.score;
    if (killsEl) killsEl.textContent = GameState.kills;
  },

  addKillEntry(name, pts) {
    const feed = document.getElementById('kill-feed');
    if (!feed) return;
    const el = document.createElement('div');
    el.className = 'kill-entry';
    el.textContent = '✕ ' + name + ' +' + pts;
    feed.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  },

  update(delta) {
    this.targets.forEach(t => {
      if (!t.userData.alive) {
        if (t.userData.respawnTimer > 0) {
          t.userData.respawnTimer -= delta;
          if (t.userData.respawnTimer <= 0) {
            t.userData.alive = true;
            t.userData.health = 100;
            t.visible = true;
            t.scale.set(1, 1, 1);
            t.position.x = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
            t.position.z = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
            t.userData.basePos.copy(t.position);
          }
        }
        return;
      }

      t.lookAt(Renderer.camera.position.x, t.position.y, Renderer.camera.position.z);

      if (t.userData.isMoving) {
        t.userData.movePhase += delta * t.userData.moveSpeed;
        const off = Math.sin(t.userData.movePhase) * t.userData.moveRange;
        if (t.userData.moveAxis === 'x') t.position.x = t.userData.basePos.x + off;
        else t.position.z = t.userData.basePos.z + off;
        const b = ARENA_SIZE / 2 - 2;
        t.position.x = Math.max(-b, Math.min(b, t.position.x));
        t.position.z = Math.max(-b, Math.min(b, t.position.z));
      }
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * 2;
      p.mesh.position.add(p.vel.clone().multiplyScalar(delta));
      p.vel.y -= 10 * delta; // Gravity roughly 10
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        Renderer.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
};
