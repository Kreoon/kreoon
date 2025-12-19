import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface TourTooltipProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function TourTooltip({ steps, isOpen, onClose, onComplete }: TourTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (!element) {
        // If element not found, try next step or close
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        }
        return;
      }

      const rect = element.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const padding = 16;
      const arrowSize = 12;

      let top = 0;
      let left = 0;
      let position: "top" | "bottom" | "left" | "right" = step.position || "bottom";

      // Highlight the element
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // Calculate position based on preference and available space
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Prefer bottom, then top, then right, then left
      if (position === "bottom" && rect.bottom + tooltipHeight + padding < viewportHeight) {
        top = rect.bottom + arrowSize + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        position = "bottom";
      } else if (position === "top" || rect.top - tooltipHeight - padding > 0) {
        top = rect.top - tooltipHeight - arrowSize - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        position = "top";
      } else if (rect.right + tooltipWidth + padding < viewportWidth) {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + arrowSize + padding;
        position = "right";
      } else {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - arrowSize - padding;
        position = "left";
      }

      // Keep tooltip within viewport
      left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));
      top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));

      setTooltipPosition({ top, left });
      setArrowPosition(position);

      // Add highlight effect to target element
      element.classList.add("tour-highlight");
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      // Remove highlight from all elements
      document.querySelectorAll(".tour-highlight").forEach(el => {
        el.classList.remove("tour-highlight");
      });
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, currentStep, step, steps.length]);

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

  if (!isOpen || !step) return null;

  const arrowClasses = cn(
    "absolute w-3 h-3 bg-card rotate-45 border",
    arrowPosition === "bottom" && "-top-1.5 left-1/2 -translate-x-1/2 border-t border-l border-r-0 border-b-0",
    arrowPosition === "top" && "-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r border-t-0 border-l-0",
    arrowPosition === "left" && "-right-1.5 top-1/2 -translate-y-1/2 border-t border-r border-b-0 border-l-0",
    arrowPosition === "right" && "-left-1.5 top-1/2 -translate-y-1/2 border-b border-l border-t-0 border-r-0"
  );

  return createPortal(
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9998]" onClick={handleSkip} />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] w-80 bg-card border rounded-xl shadow-2xl p-4 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Arrow */}
        <div className={arrowClasses} />

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-3">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentStep 
                  ? "w-6 bg-primary" 
                  : index < currentStep 
                    ? "w-1.5 bg-primary/50" 
                    : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="pr-6">
          <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Omitir tour
          </Button>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
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
