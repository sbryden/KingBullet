import { WEAPONS } from '../config/weapons.js';

export const GameState = {
  score: 0,
  kills: 0,
  gameTime: 0,
  loadout: { primary: 'ruger', secondary: 'pistol', melee: 'knife' },
  currentSlot: 'primary',
  weaponAmmo: {},

  initAmmo() {
    this.weaponAmmo = {};
    for (const slot of ['primary', 'secondary', 'melee']) {
      const id = this.loadout[slot];
      if (!id) continue;
      const w = WEAPONS[id];
      if (w.type === 'melee') continue;
      this.weaponAmmo[id] = { current: w.magSize, reserve: w.reserve };
    }
  },

  activeWeapon() {
    return WEAPONS[this.loadout[this.currentSlot]];
  },

  activeWeaponId() {
    return this.loadout[this.currentSlot];
  }
};
