import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Check, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: string; // Descripción de la acción a realizar
}

interface TourTooltipProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourTooltip({ steps, isOpen, onClose, onComplete }: TourTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const updatePosition = useCallback(() => {
    if (!step) return;

    const element = document.querySelector(step.target);
    if (!element) {
      // If element not found, try next step
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 340;
    const tooltipHeight = 220;
    const padding = 20;
    const arrowSize = 14;
    const spotlightPadding = 8;

    // Set spotlight rectangle
    setSpotlightRect({
      top: rect.top - spotlightPadding,
      left: rect.left - spotlightPadding,
      width: rect.width + spotlightPadding * 2,
      height: rect.height + spotlightPadding * 2,
    });

    let top = 0;
    let left = 0;
    let position: "top" | "bottom" | "left" | "right" = step.position || "bottom";

    // Scroll element into view smoothly
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate best position
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceTop = rect.top;
    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;

    // Determine best position based on available space
    if (spaceBottom >= tooltipHeight + padding) {
      top = rect.bottom + arrowSize + padding;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      position = "bottom";
    } else if (spaceTop >= tooltipHeight + padding) {
      top = rect.top - tooltipHeight - arrowSize - padding;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      position = "top";
    } else if (spaceRight >= tooltipWidth + padding) {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + arrowSize + padding;
      position = "right";
    } else if (spaceLeft >= tooltipWidth + padding) {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - arrowSize - padding;
      position = "left";
    } else {
      // Default to bottom with adjusted position
      top = rect.bottom + arrowSize + 10;
      left = viewportWidth / 2 - tooltipWidth / 2;
      position = "bottom";
    }

    // Keep tooltip within viewport
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));

    setTooltipPosition({ top, left });
    setArrowPosition(position);

    // Add highlight effect to target element
    document.querySelectorAll(".tour-highlight").forEach(el => {
      el.classList.remove("tour-highlight");
    });
    element.classList.add("tour-highlight");
  }, [step, currentStep, steps.length]);

  useEffect(() => {
    if (!isOpen || !step) return;

    setIsAnimating(true);
    const animationTimer = setTimeout(() => setIsAnimating(false), 300);

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(animationTimer);
      document.querySelectorAll(".tour-highlight").forEach(el => {
        el.classList.remove("tour-highlight");
      });
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, currentStep, step, updatePosition]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleGoToStep = (index: number) => {
    setCurrentStep(index);
  };

  if (!isOpen || !step) return null;

  const arrowClasses = cn(
    "absolute w-4 h-4 bg-card rotate-45 border-border",
    arrowPosition === "bottom" && "-top-2 left-1/2 -translate-x-1/2 border-t border-l",
    arrowPosition === "top" && "-bottom-2 left-1/2 -translate-x-1/2 border-b border-r",
    arrowPosition === "left" && "-right-2 top-1/2 -translate-y-1/2 border-t border-r",
    arrowPosition === "right" && "-left-2 top-1/2 -translate-y-1/2 border-b border-l"
  );

  return createPortal(
    <>
      {/* Dark overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-auto">
        {/* SVG mask for spotlight effect */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left}
                  y={spotlightRect.top}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="12"
                  ry="12"
                  fill="black"
                  className={cn(
                    "transition-all duration-300 ease-out",
                    isAnimating && "animate-pulse"
                  )}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight border glow */}
        {spotlightRect && (
          <div
            className="absolute rounded-xl pointer-events-none transition-all duration-300 ease-out"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              boxShadow: `
                0 0 0 3px hsl(var(--primary)),
                0 0 20px 4px hsl(var(--primary) / 0.5),
                inset 0 0 20px 4px hsl(var(--primary) / 0.1)
              `,
            }}
          />
        )}

        {/* Click anywhere to skip overlay */}
        <div className="absolute inset-0" onClick={handleSkip} />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-[9999] w-[340px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden",
          "transition-all duration-300 ease-out",
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Arrow */}
        <div className={arrowClasses} />

        {/* Header with step counter */}
        <div className="bg-primary/10 px-5 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {currentStep + 1}
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                de {steps.length} pasos
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Cerrar tour"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-lg text-foreground mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.content}</p>
          
          {/* Action indicator */}
          {step.action && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <MousePointer2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">{step.action}</span>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="px-5 pb-3">
          <div className="flex gap-1.5 justify-center">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleGoToStep(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-200 hover:opacity-80",
                  index === currentStep 
                    ? "w-8 bg-primary" 
                    : index < currentStep 
                      ? "w-2 bg-primary/50 cursor-pointer" 
                      : "w-2 bg-muted cursor-pointer"
                )}
                aria-label={`Ir al paso ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Omitir
          </Button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="min-w-[100px]">
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Finalizar
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
