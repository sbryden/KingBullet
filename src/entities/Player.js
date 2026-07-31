import * as THREE from 'three';
import { PLAYER_HEIGHT, WALK_SPEED, SPRINT_SPEED, JUMP_FORCE, GRAVITY, MOUSE_SENS, ARENA_SIZE } from '../config/constants.js';
import { Renderer } from '../core/Renderer.js';
import { InputManager } from '../core/InputManager.js';
import { GameState } from '../core/GameState.js';
import { OutfitFactory } from '../systems/OutfitFactory.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { Arena } from './Arena.js';

export const Player = {
  position: new THREE.Vector3(0, PLAYER_HEIGHT, ARENA_SIZE / 2 + 8),
  velocityY: 0,
  canJump: true,
  direction: new THREE.Vector3(),
  euler: new THREE.Euler(0, 0, 0, 'YXZ'),
  isSprinting: false,
  bodyMesh: null,
  leftLeg: null,
  rightLeg: null,
  walkTime: 0,
  shirtMat: null,
  pantsMat: null,
  skinMat: null,
  headMesh: null,
  torsoMesh: null,
  gearGroup: null,

  init() {
    // Random spawn
    const half = ARENA_SIZE / 2 - 2;
    this.position.x = (Math.random() - 0.5) * half * 1.5;
    this.position.z = (Math.random() - 0.5) * half * 1.5;
    Renderer.camera.position.copy(this.position);

    // Create player body mesh
    this.bodyMesh = new THREE.Group();

    const outfit = GameState.playerOutfit;
    this.shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.shirt, 15, 0.2), roughness: 1.0 });
    this.pantsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.pants, 15, 0.2), roughness: 1.0 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.skin, 8, 0.1), roughness: 0.8 });

    const bodyZOffset = 0.1; // Shift body slightly backwards

    // --- Head (for gear attachment) ---
    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), this.skinMat);
    this.headMesh.position.set(0, 1.45, bodyZOffset);
    this.headMesh.visible = false; // Hide from first-person view
    this.bodyMesh.add(this.headMesh);

    // --- Torso ---
    // 0.4 wide, 0.6 high, 0.2 deep
    this.torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.2), this.shirtMat);
    this.torsoMesh.position.set(0, 0.9, bodyZOffset);
    this.torsoMesh.castShadow = true;
    this.bodyMesh.add(this.torsoMesh);

    // --- Legs ---
    // 0.2 wide, 0.6 high, 0.2 deep
    const createLeg = () => {
      const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      legGeo.translate(0, -0.3, 0); // pivot at the top (hip)
      const legMesh = new THREE.Mesh(legGeo, this.pantsMat);
      legMesh.castShadow = true;
      return legMesh;
    };

    this.leftLeg = createLeg();
    this.leftLeg.position.set(-0.1, 0.6, bodyZOffset); // left hip
    this.bodyMesh.add(this.leftLeg);

    this.rightLeg = createLeg();
    this.rightLeg.position.set(0.1, 0.6, bodyZOffset); // right hip
    this.bodyMesh.add(this.rightLeg);

    // --- Apply gear ---
    this._applyGear();

    Renderer.scene.add(this.bodyMesh);
  },

  updateOutfit() {
    if (this.shirtMat && this.pantsMat) {
      const outfit = GameState.playerOutfit;
      
      this.shirtMat.color.setHex(0xffffff);
      this.pantsMat.color.setHex(0xffffff);
      this.shirtMat.map = OutfitFactory.createPixelTexture(outfit.shirt, 15, 0.2);
      this.pantsMat.map = OutfitFactory.createPixelTexture(outfit.pants, 15, 0.2);
      
      if (this.skinMat) {
        this.skinMat.color.setHex(0xffffff);
        this.skinMat.map = OutfitFactory.createPixelTexture(outfit.skin, 8, 0.1);
      }
      
      if (outfit.camo) {
        const tex = OutfitFactory.createCamoTexture(outfit.camo, outfit.scale);
        this.shirtMat.map = tex;
        this.pantsMat.map = tex;
      }
      
      this.shirtMat.needsUpdate = true;
      this.pantsMat.needsUpdate = true;
      if (this.skinMat) this.skinMat.needsUpdate = true;

      // Update Body Proportions based on outfit
      const isSmiler = outfit.id === 'smiler';
      
      if (this.torsoMesh) {
        this.torsoMesh.geometry.dispose();
        this.torsoMesh.geometry = new THREE.BoxGeometry(0.4, isSmiler ? 0.3 : 0.6, 0.2);
        this.torsoMesh.position.y = isSmiler ? 1.05 : 0.9;
      }
      
      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.geometry.dispose();
        this.rightLeg.geometry.dispose();
        
        const legGeo = new THREE.BoxGeometry(0.2, isSmiler ? 0.9 : 0.6, 0.2);
        legGeo.translate(0, isSmiler ? -0.45 : -0.3, 0);
        this.leftLeg.geometry = legGeo;
        this.rightLeg.geometry = legGeo;
        
        this.leftLeg.position.y = isSmiler ? 0.9 : 0.6;
        this.rightLeg.position.y = isSmiler ? 0.9 : 0.6;
      }

      // Reapply gear
      this._applyGear();
    }
  },

  _applyGear() {
    // Remove old gear
    if (this.gearGroup) {
      this.bodyMesh.remove(this.gearGroup);
      this.gearGroup = null;
    }

    const outfit = GameState.playerOutfit;
    if (outfit.gear && this.bodyMesh) {
      this.gearGroup = new THREE.Group();
      
      // Filter out head/face/hair gear for the first-person player
      const fpGear = { ...outfit.gear };
      delete fpGear.head;
      delete fpGear.face;
      delete fpGear.hair;
      
      const hairMat = outfit.hair ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.hair, 15, 0.2), roughness: 0.9 }) : null;
      OutfitFactory.attachGear(this.gearGroup, fpGear, {
        head: this.headMesh,
        torso: this.torsoMesh,
        leftLeg: this.leftLeg,
        rightLeg: this.rightLeg,
      }, {
        shirt: this.shirtMat,
        pants: this.pantsMat,
        skin: this.skinMat,
        hair: hairMat,
      });
      this.bodyMesh.add(this.gearGroup);
    }
  },

  update(delta) {
    if (!InputManager.isLocked) return;

    // Camera rotation
    const mouseDelta = InputManager.consumeMouseDelta();
    const sensMultiplier = WeaponSystem.isScoped ? 0.25 : 1.0;
    this.euler.setFromQuaternion(Renderer.camera.quaternion);
    this.euler.y -= mouseDelta.x * (MOUSE_SENS * sensMultiplier);
    this.euler.x -= mouseDelta.y * (MOUSE_SENS * sensMultiplier);
    this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
    Renderer.camera.quaternion.setFromEuler(this.euler);

    // Movement
    this.isSprinting = InputManager.isPressed('ShiftLeft') || InputManager.isPressed('ShiftRight');
    const speed = this.isSprinting ? SPRINT_SPEED : WALK_SPEED;
    
    this.direction.set(0, 0, 0);
    
    const fwd = new THREE.Vector3();
    Renderer.camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    if (InputManager.isPressed('KeyW')) this.direction.add(fwd);
    if (InputManager.isPressed('KeyS')) this.direction.sub(fwd);
    if (InputManager.isPressed('KeyD')) this.direction.add(right);
    if (InputManager.isPressed('KeyA')) this.direction.sub(right);

    if (this.direction.lengthSq() > 0) this.direction.normalize();

    const velX = this.direction.x * speed * delta;
    const velZ = this.direction.z * speed * delta;

    const checkCollision = (dirVec, dist) => {
      if (!Arena.obstacles || Arena.obstacles.length === 0) return false;
      const rayOrigin = new THREE.Vector3(this.position.x, this.position.y + 0.5, this.position.z);
      const raycaster = new THREE.Raycaster(rayOrigin, dirVec, 0, dist);
      const hits = raycaster.intersectObjects(Arena.obstacles, false);
      return hits.length > 0;
    };

    const playerRadius = 0.6;

    if (velX !== 0) {
      const dirX = new THREE.Vector3(Math.sign(velX), 0, 0);
      if (!checkCollision(dirX, playerRadius + Math.abs(velX))) {
        this.position.x += velX;
      }
    }
    
    if (velZ !== 0) {
      const dirZ = new THREE.Vector3(0, 0, Math.sign(velZ));
      if (!checkCollision(dirZ, playerRadius + Math.abs(velZ))) {
        this.position.z += velZ;
      }
    }

    // Jump
    if (InputManager.isPressed('Space') && this.canJump) {
      this.velocityY = JUMP_FORCE;
      this.canJump = false;
      InputManager.keys['Space'] = false; // consume jump
    }

    // Gravity and Terrain collision
    this.velocityY += GRAVITY * delta;
    this.position.y += this.velocityY * delta;
    
    let floorHeight = 0;
    if (Arena.collidables.length > 0) {
      const rayOrigin = new THREE.Vector3(this.position.x, this.position.y + 10, this.position.z);
      const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0));
      // raycaster.firstHitOnly = true; // small optimization if using a custom raycaster, but standard is fine
      const intersects = raycaster.intersectObjects(Arena.collidables, false);
      if (intersects.length > 0) {
        floorHeight = intersects[0].point.y;
      }
    }

    const groundY = floorHeight + PLAYER_HEIGHT;
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocityY = 0;
      this.canJump = true;
    }

    // Bounds
    const half = ARENA_SIZE / 2 - 0.5;
    this.position.x = Math.max(-half, Math.min(half, this.position.x));
    this.position.z = Math.max(-half, Math.min(half, this.position.z));

    Renderer.camera.position.copy(this.position);

    if (this.bodyMesh) {
      // Body follows player position but feet are on the ground relative to player height
      this.bodyMesh.position.copy(this.position);
      this.bodyMesh.position.y -= PLAYER_HEIGHT; 
      
      // Body rotates with camera yaw only
      this.bodyMesh.rotation.y = this.euler.y;

      // Leg animation
      const moveSpeed = this.direction.lengthSq() > 0 ? speed : 0;
      if (moveSpeed > 0 && this.position.y <= groundY + 0.1) {
        this.walkTime += delta * (speed * 0.8);
      } else {
        // Smoothly return to standing pose
        this.walkTime += (0 - this.walkTime) * 10 * delta;
        if (Math.abs(this.walkTime) < 0.01) this.walkTime = 0;
      }
      
      // Calculate swing angle
      let swing = 0;
      if (moveSpeed > 0 && this.position.y <= groundY + 0.1) {
         swing = Math.sin(this.walkTime) * 0.6;
      } else if (this.position.y > groundY + 0.1) {
         // Mid-air pose
         swing = 0.2; 
      } else {
         swing = Math.sin(this.walkTime) * 0.6; 
      }

      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = swing;
        this.rightLeg.rotation.x = -swing;
        
        // Mid-air: bend both legs slightly
        if (this.position.y > groundY + 0.1) {
          this.leftLeg.rotation.x = -0.3;
          this.rightLeg.rotation.x = -0.3;
        }
      }
    }
  }
};
