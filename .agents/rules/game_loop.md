---
description: "Triggered when working on performance, state, or the main game loop."
trigger: "model decision"
---

# Game Loop and Performance Rules

When working on the main game loop (`requestAnimationFrame`) or dealing with performance and state management, adhere to these standard practices:

## 1. Avoid Garbage Collection (GC) Stutters
- **No Object Allocation in the Loop**: NEVER instantiate new objects (`new THREE.Vector3()`, `new THREE.Quaternion()`, arrays, objects, etc.) inside the `update` or `render` loops. 
- **Preallocate and Reuse**: Create persistent instances outside the loop (e.g., `const tempVector = new THREE.Vector3();`) and reuse their methods (`.copy()`, `.set()`, `.add()`) inside the loop to avoid memory allocation and subsequent garbage collection spikes.

## 2. Delta Time
- Always use `deltaTime` (the time elapsed since the last frame) for movement, physics, and animations. This ensures the game runs at the same speed regardless of the player's monitor refresh rate (60fps vs 144fps).
- Example: `position.x += speed * deltaTime;`

## 3. Separation of Concerns
- Keep logic (`update(deltaTime)`) separate from rendering (`renderer.render(scene, camera)`). The loop should clearly execute physics/state updates first, followed by drawing to the screen.
