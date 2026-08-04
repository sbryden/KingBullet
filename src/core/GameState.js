import { WEAPONS } from '../config/weapons.js';

export const GameState = {
  score: 0,
  kills: 0,
  gameTime: 0,
  loadout: { primary: 'ak47', secondary: 'pistol', melee: 'knife' },
  loadoutRarities: { primary: 'common', secondary: 'common', melee: 'common' },
  currentSlot: 'primary',
  weaponAmmo: {},
  
  isArenaActive: false,
  matchState: 'WAITING',
  queueTimer: 0,
  aliveCount: 0,
  isAlive: true,

  kb: 0,
  kbLifetime: 0,
  kbEarnedThisRound: 0,

  // ── Outfit system ────────────────────────────────────────
  outfitIndex: 0,
  unlockedOutfits: ['boy_starter', 'girl_starter', 'cameron'],

  outfits: [
    { 
      id: 'boy_starter',
      name: 'Boy Starter',
      category: 'street',
      price: 0, rarity: 'common', shopSection: 'featured',
      skin: 0xffdcba, shirt: 0xc0392b, pants: 0x2980b9, shoes: 0x654321, hair: 0x654321,
      camo: null, sleeves: 'short', gloves: null,
      gear: { head: 'cowboy_hat', hair: 'boy_hair' },
      description: 'The classic boy starter skin, now with a cowboy hat!'
    },
    { 
      id: 'girl_starter',
      name: 'Girl Starter',
      category: 'street',
      price: 0, rarity: 'common', shopSection: 'featured',
      skin: 0xffdcba, shirt: 0xffffff, pants: 0x2980b9, shoes: 0x8b4513, hair: 0xf1c27d,
      camo: null, sleeves: 'short', gloves: null,
      gear: { head: 'cowboy_hat', hair: 'girl_hair' },
      description: 'The starter girl, rocking a white top, jeans, and a cowboy hat.'
    },
    {
      id: 'cameron',
      name: 'Cameron',
      category: 'street',
      price: 0, rarity: 'uncommon', shopSection: 'featured',
      skin: 0xffdcba, shirt: 0x3a7d44, pants: 0xc2a878, shoes: 0x4a4a4a, hair: 0xf5d442,
      camo: null, sleeves: 'short', gloves: null,
      gear: { hair: 'boy_hair', face: 'nerd_glasses' },
      description: 'A nerdy little boy with thick glasses and two enormous buck teeth. 🤓'
    }
  ],

  get playerOutfit() {
    return this.outfits[this.outfitIndex];
  },

  // ── KB Currency ──────────────────────────────────────────
  earnKB(amount) {
    this.kb += amount;
    this.kbLifetime += amount;
    this.kbEarnedThisRound += amount;
    this.saveProgress();
    // Update HUD if visible
    const el = document.getElementById('kb-display-val');
    if (el) el.textContent = this.kb;
  },

  spendKB(amount) {
    if (this.kb < amount) return false;
    this.kb -= amount;
    this.saveProgress();
    return true;
  },

  unlockOutfit(id) {
    if (!this.unlockedOutfits.includes(id)) {
      this.unlockedOutfits.push(id);
      this.saveProgress();
    }
  },

  isOutfitUnlocked(id) {
    return this.unlockedOutfits.includes(id);
  },

  // ── Persistence ──────────────────────────────────────────
  saveProgress() {
    try {
      const data = {
        kb: this.kb,
        kbLifetime: this.kbLifetime,
        unlockedOutfits: this.unlockedOutfits,
        outfitIndex: this.outfitIndex,
      };
      localStorage.setItem('kb_progress', JSON.stringify(data));
    } catch (e) { /* localStorage might be unavailable */ }
  },

  loadProgress() {
    try {
      const raw = localStorage.getItem('kb_progress');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.kb === 'number') this.kb = data.kb;
      if (typeof data.kbLifetime === 'number') this.kbLifetime = data.kbLifetime;
      if (Array.isArray(data.unlockedOutfits)) this.unlockedOutfits = data.unlockedOutfits;
      if (typeof data.outfitIndex === 'number') {
        // Make sure the saved outfit is still unlocked
        const outfit = this.outfits[data.outfitIndex];
        if (outfit && this.isOutfitUnlocked(outfit.id)) {
          this.outfitIndex = data.outfitIndex;
        }
      }
    } catch (e) { /* ignore parse errors */ }
  },

  // ── Ammo / Weapons ──────────────────────────────────────
  initAmmo() {
    this.weaponAmmo = {};
    for (const slot of ['primary', 'secondary', 'melee']) {
      const id = this.loadout[slot];
      if (!id || id === 'locked') continue;
      const w = WEAPONS[id];
      if (w && w.type !== 'melee') {
        this.weaponAmmo[id] = { current: w.magSize, reserve: w.reserve };
      }
    }
  },

  reset() {
    this.score = 0;
    this.kills = 0;
    this.gameTime = 0;
    this.kbEarnedThisRound = 0;
    this.loadout = { primary: 'ak47', secondary: 'pistol', melee: 'knife' };
    this.loadoutRarities = { primary: 'common', secondary: 'common', melee: 'common' };
    this.currentSlot = 'primary';
    this.isArenaActive = false;
    this.isAlive = true;
  },

  activeWeapon() {
    return WEAPONS[this.loadout[this.currentSlot]];
  },

  activeWeaponId() {
    return this.loadout[this.currentSlot];
  },

  activeWeaponRarity() {
    return this.loadoutRarities[this.currentSlot];
  }
};
