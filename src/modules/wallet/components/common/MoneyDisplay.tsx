import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, type Currency } from '../../types';

interface MoneyDisplayProps {
  amount: number;
  currency?: Currency;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl font-semibold',
  xl: 'text-4xl font-bold',
};

export function MoneyDisplay({
  amount,
  currency = 'USD',
  size = 'md',
  showSign = false,
  animated = false,
  className,
}: MoneyDisplayProps) {
  const [displayAmount, setDisplayAmount] = useState(amount);
  const prevAmount = useRef(amount);

  // Determine color based on amount
  const colorClass = amount > 0 ? 'text-emerald-400' : amount < 0 ? 'text-red-400' : 'text-white';

  // Animated version using spring
  const springValue = useSpring(amount, {
    stiffness: 100,
    damping: 20,
    mass: 1,
  });

  useEffect(() => {
    if (animated && amount !== prevAmount.current) {
      springValue.set(amount);
      prevAmount.current = amount;
    }
  }, [amount, animated, springValue]);

  useEffect(() => {
    if (!animated) {
      setDisplayAmount(amount);
      return;
    }

    const unsubscribe = springValue.on('change', (v) => {
      setDisplayAmount(Math.round(v * 100) / 100);
    });

    return () => unsubscribe();
  }, [animated, springValue]);

  const formattedAmount = formatCurrency(Math.abs(displayAmount), currency);
  const sign = showSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : '';

  if (animated) {
    return (
      <motion.span
        className={cn(sizeClasses[size], showSign && colorClass, className)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {sign}
        {formattedAmount}
      </motion.span>
    );
  }

  return (
    <span className={cn(sizeClasses[size], showSign && colorClass, className)}>
      {sign}
      {formatCurrency(Math.abs(amount), currency)}
    </span>
  );
}

// Simple version without animation for lists
export function MoneyText({
  amount,
  currency = 'USD',
  showSign = false,
  className,
}: Omit<MoneyDisplayProps, 'size' | 'animated'>) {
  const colorClass = amount > 0 ? 'text-emerald-400' : amount < 0 ? 'text-red-400' : '';
  const sign = showSign ? (amount > 0 ? '+' : amount < 0 ? '' : '') : '';

  return (
    <span className={cn(showSign && colorClass, className)}>
      {sign}
      {formatCurrency(amount, currency)}
    </span>
  );
}
