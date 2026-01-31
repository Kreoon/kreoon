import { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HLSVideoPlayer } from "@/components/video/HLSVideoPlayer";

interface KanbanVideoModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl: string | null;
  posterUrl?: string | null;
  title?: string;
}

export function KanbanVideoModal({
  open,
  onClose,
  videoUrl,
  posterUrl,
  title,
}: KanbanVideoModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#0a0118]/90 backdrop-blur-xl"
            style={{ background: "rgba(10, 1, 24, 0.92)" }}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(16px) saturate(180%)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              boxShadow:
                "0 0 40px rgba(168, 85, 247, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="text-sm font-medium text-[#f8fafc] truncate pr-4">
                {title || "Video"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Video Player with glow border */}
            <div
              className="relative p-3"
              style={{
                boxShadow: "0 0 30px rgba(168, 85, 247, 0.15)",
                borderRadius: "0.5rem",
              }}
            >
              {videoUrl ? (
                <HLSVideoPlayer
                  src={videoUrl}
                  poster={posterUrl || undefined}
                  showControls={true}
                  aspectRatio="16:9"
                  className="w-full rounded-lg overflow-hidden bg-black"
                />
              ) : (
                <div className="aspect-video rounded-lg bg-black/50 flex items-center justify-center text-[#cbd5e1] text-sm">
                  No hay video disponible
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
