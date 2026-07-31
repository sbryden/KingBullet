import * as THREE from 'three';
import { ARENA_SIZE } from '../config/constants.js';
import { Renderer } from '../core/Renderer.js';
import { LootSystem } from '../systems/LootSystem.js';

export const Arena = {
  collidables: [], // For vertical raycasting
  obstacles: [],   // For horizontal collisions

  build() {
    const scene = Renderer.scene;
    this.collidables = [];
    this.obstacles = [];

    this.buildTerrain(scene);
    this.buildWater(scene);
    
    this.buildRodeoZone(scene);
    this.buildCanyons(scene);
    this.buildUrbanZone(scene);
    this.buildIndustrialZone(scene);
    
    this.addParticles(scene);
  },

  buildTerrain(scene) {
    const segments = 128;
    const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE, segments, segments);
    
    // Add color attribute
    const colors = [];
    const color = new THREE.Color();
    
    const posAttribute = groundGeo.attributes.position;
    
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const z = posAttribute.getY(i); // Plane is XY originally
      
      let height = 0;
      let r = 0, g = 0, b = 0;
      
      const distToCenter = Math.hypot(x, z);
      
      if (distToCenter < 70) {
        // Rodeo Center Zone (Flat, Dusty Brown)
        height = (Math.random() - 0.5) * 0.2;
        color.setHex(0x8b6508); // Dusty brown
      } else if (x < -20 && z < -20) {
        // NW: Dust Bowl (Dunes)
        height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 6.0 
               + Math.sin(x * 0.1) * 2.0;
        color.setHex(0xc08040); // Desert sand
      } else if (x > 20 && z < -20) {
        // NE: Urban Grid (Flat Concrete)
        height = 0;
        color.setHex(0x555555); // Concrete
      } else if (z > 20) {
        // South: Industrial (Slightly uneven dirt/gravel)
        height = (Math.random() - 0.5) * 0.5;
        color.setHex(0x4a4a4a); // Dark gray
      } else {
        // Blending/Transition zones
        height = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 2.0;
        color.setHex(0x5c6b45); // Scrub brush green
      }
      
      // Slope down at the extreme edges to go underwater
      const edgeDist = Math.max(Math.abs(x), Math.abs(z));
      if (edgeDist > ARENA_SIZE/2 - 20) {
          const falloff = (edgeDist - (ARENA_SIZE/2 - 20)) / 20;
          height -= falloff * falloff * 20; // Steep dropoff
      }
      
      posAttribute.setZ(i, height);
      colors.push(color.r, color.g, color.b);
    }
    
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({ 
      vertexColors: true, 
      roughness: 0.9, 
      metalness: 0.05 
    });
    
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    this.collidables.push(ground);
  },

  buildWater(scene) {
    // A massive plane slightly below 0 to represent the ocean
    const waterGeo = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1ca3ec,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.2
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -3; // Water level
    scene.add(water);
  },

  buildRodeoZone(scene) {
    // Central Arena
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });
    
    // Large circular wooden fence
    const numPosts = 30;
    const radius = 40;
    for (let i = 0; i < numPosts; i++) {
        const angle = (i / numPosts) * Math.PI * 2;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;
        
        // Post
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), fenceMat);
        post.position.set(px, 1.5, pz);
        post.castShadow = true;
        scene.add(post);
        this.obstacles.push(post);
        
        // Rail (connect to next post)
        const nextAngle = ((i+1) / numPosts) * Math.PI * 2;
        const nx = Math.cos(nextAngle) * radius;
        const nz = Math.sin(nextAngle) * radius;
        
        const dist = Math.hypot(nx - px, nz - pz);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, dist), fenceMat);
        rail.position.set((px+nx)/2, 2.0, (pz+nz)/2);
        rail.lookAt(nx, 2.0, nz);
        rail.castShadow = true;
        scene.add(rail);
        this.obstacles.push(rail);
    }
    
    // Spawn chests in the center
    LootSystem.spawnChest(new THREE.Vector3(0, 0.5, 0));
    LootSystem.spawnChest(new THREE.Vector3(5, 0.5, -5));
    LootSystem.spawnChest(new THREE.Vector3(-5, 0.5, 5));
    
    // A few enterable shacks outside the fence
    this.createShack(scene, 50, 20);
    this.createShack(scene, -60, -10);
    this.createShack(scene, 10, 55);
    this.createShack(scene, -15, -55);
  },
  
  createShack(scene, x, z) {
      const group = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, side: THREE.DoubleSide });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 1.0, side: THREE.DoubleSide });
      
      const width = 8, depth = 8, height = 4;
      
      const addWall = (w, h, d, px, py, pz) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(px, py, pz);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
        this.obstacles.push(wall);
      };

      // Back wall
      addWall(width, height, 0.4, 0, height / 2, -depth/2);
      // Front walls (door gap)
      addWall(width / 3, height, 0.4, -width/3, height / 2, depth/2);
      addWall(width / 3, height, 0.4, width/3, height / 2, depth/2);
      // Sides
      addWall(0.4, height, depth, -width/2, height / 2, 0);
      addWall(0.4, height, depth, width/2, height / 2, 0);
      
      // Slanted roof
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(width + 1, depth + 1), roofMat);
      roof.rotation.x = -Math.PI / 2 - 0.1;
      roof.position.set(0, height + 0.2, 0);
      roof.castShadow = true;
      group.add(roof);
      
      // Floor
      const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 2, depth), wallMat);
      floor.position.y = -0.9;
      group.add(floor);
      this.collidables.push(floor);
      
      group.position.set(x, 0, z);
      group.rotation.y = Math.random() * Math.PI;
      scene.add(group);
      
      LootSystem.spawnChest(new THREE.Vector3(x, 0.5, z));
  },

  buildCanyons(scene) {
    // Massive mesas blocking sightlines
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xc04000, roughness: 1.0 });
    
    // Instanced mesh for better performance if we have lots of rocks
    const dummy = new THREE.Object3D();
    const rockCount = 40;
    const rockGeo = new THREE.CylinderGeometry(1, 1, 1, 8); // Base cylinder to scale
    const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    instancedRocks.castShadow = true;
    instancedRocks.receiveShadow = true;
    
    let i = 0;
    for (let r = 0; r < rockCount; r++) {
      const x = -50 - Math.random() * (ARENA_SIZE/2 - 50);
      const z = -50 - Math.random() * (ARENA_SIZE/2 - 50);
      
      const width = 10 + Math.random() * 20;
      const h = 15 + Math.random() * 30; // Tall!
      
      dummy.position.set(x, h/2 - 5, z);
      dummy.scale.set(width, h, width * (0.5 + Math.random()));
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      
      instancedRocks.setMatrixAt(i++, dummy.matrix);
      
      // Create an invisible box for physics (Cylinders are hard for simple AABB)
      const collisionBox = new THREE.Mesh(new THREE.BoxGeometry(width * 1.5, h, width * 1.5));
      collisionBox.position.set(x, h/2 - 5, z);
      collisionBox.visible = false;
      scene.add(collisionBox);
      this.obstacles.push(collisionBox);
      
      if (Math.random() > 0.7) {
          LootSystem.spawnChest(new THREE.Vector3(x, h - 4.5, z)); // Chest on top of Mesa
      }
    }
    
    scene.add(instancedRocks);
  },

  buildUrbanZone(scene) {
    // Dense skyscrapers
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.2 });
    
    const citySize = 150;
    const blockSize = 30;
    const roadWidth = 10;
    
    // Grid origin
    const originX = 50;
    const originZ = -200;
    
    for (let bx = 0; bx < citySize; bx += blockSize) {
        for (let bz = 0; bz < citySize; bz += blockSize) {
            if (Math.random() > 0.8) continue; // Empty lot
            
            const x = originX + bx + (blockSize - roadWidth)/2;
            const z = originZ + bz + (blockSize - roadWidth)/2;
            
            const w = blockSize - roadWidth;
            const d = blockSize - roadWidth;
            const h = 20 + Math.random() * 60;
            
            const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
            building.position.set(x, h/2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            scene.add(building);
            this.obstacles.push(building);
            this.collidables.push(building); // Raycaster needs this for dropping onto roofs
            
            // Chests in alleys or on roofs
            if (Math.random() > 0.5) {
                if (Math.random() > 0.5) {
                    LootSystem.spawnChest(new THREE.Vector3(x, h + 0.5, z)); // Roof
                } else {
                    LootSystem.spawnChest(new THREE.Vector3(x - w/2 - 2, 0.5, z)); // Alley
                }
            }
        }
    }
  },

  buildIndustrialZone(scene) {
    // Shipping containers
    const containerColors = [0xcc2222, 0x2255cc, 0x228822, 0xdd8811];
    const containerGeo = new THREE.BoxGeometry(5, 5, 12);
    
    for (let i = 0; i < 60; i++) {
        const x = -ARENA_SIZE/2 + Math.random() * ARENA_SIZE;
        const z = 50 + Math.random() * (ARENA_SIZE/2 - 50);
        
        // Skip if too close to center
        if (Math.hypot(x, z) < 80) continue;
        
        const mat = new THREE.MeshStandardMaterial({ 
            color: containerColors[Math.floor(Math.random() * containerColors.length)],
            roughness: 0.7, metalness: 0.3
        });
        
        const container = new THREE.Mesh(containerGeo, mat);
        
        // Stack them sometimes
        const stackY = (Math.random() > 0.7) ? 7.5 : 2.5;
        container.position.set(x, stackY, z);
        
        // Snap rotation to 90 degrees
        container.rotation.y = (Math.random() > 0.5) ? Math.PI / 2 : 0;
        
        container.castShadow = true;
        container.receiveShadow = true;
        scene.add(container);
        this.obstacles.push(container);
        this.collidables.push(container);
        
        if (Math.random() > 0.8) {
            LootSystem.spawnChest(new THREE.Vector3(x, stackY + 3.0, z)); // Chest on container
        }
    }
    
    // A couple huge warehouses
    const warehouseMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
    const addWarehouse = (wx, wz) => {
        const w = 40, h = 15, d = 60;
        const warehouse = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), warehouseMat);
        warehouse.position.set(wx, h/2, wz);
        warehouse.castShadow = true;
        warehouse.receiveShadow = true;
        scene.add(warehouse);
        this.obstacles.push(warehouse);
        this.collidables.push(warehouse);
    };
    
    addWarehouse(-100, 150);
    addWarehouse(100, 180);
  },

  addParticles(scene) {
    // Floating dust
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      dustPos[i*3]   = (Math.random() - 0.5) * ARENA_SIZE;
      dustPos[i*3+1] = Math.random() * 20;
      dustPos[i*3+2] = (Math.random() - 0.5) * ARENA_SIZE;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffffaa, size: 0.15, transparent: true, opacity: 0.4 }));
    scene.add(dust);
  }
};
