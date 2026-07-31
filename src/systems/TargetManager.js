/**
 * TargetManager — thin compatibility shim.
 * All logic lives in EnemyManager. This file keeps old call-sites working.
 */
import { EnemyManager } from './EnemyManager.js';

export const TargetManager = {

  get targets()   { return EnemyManager.targets; },
  get particles() { return EnemyManager.particles; },
  get tracers()   { return EnemyManager.tracers; },

  init()       { /* nothing — EnemyManager.startArena() called from GameLoop */ },
  startArena() { EnemyManager.startArena(); },

  targetHit(group, hitPoint, damage, shooter = null) {
    EnemyManager.targetHit(group, hitPoint, damage, shooter);
  },

  spawnImpact(position, color, count) {
    EnemyManager._spawnImpact(position, color, count);
  },

  spawnTracer(start, end) {
    EnemyManager._spawnTracer(start, end);
  },

  updateHUD() {
    EnemyManager._updateScoreHUD();
  },

  addKillEntry(name, pts) {
    EnemyManager._addKillEntry(name, pts);
  },

  update(delta) {
    // Delegated fully to EnemyManager via GameLoop
  },
};
