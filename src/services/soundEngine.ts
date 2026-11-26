class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMusicPlaying = false;
  private loopTimer: number | null = null;
  private stepIndex = 0;
  private isMuted = true;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.06, delay = 0) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleSound(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.ensureContext();
      this.playSelectPop();
      this.startMusic();
    }
    return this.isMuted;
  }

  public startMusic() {
    if (this.isMuted || this.isMusicPlaying) return;
    this.ensureContext();
    this.isMusicPlaying = true;
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 783.99];
    this.loopTimer = window.setInterval(() => {
      if (this.isMuted) return;
      const note = melody[this.stepIndex % melody.length];
      this.playTone(note, 0.38, 'triangle', 0.022);
      this.stepIndex += 1;
    }, 560);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  public playSelectPop() {
    this.playTone(620, 0.09, 'sine', 0.05);
    this.playTone(790, 0.1, 'sine', 0.04, 0.04);
  }

  public playStartChime() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.playTone(freq, 0.22, 'triangle', 0.05, idx * 0.08);
    });
  }

  public playStepComplete() {
    [587.33, 739.99, 880.0, 1174.66].forEach((freq, idx) => {
      this.playTone(freq, 0.25, 'triangle', 0.055, idx * 0.07);
    });
  }

  public playVictoryFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 0.3, 'triangle', 0.06, idx * 0.09);
    });
  }
}

export const soundEngine = new SoundEngine();
