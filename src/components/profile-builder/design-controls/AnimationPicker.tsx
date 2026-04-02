/**
 * Animation Picker para Profile Builder Pro
 *
 * Selector de animaciones con preview en vivo.
 * Features:
 * - Grid de animaciones predefinidas
 * - Preview al hover
 * - Control de duracion
 * - Control de delay
 * - Easing selector
 * - Trigger (on scroll, on hover, on load)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface AnimationConfig {
  type: string;
  duration?: number;
  delay?: number;
  easing?: string;
  trigger?: 'load' | 'scroll' | 'hover';
}

interface AnimationPickerProps {
  value: AnimationConfig;
  onChange: (value: AnimationConfig) => void;
  className?: string;
}

// Animaciones disponibles con sus variantes de framer-motion
const ANIMATIONS = [
  {
    id: 'none',
    name: 'Sin animacion',
    initial: {},
    animate: {},
  },
  {
    id: 'fadeIn',
    name: 'Fade In',
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  {
    id: 'fadeInUp',
    name: 'Fade In Up',
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
  {
    id: 'fadeInDown',
    name: 'Fade In Down',
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
  },
  {
    id: 'fadeInLeft',
    name: 'Fade In Left',
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
  },
  {
    id: 'fadeInRight',
    name: 'Fade In Right',
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
  },
  {
    id: 'scaleIn',
    name: 'Scale In',
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
  },
  {
    id: 'scaleInBounce',
    name: 'Scale Bounce',
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 15 },
  },
  {
    id: 'slideInUp',
    name: 'Slide Up',
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
  },
  {
    id: 'slideInDown',
    name: 'Slide Down',
    initial: { opacity: 0, y: -40 },
    animate: { opacity: 1, y: 0 },
  },
  {
    id: 'rotateIn',
    name: 'Rotate In',
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
  },
  {
    id: 'flipIn',
    name: 'Flip In',
    initial: { opacity: 0, rotateX: 90 },
    animate: { opacity: 1, rotateX: 0 },
  },
  {
    id: 'blurIn',
    name: 'Blur In',
    initial: { opacity: 0, filter: 'blur(10px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
  },
  {
    id: 'bounceIn',
    name: 'Bounce In',
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', stiffness: 500, damping: 10 },
  },
  {
    id: 'pulse',
    name: 'Pulse',
    initial: { scale: 1 },
    animate: { scale: [1, 1.05, 1] },
    transition: { repeat: Infinity, duration: 2 },
  },
  {
    id: 'shake',
    name: 'Shake',
    initial: { x: 0 },
    animate: { x: [-5, 5, -5, 5, 0] },
    transition: { repeat: Infinity, duration: 0.5, repeatDelay: 2 },
  },
];

const EASINGS = [
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'spring', label: 'Spring' },
  { value: 'anticipate', label: 'Anticipate' },
];

const TRIGGERS = [
  { value: 'load', label: 'Al cargar' },
  { value: 'scroll', label: 'Al hacer scroll' },
  { value: 'hover', label: 'Al pasar el mouse' },
];

export function AnimationPicker({ value, onChange, className }: AnimationPickerProps) {
  const [previewKey, setPreviewKey] = useState(0);
  const [hoveredAnimation, setHoveredAnimation] = useState<string | null>(null);

  const handleUpdate = useCallback(
    (updates: Partial<AnimationConfig>) => {
      onChange({ ...value, ...updates });
    },
    [value, onChange]
  );

  const handleReplay = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  const selectedAnimation = ANIMATIONS.find((a) => a.id === value.type) || ANIMATIONS[0];
  const previewAnimation = hoveredAnimation
    ? ANIMATIONS.find((a) => a.id === hoveredAnimation)
    : selectedAnimation;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview grande */}
      <div className="relative h-28 rounded-lg bg-muted/30 border border-border flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${previewAnimation?.id}-${previewKey}`}
            initial={previewAnimation?.initial}
            animate={previewAnimation?.animate}
            transition={{
              duration: (value.duration || 500) / 1000,
              delay: (value.delay || 0) / 1000,
              ease: value.easing === 'spring' ? undefined : value.easing,
              ...previewAnimation?.transition,
            }}
            className="w-16 h-12 rounded-md bg-primary/80 flex items-center justify-center"
          >
            <span className="text-xs text-primary-foreground font-medium">
              {previewAnimation?.name.split(' ')[0]}
            </span>
          </motion.div>
        </AnimatePresence>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleReplay}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Grid de animaciones */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Animacion</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {ANIMATIONS.map((animation) => (
            <button
              key={animation.id}
              type="button"
              className={cn(
                'relative h-14 rounded-md border transition-all overflow-hidden',
                'flex items-center justify-center',
                value.type === animation.id
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border bg-muted/30 hover:border-primary/50'
              )}
              onClick={() => handleUpdate({ type: animation.id })}
              onMouseEnter={() => setHoveredAnimation(animation.id)}
              onMouseLeave={() => setHoveredAnimation(null)}
            >
              {hoveredAnimation === animation.id && animation.id !== 'none' ? (
                <motion.div
                  initial={animation.initial}
                  animate={animation.animate}
                  transition={{
                    duration: 0.4,
                    ...animation.transition,
                  }}
                  className="w-5 h-4 rounded-sm bg-primary/70"
                />
              ) : (
                <div className="w-5 h-4 rounded-sm bg-muted-foreground/30" />
              )}
              <span className="absolute bottom-0.5 left-0 right-0 text-[8px] text-muted-foreground text-center truncate px-0.5">
                {animation.name.length > 10 ? animation.id : animation.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Controles de timing */}
      {value.type !== 'none' && (
        <>
          {/* Duracion */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Duracion</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {value.duration || 500}ms
              </span>
            </div>
            <Slider
              value={[value.duration || 500]}
              onValueChange={([v]) => handleUpdate({ duration: v })}
              min={100}
              max={2000}
              step={50}
            />
          </div>

          {/* Delay */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Retraso</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {value.delay || 0}ms
              </span>
            </div>
            <Slider
              value={[value.delay || 0]}
              onValueChange={([v]) => handleUpdate({ delay: v })}
              min={0}
              max={1000}
              step={50}
            />
          </div>

          {/* Easing y Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Curva</Label>
              <Select
                value={value.easing || 'easeOut'}
                onValueChange={(v) => handleUpdate({ easing: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EASINGS.map((easing) => (
                    <SelectItem key={easing.value} value={easing.value}>
                      {easing.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Activar</Label>
              <Select
                value={value.trigger || 'load'}
                onValueChange={(v) => handleUpdate({ trigger: v as AnimationConfig['trigger'] })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Boton replay */}
      {value.type !== 'none' && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={handleReplay}
        >
          <Play className="h-3 w-3" />
          Reproducir animacion
        </Button>
      )}
    </div>
  );
}

export default AnimationPicker;
