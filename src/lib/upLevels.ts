/**
 * Unified UP Level System
 * 
 * This module provides a single source of truth for level thresholds,
 * labels, colors, and icons across the entire application.
 */

import { Shield, Medal, Trophy, Crown, Star, Award, Gem } from 'lucide-react';

// Level type
export type UPLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

// Level thresholds interface
export interface LevelThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

// Default thresholds - SINGLE SOURCE OF TRUTH
// These are used when up_settings doesn't have custom values
export const DEFAULT_LEVEL_THRESHOLDS: LevelThresholds = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  diamond: 5000
};

// Level labels with medieval theme
export const LEVEL_LABELS: Record<UPLevel, string> = {
  bronze: 'Escudero',
  silver: 'Caballero',
  gold: 'Comandante',
  diamond: 'Gran Maestre'
};

// Alternative generic labels
export const LEVEL_LABELS_GENERIC: Record<UPLevel, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante'
};

// Level colors for styling
export const LEVEL_COLORS: Record<UPLevel, {
  text: string;
  bg: string;
  border: string;
  gradient: string;
}> = {
  bronze: {
    text: 'text-amber-600',
    bg: 'bg-amber-600/20',
    border: 'border-amber-600',
    gradient: 'from-amber-600 to-amber-800'
  },
  silver: {
    text: 'text-slate-400',
    bg: 'bg-slate-400/20',
    border: 'border-slate-400',
    gradient: 'from-slate-300 to-slate-500'
  },
  gold: {
    text: 'text-yellow-500',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    gradient: 'from-yellow-400 to-amber-500'
  },
  diamond: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-400/20',
    border: 'border-cyan-400',
    gradient: 'from-cyan-300 to-blue-500'
  }
};

// Level icons
export const LEVEL_ICONS = {
  bronze: Shield,
  silver: Medal,
  gold: Crown,
  diamond: Gem
};

// Alternative icon set
export const LEVEL_ICONS_ALT = {
  bronze: Medal,
  silver: Award,
  gold: Crown,
  diamond: Star
};

// Emoji icons for compact displays
export const LEVEL_EMOJIS: Record<UPLevel, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

/**
 * Calculate the user's level based on their points
 * @param points - The user's total points
 * @param thresholds - Custom thresholds (optional, uses defaults if not provided)
 * @returns The calculated level
 */
export function calculateLevel(points: number, thresholds: LevelThresholds = DEFAULT_LEVEL_THRESHOLDS): UPLevel {
  if (points >= thresholds.diamond) return 'diamond';
  if (points >= thresholds.gold) return 'gold';
  if (points >= thresholds.silver) return 'silver';
  return 'bronze';
}

/**
 * Get the next level and points needed to reach it
 * @param currentPoints - Current points
 * @param thresholds - Custom thresholds
 * @returns Next level info or null if at max level
 */
export function getNextLevelInfo(
  currentPoints: number, 
  thresholds: LevelThresholds = DEFAULT_LEVEL_THRESHOLDS
): { nextLevel: UPLevel; pointsNeeded: number; progress: number } | null {
  const currentLevel = calculateLevel(currentPoints, thresholds);
  
  if (currentLevel === 'diamond') {
    return null; // Already at max level
  }
  
  const levelOrder: UPLevel[] = ['bronze', 'silver', 'gold', 'diamond'];
  const currentIndex = levelOrder.indexOf(currentLevel);
  const nextLevel = levelOrder[currentIndex + 1];
  const nextThreshold = thresholds[nextLevel];
  const currentThreshold = thresholds[currentLevel];
  
  const pointsNeeded = nextThreshold - currentPoints;
  const rangeTotal = nextThreshold - currentThreshold;
  const rangeProgress = currentPoints - currentThreshold;
  const progress = Math.min(100, Math.max(0, (rangeProgress / rangeTotal) * 100));
  
  return {
    nextLevel,
    pointsNeeded,
    progress
  };
}

/**
 * Get level display information
 * @param level - The level to get info for
 * @param useGenericLabels - Use generic labels (Bronce, Plata) instead of medieval (Escudero, Caballero)
 */
export function getLevelDisplay(level: UPLevel, useGenericLabels = false) {
  return {
    label: useGenericLabels ? LEVEL_LABELS_GENERIC[level] : LEVEL_LABELS[level],
    colors: LEVEL_COLORS[level],
    Icon: LEVEL_ICONS[level],
    emoji: LEVEL_EMOJIS[level]
  };
}

/**
 * Parse thresholds from database value
 * @param dbValue - Value from up_settings table
 * @returns Parsed thresholds with defaults
 */
export function parseThresholdsFromDB(dbValue: unknown): LevelThresholds {
  if (!dbValue || typeof dbValue !== 'object' || Array.isArray(dbValue)) {
    return DEFAULT_LEVEL_THRESHOLDS;
  }
  
  const val = dbValue as Record<string, unknown>;
  return {
    bronze: typeof val.bronze === 'number' ? val.bronze : DEFAULT_LEVEL_THRESHOLDS.bronze,
    silver: typeof val.silver === 'number' ? val.silver : DEFAULT_LEVEL_THRESHOLDS.silver,
    gold: typeof val.gold === 'number' ? val.gold : DEFAULT_LEVEL_THRESHOLDS.gold,
    diamond: typeof val.diamond === 'number' ? val.diamond : DEFAULT_LEVEL_THRESHOLDS.diamond
  };
}
