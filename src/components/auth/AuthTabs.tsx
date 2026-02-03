import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type AuthTab = "login" | "register";

export interface AuthTabsProps {
  /** Tab actualmente seleccionado */
  activeTab: AuthTab;
  /** Callback al cambiar de tab */
  onTabChange: (tab: AuthTab) => void;
  /** Clases adicionales para el contenedor */
  className?: string;
}

const TAB_CONFIG: { id: AuthTab; label: string }[] = [
  { id: "login", label: "Iniciar sesión" },
  { id: "register", label: "Registrarse" },
];

/**
 * Tabs para alternar entre Login y Registro en flujos de autenticación.
 * Indicador deslizante animado con framer-motion (layoutId).
 */
export function AuthTabs({
  activeTab,
  onTabChange,
  className,
}: AuthTabsProps) {
  return (
    <div
      className={cn(
        "relative flex w-full rounded-full bg-kreoon-bg-secondary p-1",
        "transition-[box-shadow] duration-300",
        className,
      )}
      role="tablist"
      aria-label="Formulario de autenticación"
    >
      {TAB_CONFIG.map((tab) => (
        <div
          key={tab.id}
          className="relative flex flex-1"
          style={{ minWidth: 0 }}
        >
          {/* Sliding indicator: solo se renderiza en el tab activo; framer-motion anima entre posiciones */}
          {activeTab === tab.id ? (
            <motion.div
              layoutId="auth-tab-indicator"
              className="absolute inset-0 rounded-full bg-kreoon-gradient shadow-kreoon-glow-sm"
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
              aria-hidden
            />
          ) : null}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center rounded-full py-2.5 text-sm font-medium",
              "transition-colors duration-300",
              activeTab === tab.id
                ? "text-kreoon-text-primary"
                : "text-kreoon-text-secondary hover:text-kreoon-text-primary/90",
            )}
          >
            {tab.label}
          </button>
        </div>
      ))}
    </div>
  );
}

AuthTabs.displayName = "AuthTabs";
