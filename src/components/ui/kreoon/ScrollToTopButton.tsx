import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScrollToTopButtonProps {
  /** Pixels de scroll antes de mostrar el botón (default: 400) */
  threshold?: number;
  className?: string;
}

/**
 * Botón flotante para volver al inicio de la página.
 * Aparece cuando el scroll supera el threshold; click hace smooth scroll to top.
 */
export function ScrollToTopButton({
  threshold = 400,
  className,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Volver arriba"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-6 right-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full",
            "bg-kreoon-gradient text-white shadow-kreoon-glow",
            "transition-transform hover:scale-110 hover:shadow-kreoon-glow-lg active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-kreoon-bg-primary",
            className
          )}
        >
          <ChevronUp className="h-6 w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

ScrollToTopButton.displayName = "ScrollToTopButton";
