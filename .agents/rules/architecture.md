---
description: "Triggered for all JavaScript/TypeScript files to ensure a modular architecture for the game."
glob: "**/*.{js,ts,jsx,tsx}"
---

# Game Architecture Rules

Currently, the game is centralized in a monolithic `index.html` file. We need to safely transition to a modular structure.

## Build Tool Mandate
- **Use Vite**: We will transition to using **Vite** as our build tool. Vite provides out-of-the-box support for ES Modules, rapid hot-module replacement (HMR), and easy bundling for Three.js projects without complex configuration. This will allow us to break the game into separate files cleanly.

## Step-by-Step Refactoring Strategy
When breaking down the single JS file, do not do it all at once. Follow this safe progression:
1. **Setup Vite & Entry Point**: Initialize a Vite project, extract the JS from `index.html` into a `main.js` file, and ensure it runs exactly as before.
2. **Extract Configuration**: Move `WEAPONS` and static data into a `config.js` or `constants.js` file.
3. **Extract Systems Gradually**: 
   - **Input Manager**: Move event listeners (`keydown`, `mousemove`) into `InputManager.js`.
   - **Game Loop**: Move the `requestAnimationFrame` loop into `GameLoop.js`.
   - **Renderer / Camera**: Extract Three.js setup (scene, camera, renderer) into `Renderer.js`.
   - **Player & Controls**: Extract movement and aiming logic into `Player.js`.
   - **Weapons & Combat**: Extract shooting, raycasting, and ammo logic into `WeaponSystem.js`.
4. **Communication**: Use simple callbacks or an Event Emitter pattern (e.g., `events.js` exporting a simple pub/sub) for systems to communicate (e.g., `Player` tells `WeaponSystem` to fire). Do not tightly couple classes.
