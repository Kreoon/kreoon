import * as React from "react";
import { motion } from "framer-motion";
import { KreoonPageWrapper } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export type StatusVariant = "info" | "success" | "warning" | "error" | "pending";

export interface UserInfo {
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

export interface StatusPageLayoutProps {
  children: React.ReactNode;
  variant: StatusVariant;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  showConfetti?: boolean;
  backgroundOrbs?: boolean;
  userInfo?: UserInfo;
  className?: string;
}

const VARIANT_STYLES: Record<
  StatusVariant,
  { circle: string; glow: string; pulse?: boolean }
> = {
  info: {
    circle: "border-kreoon-purple-500 bg-kreoon-purple-500/20 text-kreoon-purple-400",
    glow: "shadow-[0_0_40px_rgba(124,58,237,0.25)]",
  },
  success: {
    circle: "border-emerald-500 bg-emerald-500/20 text-emerald-400",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
  },
  warning: {
    circle: "border-amber-500 bg-amber-500/20 text-amber-400",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
  },
  error: {
    circle: "border-red-500 bg-red-500/20 text-red-400",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.25)]",
  },
  pending: {
    circle: "border-kreoon-purple-500 bg-kreoon-purple-500/20 text-kreoon-purple-400",
    glow: "shadow-[0_0_40px_rgba(124,58,237,0.2)]",
    pulse: true,
  },
};

const CONFETTI_COLORS = ["#7c3aed", "#8b5cf6", "#a855f7", "#c4b5fd", "#ffffff"];
const CONFETTI_COUNT = 60;
const CONFETTI_DURATION_MS = 3500;

function ConfettiEffect() {
  const [pieces] = React.useState(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1.5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })),
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-0 h-2 w-2 rounded-sm"
          style={{
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.6,
          }}
          initial={{
            x: p.x,
            y: -20,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            x: p.x + (Math.random() - 0.5) * 200,
            y: "100vh",
            opacity: 0,
            rotate: p.rotation + 720,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Wrapper para páginas de estado post-autenticación (pending, welcome, unauthorized, etc.)
 */
export function StatusPageLayout({
  children,
  variant,
  icon,
  title,
  subtitle,
  showConfetti = false,
  backgroundOrbs = true,
  userInfo,
  className,
}: StatusPageLayoutProps) {
  const styles = VARIANT_STYLES[variant];
  const [confettiVisible, setConfettiVisible] = React.useState(showConfetti);

  React.useEffect(() => {
    if (!showConfetti) return;
    setConfettiVisible(true);
    const t = setTimeout(() => setConfettiVisible(false), CONFETTI_DURATION_MS);
    return () => clearTimeout(t);
  }, [showConfetti]);

  return (
    <KreoonPageWrapper
      showGradientOrb={backgroundOrbs}
      className={cn("min-h-screen", className)}
    >
      {confettiVisible && <ConfettiEffect />}

      {/* Header sticky */}
      <header className="sticky top-0 z-10 border-b border-kreoon-border/50 bg-kreoon-bg-primary/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="KREOON"
              className="h-8 w-8 rounded-sm object-cover"
            />
            <span className="text-lg font-bold tracking-tight text-kreoon-text-primary">
              KREOON
            </span>
          </div>
          {userInfo && (userInfo.name || userInfo.email) && (
            <div className="flex items-center gap-2">
              {userInfo.avatar ? (
                <img
                  src={userInfo.avatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-kreoon-purple-500/20 text-sm font-medium text-kreoon-purple-400">
                  {(userInfo.name ?? userInfo.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <span className="max-w-[120px] truncate text-sm text-kreoon-text-secondary md:max-w-[180px]">
                {userInfo.name ?? userInfo.email}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal centrado */}
      <main className="relative z-0 flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 py-8 lg:px-6">
        <div className="w-full max-w-[600px] space-y-6 text-center">
          {/* Área del icono */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className={cn(
              "mx-auto flex h-[120px] w-[120px] items-center justify-center rounded-full border-2",
              styles.circle,
              styles.glow,
              variant === "pending" && "animate-pulse",
            )}
          >
            {icon ? (
              <span className="flex h-12 w-12 items-center justify-center [&>svg]:h-12 [&>svg]:w-12">
                {icon}
              </span>
            ) : null}
          </motion.div>

          {/* Título */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-3xl font-bold text-white"
          >
            {title}
          </motion.h1>

          {/* Subtítulo */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mx-auto max-w-md text-kreoon-text-secondary"
            >
              {subtitle}
            </motion.p>
          )}

          {/* Children */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-8"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </KreoonPageWrapper>
  );
}

StatusPageLayout.displayName = "StatusPageLayout";
