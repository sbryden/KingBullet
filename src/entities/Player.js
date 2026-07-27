import * as THREE from 'three';
import { PLAYER_HEIGHT, WALK_SPEED, SPRINT_SPEED, JUMP_FORCE, GRAVITY, MOUSE_SENS, ARENA_SIZE } from '../config/constants.js';
import { Renderer } from '../core/Renderer.js';
import { InputManager } from '../core/InputManager.js';

export const Player = {
  position: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
  velocityY: 0,
  canJump: true,
  direction: new THREE.Vector3(),
  euler: new THREE.Euler(0, 0, 0, 'YXZ'),
  isSprinting: false,

  init() {
    Renderer.camera.position.copy(this.position);
  },

  update(delta) {
    if (!InputManager.isLocked) return;

    // Camera rotation
    const mouseDelta = InputManager.consumeMouseDelta();
    this.euler.setFromQuaternion(Renderer.camera.quaternion);
    this.euler.y -= mouseDelta.x * MOUSE_SENS;
    this.euler.x -= mouseDelta.y * MOUSE_SENS;
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

    this.position.x += this.direction.x * speed * delta;
    this.position.z += this.direction.z * speed * delta;

    // Jump
    if (InputManager.isPressed('Space') && this.canJump) {
      this.velocityY = JUMP_FORCE;
      this.canJump = false;
      InputManager.keys['Space'] = false; // consume jump
    }

    // Gravity
    this.velocityY += GRAVITY * delta;
    this.position.y += this.velocityY * delta;
    if (this.position.y <= PLAYER_HEIGHT) {
      this.position.y = PLAYER_HEIGHT;
      this.velocityY = 0;
      this.canJump = true;
    }

    // Bounds
    const half = ARENA_SIZE / 2 - 0.5;
    this.position.x = Math.max(-half, Math.min(half, this.position.x));
    this.position.z = Math.max(-half, Math.min(half, this.position.z));

    Renderer.camera.position.copy(this.position);
  }
};
