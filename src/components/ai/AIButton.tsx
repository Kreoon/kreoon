import { forwardRef, ReactNode } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIButtonProps extends Omit<ButtonProps, 'children'> {
  moduleActive?: boolean;
  moduleKey?: string;
  children?: ReactNode;
  tooltipDisabled?: string;
  showIcon?: boolean;
  iconPosition?: 'left' | 'right';
}

/**
 * AIButton - A button for AI features with automatic disabled state and tooltip
 * when the AI module is inactive for the organization.
 * 
 * Usage:
 * <AIButton moduleActive={isModuleActive} moduleKey="board.cards.ai">
 *   Analyze Card
 * </AIButton>
 */
export const AIButton = forwardRef<HTMLButtonElement, AIButtonProps>(({
  moduleActive = true,
  moduleKey,
  children,
  tooltipDisabled = 'IA no habilitada para este módulo por tu organización',
  showIcon = true,
  iconPosition = 'left',
  disabled,
  className,
  variant = 'outline',
  ...props
}, ref) => {
  const isDisabled = disabled || !moduleActive;

  const buttonContent = (
    <Button
      ref={ref}
      variant={variant}
      disabled={isDisabled}
      className={cn(
        'gap-2 transition-all',
        !moduleActive && 'opacity-60 cursor-not-allowed',
        moduleActive && 'hover:border-primary/50 hover:bg-primary/5',
        className
      )}
      {...props}
    >
      {showIcon && iconPosition === 'left' && (
        moduleActive ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )
      )}
      {children}
      {showIcon && iconPosition === 'right' && (
        moduleActive ? (
          <Sparkles className="h-4 w-4 text-primary" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )
      )}
    </Button>
  );

  // If module is inactive, wrap with tooltip
  if (!moduleActive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              {buttonContent}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-center">
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              <span>{tooltipDisabled}</span>
            </div>
            {moduleKey && (
              <p className="text-xs text-muted-foreground mt-1">
                Ve a Configuración → IA & Modelos para habilitarlo
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
});

AIButton.displayName = 'AIButton';

/**
 * Hook to check if an AI module is active and get the button props
 */
export function useAIButtonState(
  moduleActive: boolean,
  moduleKey?: string
) {
  return {
    moduleActive,
    moduleKey,
    tooltipDisabled: moduleActive 
      ? undefined 
      : 'IA no habilitada para este módulo por tu organización'
  };
}
