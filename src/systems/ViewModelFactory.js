import * as THREE from 'three';
import { GameState } from '../core/GameState.js';
import { WEAPONS } from '../config/weapons.js';

export const ViewModelFactory = {
  createPlayerViewModel(camera) {
    const viewModel = new THREE.Group();

    // Common materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7, metalness: 0.05 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xb8b8c0, roughness: 0.25, metalness: 0.85 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.7 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.6, metalness: 0.1 });
    const oliveMat = new THREE.MeshStandardMaterial({ color: 0x4a5a3a, roughness: 0.7, metalness: 0.2 });

    const weaponId = GameState.activeWeaponId();
    const w = WEAPONS[weaponId];

    if (GameState.currentSlot === 'melee') {
      this.buildMeleeModel(viewModel, weaponId, skinMat, silverMat, darkMetalMat, gripMat);
    } else if (w.isGrenade) {
      this.buildGrenadeModel(viewModel, skinMat, oliveMat, darkMetalMat);
    } else {
      this.buildGunModel(viewModel, weaponId, skinMat, silverMat, darkMetalMat, gripMat, woodMat);
    }

    camera.add(viewModel);
    return viewModel;
  },

  buildGunModel(vm, weaponId, skinMat, silverMat, darkMetalMat, gripMat, woodMat) {
    const gunGroup = new THREE.Group();
    const loadout = GameState.loadout;

    if (weaponId === 'ruger') {
      const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 12), darkMetalMat);
      receiver.rotation.x = Math.PI/2;
      receiver.position.set(0, 0.0, -0.2);
      gunGroup.add(receiver);
      
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.12), darkMetalMat);
      frame.position.set(0, -0.02, 0.02);
      gunGroup.add(frame);
      
      const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.04), gripMat);
      pistolGrip.position.set(0, -0.07, 0.05);
      pistolGrip.rotation.x = 0.35;
      gunGroup.add(pistolGrip);
      
      const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, 0.04), darkMetalMat);
      triggerGuard.position.set(0, -0.04, 0.01);
      gunGroup.add(triggerGuard);
      
      const fs = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.015, 0.006), darkMetalMat);
      fs.position.set(0, 0.02, -0.35);
      gunGroup.add(fs);
      
      const rs = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.01), darkMetalMat);
      rs.position.set(0, 0.02, -0.05);
      gunGroup.add(rs);

      if (loadout.melee === 'bayonet') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.015, 0.14), silverMat);
        blade.position.set(0, -0.015, -0.45); gunGroup.add(blade);
      }
      gunGroup.position.set(0.08, -0.12, -0.25);

    } else if (weaponId === 'mp5') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.42), silverMat);
      gunGroup.add(receiver);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, 0.35), darkMetalMat);
      topRail.position.set(0, 0.041, -0.02); gunGroup.add(topRail);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.055, 0.2), darkMetalMat);
      barrel.position.set(0, -0.005, -0.3); gunGroup.add(barrel);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.06, 8), darkMetalMat);
      muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, 0.005, -0.43); gunGroup.add(muzzle);
      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.04), darkMetalMat);
      magazine.position.set(0, -0.1, 0.02); magazine.rotation.x = 0.08; gunGroup.add(magazine);
      const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.04), gripMat);
      pistolGrip.position.set(0, -0.08, 0.12); pistolGrip.rotation.x = 0.25; gunGroup.add(pistolGrip);
      const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.06), darkMetalMat);
      triggerGuard.position.set(0, -0.04, 0.06); gunGroup.add(triggerGuard);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.1), darkMetalMat);
      stock.position.set(0, 0.005, 0.26); gunGroup.add(stock);
      const stockEnd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.015), gripMat);
      stockEnd.position.set(0, 0.005, 0.31); gunGroup.add(stockEnd);
      const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.01), darkMetalMat);
      rearSight.position.set(0, 0.058, 0.12); gunGroup.add(rearSight);
      const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.006), darkMetalMat);
      frontSight.position.set(0, 0.058, -0.2); gunGroup.add(frontSight);
      const chargingHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), silverMat);
      chargingHandle.rotation.z = Math.PI/2; chargingHandle.position.set(0.025, 0.042, 0.04); gunGroup.add(chargingHandle);

      if (loadout.melee === 'bayonet') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.015, 0.14), silverMat);
        blade.position.set(0, -0.015, -0.57); gunGroup.add(blade);
      }
      gunGroup.position.set(0.12, -0.15, -0.35);

    } else if (weaponId === 'sniper') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.55), darkMetalMat);
      gunGroup.add(receiver);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 8), darkMetalMat);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.005, -0.47); gunGroup.add(barrel);
      const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.06, 8), darkMetalMat);
      muzzleBrake.rotation.x = Math.PI/2; muzzleBrake.position.set(0, 0.005, -0.7); gunGroup.add(muzzleBrake);
      const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), darkMetalMat);
      scopeBody.rotation.x = Math.PI/2; scopeBody.position.set(0, 0.06, -0.05); gunGroup.add(scopeBody);
      const scopeObj = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 8), silverMat);
      scopeObj.rotation.x = Math.PI/2; scopeObj.position.set(0, 0.06, -0.16); gunGroup.add(scopeObj);
      const scopeEye = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8), silverMat);
      scopeEye.rotation.x = Math.PI/2; scopeEye.position.set(0, 0.06, 0.06); gunGroup.add(scopeEye);
      const mount1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.02), darkMetalMat);
      mount1.position.set(0, 0.042, -0.08); gunGroup.add(mount1);
      const mount2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.02), darkMetalMat);
      mount2.position.set(0, 0.042, 0.02); gunGroup.add(mount2);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), silverMat);
      bolt.rotation.z = Math.PI/2; bolt.position.set(0.035, 0.01, 0.08); gunGroup.add(bolt);
      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.1, 0.05), darkMetalMat);
      magazine.position.set(0, -0.08, 0.02); gunGroup.add(magazine);
      const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.04), gripMat);
      pistolGrip.position.set(0, -0.08, 0.15); pistolGrip.rotation.x = 0.2; gunGroup.add(pistolGrip);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.24), darkMetalMat);
      stock.position.set(0, 0.0, 0.38); gunGroup.add(stock);
      const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.075, 0.015), gripMat);
      buttpad.position.set(0, -0.005, 0.5); gunGroup.add(buttpad);
      const bipod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), darkMetalMat);
      bipod1.position.set(0.015, -0.04, -0.2); bipod1.rotation.x = 0.3; gunGroup.add(bipod1);
      const bipod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), darkMetalMat);
      bipod2.position.set(-0.015, -0.04, -0.2); bipod2.rotation.x = 0.3; gunGroup.add(bipod2);
      if (loadout.melee === 'bayonet') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.015, 0.14), silverMat);
        blade.position.set(0, -0.015, -0.82); gunGroup.add(blade);
      }
      gunGroup.position.set(0.12, -0.15, -0.3);

    } else if (weaponId === 'machinegun') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.5), darkMetalMat);
      gunGroup.add(receiver);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.015, 0.4), darkMetalMat);
      topRail.position.set(0, 0.042, -0.02); gunGroup.add(topRail);
      const handle1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.035, 0.01), darkMetalMat);
      handle1.position.set(0, 0.06, -0.05); gunGroup.add(handle1);
      const handle2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.035, 0.01), darkMetalMat);
      handle2.position.set(0, 0.06, 0.05); gunGroup.add(handle2);
      const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.01, 0.12), darkMetalMat);
      handleTop.position.set(0, 0.08, 0.0); gunGroup.add(handleTop);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.35, 8), darkMetalMat);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.005, -0.42); gunGroup.add(barrel);
      const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), darkMetalMat);
      shroud.rotation.x = Math.PI/2; shroud.position.set(0, 0.005, -0.32);
      shroud.material = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.7, wireframe: false });
      gunGroup.add(shroud);
      const boxMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a3a20, roughness: 0.6, metalness: 0.3 }));
      boxMag.position.set(0, -0.1, -0.02); gunGroup.add(boxMag);
      const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.04), gripMat);
      pistolGrip.position.set(0, -0.08, 0.15); pistolGrip.rotation.x = 0.25; gunGroup.add(pistolGrip);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.18), darkMetalMat);
      stock.position.set(0, 0.0, 0.34); gunGroup.add(stock);
      const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.015), gripMat);
      buttpad.position.set(0, -0.005, 0.43); gunGroup.add(buttpad);
      if (loadout.melee === 'bayonet') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.015, 0.14), silverMat);
        blade.position.set(0, -0.015, -0.66); gunGroup.add(blade);
      }
      gunGroup.position.set(0.14, -0.17, -0.35);

    } else if (weaponId === 'pistol') {
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.2), darkMetalMat);
      gunGroup.add(slide);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.03, 0.15), silverMat);
      frame.position.set(0, -0.02, 0.02); gunGroup.add(frame);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8), darkMetalMat);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.005, -0.12); gunGroup.add(barrel);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.035), gripMat);
      grip.position.set(0, -0.065, 0.04); grip.rotation.x = 0.15; gunGroup.add(grip);
      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.07, 0.025), darkMetalMat);
      magazine.position.set(0, -0.06, 0.035); gunGroup.add(magazine);
      const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.005, 0.04), darkMetalMat);
      triggerGuard.position.set(0, -0.03, 0.01); gunGroup.add(triggerGuard);
      const fs = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), silverMat);
      fs.position.set(0, 0.028, -0.08); gunGroup.add(fs);
      const rs = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.006), silverMat);
      rs.position.set(0, 0.028, 0.06); gunGroup.add(rs);
      gunGroup.position.set(0.08, -0.14, -0.28);

    } else if (weaponId === 'tecdc9') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.22), darkMetalMat);
      gunGroup.add(receiver);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8), darkMetalMat);
      barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.005, -0.18); gunGroup.add(barrel);
      const barrelShroud = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.1), darkMetalMat);
      barrelShroud.position.set(0, 0.0, -0.15); gunGroup.add(barrelShroud);
      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.035), darkMetalMat);
      magazine.position.set(0, -0.1, -0.04); gunGroup.add(magazine);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.04), gripMat);
      grip.position.set(0, -0.07, 0.08); grip.rotation.x = 0.2; gunGroup.add(grip);
      const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.05), darkMetalMat);
      triggerGuard.position.set(0, -0.03, 0.04); gunGroup.add(triggerGuard);
      const fs = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.005), silverMat);
      fs.position.set(0, 0.035, -0.1); gunGroup.add(fs);
      gunGroup.position.set(0.1, -0.14, -0.3);
    }

    vm.add(gunGroup);

    // Arms
    const rightArmGroup = new THREE.Group();
    const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.28), skinMat);
    rSleeve.position.set(0.20, -0.26, -0.08); rSleeve.rotation.set(0.15, -0.3, 0.3);
    rightArmGroup.add(rSleeve);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.08), skinMat);
    rHand.position.set(0.12, -0.22, -0.22); rHand.rotation.set(0.25, 0, 0.05);
    rightArmGroup.add(rHand);
    const rFingers = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.05), skinMat);
    rFingers.position.set(0.12, -0.25, -0.23); rFingers.rotation.set(0.3, 0, 0);
    rightArmGroup.add(rFingers);
    vm.add(rightArmGroup);

    const leftArmGroup = new THREE.Group();
    const lUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.27), skinMat);
    lUpperArm.position.set(-0.12, -0.32, -0.15); lUpperArm.rotation.set(0.4, -0.5, 0.45);
    leftArmGroup.add(lUpperArm);
    const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.24), skinMat);
    lForearm.position.set(0.0, -0.22, -0.28); lForearm.rotation.set(0.15, -0.35, 0.2);
    leftArmGroup.add(lForearm);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.07), skinMat);
    lHand.position.set(0.1, -0.16, -0.37); lHand.rotation.set(0.05, 0, -0.05);
    leftArmGroup.add(lHand);
    const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.06), skinMat);
    lFingers.position.set(0.1, -0.2, -0.37); lFingers.rotation.set(0.2, 0, 0);
    leftArmGroup.add(lFingers);
    vm.add(leftArmGroup);
  },

  buildMeleeModel(vm, weaponId, skinMat, silverMat, darkMetalMat, gripMat) {
    const meleeGroup = new THREE.Group();
    if (weaponId === 'knife') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.22), silverMat);
      meleeGroup.add(blade);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.05), silverMat);
      tip.position.set(0, 0, -0.13); meleeGroup.add(tip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.008), darkMetalMat);
      guard.position.set(0, 0, 0.11); meleeGroup.add(guard);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.025, 0.1), gripMat);
      handle.position.set(0, 0, 0.16); meleeGroup.add(handle);
      const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.012), darkMetalMat);
      pommel.position.set(0, 0, 0.215); meleeGroup.add(pommel);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.3), silverMat);
      meleeGroup.add(blade);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.06), silverMat);
      tip.position.set(0, 0, -0.17); meleeGroup.add(tip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.008), darkMetalMat);
      guard.position.set(0, 0, 0.15); meleeGroup.add(guard);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.028, 0.14), gripMat);
      handle.position.set(0, 0, 0.22); meleeGroup.add(handle);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), darkMetalMat);
      ring.rotation.x = Math.PI/2; ring.position.set(0, 0, 0.3); meleeGroup.add(ring);
    }
    meleeGroup.position.set(0.15, -0.15, -0.35);
    meleeGroup.rotation.set(-0.3, 0, 0.2);
    vm.add(meleeGroup);

    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.08), skinMat);
    rHand.position.set(0.15, -0.16, -0.2); rHand.rotation.set(-0.2, 0, 0.15);
    vm.add(rHand);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.28), skinMat);
    rArm.position.set(0.20, -0.24, -0.06); rArm.rotation.set(0.1, -0.25, 0.3);
    vm.add(rArm);
  },

  buildGrenadeModel(vm, skinMat, oliveMat, darkMetalMat) {
    const grenadeGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.08, 8), oliveMat);
    grenadeGroup.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.015, 8), darkMetalMat);
    cap.position.set(0, 0.047, 0); grenadeGroup.add(cap);
    const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.02), darkMetalMat);
    spoon.position.set(0.02, 0.02, 0); grenadeGroup.add(spoon);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12), darkMetalMat);
    ring.position.set(-0.02, 0.055, 0); ring.rotation.x = Math.PI/2; grenadeGroup.add(ring);
    grenadeGroup.position.set(0.1, -0.12, -0.3);
    vm.add(grenadeGroup);

    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.07), skinMat);
    rHand.position.set(0.1, -0.15, -0.28); rHand.rotation.set(0.1, 0, 0.1);
    vm.add(rHand);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.28), skinMat);
    rArm.position.set(0.18, -0.24, -0.1); rArm.rotation.set(0.15, -0.25, 0.3);
    vm.add(rArm);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.27), skinMat);
    lArm.position.set(-0.14, -0.3, -0.1); lArm.rotation.set(0.3, -0.4, 0.4);
    vm.add(lArm);
  }
};
