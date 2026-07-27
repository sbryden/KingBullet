export const InputManager = {
  keys: {},
  mouseDelta: { x: 0, y: 0 },
  mouseHeld: false,
  isLocked: false,

  init() {
    document.addEventListener('keydown', (e) => {
      if (!this.isLocked) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.isLocked) return;
      if (e.button === 0) {
        this.mouseHeld = true;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseHeld = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = !!document.pointerLockElement;
      
      if (!this.isLocked) {
        document.getElementById('start-screen').classList.remove('hidden');
        document.getElementById('hud').classList.remove('visible');
        document.getElementById('loadout-screen').classList.remove('visible');
      }
    });
  },

  isPressed(code) {
    return !!this.keys[code];
  },

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  },

  requestPointerLock() {
    document.getElementById('game-canvas').requestPointerLock();
  }
};
