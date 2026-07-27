import * as THREE from 'three';
import { ARENA_SIZE } from '../config/constants.js';
import { Renderer } from '../core/Renderer.js';

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
      [ARENA_SIZE, wallH, 0.5, 0, wallH/2,  half],
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
  }
};
