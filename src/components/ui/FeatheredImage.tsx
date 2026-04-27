import { cn } from "@/lib/utils";

interface FeatheredImageProps {
  src: string;
  alt: string;
  variant?: "radial" | "edges" | "bottom" | "top" | "sides" | "vignette" | "orb" | "floating";
  glow?: "purple" | "cyan" | "aurora" | "none";
  className?: string;
  imageClassName?: string;
}

export function FeatheredImage({
  src,
  alt,
  variant = "radial",
  glow = "purple",
  className,
  imageClassName,
}: FeatheredImageProps) {
  return (
    <div className={cn("relative group overflow-hidden", className)}>
      {glow !== "none" && (
        <div
          className={cn(
            "absolute inset-0 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-500",
            glow === "purple" && "bg-kreoon-purple-500",
            glow === "cyan" && "bg-cyan-500",
            glow === "aurora" && "bg-gradient-to-br from-violet-500 via-pink-500 to-cyan-500"
          )}
          aria-hidden
        />
      )}

      <img
        src={src}
        alt={alt}
        className={cn(
          "relative z-10 w-full h-full object-cover",
          variant === "radial" && "feathered-radial",
          variant === "edges" && "feathered-edges",
          variant === "bottom" && "feathered-bottom",
          variant === "top" && "feathered-top",
          variant === "sides" && "feathered-sides",
          variant === "vignette" && "feathered-vignette",
          variant === "orb" && "feathered-orb",
          variant === "floating" && "feathered-floating",
          imageClassName
        )}
      />
    </div>
  );
}
