import * as THREE from 'three';

export const Renderer = {
  scene: null,
  camera: null,
  renderer: null,
  
  shakeIntensity: 0,
  shakeDuration: 0,
  _baseRotation: new THREE.Euler(0, 0, 0, 'YXZ'),

  init() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 2.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 60, 150);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.scene.add(this.camera);

    window.addEventListener('resize', this.onResize.bind(this));

    this.setupLights();
  },

  setupLights() {
    const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x223344, 1.0);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    dirLight.position.set(40, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    this.scene.add(dirLight);

    const pl1 = new THREE.PointLight(0x00e5ff, 2.0, 80);
    pl1.position.set(-30, 8, -30);
    this.scene.add(pl1);

    const pl2 = new THREE.PointLight(0xff3d5a, 2.0, 80);
    pl2.position.set(30, 8, 30);
    this.scene.add(pl2);

    const pl3 = new THREE.PointLight(0x7c4dff, 2.0, 70);
    pl3.position.set(0, 12, -40);
    this.scene.add(pl3);
  },

  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  shake(intensity = 0.05, duration = 0.2) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  },

  update(delta) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      
      const shakeAmt = this.shakeIntensity * (this.shakeDuration > 0 ? 1 : 0);
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;
      
      this.camera.rotation.z += (Math.random() - 0.5) * shakeAmt * 0.2;
      
      this.shakeIntensity *= 0.9;
    }
  },

  render() {
    this.renderer.render(this.scene, this.camera);
  }
};
