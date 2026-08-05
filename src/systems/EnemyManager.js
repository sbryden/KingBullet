import * as THREE from 'three';
import { Renderer }      from '../core/Renderer.js';
import { GameState }     from '../core/GameState.js';
import { EnemyFactory, ENEMY_WEAPON_TYPES }  from '../entities/EnemyFactory.js';
import { Arena } from '../entities/Arena.js';
import { LootSystem } from './LootSystem.js';
import { SoundManager } from '../core/SoundManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { NetworkManager } from '../core/NetworkManager.js';
import {
  NUM_STATIC_TARGETS, NUM_MOVING_TARGETS,
  TARGET_RESPAWN_TIME, ARENA_SIZE, PLAYER_HEIGHT
} from '../config/constants.js';

// ── Enemy AI states ───────────────────────────────────────
const STATE = { IDLE: 'idle', AGGRO: 'aggro', DEAD: 'dead', SEARCH_WEAPON: 'search_weapon' };

// How many enemies shoot simultaneously (difficulty)
const MAX_AGGRESSORS = 4;

// Bullet speed (units/s)
const BULLET_SPEED = 28;

// After this many seconds of no line-of-sight the enemy calms down
const AGGRO_TIMEOUT = 6.0;

export const EnemyManager = {
  enemies:   [],
  particles: [],
  tracers:   [],
  bulletMeshes: [], // { mesh, vel, life }
  impactSounds: [],

  // Player health managed here for easy cross-system access
  playerHealth:    100,
  playerMaxHealth: 100,
  playerHitFlash:  0,    // seconds remaining of red vignette

  _raycaster: new THREE.Raycaster(),
  _frameCount: 0,

  // ── Initialise ──────────────────────────────────────────
  startArena() {
    // Arena is now started globally by the Match State
  },

  reset() {
    // Remove all enemy meshes
    this.enemies.forEach(e => { if (e.group) Renderer.scene.remove(e.group); });
    this.particles.forEach(p => { Renderer.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
    this.tracers.forEach(t => { Renderer.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
    this.bulletMeshes.forEach(b => { Renderer.scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });
    this.enemies = [];
    this.particles = [];
    this.tracers = [];
    this.bulletMeshes = [];
    this.playerHealth = this.playerMaxHealth;
    this.playerHitFlash = 0;
    this._updateHealthHUD();
  },

  // ── Spawn ────────────────────────────────────────────────
  spawnEnemies(count = 30) {
    if (this.enemies.length > 0) this.reset();
    for (let i = 0; i < count; i++) {
      this._spawnEnemy();
    }
  },

  _spawnEnemy() {
    // Spread them out across almost the full arena
    const x = (Math.random() - 0.5) * ARENA_SIZE * 0.95;
    const z = (Math.random() - 0.5) * ARENA_SIZE * 0.95;
    const pos = new THREE.Vector3(x, PLAYER_HEIGHT + 10, z); // start high so raycaster drops them to ground

    const outfit = EnemyFactory.randomOutfit();
    // ~60% of bots spawn with a real weapon so fights break out
    const weaponPool = ['knife', 'knife', 'pistol', 'ak47', 'mp5', 'pistol', 'ak47', 'mp5', 'sniper', 'machinegun'];
    const weaponType = weaponPool[Math.floor(Math.random() * weaponPool.length)];
    const name = EnemyFactory.randomName();
    
    const group = EnemyFactory.buildEnemy(outfit, weaponType, name);
    group.position.copy(pos);
    group.userData.isTarget = true;
    group.userData.alive    = true;

    Renderer.scene.add(group);

    const enemy = {
      group,
      weaponType,
      weaponDef:    ENEMY_WEAPON_TYPES[weaponType],
      name,
      state:        STATE.IDLE,
      health:       100,
      maxHealth:    100,
      respawnTimer: 0,
      
      waypoint:     null,
      waypointWait: 0,
      jumpCooldown: 0,
      velocityY:    0,
      moveSpeed:    1.5 + Math.random() * 1.5,
      targetEnemy:  null,

      fireCooldown: 3.0 + Math.random(), // 3s initial cooldown + slight offset
      burstCount:   0,
      burstTimer:   0,
      aggroTimer:   0,
      walkTime:     0,
      points:       150,
      // Leg refs for animation
      _leftLeg:  group.userData._leftLeg,
      _rightLeg: group.userData._rightLeg,
      
      id: this.enemies.length
    };

    this.enemies.push(enemy);
    return enemy;
  },

  // ── Main update ──────────────────────────────────────────
  update(delta, camera) {
    const playerPos = camera.position;
    const aggroCount = this.enemies.filter(e => e.state === STATE.AGGRO).length;

    this._frameCount++;

    // ── Enemies ──
    this.enemies.forEach(e => {
      if (e.state === STATE.DEAD) {
        return;
      }

      // Apply storm damage (Battle Royale only)
      if (GameState.gameMode === 'battle_royale' && GameState.isArenaActive && GameState.storm) {
        const dx = e.group.position.x - GameState.storm.x;
        const dz = e.group.position.z - GameState.storm.z;
        const dist = Math.hypot(dx, dz);
        if (dist > GameState.storm.radius) {
          e.health -= 15 * delta;
          if (e.health <= 0) {
            e.health = 0;
            this._killEnemy(e, e.group.position);
            return;
          }
        }
      }

      // Apply gravity & raycast to ground
      e.velocityY -= 20 * delta; // GRAVITY
      e.group.position.y += e.velocityY * delta;

      if ((this._frameCount + e.id) % 5 === 0) {
        let floorHeight = 0;
        if (Arena.collidables && Arena.collidables.length > 0) {
          const rayOrigin = new THREE.Vector3(e.group.position.x, e.group.position.y + 10, e.group.position.z);
          this._raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
          this._raycaster.far = Infinity;
          const intersects = this._raycaster.intersectObjects(Arena.collidables, false);
          if (intersects.length > 0) {
            floorHeight = intersects[0].point.y;
          }
        }
        e._lastFloorHeight = floorHeight;
      }

      const floorHeight = e._lastFloorHeight || 0;

      const groundY = floorHeight - 0.41; // Enemy feet are at local y=0.41
      if (e.group.position.y <= groundY) {
        e.group.position.y = groundY;
        e.velocityY = 0;
      }

      // Bounds
      const half = ARENA_SIZE / 2 - 2;
      e.group.position.x = Math.max(-half, Math.min(half, e.group.position.x));
      e.group.position.z = Math.max(-half, Math.min(half, e.group.position.z));

      // Collision helper for enemies
      const tryMove = (enemy, dir, speedMult) => {
        const velX = dir.x * speedMult;
        const velZ = dir.z * speedMult;
        
        const checkCol = (dirVec, dist, axis) => {
          if (!Arena.obstacles || Arena.obstacles.length === 0) return false;
          
          if ((this._frameCount + enemy.id) % 5 !== 0) {
            return enemy[`_lastCol${axis}`] || false;
          }
          
          const origin = new THREE.Vector3(enemy.group.position.x, enemy.group.position.y + 0.5, enemy.group.position.z);
          this._raycaster.set(origin, dirVec);
          this._raycaster.far = dist;
          const hit = this._raycaster.intersectObjects(Arena.obstacles, false).length > 0;
          enemy[`_lastCol${axis}`] = hit;
          return hit;
        };
        
        const r = 0.6;
        if (velX !== 0) {
          const dx = new THREE.Vector3(Math.sign(velX), 0, 0);
          if (!checkCol(dx, r + Math.abs(velX), 'X')) enemy.group.position.x += velX;
        }
        if (velZ !== 0) {
          const dz = new THREE.Vector3(0, 0, Math.sign(velZ));
          if (!checkCol(dz, r + Math.abs(velZ), 'Z')) enemy.group.position.z += velZ;
        }
      };

      // Detection
      if (e.state === STATE.IDLE) {
        // First: check for nearby enemies to fight
        let foundTarget = false;
        const hasGun = e.weaponType !== 'none' && e.weaponType !== 'knife' && e.weaponType !== 'bayonet';
        // Guns detect at 100u, melee/knife bots still aggro within 15u
        const detectionRange = hasGun ? 100 : 15;
        
        {
          let closestDist = detectionRange;
          let target = null;
          
          // Check player
          const distToPlayer = e.group.position.distanceTo(playerPos);
          if (distToPlayer < closestDist) {
             closestDist = distToPlayer;
             target = { pos: playerPos, type: 'player' };
          }

          // Check other bots
          this.enemies.forEach(other => {
            if (other !== e && other.state !== STATE.DEAD) {
              const dist = e.group.position.distanceTo(other.group.position);
              if (dist < closestDist) {
                closestDist = dist;
                target = { pos: other.group.position, type: 'bot', ref: other };
              }
            }
          });

          if (target) {
            e.state = STATE.AGGRO;
            e.targetEnemy = target;
            e.aggroTimer = AGGRO_TIMEOUT;
            foundTarget = true;
          }
        }
        
        // Second: if no enemy nearby, knife/unarmed bots search for weapons
        if (!foundTarget && (e.weaponType === 'none' || e.weaponType === 'knife' || e.weaponType === 'bayonet')) {
          let closestDist = 60;
          let targetObj = null;
          let isChest = false;
          
          LootSystem.groundWeapons.forEach(w => {
            const dist = e.group.position.distanceTo(w.group.position);
            if (dist < closestDist) {
              closestDist = dist;
              targetObj = w;
              isChest = false;
            }
          });
          
          LootSystem.chests.forEach(c => {
            const hitbox = c.children[2];
            if (hitbox && !hitbox.userData.opened) {
              const dist = e.group.position.distanceTo(c.position);
              if (dist < closestDist) {
                closestDist = dist;
                targetObj = c;
                isChest = true;
              }
            }
          });
          
          if (targetObj) {
            e.state = STATE.SEARCH_WEAPON;
            e.targetWeapon = targetObj;
            e.targetIsChest = isChest;
          }
        }
      }

      // AI Logic
      let isWalking = false;
      if (e.state === STATE.SEARCH_WEAPON) {
        if (!e.targetWeapon) {
          e.state = STATE.IDLE;
        } else {
          let tPos;
          let isValid = false;

          if (e.targetIsChest) {
            const hitbox = e.targetWeapon.children[2];
            isValid = hitbox && !hitbox.userData.opened;
            tPos = e.targetWeapon.position;
          } else {
            isValid = LootSystem.groundWeapons.includes(e.targetWeapon);
            tPos = e.targetWeapon.group ? e.targetWeapon.group.position : e.targetWeapon.position;
          }

          if (!isValid) {
            e.state = STATE.IDLE;
            e.targetWeapon = null;
          } else {
            e.group.lookAt(tPos.x, e.group.position.y, tPos.z);
            const dir = new THREE.Vector3().subVectors(tPos, e.group.position);
            dir.y = 0;
            const dist = dir.length();
            if (dist > 2.0) {
               dir.normalize();
               tryMove(e, dir, e.moveSpeed * delta);
               isWalking = true;
            } else {
               if (e.targetIsChest) {
                 LootSystem.openChest(e.targetWeapon.children[2].userData);
                 e.state = STATE.IDLE;
                 e.targetWeapon = null;
               } else {
                 const wepId = e.targetWeapon.group.userData.weaponId;
                 EnemyFactory.equipWeapon(e.group, wepId, e.name);
                 e.weaponType = wepId;
                 e.weaponDef = ENEMY_WEAPON_TYPES[wepId];
                 LootSystem.removeGroundWeapon(e.targetWeapon.group.userData);
                 e.state = STATE.IDLE;
                 e.targetWeapon = null;
               }
            }
          }
        }
      } else if (e.state === STATE.IDLE) {
        // Roaming
        if (e.waypointWait > 0) {
          e.waypointWait -= delta;
        } else {
          if (!e.waypoint) {
             const x = e.group.position.x + (Math.random() - 0.5) * 40;
             const z = e.group.position.z + (Math.random() - 0.5) * 40;
             e.waypoint = new THREE.Vector3(x, groundY, z);
          }
          const dir = new THREE.Vector3().subVectors(e.waypoint, e.group.position);
          dir.y = 0;
          const dist = dir.length();
          if (dist < 1.0) {
             e.waypoint = null;
             e.waypointWait = 1.0 + Math.random() * 2.0;
          } else {
             dir.normalize();
             tryMove(e, dir, e.moveSpeed * delta);
             e.group.lookAt(e.waypoint.x, e.group.position.y, e.waypoint.z);
             isWalking = true;
          }
        }
      } else if (e.state === STATE.AGGRO) {
        e.aggroTimer -= delta;
        
        // Find target pos
        let tPos = null;
        let isTargetDead = false;
        
        if (e.targetEnemy.type === 'player') {
            tPos = playerPos;
        } else if (e.targetEnemy.ref) {
            if (e.targetEnemy.ref.state === STATE.DEAD) {
                isTargetDead = true;
            } else {
                tPos = e.targetEnemy.ref.group.position;
            }
        }
        
        if (!tPos || isTargetDead || e.aggroTimer <= 0) {
          e.state = STATE.IDLE;
          e.targetEnemy = null;
        } else {
          e.group.lookAt(tPos.x, e.group.position.y, tPos.z);
          // Move towards target if too far, or strafe
          const dir = new THREE.Vector3().subVectors(tPos, e.group.position);
          dir.y = 0;
          const dist = dir.length();
          if (dist > 12) {
             dir.normalize();
             tryMove(e, dir, e.moveSpeed * delta);
             isWalking = true;
          } else if (dist < 4) {
             dir.normalize();
             tryMove(e, dir, -e.moveSpeed * delta);
             isWalking = true;
          }

          // Random jump during combat
          e.jumpCooldown -= delta;
          if (e.jumpCooldown <= 0 && e.velocityY === 0 && e.group.position.y <= groundY + 0.1) {
            if (Math.random() > 0.5) {
              e.velocityY = 8; // jump
            }
            e.jumpCooldown = 1.5 + Math.random() * 3.0;
          }

          // Combat shooting logic
          if (e.burstCount > 0) {
            e.burstTimer -= delta;
            if (e.burstTimer <= 0) {
              this._enemyShoot(e, tPos, e.targetEnemy);
              e.burstCount--;
              if (e.burstCount > 0) {
                e.burstTimer = e.weaponDef.burstInterval;
              } else {
                e.fireCooldown = 3.0;
              }
            }
          } else {
            e.fireCooldown -= delta;
            if (e.fireCooldown <= 0) {
              e.burstCount = e.weaponDef.burstCount;
              e.burstTimer = 0; 
            }
          }
        }
      }

      // Walk animation
      if (isWalking && e.group.position.y <= groundY + 0.1) {
        e.walkTime += delta * e.moveSpeed * 2.5;
      } else {
        e.walkTime += (0 - e.walkTime) * 10 * delta;
        if (Math.abs(e.walkTime) < 0.01) e.walkTime = 0;
      }
      
      let swing = 0;
      if (e.group.position.y > groundY + 0.1) {
        swing = 0.2; // mid-air
      } else {
        swing = Math.sin(e.walkTime) * 0.55;
      }

      if (e._leftLeg)  e._leftLeg.rotation.x  =  swing;
      if (e._rightLeg) e._rightLeg.rotation.x = -swing;
    });

    // ── Enemy bullets ──
    for (let i = this.bulletMeshes.length - 1; i >= 0; i--) {
      const b = this.bulletMeshes[i];
      b.life -= delta;
      b.mesh.position.addScaledVector(b.vel, delta);

      let bulletRemoved = false;

      // Hit player check
      if (b.targetType === 'player' || !b.targetType) {
        const dist = b.mesh.position.distanceTo(playerPos);
        if (dist < 0.7 && !b.hitSomething) {
            b.hitSomething = true;
            this._damagePlayer(b.damage);
            this._cleanupMesh(b.mesh);
            this.bulletMeshes.splice(i, 1);
            bulletRemoved = true;
            continue;
        }
      }

      // Hit bot check
      if (!bulletRemoved && b.shooter) {
        for (const enemy of this.enemies) {
            if (enemy === b.shooter || enemy.state === STATE.DEAD) continue;
            const dist = b.mesh.position.distanceTo(enemy.group.position);
            if (dist < 1.2 && !b.hitSomething) {
                b.hitSomething = true;
                this.targetHit(enemy.group, b.mesh.position, b.damage);
                this._cleanupMesh(b.mesh);
                this.bulletMeshes.splice(i, 1);
                bulletRemoved = true;
                break;
            }
        }
      }

      if (!bulletRemoved && (b.life <= 0 || b.mesh.position.y < 0)) {
        this._cleanupMesh(b.mesh);
        this.bulletMeshes.splice(i, 1);
      }
    }

    // ── Particles ──
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * 2;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 10 * delta;
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        this._cleanupMesh(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // ── Tracers ──
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= delta * 15;
      if (t.mesh.material) t.mesh.material.opacity = Math.max(0, t.life);
      if (t.life <= 0) {
        this._cleanupMesh(t.mesh);
        this.tracers.splice(i, 1);
      }
    }

    // ── Player hit flash ──
    if (this.playerHitFlash > 0) {
      this.playerHitFlash -= delta;
      const el = document.getElementById('damage-vignette');
      if (el) el.style.opacity = Math.min(1, this.playerHitFlash * 4);
      if (this.playerHitFlash <= 0) {
        if (el) el.style.opacity = 0;
      }
    }
  },

  // ── Enemy fires at target ────────────────────────────────
  _enemyShoot(enemy, targetPos, targetObj) {
    // Ensure the world matrix is current before reading barrel position
    enemy.group.updateMatrixWorld(true);
    const gunGroup = enemy.group.userData._gunGroup;
    const barrelZ = gunGroup.userData._barrelTipZ || -0.6;
    const tipLocal = new THREE.Vector3(0, 0, barrelZ);
    const tipWorld = tipLocal.clone().applyMatrix4(gunGroup.matrixWorld);

    // Aim at target center (approximate)
    const aimTarget = targetPos.clone();
    aimTarget.y += 0.5; // aim at upper body

    // Add some random error to aiming so bots aren't too accurate
    aimTarget.x += (Math.random() - 0.5) * 1.5;
    aimTarget.y += (Math.random() - 0.5) * 1.5;
    aimTarget.z += (Math.random() - 0.5) * 1.5;

    // Base aim direction
    const baseAim = aimTarget.clone().sub(tipWorld).normalize();

    const pellets = enemy.weaponDef.pellets || 1;
    const spreadAmt = enemy.weaponDef.spread || 0.18;

    for (let i = 0; i < pellets; i++) {
      const aim = baseAim.clone();
      aim.x += (Math.random() - 0.5) * spreadAmt;
      aim.y += (Math.random() - 0.5) * spreadAmt;
      aim.z += (Math.random() - 0.5) * spreadAmt;
      aim.normalize();

      // Bullet mesh
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color: enemy.weaponDef.color || 0xffcc44 })
      );
      mesh.position.copy(tipWorld);
      Renderer.scene.add(mesh);

      this.bulletMeshes.push({
        mesh,
        vel: aim.multiplyScalar(BULLET_SPEED),
        life: 2.5,
        hitSomething: false,
        damage: enemy.weaponDef.damage,
        shooter: enemy,
        targetType: targetObj ? targetObj.type : null,
      });

      // Tracer
      const tracerEnd = tipWorld.clone().add(aim.clone().multiplyScalar(40));
      this._spawnTracer(tipWorld, tracerEnd, enemy.weaponDef.color || 0xffaa22);
    }

    // Muzzle flash on enemy gun
    this._spawnImpact(tipWorld, enemy.weaponDef.color || 0xffd740, 4);
  },

  // ── Called by WeaponSystem or Bot bullets when target hit ─────
  targetHit(group, hitPoint, damage, shooter = null) {
    const enemy = this.enemies.find(e => e.group === group);
    if (!enemy || enemy.state === STATE.DEAD) return;

    enemy.health -= damage;

    // Hit marker flash (only if player caused it, but we'll flash anyway for feedback)
    const hm = document.getElementById('hitmarker');
    if (hm && !shooter) {
      hm.classList.add('flash');
      setTimeout(() => hm.classList.remove('flash'), 120);
      SoundManager.playHitMarker();
    }

    // Blood particles
    this._spawnImpact(hitPoint, 0xcc1111, 14);
    ParticleSystem.spawnSparks(hitPoint, new THREE.Vector3(0,1,0), 0xcc1111);

    // Enrage: enemy goes AGGRO when first hit
    if (enemy.state === STATE.IDLE) {
      const aggroCount = this.enemies.filter(e => e.state === STATE.AGGRO).length;
      if (aggroCount < MAX_AGGRESSORS) {
        enemy.state = STATE.AGGRO;
        enemy.aggroTimer = AGGRO_TIMEOUT;
        
        if (shooter) {
            enemy.targetEnemy = { type: 'bot', ref: shooter };
        } else if (!enemy.targetEnemy) {
            enemy.targetEnemy = { type: 'player', pos: Renderer.camera.position };
        }
        
        this._flashEnemy(enemy);
      }
    } else if (enemy.state === STATE.AGGRO) {
      enemy.aggroTimer = AGGRO_TIMEOUT;
      if (shooter && (!enemy.targetEnemy || enemy.targetEnemy.type !== 'player')) {
          enemy.targetEnemy = { type: 'bot', ref: shooter };
      }
    }

    if (enemy.health <= 0) {
      this._killEnemy(enemy, hitPoint);
    } else {
      this._flashEnemy(enemy);
    }
  },

  get targets() {
    return this.enemies.map(e => {
      if (!e.group) return null;
      e.group.userData.alive  = e.state !== STATE.DEAD;
      e.group.userData.points = e.points;
      return e.group;
    }).filter(Boolean);
  },

  // ── Kill enemy ──────────────────────────────────────────
  _killEnemy(enemy, hitPoint) {
    enemy.state = STATE.DEAD;
    enemy.group.userData.alive = false;
    GameState.score += enemy.points;
    GameState.kills++;
    GameState.earnKB(10);
    this._updateScoreHUD();
    this._addKillEntry(enemy.name || 'Enemy Soldier', enemy.points);
    this._spawnImpact(hitPoint, 0xcc1111, 22);
    ParticleSystem.spawnExplosion(enemy.group.position, 0xcc1111, 1.5);
    SoundManager.playExplosion();

    NetworkManager.notifyBotDeath();
    NetworkManager.notifyKill({ team: GameState.team });

    // Death collapse animation
    let p = 0;
    const collapse = () => {
      p += 0.06;
      enemy.group.rotation.z = p * (Math.PI / 2);
      enemy.group.position.y = -p * 0.5;
      if (p < 1) requestAnimationFrame(collapse);
      else {
        enemy.group.visible = false;
        enemy.respawnTimer = TARGET_RESPAWN_TIME;
      }
    };
    collapse();
  },

  // ── Respawn enemy ────────────────────────────────────────
  _respawnEnemy(enemy) {
    enemy.health = enemy.maxHealth;
    enemy.state  = STATE.IDLE;
    enemy.targetEnemy = null;
    enemy.group.userData.alive = true;

    // Random new position
    const x = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
    const z = (Math.random() - 0.5) * ARENA_SIZE * 0.8;
    enemy.group.position.set(x, PLAYER_HEIGHT + 10, z); // start high so it raycasts down
    enemy.group.rotation.set(0, 0, 0);
    enemy.group.visible = true;
    enemy.group.scale.set(1, 1, 1);
  },

  // ── Player damage ────────────────────────────────────────
  _damagePlayer(amount) {
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.playerHitFlash = 0.35;
    this._updateHealthHUD();
    
    SoundManager.playDamage();
    Renderer.shake(0.3, 0.4);

    if (this.playerHealth <= 0) {
      this._triggerPlayerDeath();
    }
  },

  _triggerPlayerDeath() {
    GameState.isAlive = false;
    NetworkManager.notifyDeath();

    // In TDM/Gun Game, show respawn countdown instead of death screen
    if (GameState.gameMode === 'team_deathmatch' || GameState.gameMode === 'gun_game') {
      const countdown = document.getElementById('respawn-countdown');
      const timerEl = document.getElementById('respawn-timer');
      if (countdown) countdown.classList.remove('hidden');
      
      let remaining = 3;
      if (timerEl) timerEl.textContent = remaining;
      
      const interval = setInterval(() => {
        remaining--;
        if (timerEl) timerEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(interval);
          if (countdown) countdown.classList.add('hidden');
          this.respawnPlayer();
        }
      }, 1000);
      return;
    }

    // Battle Royale: show death screen
    const scoreEl = document.getElementById('death-score');
    const killsEl = document.getElementById('death-kills');
    const kbEl = document.getElementById('death-kb');
    
    const bonusKB = Math.floor(GameState.score / 10);
    if (bonusKB > 0) GameState.earnKB(bonusKB);
    
    if (scoreEl) scoreEl.textContent = GameState.score;
    if (killsEl) killsEl.textContent = GameState.kills;
    if (kbEl) kbEl.textContent = "+" + GameState.kbEarnedThisRound;
    
    const ds = document.getElementById('death-screen');
    if (ds) ds.classList.remove('hidden');
    document.exitPointerLock();
  },

  respawnPlayer() {
    GameState.isAlive = true;
    this.playerHealth = this.playerMaxHealth;
    this._updateHealthHUD();
    
    // Random respawn position
    const half = ARENA_SIZE / 2 - 20;
    Player.position.x = (Math.random() - 0.5) * half * 1.5;
    Player.position.z = (Math.random() - 0.5) * half * 1.5;
    Player.position.y = PLAYER_HEIGHT + 10;
    Player.velocityY = 0;
    
    // Sync camera (Renderer is already imported at the top of the file)
    Renderer.camera.position.copy(Player.position);
  },

  // ── HUD helpers ─────────────────────────────────────────
  _updateHealthHUD() {
    const pct = this.playerHealth / this.playerMaxHealth;
    const lbl  = document.getElementById('health-label');
    const fill = document.getElementById('health-bar-inner');
    if (lbl)  lbl.textContent = Math.ceil(this.playerHealth);
    if (fill) {
      fill.style.width = (pct * 100).toFixed(1) + '%';
      fill.style.background =
        pct > 0.6 ? '#00e5ff' :
        pct > 0.3 ? '#ffd740' : '#ff3d5a';
    }
  },

  _updateScoreHUD() {
    const s = document.getElementById('score-val');
    const k = document.getElementById('kills-val');
    if (s) s.textContent = GameState.score;
    if (k) k.textContent = GameState.kills;
  },

  _addKillEntry(name, pts) {
    const feed = document.getElementById('kill-feed');
    if (!feed) return;
    const el = document.createElement('div');
    el.className = 'kill-entry';
    el.textContent = '✕ ' + name + ' +' + pts;
    feed.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  },

  // ── Visual helpers ──────────────────────────────────────
  _flashEnemy(enemy) {
    const origColors = [];
    enemy.group.traverse(obj => {
      if (obj.isMesh && obj.material) {
        origColors.push({ obj, color: obj.material.color.clone() });
        obj.material.color.set(0xffffff);
      }
    });
    setTimeout(() => {
      origColors.forEach(({ obj, color }) => {
        if (obj.material) obj.material.color.copy(color);
      });
    }, 80);
  },

  _spawnImpact(position, color, count) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      mesh.position.copy(position);
      Renderer.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random()-0.5)*7, Math.random()*5, (Math.random()-0.5)*7),
        life: 1,
      });
    }
  },

  _spawnTracer(start, end, color = 0xffeebb) {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geo, mat);
    Renderer.scene.add(line);
    this.tracers.push({ mesh: line, life: 1.0 });
  },

  _cleanupMesh(mesh) {
    Renderer.scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  },
};
