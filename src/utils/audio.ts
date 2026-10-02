/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynth {
  private ctx: AudioContext | null = null;

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (browser security blocks autoplay)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * PUNCHY ATHLETIC PUSH-UP REP CHIME
   * Distinct, energetic harmonic burst with rapid attack (E5 + C6)
   */
  playPushUpRep() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.22);

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Punchy athletic chord: E5 (659.25Hz) + C6 (1046.5Hz)
      osc1.frequency.setValueAtTime(659.25, now);
      osc2.frequency.setValueAtTime(1046.50, now);

      // Fast punchy attack (12ms), snappy decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn('Push-up audio synthesis error:', e);
    }
  }

  playCheck() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Node 1: Sound Generator (Oscillators)
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      
      // Node 2: Gain Node for Envelope
      const gainNode = this.ctx.createGain();
      
      // Lowpass Filter for softer tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(1000, now + 0.15);

      osc.type = 'sine';
      osc2.type = 'triangle';

      // Elegant harmonic chime notes (G5 & B5)
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.setValueAtTime(987.77, now); // B5

      // Volume envelope: rapid attack, smooth decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      // Connect nodes
      osc.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(this.ctx.destination);

      // Program start & stop times
      osc.start(now);
      osc2.start(now);
      
      osc.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio Synthesis is unsupported or blocked by autoplay restrictions.', e);
    }
  }

  playUncheck() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      // Descending pitch G5 -> D5
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.15); // D5

      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('Audio Synthesis is unsupported or blocked by autoplay restrictions.', e);
    }
  }

  playCompletion() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Arpeggio)
      const duration = 0.12;

      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * duration);

        gainNode.gain.setValueAtTime(0, now + i * duration);
        gainNode.gain.linearRampToValueAtTime(0.1, now + i * duration + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + i * duration + 0.3);

        osc.connect(gainNode);
        gainNode.connect(this.ctx!.destination);

        osc.start(now + i * duration);
        osc.stop(now + i * duration + 0.35);
      });
    } catch (e) {
      console.warn('Audio Synthesis is unsupported or blocked by autoplay restrictions.', e);
    }
  }

  playRankUp() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Majestic chord progression / fanfare: C4, E4, G4, C5, E5, G5
      const notes = [
        { freq: 261.63, delay: 0.00, dur: 0.3 }, // C4
        { freq: 329.63, delay: 0.10, dur: 0.3 }, // E4
        { freq: 392.00, delay: 0.20, dur: 0.3 }, // G4
        { freq: 523.25, delay: 0.32, dur: 0.35 }, // C5
        { freq: 659.25, delay: 0.44, dur: 0.4 }, // E5
        { freq: 783.99, delay: 0.56, dur: 0.75 }, // G5 (sustained)
        { freq: 1046.50, delay: 0.58, dur: 0.8 }, // C6 (triumphant octave)
      ];

      notes.forEach(({ freq, delay, dur }) => {
        const osc = this.ctx!.createOscillator();
        const osc2 = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();

        osc.type = 'triangle';
        osc2.type = 'sine';

        osc.frequency.setValueAtTime(freq, now + delay);
        osc2.frequency.setValueAtTime(freq * 1.002, now + delay); // subtle unison detune

        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.14, now + delay + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

        osc.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.ctx!.destination);

        osc.start(now + delay);
        osc2.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
        osc2.stop(now + delay + dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  }

  playRankDown() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Somber, descending cadence: G4 -> Eb4 -> C4
      const notes = [
        { freq: 392.00, delay: 0.00, dur: 0.25 }, // G4
        { freq: 311.13, delay: 0.16, dur: 0.28 }, // Eb4
        { freq: 261.63, delay: 0.34, dur: 0.45 }, // C4
      ];

      notes.forEach(({ freq, delay, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gainNode = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + delay);

        // Lowpass filter for deep resonant drop
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now + delay);
        filter.frequency.exponentialRampToValueAtTime(300, now + delay + dur);

        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx!.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  }

  playTick() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio autoplay policy
    }
  }
}

export const chime = new AudioSynth();
