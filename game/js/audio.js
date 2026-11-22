// Every sound in Velvet Hour is synthesised in the browser: no audio files.
// The audio context opens on the first real key press and every voice is
// guarded, so a browser that refuses audio still plays the game.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.pulseT = 0;
    this.stepT = 0;
    this.servoT = 0;
    this.klaxonT = 0;
    this.stage = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.36;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let seed = 0x1f2e3d4c;
      for (let i = 0; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[i] = (seed / 4294967296) * 2 - 1;
      }
      this.noiseBuffer = buf;
    } catch {
      this.ctx = null;
    }
  }

  get ready() {
    return this.ctx !== null && this.master !== null;
  }

  /** Forget the last run's musical timers, for a fresh one. */
  reset() {
    this.pulseT = 0;
    this.stepT = 0;
    this.servoT = 0;
    this.klaxonT = 0;
    this.stage = 0;
  }

  tone(freq, dur, type, gain, slideTo) {
    if (!this.ready) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp);
      amp.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch {
      /* silent */
    }
  }

  noise(dur, gain, cutoff, type) {
    if (!this.ready || !this.noiseBuffer) return;
    try {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff || 900, t);
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(gain || 0.06, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch {
      /* silent */
    }
  }

  step() {
    this.noise(0.06, 0.045, 1500, 'highpass');
    this.tone(96, 0.05, 'triangle', 0.03);
  }

  sting() {
    this.tone(740, 0.16, 'triangle', 0.07, 620);
  }

  smoke() {
    this.noise(0.34, 0.1, 1200);
    this.tone(180, 0.22, 'sine', 0.07, 90);
  }

  coin() {
    this.tone(1320, 0.07, 'square', 0.05);
    this.tone(1760, 0.12, 'square', 0.04);
  }

  loop() {
    this.tone(420, 0.1, 'sawtooth', 0.05, 300);
    this.tone(620, 0.16, 'triangle', 0.05, 900);
  }

  refuse() {
    this.tone(140, 0.12, 'square', 0.05, 110);
  }

  doorGroan() {
    this.tone(120, 0.5, 'sawtooth', 0.08, 55);
    this.noise(0.45, 0.06, 500);
  }

  chime() {
    const notes = [523.25, 659.25, 987.77];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.34, 'triangle', 0.08), i * 110);
    });
  }

  bust() {
    this.tone(70, 0.5, 'sine', 0.22, 38);
    this.noise(0.4, 0.12, 380);
  }

  klaxon() {
    this.tone(300, 0.28, 'square', 0.06, 240);
    setTimeout(() => this.tone(240, 0.3, 'square', 0.06, 300), 150);
  }

  getaway() {
    this.noise(0.7, 0.08, 1800);
    this.tone(180, 0.5, 'sine', 0.08, 420);
    setTimeout(() => this.tone(523, 0.3, 'triangle', 0.08), 200);
    setTimeout(() => this.tone(659, 0.3, 'triangle', 0.08), 340);
    setTimeout(() => this.tone(784, 0.5, 'triangle', 0.09), 480);
  }

  /** The low pulse, footstep ticks, the servo whirr and the klaxon, mixed by the alarm. */
  update(g, dt) {
    if (!this.ready) return;
    if (g.mode !== 'play') return;
    try {
      const stage = g.alarm >= 75 ? 2 : g.alarm >= 40 ? 1 : 0;
      if (stage >= 2 && this.stage < 2) this.klaxon();
      this.stage = stage;

      this.pulseT -= dt;
      if (this.pulseT <= 0) {
        this.pulseT = 1.12 - 0.8 * (g.alarm / 100);
        this.tone(58 + g.alarm * 0.16, 0.11, 'sine', 0.07);
      }

      if (g.player.moving && !g.player.crouch) {
        this.stepT -= dt;
        if (this.stepT <= 0) {
          this.stepT = 0.27;
          this.step();
        }
      } else {
        this.stepT = 0;
      }

      let nearLens = false;
      for (const cam of g.cameras) {
        if (Math.hypot(cam.x - g.player.x, cam.y - g.player.y) < 170) nearLens = true;
      }
      if (nearLens) {
        this.servoT -= dt;
        if (this.servoT <= 0) {
          this.servoT = 1.7;
          this.tone(240, 0.2, 'sawtooth', 0.025, 320);
        }
      }

      if (stage >= 2) {
        this.klaxonT -= dt;
        if (this.klaxonT <= 0) {
          this.klaxonT = 2;
          this.klaxon();
        }
      }
    } catch {
      /* silent */
    }
  }
}
