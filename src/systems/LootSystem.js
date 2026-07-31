import * as THREE from 'three';
import { Renderer } from '../core/Renderer.js';
import { WEAPONS } from '../config/weapons.js';
import { ViewModelFactory } from './ViewModelFactory.js';

export const LootSystem = {
  chests: [],
  groundWeapons: [],

  init() {},

  spawnChest(position) {
    const chestGroup = new THREE.Group();
    chestGroup.position.copy(position);

    // Chest base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const baseGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    baseGeo.translate(0, 0.4, 0);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    chestGroup.add(baseMesh);

    // Chest lid
    const lidGeo = new THREE.BoxGeometry(1.2, 0.2, 0.8);
    lidGeo.translate(0, 0.1, -0.4); // Pivot at back
    const lidMesh = new THREE.Mesh(lidGeo, baseMat);
    lidMesh.position.set(0, 0.8, 0.4);
    lidMesh.castShadow = true;
    chestGroup.add(lidMesh);

    // Hitbox for interaction
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ visible: false }));
    hitbox.position.set(0, 1, 0);
    hitbox.userData = { isChest: true, chestObj: chestGroup, lid: lidMesh, opened: false };
    chestGroup.add(hitbox);

    Renderer.scene.add(chestGroup);
    this.chests.push(chestGroup);
  },

  openChest(chestData) {
    if (chestData.opened) return;
    chestData.opened = true;
    
    // Animate lid open
    let p = 0;
    const animateLid = () => {
      p += 0.05;
      if (p <= 1) {
        chestData.lid.rotation.x = -p * Math.PI * 0.6;
        requestAnimationFrame(animateLid);
      } else {
        // Spawn a random weapon
        const weaponKeys = Object.keys(WEAPONS).filter(k => k !== 'knife'); // filter out starter knife
        const randomWep = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
        
        const spawnPos = chestData.chestObj.position.clone();
        spawnPos.y += 1.0; // spawn slightly above chest
        spawnPos.z += 1.0; // pop out in front
        
        this.spawnGroundWeapon(randomWep, spawnPos);
      }
    };
    animateLid();
  },

  spawnGroundWeapon(weaponId, position) {
    const w = WEAPONS[weaponId];
    if (!w) return;

    const wepGroup = new THREE.Group();
    wepGroup.position.copy(position);

    // Build actual mesh
    const dummyVm = new THREE.Group();
    // Default dummy materials
    const skinMat = new THREE.MeshBasicMaterial();
    const shirtMat = new THREE.MeshBasicMaterial();
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xb8b8c0, roughness: 0.25, metalness: 0.85 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.7 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.6, metalness: 0.1 });

    if (weaponId === 'knife' || weaponId === 'bayonet') {
      ViewModelFactory.buildMeleeModel(dummyVm, weaponId, skinMat, shirtMat, skinMat, 'long', silverMat, darkMetalMat, gripMat);
    } else if (w.isGrenade) {
      ViewModelFactory.buildGrenadeModel(dummyVm, skinMat, shirtMat, skinMat, 'long', silverMat, darkMetalMat);
    } else {
      ViewModelFactory.buildGunModel(dummyVm, weaponId, skinMat, shirtMat, skinMat, 'long', silverMat, darkMetalMat, gripMat, woodMat);
    }
    
    const gunMesh = dummyVm.children[0];
    if (gunMesh) {
      gunMesh.scale.set(4, 4, 4);

      const slot = w.type === 'melee' ? 'melee' : (w.type === 'pistol' || w.type === 'grenade' ? 'secondary' : 'primary');
      wepGroup.userData = { isWeaponDrop: true, weaponId: weaponId, slot: slot, baseY: position.y };
      
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ visible: false }));
      hitbox.userData = wepGroup.userData;
      wepGroup.add(hitbox);

      wepGroup.add(gunMesh);
      Renderer.scene.add(wepGroup);
      this.groundWeapons.push({ group: wepGroup, floatTime: Math.random() * 10 });
    }
  },

  update(delta) {
    // Float ground weapons
    for (const w of this.groundWeapons) {
      w.floatTime += delta * 2;
      w.group.position.y = (w.group.userData.baseY || 1.0) + Math.sin(w.floatTime) * 0.2;
      w.group.rotation.y += delta;
    }
  },

  removeGroundWeapon(groupData) {
    const idx = this.groundWeapons.findIndex(w => w.group.userData === groupData);
    if (idx !== -1) {
      const w = this.groundWeapons[idx];
      Renderer.scene.remove(w.group);
      this.groundWeapons.splice(idx, 1);
    }
  }
};
