import * as THREE from 'three';
import { Renderer } from '../core/Renderer.js';
import { GameState } from '../core/GameState.js';
import { EnemyFactory } from '../entities/EnemyFactory.js';
import { ARENA_SIZE } from '../config/constants.js';
import { WeaponSystem } from './WeaponSystem.js';

export const LobbySystem = {
  isActive: false,
  characterGroup: null,
  wrapperGroup: null,
  animationFrameId: null,
  startTime: 0,
  animState: 'STANDING', // STANDING, WALKING, SPRINTING, SWIMMING
  animTimer: 0,
  
  init() {
    this.isActive = true;
    this.startTime = performance.now();
    this.animState = 'STANDING';
    this.animTimer = 0;
    document.getElementById('anim-state-label').innerText = this.animState;
    
    // Hide first-person weapon model
    if (WeaponSystem.viewModelGroup) {
      WeaponSystem.viewModelGroup.visible = false;
    }

    // Position camera in the forest (edge of the map)
    const half = ARENA_SIZE / 2;
    // We pick a spot near the edge looking into the trees
    const camX = half - 20;
    const camZ = half - 20;
    Renderer.camera.position.set(camX, 1.6, camZ);
    // Look towards the center
    Renderer.camera.lookAt(camX - 5, 1.2, camZ - 5);

    // Add a spotlight to illuminate the character in the dark forest
    this.spotLight = new THREE.SpotLight(0xffffff, 8);
    this.spotLight.position.set(camX + 1, 3, camZ + 1);
    this.spotLight.angle = Math.PI / 4;
    this.spotLight.penumbra = 0.5;
    this.spotLight.target.position.set(camX - 2, 1, camZ - 2);
    Renderer.scene.add(this.spotLight);
    Renderer.scene.add(this.spotLight.target);

    this.updateCharacterPreview();
    this.animate();
  },

  updateCharacterPreview() {
    if (this.wrapperGroup) {
      Renderer.scene.remove(this.wrapperGroup);
      this.wrapperGroup = null;
      this.characterGroup = null;
    }

    const outfit = GameState.playerOutfit;
    // Base weapon type to build mesh
    const wId = GameState.loadout.primary || GameState.loadout.secondary || 'pistol';
    let weaponType = 'pistol';
    if (['ak47', 'mp5', 'sniper', 'machinegun', 'ruger'].includes(wId)) {
      weaponType = 'rifle';
    }

    // Don't pass a name so the nameplate isn't created
    this.characterGroup = EnemyFactory.buildEnemy(outfit, weaponType, '');
    
    // Create a wrapper to handle the global lookAt rotation
    this.wrapperGroup = new THREE.Group();
    
    // Position wrapper in front of camera
    const half = ARENA_SIZE / 2;
    const camX = half - 20;
    const camZ = half - 20;
    
    // Put wrapper 1.5 units in front of camera, looking back at camera
    this.wrapperGroup.position.set(camX - 1.4, 0, camZ - 1.4);
    this.wrapperGroup.lookAt(camX, 0, camZ);
    
    this.wrapperGroup.add(this.characterGroup);
    Renderer.scene.add(this.wrapperGroup);
    
    // Reset rotations to match state
    this.setAnimState(this.animState);
  },

  setAnimState(state) {
    this.animState = state;
    document.getElementById('anim-state-label').innerText = state;
    
    // Reset rotations when switching
    if (this.characterGroup) {
      this.characterGroup.rotation.x = 0;
      this.characterGroup.rotation.y = 0; // Naturally faces the camera now!
      this.characterGroup.position.set(0, 0, 0); // Reset position
      this.characterGroup.userData._leftLeg.rotation.x = 0;
      this.characterGroup.userData._rightLeg.rotation.x = 0;
      // Note: EnemyFactory sets rightArm to -0.6 for aiming. We preserve it.
      this.characterGroup.userData._leftArm.rotation.x = 0;
      this.characterGroup.userData._rightArm.rotation.x = -0.6; 
      this.characterGroup.userData._leftArm.rotation.z = 0;
      this.characterGroup.userData._rightArm.rotation.z = 0;
    }
  },

  animate() {
    if (!this.isActive) return;
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const time = (performance.now() - this.startTime) / 1000;

    // Simple idle breathing
    if (this.characterGroup) {
      const lArm = this.characterGroup.userData._leftArm;
      this.characterGroup.position.y = Math.sin(time * 2) * 0.02;
      lArm.rotation.x = Math.sin(time * 1.5) * 0.05;
    }

    Renderer.renderer.render(Renderer.scene, Renderer.camera);
  },

  shutdown() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.wrapperGroup) {
      Renderer.scene.remove(this.wrapperGroup);
      this.wrapperGroup = null;
      this.characterGroup = null;
    }
    if (this.spotLight) {
      Renderer.scene.remove(this.spotLight.target);
      Renderer.scene.remove(this.spotLight);
      this.spotLight = null;
    }
  }
};
