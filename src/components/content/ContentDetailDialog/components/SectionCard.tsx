import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  iconEmoji?: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'compact' | 'highlight';
}

export function SectionCard({
  title,
  icon: Icon,
  iconEmoji,
  iconColor = 'text-primary',
  children,
  className,
  headerAction,
  variant = 'default',
}: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card',
        variant === 'compact' && 'p-3',
        variant === 'default' && 'p-4',
        variant === 'highlight' && 'p-4 bg-gradient-to-r from-primary/5 to-primary/10',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          {iconEmoji && <span>{iconEmoji}</span>}
          {Icon && <Icon className={cn('h-4 w-4', iconColor)} />}
          {title}
        </h4>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

interface FieldRowProps {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function FieldRow({ label, icon: Icon, children, className }: FieldRowProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-muted-foreground text-xs flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
    </div>
  );
}

interface ReadonlyFieldProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  emptyText?: string;
}

export function ReadonlyField({
  label,
  value,
  icon: Icon,
  className,
  emptyText = '—',
}: ReadonlyFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-muted-foreground text-xs flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <p className="font-medium">{value || emptyText}</p>
    </div>
  );
}

interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function ActionBar({ children, className, align = 'right' }: ActionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
        align === 'between' && 'justify-between',
        className
      )}
    >
      {children}
    </div>
  );
}
