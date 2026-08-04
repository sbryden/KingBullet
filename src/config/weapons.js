export const WEAPONS = {
  // Primaries
  ak47: {
    name: 'AK-47', type: 'primary', caliber: '7.62×39mm',
    damage: 34, fireRate: 0.1, accuracy: 0.85, magSize: 30, reserve: 90,
    reloadTime: 2.2, recoil: 0.015, auto: true, zoomFOV: 40
  },
  mp5: {
    name: 'MP5', type: 'primary', caliber: '9×19mm',
    damage: 28, fireRate: 0.05, accuracy: 0.9, magSize: 30, reserve: 120,
    reloadTime: 1.8, recoil: 0.008, auto: true, zoomFOV: 45
  },
  sniper: {
    name: 'Sniper', type: 'primary', caliber: '.338 Lapua',
    damage: 150, fireRate: 1.0, accuracy: 0.98, magSize: 5, reserve: 30,
    reloadTime: 3.0, recoil: 0.08, auto: false, zoomFOV: 20
  },
  machinegun: {
    name: 'Machine Gun', type: 'primary', caliber: '5.56×45mm',
    damage: 22, fireRate: 0.04, accuracy: 0.6, magSize: 100, reserve: 200,
    reloadTime: 4.5, recoil: 0.02, auto: true, noSecondary: true, zoomFOV: 55
  },
  // Secondaries
  pistol: {
    name: 'Pistol', type: 'secondary', caliber: '9mm',
    damage: 35, fireRate: 0.167, accuracy: 0.88, magSize: 12, reserve: 48,
    reloadTime: 1.2, recoil: 0.018, auto: false
  },
  grenade: {
    name: 'Grenade', type: 'secondary', caliber: 'Frag',
    damage: 200, fireRate: 2.0, accuracy: 1, magSize: 1, reserve: 3,
    reloadTime: 0, recoil: 0, auto: false, isGrenade: true, range: 8
  },
  tecdc9: {
    name: 'Tec-DC9', type: 'secondary', caliber: '9mm',
    damage: 20, fireRate: 0.055, accuracy: 0.55, magSize: 32, reserve: 96,
    reloadTime: 2.0, recoil: 0.02, auto: true
  },
  // Melee
  knife: {
    name: 'Knife', type: 'melee', caliber: '',
    damage: 80, fireRate: 0.3, range: 2.5, auto: false
  },
  bayonet: {
    name: 'Bayonet', type: 'melee', caliber: '',
    damage: 100, fireRate: 0.6, range: 3.5, auto: false
  }
};

export const WEAPON_RARITIES = {
  common:   { name: 'Common',   color: '#ffffff', dropWeight: 50, damageMult: 1.0 },
  uncommon: { name: 'Uncommon', color: '#2ecc71', dropWeight: 30, damageMult: 1.15 },
  rare:     { name: 'Rare',     color: '#3498db', dropWeight: 12, damageMult: 1.3 },
  epic:     { name: 'Epic',     color: '#9b59b6', dropWeight: 6,  damageMult: 1.5 },
  legendary:{ name: 'Legendary',color: '#f1c40f', dropWeight: 2,  damageMult: 1.8 }
};
