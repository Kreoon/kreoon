// ═══════════════════════════════════════════════════════════════════════════
// KIRO SOUND ENGINE
// Sistema de sonidos para KIRO usando Web Audio API (sin archivos externos)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export type KiroSoundName =
  | 'message_sent'
  | 'message_received'
  | 'notification'
  | 'notification_urgent'
  | 'action_click'
  | 'game_token_catch'
  | 'game_token_gold'
  | 'game_end'
  | 'level_up'
  | 'celebration'
  | 'panel_open'
  | 'panel_close';

// ═══════════════════════════════════════════════════════════════════════════
// NOTAS MUSICALES (frecuencias en Hz)
// ═══════════════════════════════════════════════════════════════════════════

const NOTES = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

class KiroSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.7; // master volume multiplier (0 a 1)

  constructor() {
    // NO crear AudioContext aquí — crearlo lazy en la primera interacción
    // (browsers requieren user gesture para AudioContext)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Métodos públicos
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reproduce un sonido por nombre
   */
  play(sound: KiroSoundName): void {
    if (!this.enabled) return;

    try {
      const ctx = this.ensureContext();

      switch (sound) {
        case 'message_sent':
          this.playMessageSent(ctx);
          break;
        case 'message_received':
          this.playMessageReceived(ctx);
          break;
        case 'notification':
          this.playNotification(ctx);
          break;
        case 'notification_urgent':
          this.playNotificationUrgent(ctx);
          break;
        case 'action_click':
          this.playActionClick(ctx);
          break;
        case 'game_token_catch':
          this.playGameTokenCatch(ctx);
          break;
        case 'game_token_gold':
          this.playGameTokenGold(ctx);
          break;
        case 'game_end':
          this.playGameEnd(ctx);
          break;
        case 'level_up':
          this.playLevelUp(ctx);
          break;
        case 'celebration':
          this.playCelebration(ctx);
          break;
        case 'panel_open':
          this.playPanelOpen(ctx);
          break;
        case 'panel_close':
          this.playPanelClose(ctx);
          break;
      }
    } catch (e) {
      console.warn('[KIRO Sound] Error:', e);
    }
  }

  /**
   * Habilita o deshabilita los sonidos
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Establece el volumen maestro (0 a 1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Retorna si los sonidos están habilitados
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Retorna el volumen actual
   */
  getVolume(): number {
    return this.volume;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Métodos privados - AudioContext
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Asegura que el AudioContext existe y está activo
   */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  /**
   * Crea un oscilador básico
   */
  private createOscillator(
    ctx: AudioContext,
    type: OscillatorType,
    frequency: number
  ): OscillatorNode {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }

  /**
   * Crea un nodo de ganancia con volumen ajustado
   */
  private createGain(ctx: AudioContext, volume: number): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = volume * this.volume;
    return gain;
  }

  /**
   * Programa un sweep de frecuencia
   */
  private scheduleSweep(
    osc: OscillatorNode,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number
  ): void {
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
  }

  /**
   * Programa un envelope de volumen (attack-decay)
   */
  private scheduleEnvelope(
    gain: GainNode,
    startTime: number,
    attackTime: number,
    decayTime: number,
    peakVolume: number
  ): void {
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakVolume * this.volume, startTime + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + attackTime + decayTime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Implementación de cada sonido
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * message_sent: tono ascendente suave (440Hz → 660Hz en 100ms)
   */
  private playMessageSent(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = this.createOscillator(ctx, 'sine', 440);
    const gain = this.createGain(ctx, 0.15);

    this.scheduleSweep(osc, 440, 660, now, 0.1);
    this.scheduleEnvelope(gain, now, 0.01, 0.09, 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * message_received: dos tonos rápidos descendentes
   */
  private playMessageReceived(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Primer tono: 880Hz → 660Hz
    const osc1 = this.createOscillator(ctx, 'sine', 880);
    const gain1 = this.createGain(ctx, 0.12);

    this.scheduleSweep(osc1, 880, 660, now, 0.075);
    this.scheduleEnvelope(gain1, now, 0.005, 0.07, 0.12);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Segundo tono después de 50ms: 660Hz → 440Hz
    const osc2 = this.createOscillator(ctx, 'sine', 660);
    const gain2 = this.createGain(ctx, 0.12);

    this.scheduleSweep(osc2, 660, 440, now + 0.1, 0.075);
    this.scheduleEnvelope(gain2, now + 0.1, 0.005, 0.07, 0.12);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.2);
  }

  /**
   * notification: campana suave (1047Hz, triangle, 300ms con decay)
   */
  private playNotification(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = this.createOscillator(ctx, 'triangle', NOTES.C6);
    const gain = this.createGain(ctx, 0.2);

    this.scheduleEnvelope(gain, now, 0.01, 0.29, 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * notification_urgent: doble campana más fuerte
   */
  private playNotificationUrgent(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Primera campana
    const osc1 = this.createOscillator(ctx, 'triangle', NOTES.C6);
    const gain1 = this.createGain(ctx, 0.3);

    this.scheduleEnvelope(gain1, now, 0.01, 0.14, 0.3);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Segunda campana después de 150ms
    const osc2 = this.createOscillator(ctx, 'triangle', NOTES.C6);
    const gain2 = this.createGain(ctx, 0.3);

    this.scheduleEnvelope(gain2, now + 0.2, 0.01, 0.14, 0.3);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.35);
  }

  /**
   * action_click: clic táctil (1200Hz, square, 30ms)
   */
  private playActionClick(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = this.createOscillator(ctx, 'square', 1200);
    const gain = this.createGain(ctx, 0.08);

    this.scheduleEnvelope(gain, now, 0.005, 0.025, 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * game_token_catch: pop satisfactorio (600Hz → 900Hz en 50ms)
   */
  private playGameTokenCatch(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = this.createOscillator(ctx, 'sine', 600);
    const gain = this.createGain(ctx, 0.15);

    this.scheduleSweep(osc, 600, 900, now, 0.05);
    this.scheduleEnvelope(gain, now, 0.01, 0.07, 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * game_token_gold: pop + shimmer (600Hz → 900Hz + sweep 900Hz → 1800Hz)
   */
  private playGameTokenGold(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Pop inicial
    const osc1 = this.createOscillator(ctx, 'sine', 600);
    const gain1 = this.createGain(ctx, 0.18);

    this.scheduleSweep(osc1, 600, 900, now, 0.05);
    this.scheduleEnvelope(gain1, now, 0.01, 0.05, 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.06);

    // Shimmer sweep
    const osc2 = this.createOscillator(ctx, 'sine', 900);
    const gain2 = this.createGain(ctx, 0.12);

    this.scheduleSweep(osc2, 900, 1800, now + 0.05, 0.15);
    this.scheduleEnvelope(gain2, now + 0.05, 0.01, 0.14, 0.12);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.2);
  }

  /**
   * game_end: fanfarria corta (C5 → E5 → G5)
   */
  private playGameEnd(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: NOTES.C5, start: 0, dur: 0.1 },
      { freq: NOTES.E5, start: 0.1, dur: 0.1 },
      { freq: NOTES.G5, start: 0.2, dur: 0.2 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = this.createOscillator(ctx, 'triangle', freq);
      const gain = this.createGain(ctx, 0.2);

      this.scheduleEnvelope(gain, now + start, 0.01, dur - 0.01, 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  }

  /**
   * level_up: fanfarria ascendente triunfal (C4 → E4 → G4 → C5)
   */
  private playLevelUp(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: NOTES.C4, start: 0, dur: 0.15 },
      { freq: NOTES.E4, start: 0.15, dur: 0.15 },
      { freq: NOTES.G4, start: 0.3, dur: 0.15 },
      { freq: NOTES.C5, start: 0.45, dur: 0.3 },
    ];

    notes.forEach(({ freq, start, dur }) => {
      // Oscilador triangle
      const osc1 = this.createOscillator(ctx, 'triangle', freq);
      const gain1 = this.createGain(ctx, 0.2);

      this.scheduleEnvelope(gain1, now + start, 0.01, dur - 0.01, 0.2);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now + start);
      osc1.stop(now + start + dur);

      // Oscilador sine para más riqueza
      const osc2 = this.createOscillator(ctx, 'sine', freq * 2); // Octava arriba
      const gain2 = this.createGain(ctx, 0.08);

      this.scheduleEnvelope(gain2, now + start, 0.01, dur - 0.01, 0.08);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + start);
      osc2.stop(now + start + dur);
    });
  }

  /**
   * celebration: efecto sparkle (5 tonos aleatorios rápidos)
   */
  private playCelebration(ctx: AudioContext): void {
    const now = ctx.currentTime;

    for (let i = 0; i < 5; i++) {
      const freq = 1000 + Math.random() * 2000; // 1000-3000 Hz
      const osc = this.createOscillator(ctx, 'sine', freq);
      const gain = this.createGain(ctx, 0.1);

      const start = now + i * 0.03;
      this.scheduleEnvelope(gain, start, 0.005, 0.025, 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.03);
    }
  }

  /**
   * panel_open: whoosh suave (noise con lowpass sweep 200Hz → 2000Hz)
   */
  private playPanelOpen(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.15;

    // Crear buffer de ruido
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filtro lowpass con sweep
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.linearRampToValueAtTime(2000, now + duration);
    filter.Q.value = 1;

    const gain = this.createGain(ctx, 0.08);
    this.scheduleEnvelope(gain, now, 0.01, duration - 0.01, 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * panel_close: whoosh inverso (noise con lowpass sweep 2000Hz → 200Hz)
   */
  private playPanelClose(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 0.1;

    // Crear buffer de ruido
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Filtro lowpass con sweep inverso
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.linearRampToValueAtTime(200, now + duration);
    filter.Q.value = 1;

    const gain = this.createGain(ctx, 0.06);
    this.scheduleEnvelope(gain, now, 0.005, duration - 0.005, 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const kiroSounds = new KiroSoundEngine();
