import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Palette,
  Building2,
  Target,
  Award,
  Shield,
  Check,
} from "lucide-react";
import { ROLE_COLORS } from "@/styles/kreoon-theme";
import { cn } from "@/lib/utils";

export type RoleBadgeRole =
  | "creator"
  | "editor"
  | "client"
  | "strategist"
  | "ambassador"
  | "admin";

export type RoleBadgeSize = "sm" | "md" | "lg";

const ROLE_ICONS: Record<RoleBadgeRole, React.ComponentType<{ className?: string }>> = {
  creator: Sparkles,
  editor: Palette,
  client: Building2,
  strategist: Target,
  ambassador: Award,
  admin: Shield,
};

const ROLE_DATA: Record<
  RoleBadgeRole,
  { label: string; description: string; benefits: string[] }
> = {
  creator: {
    label: "Creador",
    description: "Crea contenido auténtico para marcas",
    benefits: [
      "Acceso a campañas de marcas verificadas",
      "Sistema de reputación y ranking",
      "Herramientas de IA creativa",
      "Comunidad de creadores",
    ],
  },
  editor: {
    label: "Editor",
    description: "Potencia el contenido con tu talento",
    benefits: [
      "Conexión con creadores que necesitan edición",
      "Portafolio verificado",
      "Proyectos recurrentes",
      "Pagos seguros",
    ],
  },
  client: {
    label: "Marca",
    description: "Conecta con creadores auténticos",
    benefits: [
      "Acceso a red de creadores verificados",
      "Gestión de campañas simplificada",
      "Métricas y analytics",
      "Contenido que convierte",
    ],
  },
  strategist: {
    label: "Estratega",
    description: "Diseña estrategias ganadoras",
    benefits: [
      "Dashboard de estrategia avanzado",
      "Gestión de múltiples campañas",
      "Reportes ejecutivos",
      "Acceso a datos del ecosistema",
    ],
  },
  ambassador: {
    label: "Embajador",
    description: "Representa y expande la comunidad",
    benefits: [
      "Comisiones por referidos",
      "Eventos exclusivos",
      "Reconocimiento público",
      "Networking premium",
    ],
  },
  admin: {
    label: "Administrador",
    description: "Gestiona el ecosistema",
    benefits: [
      "Panel de control completo",
      "Gestión de usuarios y roles",
      "Configuración de plataforma",
      "Analytics avanzados",
    ],
  },
};

const SIZE_CLASSES: Record<
  RoleBadgeSize,
  { card: string; iconWrapper: string; icon: string; title: string; desc: string }
> = {
  sm: {
    card: "p-4",
    iconWrapper: "h-10 w-10",
    icon: "h-5 w-5",
    title: "text-base",
    desc: "text-xs",
  },
  md: {
    card: "p-5",
    iconWrapper: "h-12 w-12",
    icon: "h-6 w-6",
    title: "text-lg",
    desc: "text-sm",
  },
  lg: {
    card: "p-6",
    iconWrapper: "h-14 w-14",
    icon: "h-7 w-7",
    title: "text-xl",
    desc: "text-base",
  },
};

const benefitStagger = {
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.2 },
  }),
  hidden: { opacity: 0, x: -8 },
};

export interface RoleBadgeCardProps {
  role: RoleBadgeRole;
  userName?: string;
  showBenefits?: boolean;
  size?: RoleBadgeSize;
  className?: string;
}

/**
 * Card premium que muestra información del rol del usuario con gradiente y beneficios.
 */
export function RoleBadgeCard({
  role,
  userName,
  showBenefits = true,
  size = "md",
  className,
}: RoleBadgeCardProps) {
  const roleInfo = ROLE_DATA[role];
  const roleColors = ROLE_COLORS[role];
  const gradientClass = `bg-gradient-to-r ${roleColors.gradient}`;
  const IconComponent = ROLE_ICONS[role];
  const sizeClasses = SIZE_CLASSES[size];
  const showBenefitsList = showBenefits && size !== "sm" && roleInfo.benefits.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl p-[2px] shadow-[0_0_24px_var(--role-glow)]",
        gradientClass,
        className,
      )}
      style={
        {
          "--role-glow": `${roleColors.primary}25`,
        } as React.CSSProperties
      }
    >
      <div className="rounded-[10px] bg-kreoon-bg-card">
        <div className={cn("rounded-[10px]", sizeClasses.card)}>
          {/* Header */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full text-white shadow-lg",
                gradientClass,
                sizeClasses.iconWrapper,
              )}
            >
              <IconComponent className={cn("text-white", sizeClasses.icon)} />
            </div>
            <div className="min-w-0">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-white",
                  gradientClass,
                )}
              >
                {roleInfo.label}
              </span>
              {userName && (
                <p
                  className={cn(
                    "mt-1.5 font-semibold text-kreoon-text-primary",
                    sizeClasses.title,
                  )}
                >
                  ¡Hola, {userName}!
                </p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <p
            className={cn(
              "mt-3 text-kreoon-text-secondary",
              sizeClasses.desc,
            )}
          >
            {roleInfo.description}
          </p>

          {/* Beneficios */}
          {showBenefitsList && (
            <ul className="mt-4 space-y-2">
              {roleInfo.benefits.map((benefit, i) => (
                <motion.li
                  key={i}
                  initial="hidden"
                  animate="visible"
                  variants={benefitStagger}
                  custom={i}
                  className="flex items-start gap-2 text-sm text-kreoon-text-secondary"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: roleColors.primary }}
                  />
                  <span>{benefit}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

RoleBadgeCard.displayName = "RoleBadgeCard";
