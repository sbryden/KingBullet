import * as THREE from 'three';

// ── Helper: box mesh shorthand ─────────────────────────────
function _box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function _cyl(rTop, rBot, h, x, y, z, mat, segs = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
  m.position.set(x, y, z);
  return m;
}

export const OutfitFactory = {

  // ── Camo texture generation ──────────────────────────────
  createCamoTexture(colors, scale = 10) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fill base
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw splotches
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * (colors.length - 1)) + 1];
      ctx.beginPath();
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * scale + 5;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  // ── Procedural Pixel Texture ─────────────────────────────
  // Adds pixel-art noise and edge shading (ambient occlusion) to any color
  createPixelTexture(colorHex, variation = 15, borderOpacity = 0.15) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    // Parse hex
    const r = (colorHex >> 16) & 255;
    const g = (colorHex >> 8) & 255;
    const b = colorHex & 255;
    
    // Fill with noise
    for(let y = 0; y < 16; y++) {
      for(let x = 0; x < 16; x++) {
        const v = (Math.random() - 0.5) * (variation * 2);
        const cr = Math.min(255, Math.max(0, r + v));
        const cg = Math.min(255, Math.max(0, g + v));
        const cb = Math.min(255, Math.max(0, b + v));
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    // Dark edges (AO)
    ctx.fillStyle = `rgba(0,0,0,${borderOpacity})`;
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    
    // Light highlight on top/left inner edge
    ctx.fillStyle = `rgba(255,255,255,${borderOpacity * 0.7})`;
    ctx.fillRect(1, 1, 14, 1);
    ctx.fillRect(1, 1, 1, 14);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; // Crispy pixels
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  },

  // Returns CSS string for the swatch
  getCamoCSS(colors) {
    return `repeating-linear-gradient(45deg, ${colors[0]}, ${colors[0]} 10px, ${colors[1]} 10px, ${colors[1]} 20px, ${colors[2] || colors[0]} 20px, ${colors[2] || colors[0]} 30px)`;
  },

  // ════════════════════════════════════════════════════════
  //  GEAR ATTACHMENT SYSTEM
  // ════════════════════════════════════════════════════════

  /**
   * Attaches gear meshes to a character group.
   * @param {THREE.Group} root       – The character root group
   * @param {object}      gear       – Gear definition, e.g. { head: 'helmet', torso: 'tactical_vest' }
   * @param {object}      refs       – Body part references { head, torso, leftLeg, rightLeg }
   * @param {object}      mats       – Materials { shirt, pants, skin, accent }
   */
  attachGear(root, gear, refs, mats) {
    if (!gear) return;

    // Gear material (darker version of shirt for straps/gear)
    const gearDarkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(mats.shirt.color).multiplyScalar(0.6),
      roughness: 0.85, metalness: 0.15
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3, metalness: 0.7 });
    const fabricMat = mats.shirt; // Same color as shirt

    // HAIR GEAR
    if (gear.hair) {
      const hairGear = this._buildHeadGear(gear.hair, refs.head, mats, gearDarkMat, metalMat);
      if (hairGear) root.add(hairGear);
    }

    // HEAD GEAR
    if (gear.head) {
      const headGear = this._buildHeadGear(gear.head, refs.head, mats, gearDarkMat, metalMat);
      if (headGear) root.add(headGear);
    }

    // FACE GEAR
    if (gear.face) {
      const faceGear = this._buildFaceGear(gear.face, refs.head, mats, gearDarkMat, metalMat);
      if (faceGear) root.add(faceGear);
    }

    // TORSO GEAR
    if (gear.torso) {
      const torsoGear = this._buildTorsoGear(gear.torso, refs.torso, mats, gearDarkMat, metalMat);
      if (torsoGear) root.add(torsoGear);
    }

    // SECONDARY TORSO (e.g. ammo belt on top of plate carrier)
    if (gear.torso2) {
      const torsoGear2 = this._buildTorsoGear(gear.torso2, refs.torso, mats, gearDarkMat, metalMat);
      if (torsoGear2) root.add(torsoGear2);
    }

    // BACK GEAR
    if (gear.back) {
      const backGear = this._buildBackGear(gear.back, refs.torso, mats, gearDarkMat, metalMat);
      if (backGear) root.add(backGear);
    }

    // LEG GEAR
    if (gear.legs) {
      this._buildLegGear(gear.legs, refs.leftLeg, refs.rightLeg, mats, gearDarkMat, metalMat);
    }
  },

  _buildHeadGear(type, headMesh, mats, gearMat, metalMat) {
    const g = new THREE.Group();
    // Head is at ~1.75 Y, size 0.35³
    const headY = headMesh ? headMesh.position.y : 1.75;

    switch (type) {
      case 'helmet': {
        // Military helmet — dome shape over head
        const dome = _cyl(0.01, 0.22, 0.14, 0, headY + 0.24, 0, gearMat);
        g.add(dome);
        const shell = _cyl(0.20, 0.22, 0.2, 0, headY + 0.14, 0, gearMat, 16);
        g.add(shell);
        // Rim that extends slightly
        const rim = _cyl(0.24, 0.24, 0.03, 0, headY + 0.12, 0, gearMat, 16);
        g.add(rim);
        break;
      }

      case 'beret': {
        // Flat tilted beret
        const beret = _cyl(0.18, 0.2, 0.06, 0.03, headY + 0.19, -0.02, gearMat, 12);
        beret.rotation.z = 0.15;
        g.add(beret);
        // Small stem on top
        const stem = _cyl(0.015, 0.015, 0.03, 0, headY + 0.24, 0, gearMat, 6);
        g.add(stem);
        break;
      }

      case 'beanie': {
        // Knit cap — cylinder that sits on head
        const cap = _cyl(0.19, 0.20, 0.18, 0, headY + 0.18, 0, gearMat, 12);
        g.add(cap);
        // Folded brim
        const brim = _cyl(0.21, 0.21, 0.05, 0, headY + 0.12, 0, gearMat, 12);
        g.add(brim);
        break;
      }

      case 'boy_hair': {
        const hairMat = mats.hair || gearMat;
        // Simple swept hair
        const base = _box(0.36, 0.1, 0.37, 0, headY + 0.18, 0, hairMat);
        g.add(base);
        // Bangs / Front swoop
        const front = _box(0.36, 0.15, 0.1, 0, headY + 0.15, 0.16, hairMat);
        front.rotation.x = 0.2;
        g.add(front);
        // Sideburns
        const sideL = _box(0.04, 0.12, 0.1, -0.19, headY + 0.05, 0.05, hairMat);
        const sideR = _box(0.04, 0.12, 0.1,  0.19, headY + 0.05, 0.05, hairMat);
        g.add(sideL, sideR);
        break;
      }

      case 'girl_hair': {
        const hairMat = mats.hair || gearMat;
        // Base head covering
        const base = _box(0.36, 0.1, 0.37, 0, headY + 0.18, 0, hairMat);
        g.add(base);
        // Hair down the back (-z is the back!)
        const hairDown = _box(0.36, 0.4, 0.1, 0, headY - 0.05, -0.18, hairMat);
        hairDown.rotation.x = -0.15;
        g.add(hairDown);
        // Side bangs
        const sideL = _box(0.06, 0.2, 0.12, -0.18, headY + 0.05, 0.08, hairMat);
        const sideR = _box(0.06, 0.2, 0.12,  0.18, headY + 0.05, 0.08, hairMat);
        g.add(sideL, sideR);
        break;
      }

      case 'cowboy_hat': {
        const hatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(0x8b4513, 10, 0.2), roughness: 0.9 }); 
        
        // Crown base (blocky)
        const crown = _box(0.26, 0.15, 0.28, 0, headY + 0.30, 0, hatMat);
        g.add(crown);
        
        // Top crease of the crown (two ridges)
        const creaseL = _box(0.08, 0.05, 0.28, -0.09, headY + 0.38, 0, hatMat);
        const creaseR = _box(0.08, 0.05, 0.28,  0.09, headY + 0.38, 0, hatMat);
        g.add(creaseL, creaseR);
        
        // Flat brim base (sits just above the 0.23 hair height to prevent z-fighting)
        const brim = _box(0.42, 0.03, 0.55, 0, headY + 0.24, 0, hatMat);
        g.add(brim);
        
        // Wide curved up sides of the brim (covers the whole depth of 0.55)
        const leftBrim = _box(0.15, 0.03, 0.55, -0.24, headY + 0.28, 0, hatMat);
        leftBrim.rotation.z = -0.5;
        g.add(leftBrim);
        
        const rightBrim = _box(0.15, 0.03, 0.55, 0.24, headY + 0.28, 0, hatMat);
        rightBrim.rotation.z = 0.5;
        g.add(rightBrim);
        
        break;
      }

      case 'boonie_hat': {
        // Wide-brim bush hat
        const crown = _cyl(0.16, 0.19, 0.12, 0, headY + 0.22, 0, gearMat, 12);
        g.add(crown);
        // Wide brim
        const brim = _cyl(0.28, 0.28, 0.02, 0, headY + 0.16, 0, gearMat, 16);
        g.add(brim);
        // Slight droop
        brim.rotation.x = 0.05;
        break;
      }

      case 'snow_hood': {
        // Hood that wraps around head — larger box behind and over
        const hoodBack = _box(0.42, 0.38, 0.25, 0, headY - 0.02, 0.08, mats.shirt);
        g.add(hoodBack);
        const hoodTop = _box(0.40, 0.08, 0.42, 0, headY + 0.20, -0.02, mats.shirt);
        g.add(hoodTop);
        // Side flaps
        g.add(_box(0.06, 0.30, 0.38, -0.20, headY + 0.0, -0.02, mats.shirt));
        g.add(_box(0.06, 0.30, 0.38,  0.20, headY + 0.0, -0.02, mats.shirt));
        break;
      }

      case 'balaclava': {
        // Ski mask — swap head material to fabric color and add eye slit
        if (headMesh) {
          headMesh.material = mats.shirt.clone();
        }
        // Eye slit (dark strip across eyes)
        const slit = _box(0.30, 0.06, 0.02, 0, headY + 0.04, -0.18, 
          new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }));
        g.add(slit);
        break;
      }

      case 'gas_mask': {
        // Full face respirator
        // Face plate
        const plate = _box(0.32, 0.28, 0.08, 0, headY - 0.02, -0.20, metalMat);
        g.add(plate);
        // Eye lenses (two dark circles)
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.5 });
        const lensL = _cyl(0.05, 0.05, 0.04, -0.08, headY + 0.04, -0.25, lensMat, 8);
        lensL.rotation.x = Math.PI / 2;
        g.add(lensL);
        const lensR = _cyl(0.05, 0.05, 0.04, 0.08, headY + 0.04, -0.25, lensMat, 8);
        lensR.rotation.x = Math.PI / 2;
        g.add(lensR);
        // Filter canister on side
        const canister = _cyl(0.04, 0.04, 0.1, 0.18, headY - 0.06, -0.15, metalMat, 8);
        canister.rotation.z = Math.PI / 2;
        g.add(canister);
        break;
      }

      case 'shemagh': {
        // Wrapped scarf around neck and lower face
        // Neck wrap
        const wrap = _box(0.40, 0.15, 0.30, 0, headY - 0.28, 0, mats.shirt);
        g.add(wrap);
        // Lower face cover
        const faceCover = _box(0.34, 0.12, 0.06, 0, headY - 0.10, -0.16, mats.shirt);
        g.add(faceCover);
        // Draping tail
        const tail = _box(0.12, 0.25, 0.08, 0.14, headY - 0.35, 0.05, mats.shirt);
        tail.rotation.z = -0.15;
        g.add(tail);
        break;
      }
    }

    return g.children.length > 0 ? g : null;
  },

  // ── Face gear builders ───────────────────────────────────
  _buildFaceGear(type, headMesh, mats, gearMat, metalMat) {
    const g = new THREE.Group();
    const headY = headMesh ? headMesh.position.y : 1.75;

    switch (type) {
      case 'goggles': {
        // Tactical goggles on forehead
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.1, metalness: 0.4 });
        // Strap
        const strap = _box(0.38, 0.04, 0.38, 0, headY + 0.08, 0, strapMat);
        g.add(strap);
        // Left lens
        const lensL = _box(0.12, 0.07, 0.04, -0.08, headY + 0.08, -0.18, lensMat);
        g.add(lensL);
        // Right lens
        const lensR = _box(0.12, 0.07, 0.04, 0.08, headY + 0.08, -0.18, lensMat);
        g.add(lensR);
        // Frame
        const frame = _box(0.30, 0.09, 0.02, 0, headY + 0.08, -0.19, metalMat);
        g.add(frame);
        break;
      }
    }

    return g.children.length > 0 ? g : null;
  },

  // ── Torso gear builders ──────────────────────────────────
  _buildTorsoGear(type, torsoMesh, mats, gearMat, metalMat) {
    const g = new THREE.Group();
    // Torso is at ~1.27Y (enemy) or ~0.9Y (player), size 0.42 x 0.6 x 0.22
    const torsoY = torsoMesh ? torsoMesh.position.y : 1.27;

    switch (type) {
      case 'tactical_vest': {
        // Chest rig with pouches
        // Front plate
        const frontPlate = _box(0.38, 0.4, 0.06, 0, torsoY + 0.05, -0.14, gearMat);
        g.add(frontPlate);
        // Back plate
        const backPlate = _box(0.36, 0.38, 0.04, 0, torsoY + 0.05, 0.14, gearMat);
        g.add(backPlate);
        // Shoulder straps
        g.add(_box(0.08, 0.06, 0.30, -0.15, torsoY + 0.28, 0, gearMat));
        g.add(_box(0.08, 0.06, 0.30,  0.15, torsoY + 0.28, 0, gearMat));
        // Magazine pouches (3 on front)
        for (let i = -1; i <= 1; i++) {
          g.add(_box(0.08, 0.12, 0.05, i * 0.1, torsoY - 0.12, -0.17, metalMat));
        }
        break;
      }

      case 'plate_carrier': {
        // Heavier body armor with shoulder pads
        // Front armor plate
        const front = _box(0.40, 0.46, 0.08, 0, torsoY + 0.02, -0.15, gearMat);
        g.add(front);
        // Back armor plate
        const back = _box(0.38, 0.44, 0.06, 0, torsoY + 0.02, 0.14, gearMat);
        g.add(back);
        // Shoulder pads
        g.add(_box(0.14, 0.08, 0.22, -0.22, torsoY + 0.26, 0, gearMat));
        g.add(_box(0.14, 0.08, 0.22,  0.22, torsoY + 0.26, 0, gearMat));
        // Side plates
        g.add(_box(0.04, 0.30, 0.16, -0.23, torsoY, 0, gearMat));
        g.add(_box(0.04, 0.30, 0.16,  0.23, torsoY, 0, gearMat));
        break;
      }

      case 'hoodie': {
        // Hoodie — slightly larger torso + hood draped on back
        // Oversized front
        const hoodieFront = _box(0.44, 0.55, 0.06, 0, torsoY, -0.14, mats.shirt);
        g.add(hoodieFront);
        // Kangaroo pocket
        const pocket = _box(0.28, 0.12, 0.03, 0, torsoY - 0.18, -0.16, gearMat);
        g.add(pocket);
        // Hood draped on back
        const hood = _box(0.30, 0.22, 0.14, 0, torsoY + 0.35, 0.15, mats.shirt);
        g.add(hood);
        // Drawstrings
        const stringMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
        g.add(_box(0.01, 0.12, 0.01, -0.04, torsoY + 0.10, -0.15, stringMat));
        g.add(_box(0.01, 0.12, 0.01,  0.04, torsoY + 0.10, -0.15, stringMat));
        break;
      }

      case 'ammo_belt': {
        // Diagonal belt across torso
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 0.8, metalness: 0.1 });
        // Diagonal strap
        const strap = _box(0.06, 0.65, 0.04, 0.05, torsoY, 0, beltMat);
        strap.rotation.z = 0.5;
        g.add(strap);
        // Bullet pouches along belt
        const bulletMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 });
        for (let i = 0; i < 5; i++) {
          const pouch = _cyl(0.015, 0.015, 0.04, 
            0.05 + (i - 2) * 0.04, 
            torsoY - 0.1 + (i - 2) * 0.12, 
            -0.04, bulletMat, 6);
          pouch.rotation.z = 0.5;
          g.add(pouch);
        }
        break;
      }
    }

    return g.children.length > 0 ? g : null;
  },

  // ── Back gear builders ───────────────────────────────────
  _buildBackGear(type, torsoMesh, mats, gearMat, metalMat) {
    const g = new THREE.Group();
    const torsoY = torsoMesh ? torsoMesh.position.y : 1.27;

    switch (type) {
      case 'backpack': {
        // Small tactical backpack
        const body = _box(0.30, 0.35, 0.14, 0, torsoY + 0.02, 0.20, gearMat);
        g.add(body);
        // Top flap
        const flap = _box(0.28, 0.06, 0.16, 0, torsoY + 0.21, 0.20, gearMat);
        g.add(flap);
        // Side pockets
        g.add(_box(0.05, 0.18, 0.12, -0.17, torsoY - 0.02, 0.20, gearMat));
        g.add(_box(0.05, 0.18, 0.12,  0.17, torsoY - 0.02, 0.20, gearMat));
        // Straps (extending from top to shoulders)
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        g.add(_box(0.04, 0.40, 0.03, -0.10, torsoY + 0.10, 0.12, strapMat));
        g.add(_box(0.04, 0.40, 0.03,  0.10, torsoY + 0.10, 0.12, strapMat));
        break;
      }
    }

    return g.children.length > 0 ? g : null;
  },

  // ── Leg gear builders ────────────────────────────────────
  _buildLegGear(type, leftLeg, rightLeg, mats, gearMat, metalMat) {
    switch (type) {
      case 'knee_pads': {
        // Small protective pads on front of each knee
        const padMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.2 });
        
        if (leftLeg) {
          const lPad = _box(0.14, 0.10, 0.06, 0, -0.28, -0.12, padMat);
          leftLeg.add(lPad);
          // Strap
          leftLeg.add(_box(0.18, 0.02, 0.18, 0, -0.24, -0.02, padMat));
          leftLeg.add(_box(0.18, 0.02, 0.18, 0, -0.32, -0.02, padMat));
        }
        if (rightLeg) {
          const rPad = _box(0.14, 0.10, 0.06, 0, -0.28, -0.12, padMat);
          rightLeg.add(rPad);
          rightLeg.add(_box(0.18, 0.02, 0.18, 0, -0.24, -0.02, padMat));
          rightLeg.add(_box(0.18, 0.02, 0.18, 0, -0.32, -0.02, padMat));
        }
        break;
      }
    }
  }
};
