// =============================================================================
// KIRO Animation System - Barrel Exports
// =============================================================================

// Hooks
export {
  useKiroAnimationLoop,
  type KiroAnimationValues,
  type KiroState,
  type ReactionType,
} from './useKiroAnimationLoop';
export { useKiroTransitions, STATE_COLORS } from './useKiroTransitions';

// Components
export { KiroParticles } from './KiroParticles';
export { KiroConfetti, type KiroConfettiHandle, type ConfettiType } from './KiroConfetti';
