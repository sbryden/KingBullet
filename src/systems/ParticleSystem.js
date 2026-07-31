import * as THREE from 'three';
import { Renderer } from '../core/Renderer.js';

export const ParticleSystem = {
  particles: [],

  init() {
    // Initialization if needed (e.g. pre-allocating materials)
  },

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      
      if (p.life <= 0) {
        Renderer.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        // If material is unique (cloned), dispose it too
        if (p.uniqueMaterial) {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.vel.y -= p.gravity * delta;
      p.mesh.position.add(p.vel.clone().multiplyScalar(delta));
      
      // Scaling over time
      if (p.scaleRate) {
        const s = Math.max(0.01, p.mesh.scale.x + p.scaleRate * delta);
        p.mesh.scale.set(s, s, s);
      }
      
      // Rotation
      if (p.rotSpeed) {
        p.mesh.rotation.x += p.rotSpeed.x * delta;
        p.mesh.rotation.y += p.rotSpeed.y * delta;
        p.mesh.rotation.z += p.rotSpeed.z * delta;
      }
    }
  },

  spawnExplosion(pos, color = 0xffaa00, size = 1.0) {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const sizeRandom = (Math.random() * 0.4 + 0.2) * size;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sizeRandom, sizeRandom, sizeRandom),
        new THREE.MeshBasicMaterial({ color: color })
      );
      
      mesh.position.copy(pos);
      // Spread them slightly from center
      mesh.position.x += (Math.random() - 0.5) * size;
      mesh.position.y += (Math.random() - 0.5) * size;
      mesh.position.z += (Math.random() - 0.5) * size;
      
      Renderer.scene.add(mesh);
      
      const speed = Math.random() * 10 * size + 5;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed);
      
      this.particles.push({
        mesh,
        vel,
        life: Math.random() * 0.3 + 0.2,
        gravity: 20,
        uniqueMaterial: true,
        scaleRate: -1.0,
        rotSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10)
      });
    }
  },

  spawnSparks(pos, normal = new THREE.Vector3(0, 1, 0), color = 0xffff00) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: color })
      );
      mesh.position.copy(pos);
      Renderer.scene.add(mesh);
      
      // Reflect or scatter around the normal
      const scatter = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      
      // Blend scatter with normal
      const vel = normal.clone().add(scatter).normalize().multiplyScalar(Math.random() * 5 + 3);
      
      this.particles.push({
        mesh,
        vel,
        life: 0.2 + Math.random() * 0.2,
        gravity: 15,
        uniqueMaterial: true,
        scaleRate: -0.5,
        rotSpeed: null
      });
    }
  },

  spawnMuzzleFlash(pos, direction, scale = 1.0) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 * scale, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.8 })
    );
    mesh.position.copy(pos);
    mesh.position.add(direction.clone().multiplyScalar(0.2)); // slightly forward
    
    // Scale on Z to make it point forward
    mesh.scale.z = 2.0;
    
    Renderer.scene.add(mesh);
    
    this.particles.push({
      mesh,
      vel: new THREE.Vector3(0, 0, 0),
      life: 0.05, // very short
      gravity: 0,
      uniqueMaterial: true,
      scaleRate: 0,
      rotSpeed: null
    });
  }
};
