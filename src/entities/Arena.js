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
    this.buildStorm(scene);
    
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

  buildStorm(scene) {
    const stormGeo = new THREE.CylinderGeometry(1, 1, 200, 32, 1, true);
    const stormMat = new THREE.MeshStandardMaterial({
      color: 0xaa22ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.stormMesh = new THREE.Mesh(stormGeo, stormMat);
    this.stormMesh.position.y = 100; // Half height
    scene.add(this.stormMesh);
  },

  updateStorm(radius, x, z) {
    if (!this.stormMesh) return;
    if (radius <= 0) {
      this.stormMesh.visible = false;
      return;
    }
    this.stormMesh.visible = true;
    this.stormMesh.scale.set(radius, 1, radius);
    this.stormMesh.position.x = x;
    this.stormMesh.position.z = z;
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
    // Generate a dynamic window texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base concrete
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw glowing and dark windows
    for (let y = 10; y < 256; y += 35) {
        for (let x = 15; x < 256; x += 40) {
            ctx.fillStyle = Math.random() > 0.8 ? '#ffffaa' : '#111122'; // 20% lit windows
            ctx.fillRect(x, y, 20, 20);
        }
    }
    
    const windowTexture = new THREE.CanvasTexture(canvas);
    windowTexture.wrapS = THREE.RepeatWrapping;
    windowTexture.wrapT = THREE.RepeatWrapping;

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    
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
            
            const lobbyH = 5;
            const coreH = h - lobbyH;
            const wallT = 1.0; // Wall thickness
            const doorW = 4;
            
            const buildingGroup = new THREE.Group();
            buildingGroup.position.set(x, 0, z);
            
            const lobbyWallMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
            
            // --- GROUND FLOOR (LOBBY) ---
            const hw = w / 2;
            const hd = d / 2;
            
            const addWall = (ww, hh, dd, px, py, pz) => {
                const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, dd), lobbyWallMat);
                wall.position.set(px, py, pz);
                wall.castShadow = true;
                wall.receiveShadow = true;
                buildingGroup.add(wall);
                this.obstacles.push(wall);
            };

            // Back wall
            addWall(w, lobbyH, wallT, 0, lobbyH / 2, -hd + wallT / 2);
            // Left wall
            addWall(wallT, lobbyH, d, -hw + wallT / 2, lobbyH / 2, 0);
            // Right wall
            addWall(wallT, lobbyH, d, hw - wallT / 2, lobbyH / 2, 0);
            // Front walls (with door gap in center)
            const sideW = (w - doorW) / 2;
            addWall(sideW, lobbyH, wallT, -hw + sideW / 2, lobbyH / 2, hd - wallT / 2);
            addWall(sideW, lobbyH, wallT, hw - sideW / 2, lobbyH / 2, hd - wallT / 2);
            
            // Door header
            addWall(doorW, 1.5, wallT, 0, lobbyH - 0.75, hd - wallT / 2);
            
            // Lobby ceiling
            const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), lobbyWallMat);
            ceiling.position.set(0, lobbyH, 0);
            ceiling.receiveShadow = true;
            buildingGroup.add(ceiling);
            // The ceiling is also a floor for the upper levels if players land on it? Actually, players won't be in the lobby ceiling, but if they get stuck...
            
            // --- UPPER FLOORS (SOLID CORE) ---
            
            // Create a unique material instance to scale the windows properly based on height
            const bMat = new THREE.MeshStandardMaterial({ 
                map: windowTexture, 
                roughness: 0.7, 
                metalness: 0.3 
            });
            // Clone texture so repeat settings are independent per material
            bMat.map = windowTexture.clone();
            bMat.map.needsUpdate = true;
            bMat.map.repeat.set(w / 10, coreH / 10);
            
            // Apply window texture only to the sides. Use solid roof mat for top and bottom.
            const materials = [bMat, bMat, roofMat, roofMat, bMat, bMat];
            
            const core = new THREE.Mesh(new THREE.BoxGeometry(w, coreH, d), materials);
            core.position.set(0, lobbyH + coreH/2, 0);
            core.castShadow = true;
            core.receiveShadow = true;
            buildingGroup.add(core);
            
            // The solid core is an obstacle.
            this.obstacles.push(core);
            this.collidables.push(core);
            
            scene.add(buildingGroup);
            
            // Rooftop details (AC Units, antennas)
            const numDetails = Math.floor(Math.random() * 3) + 1;
            for(let i=0; i<numDetails; i++) {
                if (Math.random() > 0.5) {
                    // AC Unit
                    const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({color: 0x888888}));
                    ac.position.set(x + (Math.random()-0.5)*(w-4), h + 1, z + (Math.random()-0.5)*(d-4));
                    ac.castShadow = true;
                    scene.add(ac);
                    this.collidables.push(ac);
                    this.obstacles.push(ac);
                } else {
                    // Antenna
                    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), new THREE.MeshStandardMaterial({color: 0x111111}));
                    ant.position.set(x + (Math.random()-0.5)*(w-2), h + 2.5, z + (Math.random()-0.5)*(d-2));
                    scene.add(ant);
                }
            }
            
            // Loot Chests
            if (Math.random() > 0.3) {
                // Chest in the lobby
                LootSystem.spawnChest(new THREE.Vector3(x + (Math.random()-0.5)*10, 0.5, z + (Math.random()-0.5)*10));
            }
            if (Math.random() > 0.5) {
                // Chest on the roof
                LootSystem.spawnChest(new THREE.Vector3(x, h + 0.5, z));
            }
            
            // Add a jump pad in the alley sometimes
            if (Math.random() > 0.6) {
                const padGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 16);
                const padMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, roughness: 0.2 });
                const pad = new THREE.Mesh(padGeo, padMat);
                // Position in the alley (outside the building footprint)
                const padX = x - w/2 - 2;
                pad.position.set(padX, 0.1, z);
                scene.add(pad);
                
                // Track jump pads in Arena object
                if (!this.jumpPads) this.jumpPads = [];
                this.jumpPads.push({ mesh: pad, boost: 35 });
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
        
        // Base container
        container.position.set(x, 2.5, z);
        
        // Snap rotation to 90 degrees
        container.rotation.y = (Math.random() > 0.5) ? Math.PI / 2 : 0;
        
        container.castShadow = true;
        container.receiveShadow = true;
        scene.add(container);
        this.obstacles.push(container);
        this.collidables.push(container);
        
        // Stack a second one on top sometimes
        if (Math.random() > 0.7) {
            const topContainer = new THREE.Mesh(containerGeo, mat);
            topContainer.position.set(x, 7.5, z);
            topContainer.rotation.y = container.rotation.y;
            topContainer.castShadow = true;
            topContainer.receiveShadow = true;
            scene.add(topContainer);
            this.obstacles.push(topContainer);
            this.collidables.push(topContainer);
            
            if (Math.random() > 0.5) {
                LootSystem.spawnChest(new THREE.Vector3(x, 10.5, z)); // Chest on top container
            }
            
            // Add steps to climb up
            for (let step = 0; step < 4; step++) {
                const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x555555 }));
                const stepY = 1.5 + (step * 2.2); 
                const shiftLong = -4 + (step * 2.5);
                
                let finalX = x;
                let finalZ = z;
                
                if (container.rotation.y === 0) {
                    finalX += 3.0; // stick out from side
                    finalZ += shiftLong;
                } else {
                    finalZ += 3.0; // stick out from side
                    finalX += shiftLong;
                }
                
                stepMesh.position.set(finalX, stepY, finalZ);
                stepMesh.castShadow = true;
                stepMesh.receiveShadow = true;
                scene.add(stepMesh);
                this.collidables.push(stepMesh);
                this.obstacles.push(stepMesh);
            }
        } else if (Math.random() > 0.8) {
            LootSystem.spawnChest(new THREE.Vector3(x, 5.5, z)); // Chest on base container
            
            // Add steps to climb up to single container
            for (let step = 0; step < 2; step++) {
                const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x555555 }));
                const stepY = 1.5 + (step * 2.2); 
                const shiftLong = -2 + (step * 2.5);
                
                let finalX = x;
                let finalZ = z;
                
                if (container.rotation.y === 0) {
                    finalX += 3.0; 
                    finalZ += shiftLong;
                } else {
                    finalZ += 3.0; 
                    finalX += shiftLong;
                }
                
                stepMesh.position.set(finalX, stepY, finalZ);
                stepMesh.castShadow = true;
                stepMesh.receiveShadow = true;
                scene.add(stepMesh);
                this.collidables.push(stepMesh);
                this.obstacles.push(stepMesh);
            }
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
