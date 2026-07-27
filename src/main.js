import { Renderer } from './core/Renderer.js';
import { InputManager } from './core/InputManager.js';
import { GameState } from './core/GameState.js';
import { Player } from './entities/Player.js';
import { Arena } from './entities/Arena.js';
import { TargetManager } from './systems/TargetManager.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { GameLoop } from './core/GameLoop.js';

let isInitialized = false;

function setupLoadoutUI() {
  const cards = document.querySelectorAll('.weapon-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const slot = card.dataset.slot;
      const weapon = card.dataset.weapon;
      
      document.querySelectorAll(`.weapon-card[data-slot="${slot}"]`).forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      GameState.loadout[slot] = weapon;

      if (slot === 'primary') {
        const secCol = document.getElementById('col-secondary');
        const lockedOverlay = document.getElementById('secondary-locked');
        if (weapon === 'machinegun') {
          secCol.classList.add('locked');
          if (lockedOverlay) lockedOverlay.classList.add('visible');
          GameState.loadout.secondary = 'locked';
        } else {
          secCol.classList.remove('locked');
          if (lockedOverlay) lockedOverlay.classList.remove('visible');
          if (GameState.loadout.secondary === 'locked') {
            const defaultSec = document.querySelector('.weapon-card[data-slot="secondary"]');
            if (defaultSec) {
              defaultSec.classList.add('selected');
              GameState.loadout.secondary = defaultSec.dataset.weapon;
            }
          }
        }
      }
    });
  });
}

function initGame() {
  if (isInitialized) {
    InputManager.requestPointerLock();
    return;
  }

  isInitialized = true;
  GameState.reset();
  GameState.initAmmo();

  Renderer.init();
  InputManager.init();
  Player.init();
  Arena.build();
  TargetManager.init();
  WeaponSystem.init();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('hud').classList.add('visible');
  InputManager.requestPointerLock();

  GameLoop.start();
}

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  if (isInitialized) {
    document.getElementById('hud').classList.add('visible');
    InputManager.requestPointerLock();
  } else {
    document.getElementById('loadout-screen').classList.add('visible');
  }
});

document.getElementById('deploy-btn').addEventListener('click', () => {
  document.getElementById('loadout-screen').classList.remove('visible');
  initGame();
});

setupLoadoutUI();
