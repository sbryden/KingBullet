import { Renderer }      from './core/Renderer.js';
import { InputManager }  from './core/InputManager.js';
import { GameState }     from './core/GameState.js';
import { Player }        from './entities/Player.js';
import { Arena }         from './entities/Arena.js';
import { TargetManager } from './systems/TargetManager.js';
import { EnemyManager }  from './systems/EnemyManager.js';
import { WeaponSystem }  from './systems/WeaponSystem.js';
import { GameLoop }      from './core/GameLoop.js';
import { PLAYER_HEIGHT, ARENA_SIZE } from './config/constants.js';
import { LobbySystem }   from './systems/LobbySystem.js';
import { OutfitFactory } from './systems/OutfitFactory.js';
import { SoundManager }  from './core/SoundManager.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { NetworkManager } from './core/NetworkManager.js';
import { WEAPONS } from './config/weapons.js';

let isSystemsInitialized = false;
let currentCategory = 'all';
let currentLobbyTab = 'inventory'; // 'shop', 'inventory', 'loadout'
let selectedPreviewIndex = 0;

function initSystems() {
  if (isSystemsInitialized) return;
  isSystemsInitialized = true;

  GameState.loadProgress();
  selectedPreviewIndex = GameState.outfitIndex;
  
  GameState.reset();
  GameState.initAmmo();

  Renderer.init();
  InputManager.init();
  Player.init();
  Arena.build();
  TargetManager.init();
  WeaponSystem.init();
  ParticleSystem.init();
  SoundManager.init();
  NetworkManager.init();
  
  // Setup UI event listeners
  setupLobbyUI();
}

function setupLobbyUI() {
  // Top Nav Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentLobbyTab = e.target.dataset.target;
      
      const outfitsPanel = document.getElementById('outfits-panel');
      
      outfitsPanel.classList.add('active');
      document.getElementById('outfits-panel-title').textContent = currentLobbyTab.toUpperCase();
        
        const shopContent = document.getElementById('shop-content');
        const invContent = document.getElementById('inventory-content');
        const shopTimer = document.getElementById('shop-timer');
        
        if (currentLobbyTab === 'shop') {
          shopContent.style.display = 'flex';
          invContent.style.display = 'none';
          shopTimer.classList.remove('hidden');
        } else {
          shopContent.style.display = 'none';
          invContent.style.display = 'block';
          shopTimer.classList.add('hidden');
        }

        buildOutfitsUI();
    });
  });

  // Category tabs
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.cat;
      buildOutfitsUI();
    });
  });

  // Unlock button
  document.getElementById('unlock-btn').addEventListener('click', () => {
    const outfit = GameState.outfits[selectedPreviewIndex];
    if (outfit && !GameState.isOutfitUnlocked(outfit.id)) {
      if (GameState.spendKB(outfit.price)) {
        GameState.unlockOutfit(outfit.id);
        GameState.outfitIndex = selectedPreviewIndex;
        Player.updateOutfit();
        buildOutfitsUI();
        
        // Play celebration animation on the unlocked card
        const card = document.querySelector(`.outfit-card[data-index="${selectedPreviewIndex}"]`);
        if (card) {
          card.classList.add('just-unlocked');
          setTimeout(() => card.classList.remove('just-unlocked'), 600);
        }
      }
    }
  });

  buildOutfitsUI();

  // Mode selection cards
  setupModeSelection();
}

function updateKBDisplay() {
  const el = document.getElementById('kb-display-val');
  if (el) el.textContent = GameState.kb;
}

function buildOutfitsUI() {
  updateKBDisplay();
  const inventoryGrid = document.getElementById('outfit-grid');
  const featuredGrid = document.getElementById('featured-grid');
  const dailyGrid = document.getElementById('daily-grid');
  
  if (inventoryGrid) inventoryGrid.innerHTML = '';
  if (featuredGrid) featuredGrid.innerHTML = '';
  if (dailyGrid) dailyGrid.innerHTML = '';
  
  const unlockArea = document.getElementById('unlock-area');
  const unlockBtn = document.getElementById('unlock-btn');
  
  let needsUnlockBtn = false;
  let currentPreviewOutfit = GameState.outfits[selectedPreviewIndex];

  GameState.outfits.forEach((outfit, idx) => {
    const isUnlocked = GameState.isOutfitUnlocked(outfit.id);
    
    // Filter by Lobby Tab
    if (currentLobbyTab === 'shop' && isUnlocked) return; // Shop only shows locked
    if (currentLobbyTab === 'inventory' && !isUnlocked) return; // Inventory only shows unlocked
    
    // In Inventory, filter by category
    if (currentLobbyTab === 'inventory' && currentCategory !== 'all' && outfit.category !== currentCategory) return;
    
    // In Shop, only show if it has a shopSection
    if (currentLobbyTab === 'shop' && !outfit.shopSection) return;
    
    const isEquipped = (idx === GameState.outfitIndex);
    const isSelectedPreview = (idx === selectedPreviewIndex);
    
    const card = document.createElement('div');
    // Add shop section class if in shop tab
    let sectionClass = currentLobbyTab === 'shop' ? outfit.shopSection : '';
    let rarityClass = outfit.rarity ? `rarity-${outfit.rarity}` : 'rarity-common';
    card.className = `outfit-card ${isSelectedPreview ? 'selected' : ''} ${isEquipped ? 'equipped' : ''} ${sectionClass} ${rarityClass}`;
    card.dataset.index = idx;
    
    // Swatch
    const swatch = document.createElement('div');
    swatch.className = 'outfit-card-swatch';
    if (outfit.image) {
      swatch.style.backgroundImage = `url(${outfit.image})`;
      swatch.style.backgroundSize = 'contain';
      swatch.style.backgroundPosition = 'center';
      swatch.style.backgroundRepeat = 'no-repeat';
      swatch.style.backgroundColor = 'transparent';
    } else if (outfit.camo) {
      swatch.style.background = OutfitFactory.getCamoCSS(outfit.camo);
    } else {
      swatch.style.background = `linear-gradient(135deg, #${outfit.shirt.toString(16).padStart(6,'0')} 40%, #${outfit.pants.toString(16).padStart(6,'0')} 60%)`;
    }
    card.appendChild(swatch);
    
    // Name
    const nameEl = document.createElement('div');
    nameEl.className = 'outfit-card-name';
    nameEl.textContent = outfit.name;
    card.appendChild(nameEl);
    
    // Badges/Overlays
    if (isEquipped) {
      const badge = document.createElement('div');
      badge.className = 'outfit-card-badge equipped-badge';
      badge.textContent = '✓ EQUIPPED';
      swatch.appendChild(badge);
    } else if (isUnlocked) {
      const badge = document.createElement('div');
      badge.className = 'outfit-card-badge free';
      badge.textContent = 'UNLOCKED';
      swatch.appendChild(badge);
    } else {
      // Locked overlay or price badge
      if (currentLobbyTab === 'shop') {
        const priceBadge = document.createElement('div');
        priceBadge.className = 'outfit-card-badge price';
        priceBadge.textContent = `${outfit.price} KB`;
        swatch.appendChild(priceBadge);
      } else {
        const lockOverlay = document.createElement('div');
        lockOverlay.className = 'outfit-card-lock';
        lockOverlay.innerHTML = `<span class="lock-icon">🔒</span><span class="lock-price">${outfit.price} KB</span>`;
        swatch.appendChild(lockOverlay);
      }
    }
    
    card.onclick = () => {
      selectedPreviewIndex = idx;
      
      // Enter Focus Mode
      document.getElementById('skins-grid-container').classList.add('hidden');
      document.getElementById('skins-focus-container').classList.remove('hidden');
      
      // Update Focus Details
      document.getElementById('focus-name').textContent = outfit.name;
      document.getElementById('focus-rarity').textContent = outfit.rarity;
      document.getElementById('focus-rarity').className = `focus-rarity ${rarityClass}`;
      if (outfit.description) {
        document.getElementById('focus-desc').textContent = outfit.description;
      }
      
      // Setup Buttons
      const unlockArea = document.getElementById('unlock-area');
      const equipArea = document.getElementById('equip-area');
      const unlockBtn = document.getElementById('unlock-btn');
      const equipBtn = document.getElementById('equip-btn');
      
      if (isUnlocked) {
        unlockArea.classList.add('hidden');
        equipArea.classList.remove('hidden');
        
        if (GameState.outfitIndex === idx) {
          equipBtn.textContent = 'EQUIPPED';
          equipBtn.disabled = true;
          equipBtn.style.opacity = '0.5';
        } else {
          equipBtn.textContent = 'EQUIP';
          equipBtn.disabled = false;
          equipBtn.style.opacity = '1';
        }
      } else {
        unlockArea.classList.remove('hidden');
        equipArea.classList.add('hidden');
        unlockBtn.textContent = `🔓 UNLOCK — ${outfit.price} KB`;
        unlockBtn.disabled = GameState.kb < outfit.price;
        
        unlockBtn.onclick = () => {
          if (GameState.spendKB(outfit.price)) {
            GameState.unlockOutfit(outfit.id);
            buildOutfitsUI();
            unlockArea.classList.add('hidden');
            equipArea.classList.remove('hidden');
          }
        };
      }
      
      equipBtn.onclick = () => {
        GameState.outfitIndex = idx;
        Player.updateOutfit();
        equipBtn.textContent = 'EQUIPPED';
        equipBtn.disabled = true;
        equipBtn.style.opacity = '0.5';
      };

      // Temporarily swap lobby preview to show selected even if locked
      const oldIndex = GameState.outfitIndex;
      GameState.outfitIndex = idx;
      LobbySystem.updateCharacterPreview();
      GameState.outfitIndex = oldIndex; // restore actual equipped state
    };
    
    if (currentLobbyTab === 'shop') {
      if (outfit.shopSection === 'featured') {
        featuredGrid.appendChild(card);
      } else {
        dailyGrid.appendChild(card);
      }
    } else {
      inventoryGrid.appendChild(card);
    }
  });
}

// ── Back Button Listener ──────────────────────────────────
document.getElementById('back-to-grid-btn').addEventListener('click', () => {
  document.getElementById('skins-focus-container').classList.add('hidden');
  document.getElementById('skins-grid-container').classList.remove('hidden');
  // Reset character preview to currently equipped outfit
  selectedPreviewIndex = GameState.outfitIndex;
  LobbySystem.updateCharacterPreview();
  buildOutfitsUI();
});

// ── Start button (Title -> Lobby) ──────────────────────────
document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('lobby-ui').classList.remove('hidden');
  
  initSystems();
  SoundManager.resume();
  
  // Set default tab to Inventory
  document.querySelector('.nav-tab[data-target="inventory"]').click();
  
  LobbySystem.init();
});

// ── Deploy button (Lobby -> Game) ────────────────────────
document.getElementById('nav-deploy-btn').addEventListener('click', () => {
  document.getElementById('lobby-ui').classList.add('hidden');
  
  LobbySystem.shutdown();
  
  // Teleport player back to random spawn
  const half = ARENA_SIZE / 2 - 2;
  Player.position.x = (Math.random() - 0.5) * half * 1.5;
  Player.position.z = (Math.random() - 0.5) * half * 1.5;
  Player.position.y = PLAYER_HEIGHT;
  Player.velocityY = 0;
  
  // Re-sync the actual camera back to the player
  Renderer.camera.position.copy(Player.position);
  Player.euler.set(0, 0, 0);
  Renderer.camera.quaternion.setFromEuler(Player.euler);
  
  // Recreate the player view model (so it matches the new loadout)
  WeaponSystem.createPlayerViewModel();
  WeaponSystem.updateAmmoDisplay();
  WeaponSystem.updateWeaponInfo();
  WeaponSystem.updateSlotIndicators();

  document.getElementById('hud').classList.add('visible');
  InputManager.requestPointerLock();
  
  // Gun Game: set initial weapon
  if (GameState.gameMode === 'gun_game') {
    const tier0 = GameState.gunGameTiers[0];
    const wepDef = WEAPONS[tier0];
    if (wepDef) {
      const slot = wepDef.type === 'melee' ? 'melee' : (wepDef.type === 'secondary' ? 'secondary' : 'primary');
      GameState.loadout[slot] = tier0;
      GameState.initAmmo();
      WeaponSystem.switchWeapon(slot, true);
      WeaponSystem.createPlayerViewModel();
      WeaponSystem.updateAmmoDisplay();
      WeaponSystem.updateWeaponInfo();
      WeaponSystem.updateSlotIndicators();
    }
  }
  
  GameLoop.start();
});

// ── Respawn button (after death) ──────────────────────────
document.getElementById('respawn-btn').addEventListener('click', () => {
  // Show final stats before hiding
  document.getElementById('death-screen').classList.add('hidden');

  // Reset player state
  EnemyManager.reset();
  GameState.reset();
  GameState.initAmmo();
  GameState.isArenaActive = false;

  // Teleport player back to random spawn
  const half = ARENA_SIZE / 2 - 2;
  Player.position.x = (Math.random() - 0.5) * half * 1.5;
  Player.position.z = (Math.random() - 0.5) * half * 1.5;
  Player.position.y = PLAYER_HEIGHT;
  Player.velocityY = 0;
  Renderer.camera.position.copy(Player.position);
  Player.euler.set(0, 0, 0, 'YXZ');
  Renderer.camera.quaternion.setFromEuler(Player.euler);

  // Reset HUD
  WeaponSystem.createPlayerViewModel();
  WeaponSystem.updateAmmoDisplay();
  WeaponSystem.updateWeaponInfo();
  WeaponSystem.updateSlotIndicators();

  document.getElementById('score-val').textContent = '0';
  document.getElementById('kills-val').textContent = '0';
  document.getElementById('timer-val').textContent = '0:00';
  
  // Go back to Lobby
  document.getElementById('hud').classList.remove('visible');
  document.getElementById('lobby-ui').classList.remove('hidden');
  
  // Re-init lobby scene
  LobbySystem.init();
  updateKBDisplay();
});

document.getElementById('victory-respawn-btn').addEventListener('click', () => {
  document.getElementById('victory-screen').classList.add('hidden');
  document.getElementById('respawn-btn').click(); // Reuse respawn logic
});

window.addEventListener('matchStateChanged', (e) => {
  const data = e.detail;
  if (data.state === 'PLAYING') {
    EnemyManager.spawnEnemies(data.botsToSpawn || 0);
  } else if (data.state === 'FINISHED') {
    // Show victory screen if the player is alive
    if (GameState.isAlive) {
      document.getElementById('victory-screen').classList.remove('hidden');
      document.exitPointerLock();
      
      const vScore = document.getElementById('victory-score');
      const vKills = document.getElementById('victory-kills');
      const vKb = document.getElementById('victory-kb');
      const vSub = document.getElementById('victory-sub');
      
      const bonusKB = Math.floor(GameState.score / 5) + 100; // Extra win bonus
      GameState.earnKB(bonusKB);
      
      if (vScore) vScore.textContent = GameState.score;
      if (vKills) vKills.textContent = GameState.kills;
      if (vKb) vKb.textContent = "+" + GameState.kbEarnedThisRound;
      
      // Mode-specific victory text
      if (vSub) {
        if (GameState.gameMode === 'team_deathmatch') {
          const won = GameState.teamScores.red >= 50 ? 'RED' : 'BLUE';
          vSub.textContent = `Team ${won} wins!`;
        } else if (GameState.gameMode === 'gun_game') {
          vSub.textContent = 'You completed all weapon tiers!';
        } else {
          vSub.textContent = 'You are the last one standing.';
        }
      }
    }
  } else if (data.state === 'WAITING' || data.state === 'STARTING') {
    // Cleanup any lingering bots
    EnemyManager.reset();
  }
});

// ── Gun Game weapon advancement ─────────────────────────
window.addEventListener('gunGameAdvance', (e) => {
  const data = e.detail;
  GameState.gunGameTier = data.tier;
  const weaponId = GameState.gunGameTiers[data.tier];
  if (!weaponId) return;
  
  const wepDef = WEAPONS[weaponId];
  if (!wepDef) return;
  
  const slot = wepDef.type === 'melee' ? 'melee' : (wepDef.type === 'secondary' ? 'secondary' : 'primary');
  GameState.loadout[slot] = weaponId;
  GameState.initAmmo();
  WeaponSystem.switchWeapon(slot, true);
  WeaponSystem.createPlayerViewModel();
  WeaponSystem.updateAmmoDisplay();
  WeaponSystem.updateWeaponInfo();
  WeaponSystem.updateSlotIndicators();
  
  // Flash the gun game HUD
  const ggHud = document.getElementById('gun-game-hud');
  if (ggHud) {
    ggHud.classList.add('advance');
    setTimeout(() => ggHud.classList.remove('advance'), 600);
  }
});

// ── Mode Selection ─────────────────────────────────────────
function setupModeSelection() {
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const mode = card.dataset.mode;
      GameState.gameMode = mode;
      NetworkManager.selectMode(mode);
    });
  });
}
