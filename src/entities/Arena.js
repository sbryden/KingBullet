import * as THREE from 'three';
import { ARENA_SIZE } from '../config/constants.js';
import { Renderer } from '../core/Renderer.js';
import { WEAPONS } from '../config/weapons.js';
import { ViewModelFactory } from '../systems/ViewModelFactory.js';

export const Arena = {
  build() {
    const scene = Renderer.scene;

    // Ground
    const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.7, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(ARENA_SIZE, 60, 0x5566bb, 0x3a3a66);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a4a7e, roughness: 0.5, metalness: 0.3 });
    const wallH = 8;
    const half = ARENA_SIZE / 2;

    [
      [ARENA_SIZE, wallH, 0.5, 0, wallH/2, -half],
      [45, wallH, 0.5, -27.5, wallH/2,  half], // Back wall left of door
      [45, wallH, 0.5,  27.5, wallH/2,  half], // Back wall right of door
      [0.5, wallH, ARENA_SIZE, -half, wallH/2, 0],
      [0.5, wallH, ARENA_SIZE,  half, wallH/2, 0],
    ].forEach(([w, h, d, x, y, z]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    });

    // Obstacles
    const obMat = new THREE.MeshStandardMaterial({ color: 0x3355aa, roughness: 0.4, metalness: 0.5 });
    const obMat2 = new THREE.MeshStandardMaterial({ color: 0x445588, roughness: 0.4, metalness: 0.4 });
    [
      [-20, -15, 4, 3, 4],
      [ 15, -25, 6, 2.5, 2],
      [-10,  20, 3, 4, 3],
      [ 25,  10, 5, 3.5, 5],
      [-30,   5, 2, 5, 8],
      [ 10,  30, 8, 2, 2],
      [-25, -35, 4, 6, 4],
      [ 35, -20, 3, 4, 6],
    ].forEach(([x, z, w, h, d], i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), i % 2 === 0 ? obMat : obMat2);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // Glowing strips
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.3 });
    for (let i = -4; i <= 4; i += 2) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, 0.2), stripMat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(0, 0.03, i * 12);
      scene.add(strip);
    }

    // Floating dust
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      dustPos[i*3]   = (Math.random() - 0.5) * ARENA_SIZE;
      dustPos[i*3+1] = Math.random() * 10;
      dustPos[i*3+2] = (Math.random() - 0.5) * ARENA_SIZE;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x8899dd, size: 0.12, transparent: true, opacity: 0.5 }));
    scene.add(dust);

    this.buildLoadoutRoom(scene);
  },

  buildLoadoutRoom(scene) {
    const roomW = 30;
    const roomD = 20;
    const roomZ = ARENA_SIZE / 2 + roomD / 2;

    // Room Ground
    const groundGeo = new THREE.PlaneGeometry(roomW, roomD);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, roomZ);
    ground.receiveShadow = true;
    scene.add(ground);

    // Room Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6 });
    const wallH = 6;
    [
      [10, wallH, 1, -10, wallH/2, ARENA_SIZE / 2], // Front wall left
      [10, wallH, 1,  10, wallH/2, ARENA_SIZE / 2], // Front wall right
      [roomW, wallH, 1, 0, wallH/2, roomZ + roomD/2], // Back wall
      [1, wallH, roomD, -roomW/2, wallH/2, roomZ], // Left wall
      [1, wallH, roomD,  roomW/2, wallH/2, roomZ], // Right wall
    ].forEach(([w, h, d, x, y, z]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
    });

    // Wardrobe (to change outfits)
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(-10, 0, roomZ - 8);
    wardrobeGroup.rotation.y = Math.PI / 4; // Angle it slightly towards the room center
    
    // Main body
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 2), cabinetMat);
    cabinet.position.set(0, 3, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    wardrobeGroup.add(cabinet);

    // Doors with hinges
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.8 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });

    // Left Door
    const leftHinge = new THREE.Group();
    leftHinge.position.set(-2.0, 3, 1.0);
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 5.8, 0.1), doorMat);
    leftDoor.position.set(0.95, 0, 0.05);
    const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), handleMat);
    leftHandle.position.set(1.7, 0, 0.15);
    leftDoor.add(leftHandle);
    leftHinge.add(leftDoor);
    wardrobeGroup.add(leftHinge);

    // Right Door
    const rightHinge = new THREE.Group();
    rightHinge.position.set(2.0, 3, 1.0);
    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 5.8, 0.1), doorMat);
    rightDoor.position.set(-0.95, 0, 0.05);
    const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), handleMat);
    rightHandle.position.set(-1.7, 0, 0.15);
    rightDoor.add(rightHandle);
    rightHinge.add(rightDoor);
    wardrobeGroup.add(rightHinge);

    wardrobeGroup.userData = {
      isWardrobeInteract: true,
      leftHinge: leftHinge,
      rightHinge: rightHinge
    };

    // Hitbox for interaction
    const hitbox = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 4), new THREE.MeshBasicMaterial({visible: false}));
    hitbox.position.set(0, 3.5, 0);
    hitbox.userData = wardrobeGroup.userData;
    wardrobeGroup.add(hitbox);

    scene.add(wardrobeGroup);

    // Materials for 3D weapon meshes on the wall
    const skinMat = new THREE.MeshBasicMaterial();
    const shirtMat = new THREE.MeshBasicMaterial();
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xb8b8c0, roughness: 0.25, metalness: 0.85 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.35, metalness: 0.7 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.6, metalness: 0.1 });

    const createWeaponPlacardTexture = (w) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 1024; // Tall placard (1:2 aspect ratio)
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = '#222';
      ctx.fillRect(0, 0, 512, 1024);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 504, 1016);
      
      // Name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(w.name.toUpperCase(), 256, 80);
      
      // Caliber
      ctx.fillStyle = '#aaa';
      ctx.font = '30px monospace';
      ctx.fillText(w.caliber || w.type, 256, 130);

      // (Middle space left blank for 3D gun mesh at y = ~400-600)
      
      // Stats
      const drawBar = (y, label, val, color1, color2) => {
        ctx.fillStyle = '#ccc';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, 40, y);
        
        ctx.fillStyle = '#111';
        ctx.fillRect(200, y - 20, 260, 24);
        
        const grd = ctx.createLinearGradient(200, 0, 460, 0);
        grd.addColorStop(0, color1);
        grd.addColorStop(1, color2);
        ctx.fillStyle = grd;
        ctx.fillRect(200, y - 20, 260 * Math.min(1, val), 24);
      };
      
      drawBar(800, 'DAMAGE', w.damage / 100, '#ff3d5a', '#ff6b81');
      if (w.fireRate) drawBar(860, 'FIRE RATE', (1/w.fireRate)*5 / 100, '#00e5ff', '#40c4ff');
      
      // Prompt
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("PRESS [SPACE] TO EQUIP", 256, 960);
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // Weapon displays
    const addWeaponWallMount = (x, y, z, rotY, weaponId, slot) => {
      const w = WEAPONS[weaponId];
      if (!w) return;

      // Placard (2 units wide, 4 units tall to match 512x1024 texture)
      const placardTex = createWeaponPlacardTexture(w);
      const placardMat = new THREE.MeshBasicMaterial({ map: placardTex, side: THREE.DoubleSide });
      const placard = new THREE.Mesh(new THREE.PlaneGeometry(2, 4), placardMat);
      placard.position.set(x, y, z);
      placard.rotation.y = rotY;
      placard.userData = { isWeaponSlot: true, weaponId, slot };
      scene.add(placard);

      // Add actual 3D weapon mesh mounted on placard
      const dummyVm = new THREE.Group();
      if (slot === 'melee') {
        ViewModelFactory.buildMeleeModel(dummyVm, weaponId, skinMat, shirtMat, skinMat, 'long', silverMat, darkMetalMat, gripMat);
      } else if (w.isGrenade) {
        ViewModelFactory.buildGrenadeModel(dummyVm, skinMat, shirtMat, skinMat, 'long', silverMat, darkMetalMat);
      } else {
        ViewModelFactory.buildGunModel(dummyVm, weaponId, skinMat, shirtMat, skinMat, 'long', silverMat, darkMetalMat, gripMat, woodMat);
      }
      
      const gunMesh = dummyVm.children[0];
      if (gunMesh) {
        gunMesh.scale.set(4, 4, 4); // scale down a bit
        gunMesh.position.copy(placard.position);
        
        // Push slightly off the wall in the direction of its normal to not clip
        gunMesh.position.x += Math.sin(rotY) * 0.08;
        gunMesh.position.z += Math.cos(rotY) * 0.08;
        
        // Adjust height slightly above center of placard
        gunMesh.position.y += 0.5;

        // Reset any weird viewmodel rotations and lay flat against wall
        gunMesh.rotation.set(0, rotY + Math.PI/2, 0);
        // Fix orientation since gun normally points in -Z
        scene.add(gunMesh);
      }
    };

    // Left Wall: Primaries
    const leftX = -14.4;
    addWeaponWallMount(leftX, 3.5, roomZ + 7.5, Math.PI/2, 'ruger', 'primary');
    addWeaponWallMount(leftX, 3.5, roomZ + 2.5, Math.PI/2, 'mp5', 'primary');
    addWeaponWallMount(leftX, 3.5, roomZ - 2.5, Math.PI/2, 'sniper', 'primary');
    addWeaponWallMount(leftX, 3.5, roomZ - 7.5, Math.PI/2, 'machinegun', 'primary');

    // Right Wall: Secondaries
    const rightX = 14.4;
    addWeaponWallMount(rightX, 3.5, roomZ + 4, -Math.PI/2, 'pistol', 'secondary');
    addWeaponWallMount(rightX, 3.5, roomZ, -Math.PI/2, 'tecdc9', 'secondary');
    addWeaponWallMount(rightX, 3.5, roomZ - 4, -Math.PI/2, 'grenade', 'secondary');

    // Back Wall: Melee (opposite the doorway)
    const backZ = roomZ + roomD/2 - 0.6;
    addWeaponWallMount(-4, 3.5, backZ, Math.PI, 'knife', 'melee');
    addWeaponWallMount(4, 3.5, backZ, Math.PI, 'bayonet', 'melee');
  }
};
