import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Play,
  Clock,
  X,
  CheckCircle,
  Loader2,
  Users,
  ShoppingCart,
  BarChart3,
  Link2,
  Video,
  Sparkles,
} from "lucide-react";
import { KreoonCard, KreoonButton, KreoonInput } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { kreoonToast } from "@/lib/toast";
import { isValidEmail } from "@/lib/utils/formatters";

export interface LiveShoppingComingSoonProps {
  variant: "card" | "banner" | "modal";
  onJoinWaitlist?: (email: string) => void;
  onClose?: () => void;
  source?: "landing" | "features" | "pricing";
  className?: string;
}

type FormState = "default" | "loading" | "success" | "error";

const LIVE_SHOPPING_FEATURES = [
  { icon: Video, text: "Vende productos en tiempo real" },
  { icon: Users, text: "Creadores como presentadores" },
  { icon: ShoppingCart, text: "Carrito integrado en el stream" },
  { icon: BarChart3, text: "Métricas de conversión en vivo" },
  { icon: Link2, text: "Integración con tu ecommerce" },
];

// Simulated waitlist count (could be real from Supabase)
const WAITLIST_COUNT = 347;

export function LiveShoppingComingSoon({
  variant,
  onJoinWaitlist,
  onClose,
  source = "landing",
  className,
}: LiveShoppingComingSoonProps) {
  const [email, setEmail] = React.useState("");
  const [formState, setFormState] = React.useState<FormState>("default");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Ingresa tu email");
      setFormState("error");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage("Email inválido");
      setFormState("error");
      return;
    }

    setFormState("loading");
    setErrorMessage("");

    try {
      const { error } = await supabase.from("waitlist").insert({
        email: email.trim().toLowerCase(),
        feature: "live_shopping",
        source,
      });

      if (error) {
        // Check if it's a duplicate
        if (error.code === "23505") {
          setFormState("success");
          kreoonToast.info("Ya estás en la lista", "Te avisaremos cuando Live Shopping esté disponible.");
        } else {
          throw error;
        }
      } else {
        setFormState("success");
        kreoonToast.success("¡Estás en la lista!", "Te avisaremos cuando Live Shopping esté disponible.");
        onJoinWaitlist?.(email);
      }
    } catch (err) {
      console.error("Error joining waitlist:", err);
      setFormState("error");
      setErrorMessage("Error al registrarte. Intenta de nuevo.");
      kreoonToast.error("Error", "No pudimos registrarte. Intenta de nuevo.");
    }
  };

  // Card variant
  if (variant === "card") {
    return (
      <KreoonCard
        className={cn(
          "relative overflow-hidden border-dashed border-amber-500/30 bg-gradient-to-br from-kreoon-bg-card via-kreoon-bg-card to-amber-900/10",
          className,
        )}
      >
        {/* Background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(245,158,11,0.5) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative p-6">
          {/* Badge */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.9, 1.02, 0.95, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="absolute -top-2 right-4"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">
              <Clock className="h-3 w-3" />
              Próximamente
            </span>
          </motion.div>

          {/* Icon */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-kreoon-purple-500 to-kreoon-purple-700 opacity-70">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div className="flex h-8 w-8 -ml-4 items-center justify-center rounded-full bg-amber-500/80">
              <Play className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Content */}
          <h4 className="mb-2 text-lg font-bold text-white">Live Shopping</h4>
          <p className="mb-4 text-sm text-kreoon-text-secondary">
            Vende en tiempo real con creadores. Convierte audiencia en clientes al instante.
          </p>

          {/* Form or Success */}
          <AnimatePresence mode="wait">
            {formState === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
              >
                <CheckCircle className="h-4 w-4" />
                ¡Estás en la lista!
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <KreoonInput
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formState === "error") setFormState("default");
                    }}
                    className="flex-1 text-sm"
                    disabled={formState === "loading"}
                  />
                  <KreoonButton
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={formState === "loading"}
                    className="shrink-0"
                  >
                    {formState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Avisarme"
                    )}
                  </KreoonButton>
                </div>
                {formState === "error" && errorMessage && (
                  <p className="text-xs text-red-400">{errorMessage}</p>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-3 text-xs text-kreoon-text-muted">
            Sé el primero en vender en vivo
          </p>
        </div>
      </KreoonCard>
    );
  }

  // Banner variant
  if (variant === "banner") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            "relative overflow-hidden rounded-xl border border-kreoon-purple-500/30 bg-gradient-to-r from-kreoon-purple-900/30 via-kreoon-bg-card to-kreoon-purple-900/30 px-4 py-3 backdrop-blur-sm",
            className,
          )}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {/* Icon + Text */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kreoon-purple-500/20">
                <ShoppingBag className="h-5 w-5 text-kreoon-purple-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  <Clock className="h-3 w-3" />
                  Próximamente
                </span>
                <span className="text-sm font-medium text-white">
                  Live Shopping llegará pronto
                </span>
              </div>
            </div>

            {/* Form or Success */}
            <div className="flex flex-1 justify-end">
              <AnimatePresence mode="wait">
                {formState === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-sm text-emerald-400"
                  >
                    <CheckCircle className="h-4 w-4" />
                    ¡Te avisaremos!
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2"
                  >
                    <KreoonInput
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-48 text-sm"
                      disabled={formState === "loading"}
                    />
                    <KreoonButton
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={formState === "loading"}
                    >
                      {formState === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Unirme"
                      )}
                    </KreoonButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute right-2 top-2 rounded-full p-1 text-kreoon-text-muted transition-colors hover:bg-kreoon-bg-secondary hover:text-white sm:relative sm:right-auto sm:top-auto"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {formState === "error" && errorMessage && (
            <p className="mt-2 text-center text-xs text-red-400 sm:text-right">
              {errorMessage}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Modal variant
  if (variant === "modal") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
          className,
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-kreoon-border bg-kreoon-bg-card shadow-2xl"
        >
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-kreoon-text-muted transition-colors hover:bg-kreoon-bg-secondary hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Header with illustration */}
          <div className="relative overflow-hidden bg-gradient-to-br from-kreoon-purple-900/50 via-kreoon-bg-secondary to-amber-900/30 px-6 pb-8 pt-10">
            {/* Background pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative text-center">
              {/* Icon */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-kreoon-purple-500 to-kreoon-purple-700 shadow-kreoon-glow-lg"
              >
                <ShoppingBag className="h-10 w-10 text-white" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 shadow-lg"
                >
                  <Play className="h-4 w-4 text-white" />
                </motion.div>
              </motion.div>

              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                <Clock className="h-3 w-3" />
                Próximamente
              </span>

              <h2 className="mt-3 text-2xl font-bold text-white">
                Live Shopping está en camino
              </h2>
              <p className="mt-2 text-sm text-kreoon-text-secondary">
                Vende en vivo con creadores y convierte tu audiencia en clientes al instante.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Features list */}
            <div className="mb-6 space-y-3">
              <h3 className="text-sm font-medium text-kreoon-text-muted uppercase tracking-wider">
                Qué podrás hacer
              </h3>
              {LIVE_SHOPPING_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kreoon-purple-500/10">
                      <Icon className="h-4 w-4 text-kreoon-purple-400" />
                    </div>
                    <span className="text-sm text-kreoon-text-secondary">
                      {feature.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Waitlist counter */}
            <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-kreoon-bg-secondary/50 py-2.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-kreoon-text-secondary">
                Ya hay <span className="font-semibold text-white">{WAITLIST_COUNT}</span> personas esperando
              </span>
            </div>

            {/* Form or Success */}
            <AnimatePresence mode="wait">
              {formState === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-emerald-500/10 p-4 text-center"
                >
                  <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">¡Estás en la lista!</h3>
                  <p className="mt-1 text-sm text-kreoon-text-secondary">
                    Te avisaremos cuando Live Shopping esté disponible.
                  </p>
                  {onClose && (
                    <KreoonButton
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={onClose}
                    >
                      Cerrar
                    </KreoonButton>
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="space-y-3"
                >
                  <KreoonInput
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formState === "error") setFormState("default");
                    }}
                    disabled={formState === "loading"}
                    className="w-full"
                  />
                  {formState === "error" && errorMessage && (
                    <p className="text-sm text-red-400">{errorMessage}</p>
                  )}
                  <KreoonButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full gap-2"
                    disabled={formState === "loading"}
                  >
                    {formState === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        Unirme a la lista de espera
                      </>
                    )}
                  </KreoonButton>
                  <p className="text-center text-xs text-kreoon-text-muted">
                    No spam. Solo te avisaremos cuando esté listo.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return null;
}

// Hook para manejar el modal de Live Shopping
export function useLiveShoppingModal() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
