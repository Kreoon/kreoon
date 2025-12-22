import { useCallback, useRef } from 'react';

// Create audio context and sounds
const createNotificationSound = (type: 'chat' | 'notification' | 'urgent') => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  const frequencies: Record<string, number[]> = {
    chat: [800, 1000, 800], // Friendly double beep
    notification: [600, 800], // Simple alert
    urgent: [400, 600, 800, 600, 400], // Urgent multi-tone
  };
  
  const durations: Record<string, number> = {
    chat: 100,
    notification: 150,
    urgent: 80,
  };

  const freq = frequencies[type];
  const duration = durations[type];
  
  let time = audioContext.currentTime;
  
  freq.forEach((f, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = f;
    
    // Fade in and out
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.3, time + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, time + duration / 1000);
    
    oscillator.start(time);
    oscillator.stop(time + duration / 1000);
    
    time += (duration / 1000) + 0.05; // Small gap between tones
  });
};

export function useNotificationSound() {
  const lastPlayedRef = useRef<number>(0);
  const minInterval = 1000; // Minimum 1 second between sounds

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