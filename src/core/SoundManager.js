export const SoundManager = {
  ctx: null,
  isInitialized: false,
  volume: 0.3,

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playShoot(pitch = 1.0, isHeavy = false) {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;
    
    // Noise burst
    const bufferSize = this.ctx.sampleRate * (isHeavy ? 0.3 : 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = isHeavy ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(isHeavy ? 1000 : 2500 * pitch, t);
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(this.volume, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + (isHeavy ? 0.25 : 0.1));
    
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.ctx.destination);
    
    noise.start(t);

    // Tone punch
    if (isHeavy) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      
      const oscEnv = this.ctx.createGain();
      oscEnv.gain.setValueAtTime(this.volume * 0.8, t);
      oscEnv.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      osc.connect(oscEnv);
      oscEnv.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  },

  playHitMarker() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.05);
    
    env.gain.setValueAtTime(this.volume * 0.4, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(env);
    env.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  },

  playExplosion() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.6);
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(this.volume * 1.5, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.ctx.destination);
    
    noise.start(t);
  },

  playReload() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    
    env.gain.setValueAtTime(this.volume * 0.2, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.connect(env);
    env.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  },
  
  playDamage() {
    if (!this.isInitialized) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(this.volume * 1.2, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(env);
    env.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
};
