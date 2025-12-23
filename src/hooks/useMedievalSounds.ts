import { useCallback, useRef } from 'react';

// Medieval sound effects - using Web Audio API to generate sounds
// These are synthesized sounds to avoid external dependencies

type SoundType = 
  | 'achievement' 
  | 'points' 
  | 'levelUp' 
  | 'fanfare' 
  | 'sword' 
  | 'shield'
  | 'coin'
  | 'scroll';

export function useMedievalSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine',
    gain: number = 0.3
  ) => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getAudioContext]);

  const playSequence = useCallback((notes: Array<{ freq: number; dur: number; delay: number; type?: OscillatorType }>) => {
    if (!enabledRef.current) return;
    
    notes.forEach(({ freq, dur, delay, type }) => {
      setTimeout(() => playTone(freq, dur, type), delay);
    });
  }, [playTone]);

  const playSound = useCallback((soundType: SoundType) => {
    if (!enabledRef.current) return;

    switch (soundType) {
      case 'achievement':
        // Triumphant fanfare - major chord progression
        playSequence([
          { freq: 392, dur: 0.15, delay: 0, type: 'triangle' },    // G4
          { freq: 494, dur: 0.15, delay: 100, type: 'triangle' },  // B4
          { freq: 587, dur: 0.15, delay: 200, type: 'triangle' },  // D5
          { freq: 784, dur: 0.4, delay: 300, type: 'triangle' },   // G5 (hold)
        ]);
        break;

      case 'levelUp':
        // Epic ascending fanfare
        playSequence([
          { freq: 262, dur: 0.1, delay: 0, type: 'square' },       // C4
          { freq: 330, dur: 0.1, delay: 80, type: 'square' },      // E4
          { freq: 392, dur: 0.1, delay: 160, type: 'square' },     // G4
          { freq: 523, dur: 0.2, delay: 240, type: 'square' },     // C5
          { freq: 659, dur: 0.3, delay: 360, type: 'triangle' },   // E5
          { freq: 784, dur: 0.5, delay: 480, type: 'triangle' },   // G5
        ]);
        break;

      case 'fanfare':
        // Royal trumpet fanfare
        playSequence([
          { freq: 523, dur: 0.2, delay: 0, type: 'sawtooth' },
          { freq: 523, dur: 0.1, delay: 250, type: 'sawtooth' },
          { freq: 523, dur: 0.1, delay: 380, type: 'sawtooth' },
          { freq: 659, dur: 0.4, delay: 500, type: 'sawtooth' },
          { freq: 587, dur: 0.15, delay: 700, type: 'sawtooth' },
          { freq: 523, dur: 0.5, delay: 900, type: 'sawtooth' },
        ]);
        break;

      case 'points':
        // Coin/points gain sound
        playSequence([
          { freq: 880, dur: 0.08, delay: 0, type: 'square' },
          { freq: 1175, dur: 0.12, delay: 60, type: 'square' },
        ]);
        break;

      case 'coin':
        // Metallic coin clink
        playSequence([
          { freq: 2500, dur: 0.05, delay: 0, type: 'sine' },
          { freq: 3000, dur: 0.08, delay: 30, type: 'sine' },
          { freq: 2200, dur: 0.1, delay: 80, type: 'sine' },
        ]);
        break;

      case 'sword':
        // Sword unsheathe/clash
        playSequence([
          { freq: 200, dur: 0.05, delay: 0, type: 'sawtooth' },
          { freq: 800, dur: 0.1, delay: 30, type: 'sawtooth' },
          { freq: 400, dur: 0.15, delay: 100, type: 'triangle' },
        ]);
        break;

      case 'shield':
        // Shield impact
        playSequence([
          { freq: 150, dur: 0.15, delay: 0, type: 'triangle' },
          { freq: 100, dur: 0.2, delay: 50, type: 'sine' },
        ]);
        break;

      case 'scroll':
        // Parchment unfurl
        playSequence([
          { freq: 600, dur: 0.03, delay: 0, type: 'sine' },
          { freq: 800, dur: 0.03, delay: 40, type: 'sine' },
          { freq: 700, dur: 0.03, delay: 80, type: 'sine' },
          { freq: 900, dur: 0.03, delay: 120, type: 'sine' },
        ]);
        break;
    }
  }, [playSequence]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return {
    playSound,
    setEnabled,
    isEnabled: () => enabledRef.current
  };
}

// Create a singleton instance for global access
let globalSoundsInstance: ReturnType<typeof useMedievalSounds> | null = null;

export function getMedievalSounds() {
  if (!globalSoundsInstance) {
    // Create a simple instance without hooks for global use
    let enabled = true;
    let audioContext: AudioContext | null = null;

    const getContext = () => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return audioContext;
    };

    const playTone = (freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3) => {
      if (!enabled) return;
      try {
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      } catch (e) {}
    };

    globalSoundsInstance = {
      playSound: (type: SoundType) => {
        if (!enabled) return;
        // Simplified version for global use
        switch (type) {
          case 'achievement':
            playTone(392, 0.15, 'triangle');
            setTimeout(() => playTone(494, 0.15, 'triangle'), 100);
            setTimeout(() => playTone(587, 0.15, 'triangle'), 200);
            setTimeout(() => playTone(784, 0.4, 'triangle'), 300);
            break;
          case 'points':
            playTone(880, 0.08, 'square');
            setTimeout(() => playTone(1175, 0.12, 'square'), 60);
            break;
          case 'levelUp':
            playTone(262, 0.1, 'square');
            setTimeout(() => playTone(330, 0.1, 'square'), 80);
            setTimeout(() => playTone(392, 0.1, 'square'), 160);
            setTimeout(() => playTone(523, 0.2, 'square'), 240);
            setTimeout(() => playTone(659, 0.3, 'triangle'), 360);
            setTimeout(() => playTone(784, 0.5, 'triangle'), 480);
            break;
        }
      },
      setEnabled: (e: boolean) => { enabled = e; },
      isEnabled: () => enabled
    };
  }
  return globalSoundsInstance;
}
