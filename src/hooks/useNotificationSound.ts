import { useCallback, useRef } from 'react';

// Create audio context and sounds - enhanced for mobile
const createNotificationSound = (type: 'chat' | 'notification' | 'urgent') => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const frequencies: Record<string, number[]> = {
    chat: [523, 659, 784], // C5, E5, G5 - pleasant chord arpeggio
    notification: [440, 550, 660], // A4, C#5, E5 - attention-grabbing
    urgent: [880, 660, 880, 660, 880], // Urgent alternating high pitch
  };
  
  const durations: Record<string, number> = {
    chat: 120,
    notification: 180,
    urgent: 100,
  };

  const volumes: Record<string, number> = {
    chat: 0.4,
    notification: 0.5,
    urgent: 0.6,
  };

  const freq = frequencies[type];
  const duration = durations[type];
  const volume = volumes[type];
  
  let time = audioContext.currentTime;
  
  freq.forEach((f, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = type === 'urgent' ? 'square' : 'sine';
    oscillator.frequency.value = f;
    
    // Fade in and out with better envelope
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration / 1000);
    
    oscillator.start(time);
    oscillator.stop(time + duration / 1000 + 0.05);
    
    time += (duration / 1000) + 0.08; // Gap between tones
  });

  // Vibrate on mobile if available
  if ('vibrate' in navigator) {
    const vibrationPattern: Record<string, number[]> = {
      chat: [100, 50, 100],
      notification: [150, 50, 150],
      urgent: [200, 100, 200, 100, 200],
    };
    navigator.vibrate(vibrationPattern[type]);
  }
};

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);
  const minInterval = 800; // Minimum 0.8 second between sounds

  const playSound = useCallback((type: 'chat' | 'notification' | 'urgent' = 'notification') => {
    const now = Date.now();
    
    // Throttle sound playback
    if (now - lastPlayedRef.current < minInterval) {
      return;
    }
    
    lastPlayedRef.current = now;
    
    try {
      createNotificationSound(type);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
      // Fallback vibration only
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, []);

  const playChatSound = useCallback(() => playSound('chat'), [playSound]);
  const playNotificationSound = useCallback(() => playSound('notification'), [playSound]);
  const playUrgentSound = useCallback(() => playSound('urgent'), [playSound]);

  return {
    playSound,
    playChatSound,
    playNotificationSound,
    playUrgentSound,
  };
}