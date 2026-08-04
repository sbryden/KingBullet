import * as THREE from 'three';
import { OutfitFactory } from '../systems/OutfitFactory.js';
import { GameState } from '../core/GameState.js';

// ── Enemy usernames ────────────────────────────────────────
export const ENEMY_NAMES = [
  'xX_D3adsh0t_Xx', 'GrimReaper99',  'BloodThorn',    'NightReaper77',
  'IronFang',        'Specter_7',     'Venom_',        'DarkHunter',
  'CrimsonFury',     'PhantomX',      'WarDog99',      'BulletMage',
  'LoneWolf',        'JudgmentDay',   'TriggerHappy',  'SilentK1ll',
  'ShadowBane',      'NightStalker',  'DeadEye_',      'VoidReaper',
  'xX_Wr3cker_Xx',  'AngryG4mer',    'Reckoning_X',   'IcedOut99',
  'HellRaiser',      'GunSlinger_X',  'Foxhound',      'BloodLust',
  'TacticalNuke',    'Sk4llCrusher',
];

// ── Weapon type definitions ────────────────────────────────
// burstCount: how many shots per burst
// burstInterval: seconds between shots inside the burst
// pellets: how many projectiles per shot (shotgun only)
export const ENEMY_WEAPON_TYPES = {
  none:       { label: 'UNARMED', color: '#999999', damage: 0,  burstCount: 0, burstInterval: 0,  spread: 0, pellets: 0 },
  pistol:     { label: 'PISTOL',  color: '#aaaaff', damage: 6,  burstCount: 3, burstInterval: 0.22, spread: 0.26, pellets: 1 },
  smg:        { label: 'SMG',     color: '#44ffaa', damage: 8,  burstCount: 7, burstInterval: 0.08, spread: 0.20, pellets: 1 },
  rifle:      { label: 'RIFLE',   color: '#ffd740', damage: 14, burstCount: 4, burstInterval: 0.14, spread: 0.12, pellets: 1 },
  shotgun:    { label: 'SHOTGUN', color: '#ff8844', damage: 9,  burstCount: 1, burstInterval: 0.0,  spread: 0.38, pellets: 6 },
  sniper:     { label: 'SNIPER',  color: '#ff4444', damage: 40, burstCount: 1, burstInterval: 0.0,  spread: 0.03, pellets: 1 },
  ak47:       { label: 'AK-47',   color: '#ffd740', damage: 14, burstCount: 4, burstInterval: 0.14, spread: 0.12, pellets: 1 },
  mp5:        { label: 'MP5',     color: '#44ffaa', damage: 8,  burstCount: 7, burstInterval: 0.08, spread: 0.20, pellets: 1 },
  machinegun: { label: 'LMG',     color: '#ffd740', damage: 12, burstCount: 8, burstInterval: 0.10, spread: 0.15, pellets: 1 },
  grenade:    { label: 'GRENADE', color: '#aaaaff', damage: 50, burstCount: 1, burstInterval: 0.0,  spread: 0.0,  pellets: 1 },
  tecdc9:     { label: 'TEC-9',   color: '#44ffaa', damage: 7,  burstCount: 6, burstInterval: 0.10, spread: 0.22, pellets: 1 },
  knife:      { label: 'KNIFE',   color: '#999999', damage: 20, burstCount: 1, burstInterval: 0.0,  spread: 0.0,  pellets: 1 },
  bayonet:    { label: 'BAYONET', color: '#999999', damage: 30, burstCount: 1, burstInterval: 0.0,  spread: 0.0,  pellets: 1 },
};

// ── Enemy outfit palettes — hostile/dark tones ─────────────
const ENEMY_OUTFITS = [
  { shirt: 0x8b0000, pants: 0x5a0000, skin: 0xc68642 }, // crimson
  { shirt: 0x1a1a2e, pants: 0x16213e, skin: 0xf1c27d }, // dark navy
  { shirt: 0x3d1c02, pants: 0x2b1300, skin: 0xc68642 }, // dark brown
  { shirt: 0x4a0040, pants: 0x2d0027, skin: 0xd4956a }, // deep purple
  { shirt: 0x0d3b0d, pants: 0x071f07, skin: 0xc68642 }, // very dark green
];

// ────────────────────────────────────────────────────────────
// Private helpers
// ────────────────────────────────────────────────────────────

function _roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

/** Creates a camera-facing nameplate sprite with the enemy's name + weapon class. */
function _makeNameplate(name, weaponType) {
  const wDef = ENEMY_WEAPON_TYPES[weaponType];
  const W = 320, H = 70;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Dark pill background
  _roundRect(ctx, 2, 2, W - 4, H - 4, 10);
  ctx.fillStyle = 'rgba(5, 5, 16, 0.84)';
  ctx.fill();

  // Weapon-colour top strip
  _roundRect(ctx, 2, 2, W - 4, 6, { tl: 10, tr: 10, bl: 0, br: 0 });
  ctx.fillStyle = wDef.color;
  ctx.fill();

  // Username
  ctx.font = 'bold 24px Outfit, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(name, W / 2, 43);

  // Weapon label
  ctx.font = 'bold 14px "JetBrains Mono", Courier New, monospace';
  ctx.fillStyle = wDef.color;
  ctx.fillText('[' + wDef.label + ']', W / 2, 62);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,  // always visible so player can ID targets
    opacity: 0.95,
  }));
  // Scale to maintain 320:70 aspect ratio in world units
  sprite.scale.set(1.65, 0.36, 1);
  sprite.position.set(0, 2.35, 0);
  return sprite;
}

/**
 * Builds a weapon-specific gun mesh group.
 * Stores the barrel tip Z offset in group.userData._barrelTipZ
 * (local to gunGroup — negative = forward).
 */
function _buildGunMesh(weaponType, gunMat) {
  const g = new THREE.Group();
  let barrelTipZ = -0.47;

  switch (weaponType) {

    case 'none': {
      barrelTipZ = 0;
      break;
    }
    case 'knife':
    case 'bayonet': {
      g.add(_box(0.015, 0.04, 0.22, 0, 0, -0.1, gunMat));
      g.add(_box(0.022, 0.06, 0.1, 0, 0, 0.05, gunMat));
      barrelTipZ = -0.22;
      break;
    }

    case 'pistol': {
      // Compact handgun
      g.add(_box(0.060, 0.09, 0.20, 0, 0, 0, gunMat));
      const b = _cyl(0.013, 0.18, 0, 0.02, -0.19, gunMat); g.add(b);
      const gr = _box(0.050, 0.13, 0.055, 0, -0.11, 0.05, gunMat);
      gr.rotation.x = 0.12; g.add(gr);
      barrelTipZ = -0.28;
      break;
    }

    case 'smg': {
      // Compact SMG with foregrip
      g.add(_box(0.070, 0.10, 0.34,  0,     0,     0,     gunMat));
      g.add(_cyl(0.015, 0.20,        0,  0.02, -0.27,     gunMat));
      g.add(_box(0.050, 0.13, 0.058, 0, -0.10,  0.05,     gunMat));
      g.add(_box(0.040, 0.12, 0.050, 0, -0.10, -0.02,     gunMat)); // mag
      g.add(_box(0.040, 0.08, 0.040, 0, -0.07, -0.13,     gunMat)); // foregrip
      barrelTipZ = -0.37;
      break;
    }

    case 'rifle': {
      // Assault rifle with stock
      g.add(_box(0.065, 0.10, 0.44,  0,     0,     0,     gunMat));
      g.add(_cyl(0.015, 0.36,        0,  0.02, -0.40,     gunMat));
      g.add(_box(0.050, 0.13, 0.058, 0, -0.10,  0.06,     gunMat)); // grip
      g.add(_box(0.040, 0.14, 0.050, 0, -0.11, -0.02,     gunMat)); // mag
      g.add(_box(0.055, 0.08, 0.16,  0, -0.01,  0.30,     gunMat)); // stock
      barrelTipZ = -0.58;
      break;
    }

    case 'shotgun': {
      // Pump-action shotgun — wide barrel
      g.add(_box(0.075, 0.10, 0.38,  0,     0,     0,     gunMat));
      g.add(_cyl(0.026, 0.28,        0,  0.03, -0.33,     gunMat)); // wide barrel
      g.add(_box(0.056, 0.14, 0.065, 0, -0.11,  0.08,     gunMat)); // grip
      g.add(_box(0.058, 0.055,0.10,  0, -0.04, -0.18,     gunMat)); // pump
      g.add(_box(0.065, 0.085,0.20,  0, -0.01,  0.27,     gunMat)); // stock
      barrelTipZ = -0.47;
      break;
    }

    case 'sniper': {
      // Long-barrel sniper with scope
      g.add(_box(0.060, 0.10, 0.46,  0,     0,     0,     gunMat));
      g.add(_cyl(0.012, 0.58,        0,  0.02, -0.52,     gunMat)); // very long barrel
      g.add(_box(0.050, 0.13, 0.058, 0, -0.10,  0.08,     gunMat)); // grip
      g.add(_box(0.035, 0.12, 0.040, 0, -0.10,  0.00,     gunMat)); // mag
      g.add(_cyl(0.024, 0.22,        0,  0.075,-0.10,     gunMat)); // scope tube
      g.add(_box(0.055, 0.08, 0.26,  0, -0.01,  0.35,     gunMat)); // stock
      barrelTipZ = -0.81;
      break;
    }
  }

  g.userData._barrelTipZ = barrelTipZ;
  return g;
}

/** Shorthand mesh builder helpers */
function _box(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function _cyl(r, len, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

// ────────────────────────────────────────────────────────────
// Exported factory
// ────────────────────────────────────────────────────────────
export const EnemyFactory = {

  /**
   * Build a complete humanoid enemy.
   * @param {object} outfit     - { shirt, pants, skin } hex colours
   * @param {string} weaponType - key of ENEMY_WEAPON_TYPES
   * @param {string} name       - username to display above head
   * @returns THREE.Group
   */
  buildEnemy(outfit, weaponType, name) {
    if (!outfit)     outfit     = ENEMY_OUTFITS[Math.floor(Math.random() * ENEMY_OUTFITS.length)];
    if (!weaponType) weaponType = this.randomWeaponType();

    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.shirt, 15, 0.2), roughness: 0.9 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.pants, 15, 0.2), roughness: 0.9 });
    const skinMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.skin, 8, 0.1), roughness: 0.8 });
    const gunMat   = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(0x1c1c1c, 5, 0.3), roughness: 0.3, metalness: 0.8 });
    const bootMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.shoes !== undefined ? outfit.shoes : 0x111111, 10, 0.2), roughness: 0.9 });

    const root = new THREE.Group();

    // ── HEAD ──────────────────────────────────────────────
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
    head.position.set(0, 1.75, 0);
    head.castShadow = true;
    root.add(head);

    const isSmiler = outfit.id === 'smiler';

    const isCameron = outfit.id === 'cameron';

    if (isSmiler) {
      const eyeGeo  = new THREE.SphereGeometry(0.05, 12, 12);
      const eyeMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupGeo  = new THREE.SphereGeometry(0.02, 8, 8);
      const pupMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });
      [[-0.09, 0.05], [0.09, 0.05]].forEach(([ex]) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 0.05, 0.17); 
        const pup = new THREE.Mesh(pupGeo, pupMat);
        pup.position.set(0, 0, 0.04);
        eye.add(pup);
        head.add(eye);
      });
      // Creepy smile (curved using TorusGeometry)
      // TorusGeometry(radius, tube, radialSegments, tubularSegments, arc)
      const smileGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 12, Math.PI);
      const smileMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const smile = new THREE.Mesh(smileGeo, smileMat);
      // The arc is drawn from +X to -X (top half). Rotate it 180 degrees around Z to make it a bottom half (smile)
      smile.rotation.z = Math.PI; 
      smile.position.set(0, -0.02, 0.18);
      head.add(smile);
      
      // Elf ears
      const earGeo = new THREE.ConeGeometry(0.05, 0.18, 4);
      const lEar = new THREE.Mesh(earGeo, skinMat);
      lEar.position.set(-0.2, 0.05, 0);
      lEar.rotation.z = Math.PI / 3;
      lEar.rotation.x = 0.2;
      head.add(lEar);
      const rEar = new THREE.Mesh(earGeo, skinMat);
      rEar.position.set(0.2, 0.05, 0);
      rEar.rotation.z = -Math.PI / 3;
      rEar.rotation.x = 0.2;
      head.add(rEar);
    } else if (isCameron) {
      // Cameron: nerdy little boy face 🤓
      // Smaller eyes (behind thick glasses)
      const eyeGeo  = new THREE.SphereGeometry(0.04, 8, 8);
      const eyeMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupGeo  = new THREE.SphereGeometry(0.022, 8, 8);
      const pupMat  = new THREE.MeshBasicMaterial({ color: 0x3366aa }); // blue eyes
      [[-0.09, 0.05], [0.09, 0.05]].forEach(([ex]) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 0.05, 0.18);
        const pup = new THREE.Mesh(pupGeo, pupMat);
        pup.position.set(0, 0, 0.02);
        eye.add(pup);
        head.add(eye);
      });
      // Two oversized buck teeth sticking out from the bottom of the face
      const toothMat = new THREE.MeshStandardMaterial({ color: 0xfcf8e8, roughness: 0.4, metalness: 0.05 });
      const toothL = _box(0.06, 0.14, 0.06, -0.04, -0.20, 0.12, toothMat);
      head.add(toothL);
      const toothR = _box(0.06, 0.14, 0.06,  0.04, -0.20, 0.12, toothMat);
      head.add(toothR);
      // Tiny freckles (small dots on cheeks)
      const freckleMat = new THREE.MeshBasicMaterial({ color: 0xc9956b });
      const freckleGeo = new THREE.SphereGeometry(0.012, 4, 4);
      [[-0.12, -0.02, 0.17], [-0.10, -0.06, 0.17], [0.12, -0.02, 0.17], [0.10, -0.06, 0.17]].forEach(([fx, fy, fz]) => {
        const f = new THREE.Mesh(freckleGeo, freckleMat);
        f.position.set(fx, fy, fz);
        head.add(f);
      });
    } else {
      const eyeGeo  = new THREE.SphereGeometry(0.035, 8, 8);
      const eyeMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pupGeo  = new THREE.SphereGeometry(0.020, 8, 8);
      const pupMat  = new THREE.MeshBasicMaterial({ color: 0x111111 });
      [[-0.08, 0.05], [0.08, 0.05]].forEach(([ex]) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 0.05, 0.19); // +Z faces camera via lookAt
        const pup = new THREE.Mesh(pupGeo, pupMat);
        pup.position.set(0, 0, 0.02);
        eye.add(pup);
        head.add(eye);
      });
    }

    // ── TORSO ─────────────────────────────────────────────
    const torsoGeo = new THREE.BoxGeometry(0.42, isSmiler ? 0.3 : 0.6, 0.22);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.set(0, isSmiler ? 1.42 : 1.27, 0);
    torso.castShadow = true;
    root.add(torso);

    // ── HIPS ──────────────────────────────────────────────
    root.add(_box(0.38, 0.18, 0.20, 0, isSmiler ? 1.18 : 0.95, 0, pantsMat));

    // ── ARMS HIERARCHY ────────────────────────────────────
    // Pivot at shoulders
    const upperArmGeo = new THREE.BoxGeometry(0.14, 0.3, 0.14);
    upperArmGeo.translate(0, -0.15, 0); 
    const lUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    const rUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    
    // Shoulder positions
    lUpperArm.position.set(-0.28, isSmiler ? 1.55 : 1.42, 0); 
    rUpperArm.position.set( 0.28, isSmiler ? 1.55 : 1.42, 0);
    lUpperArm.castShadow = rUpperArm.castShadow = true;
    root.add(lUpperArm, rUpperArm);

    // Forearms (Children of Upper Arms)
    const foreArmGeo = new THREE.BoxGeometry(0.12, 0.28, 0.12);
    foreArmGeo.translate(0, -0.14, 0); // Pivot at elbow
    const lForeArm = new THREE.Mesh(foreArmGeo, skinMat);
    const rForeArm = new THREE.Mesh(foreArmGeo, skinMat);
    
    // Position elbow relative to shoulder (length of upper arm is 0.3)
    lForeArm.position.set(0, -0.3, 0);
    rForeArm.position.set(0, -0.3, 0);
    lUpperArm.add(lForeArm);
    rUpperArm.add(rForeArm);

    // ── LEGS HIERARCHY ────────────────────────────────────
    // Pivot at hips
    const legGeo = new THREE.BoxGeometry(0.18, isSmiler ? 0.78 : 0.48, 0.18);
    legGeo.translate(0, isSmiler ? -0.39 : -0.24, 0); 
    const leftLegMesh  = new THREE.Mesh(legGeo, pantsMat);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    
    // Hip positions
    leftLegMesh.position.set(-0.11, isSmiler ? 1.18 : 0.95, 0);
    rightLegMesh.position.set( 0.11, isSmiler ? 1.18 : 0.95, 0);
    leftLegMesh.castShadow = rightLegMesh.castShadow = true;
    root.add(leftLegMesh, rightLegMesh);

    // Boots (Children of Legs)
    // Leg length is 0.48, so ankle is at -0.48
    if (!isSmiler) {
      const lBoot = _box(0.19, 0.12, 0.22, 0, -0.48, 0.02, bootMat);
      const rBoot = _box(0.19, 0.12, 0.22, 0, -0.48, 0.02, bootMat);
      leftLegMesh.add(lBoot);
      rightLegMesh.add(rBoot);
    }

    // ── GUN (Attached to Right Forearm) ───────────────────
    const gunGroup = _buildGunMesh(weaponType, gunMat);
    // Position relative to right forearm (wrist area)
    gunGroup.position.set(0, -0.28, 0.05);
    gunGroup.rotation.set(-0.1, 0, 0);
    rForeArm.add(gunGroup);
    
    // Set default aiming pose for enemies
    if (weaponType !== 'none') {
      rUpperArm.rotation.x = -0.6;
      rForeArm.rotation.x = -0.2;
    }

    // ── NAMEPLATE sprite ───────────────────────────────────
    if (name) {
      const plate = _makeNameplate(name, weaponType);
      root.userData._nameplate = plate;
      root.add(plate);
    }

    // ── Store refs for EnemyManager & LobbySystem ──
    root.userData._leftLeg  = leftLegMesh;
    root.userData._rightLeg = rightLegMesh;
    root.userData._leftArm  = lUpperArm;
    root.userData._rightArm = rUpperArm;
    root.userData._gunGroup = gunGroup;

    // ── ATTACH GEAR from outfit definition ────────────────
    if (outfit.gear) {
      const hairMat = outfit.hair ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(outfit.hair, 15, 0.2), roughness: 0.9 }) : null;
      OutfitFactory.attachGear(root, outfit.gear, {
        head: head,
        torso: torso,
        leftLeg: leftLegMesh,
        rightLeg: rightLegMesh,
      }, {
        shirt: shirtMat,
        pants: pantsMat,
        skin: skinMat,
        hair: hairMat
      });
    }

    return root;
  },

  randomOutfit()     { 
    const outfits = GameState.outfits;
    return outfits[Math.floor(Math.random() * outfits.length)]; 
  },
  randomName()       { return ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)]; },
  randomWeaponType() {
    const types = Object.keys(ENEMY_WEAPON_TYPES);
    return types[Math.floor(Math.random() * types.length)];
  },

  equipWeapon(enemyGroup, weaponType, name) {
    const rUpperArm = enemyGroup.userData._rightArm;
    const rForeArm = rUpperArm.children[0];
    const oldGun = enemyGroup.userData._gunGroup;
    
    if (oldGun && rForeArm) {
      rForeArm.remove(oldGun);
    }
    
    const gunMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: OutfitFactory.createPixelTexture(0x1c1c1c, 5, 0.3), roughness: 0.3, metalness: 0.8 });
    const gunGroup = _buildGunMesh(weaponType, gunMat);
    gunGroup.position.set(0, -0.28, 0.05);
    gunGroup.rotation.set(-0.1, 0, 0);
    rForeArm.add(gunGroup);
    enemyGroup.userData._gunGroup = gunGroup;

    if (weaponType !== 'none') {
      rUpperArm.rotation.x = -0.6;
      rForeArm.rotation.x = -0.2;
    } else {
      rUpperArm.rotation.x = 0;
      rForeArm.rotation.x = 0;
    }

    const oldNameplate = enemyGroup.userData._nameplate;
    if (oldNameplate) {
      enemyGroup.remove(oldNameplate);
    }
    
    if (name) {
      const plate = _makeNameplate(name, weaponType);
      enemyGroup.userData._nameplate = plate;
      enemyGroup.add(plate);
    }
  }
};
