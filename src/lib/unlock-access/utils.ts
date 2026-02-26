import { CONFIG } from './constants';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

export function getTimeRemaining(): TimeRemaining {
  const now = Date.now();
  const target = CONFIG.deadline.getTime();
  const totalMs = Math.max(0, target - now);

  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const hours = Math.floor((totalMs / 1000 / 60 / 60) % 24);
  const days = Math.floor(totalMs / 1000 / 60 / 60 / 24);

  return { days, hours, minutes, seconds, totalMs, isExpired: false };
}

export function getDaysRemaining(): number {
  const { days, isExpired } = getTimeRemaining();
  return isExpired ? 0 : days;
}

export type UrgencyLevel = 'critical' | 'high' | 'normal';

export function getUrgencyLevel(): UrgencyLevel {
  const days = getDaysRemaining();
  if (days <= 7) return 'critical';
  if (days <= 14) return 'high';
  return 'normal';
}

export function formatTimeUnit(value: number): string {
  return value.toString().padStart(2, '0');
}

export function getKeyState(keyIndex: number, unlockedCount: number): 'locked' | 'current' | 'unlocked' {
  if (keyIndex < unlockedCount) return 'unlocked';
  if (keyIndex === unlockedCount) return 'current';
  return 'locked';
}

// Storage keys for persisting KIRO message index
const KIRO_MESSAGE_INDEX_KEY = 'kreoon_kiro_message_index';

export function getStoredKiroMessageIndex(): number {
  try {
    const stored = localStorage.getItem(KIRO_MESSAGE_INDEX_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function storeKiroMessageIndex(index: number): void {
  try {
    localStorage.setItem(KIRO_MESSAGE_INDEX_KEY, index.toString());
  } catch {
    // Ignore storage errors
  }
}
