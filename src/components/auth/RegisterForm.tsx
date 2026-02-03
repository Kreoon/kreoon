import * as React from "react";
import {
  Video,
  Scissors,
  Building2,
  Users2,
  Mail,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  Sparkles,
  Globe,
  Briefcase,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ROLE_COLORS } from "@/styles/kreoon-theme";
import type { AppRole } from "@/types/database";
import {
  KreoonButton,
  KreoonInput,
  KreoonSectionTitle,
  KreoonCard,
} from "@/components/ui/kreoon";

type WizardRole = "creator" | "editor" | "client" | "agency";

const WIZARD_ROLES: Array<{
  id: WizardRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: "creator",
    label: "Creador",
    description: "Crea contenido UGC para marcas y gana con tu talento.",
    icon: <Video className="h-6 w-6" />,
    color: "#a855f7", // Purple
  },
  {
    id: "editor",
    label: "Editor",
    description: "Edita y produce videos para campañas creativas.",
    icon: <Scissors className="h-6 w-6" />,
    color: "#3b82f6", // Blue
  },
  {
    id: "client",
    label: "Marca",
    description: "Gestiona campañas y trabaja con creadores verificados.",
    icon: <Building2 className="h-6 w-6" />,
    color: "#10b981", // Emerald
  },
  {
    id: "agency",
    label: "Agencia / Equipo",
    description: "Gestiono clientes y/o un equipo creativo.",
    icon: <Users2 className="h-6 w-6" />,
    color: "#f59e0b", // Amber
  },
];

const CREATOR_NICHES = [
  "Belleza",
  "Moda",
  "Tecnología",
  "Gastronomía",
  "Fitness",
  "Viajes",
  "Lifestyle",
  "Otro",
];

const EDITOR_SKILLS = [
  "Edición cortes",
  "Motion graphics",
  "Color grading",
  "Audio",
  "Subtítulos",
  "Reels / Shorts",
];

const CLIENT_INDUSTRIES = [
  "Retail",
  "Tecnología",
  "Belleza",
  "Alimentación",
  "Servicios",
  "Entretenimiento",
  "Otro",
];

const TEAM_SIZE_OPTIONS = [
  { value: "1-5", label: "1-5 personas" },
  { value: "6-15", label: "6-15 personas" },
  { value: "16-50", label: "16-50 personas" },
  { value: "50+", label: "Más de 50" },
];

const CLIENT_COUNT_OPTIONS = [
  { value: "1-3", label: "1-3 clientes" },
  { value: "4-10", label: "4-10 clientes" },
  { value: "11-20", label: "11-20 clientes" },
  { value: "20+", label: "Más de 20" },
];

export interface RegisterFormData {
  role: "" | WizardRole;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  bio: string;
  acceptTerms: boolean;
  // Creator
  niche?: string;
  // Editor
  skills: string[];
  // Client
  industry?: string;
  // Agency
  agencyName?: string;
  agencyWebsite?: string;
  teamSize?: string;
  clientCount?: string;
}

const initialFormData: RegisterFormData = {
  role: "",
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  bio: "",
  acceptTerms: false,
  niche: "",
  skills: [],
  industry: "",
  agencyName: "",
  agencyWebsite: "",
  teamSize: "",
  clientCount: "",
};

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "bg-kreoon-text-muted" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: "Débil", color: "bg-red-500" };
  if (score <= 3) return { score: 3, label: "Media", color: "bg-amber-500" };
  return { score: 5, label: "Fuerte", color: "bg-emerald-500" };
}

export interface RegisterFormProps {
  onSuccess?: (role: string) => void;
  onSwitchToLogin: () => void;
  preselectedRole?: string;
  organizationSlug?: string;
}

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
};

const AGENCY_BENEFITS = [
  "Panel multi-cliente para gestionar todas tus marcas",
  "Asigna proyectos a tu equipo interno",
  "Acceso a red de creadores verificados",
  "Reportes automáticos por cliente",
  "Workflows de aprobación personalizados",
];

/**
 * Wizard de registro en 4 pasos con estilo Kreoon.
 * Rol → Datos básicos → Info adicional → Confirmación.
 */
export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
  preselectedRole,
  organizationSlug,
}: RegisterFormProps) {
  const { signUp } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [formData, setFormData] = React.useState<RegisterFormData>(initialFormData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (preselectedRole && ["creator", "editor", "client", "agency"].includes(preselectedRole)) {
      setFormData((prev) => ({ ...prev, role: preselectedRole as RegisterFormData["role"] }));
    }
  }, [preselectedRole]);

  const updateData = (updates: Partial<RegisterFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const goNext = () => {
    setDirection(1);
    setCurrentStep((prev) => Math.min(3, prev + 1));
  };

  const goBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const validateStep0 = () => !!formData.role;
  const validateStep1 = () => {
    if (!formData.fullName.trim()) return false;
    if (!formData.email.trim()) return false;
    if (formData.password.length < 8) return false;
    if (!/[A-Z]/.test(formData.password)) return false;
    if (!/[0-9]/.test(formData.password)) return false;
    if (formData.password !== formData.confirmPassword) return false;
    return true;
  };
  const validateStep2 = () => formData.acceptTerms;

  const handleContinueFrom0 = () => {
    if (!validateStep0()) {
      setError("Selecciona un rol para continuar");
      return;
    }
    setError(null);
    goNext();
  };

  const handleContinueFrom1 = () => {
    if (!formData.fullName.trim()) {
      setError("Ingresa tu nombre completo");
      return;
    }
    if (!formData.email.trim()) {
      setError("Ingresa tu correo electrónico");
      return;
    }
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("La contraseña debe incluir al menos una mayúscula");
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("La contraseña debe incluir al menos un número");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError(null);
    goNext();
  };

  const handleCreateAccount = async () => {
    if (!formData.acceptTerms) {
      setError("Debes aceptar los términos y condiciones");
      return;
    }
    if (!formData.role) return;

    setLoading(true);
    setError(null);
    try {
      // For agencies, we use 'client' role internally but flag as agency
      const effectiveRole: AppRole = formData.role === "agency" ? "client" : (formData.role as AppRole);
      const companyName = formData.role === "client" 
        ? formData.fullName 
        : formData.role === "agency" 
          ? formData.agencyName || formData.fullName
          : undefined;

      const { error: signUpError } = await signUp(
        formData.email.trim(),
        formData.password,
        formData.fullName.trim(),
        effectiveRole,
        companyName,
      );

      if (signUpError) {
        setError(signUpError.message);
        toast({
          title: "Error al crear la cuenta",
          description: signUpError.message,
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Update profile with additional data
        const profileUpdate: Record<string, unknown> = {
          full_name: formData.fullName,
          bio: formData.bio || null,
        };

        // Agency-specific metadata
        if (formData.role === "agency") {
          profileUpdate.is_agency = true;
          profileUpdate.agency_metadata = {
            agency_name: formData.agencyName,
            website: formData.agencyWebsite,
            team_size: formData.teamSize,
            client_count: formData.clientCount,
          };
        }

        if (organizationSlug) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug", organizationSlug)
            .single();
          
          if (org) {
            await supabase.from("organization_member_roles").insert({
              organization_id: org.id,
              user_id: user.id,
              role: effectiveRole,
            });
            profileUpdate.current_organization_id = org.id;
          }
        } else if (formData.role === "agency") {
          // Create a new organization for the agency
          const orgSlug = (formData.agencyName || formData.fullName)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          const { data: newOrg } = await supabase
            .from("organizations")
            .insert({
              name: formData.agencyName || formData.fullName,
              slug: `${orgSlug}-${Date.now().toString(36)}`,
              owner_id: user.id,
            })
            .select("id")
            .single();

          if (newOrg) {
            profileUpdate.current_organization_id = newOrg.id;
            
            // Add user as admin of the organization
            await supabase.from("organization_member_roles").insert({
              organization_id: newOrg.id,
              user_id: user.id,
              role: "admin",
            });
          }
        }

        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", user.id);
      }

      goNext();
      onSuccess?.(formData.role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear la cuenta";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const selectedRoleConfig = WIZARD_ROLES.find((r) => r.id === formData.role);

  return (
    <div className="space-y-6">
      {/* Indicador de progreso */}
      <div className="flex items-center justify-between gap-2">
        {[0, 1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300",
                step < currentStep &&
                  "border-kreoon-purple-500 bg-kreoon-purple-500/20 text-kreoon-purple-400",
                step === currentStep &&
                  "border-kreoon-purple-500 bg-kreoon-purple-500 text-kreoon-text-primary shadow-kreoon-glow-sm",
                step > currentStep && "border-kreoon-border text-kreoon-text-muted",
              )}
            >
              {step < currentStep ? <Check className="h-4 w-4" /> : step + 1}
            </div>
            {step < 3 && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-[8px] rounded-full transition-colors duration-300",
                  step < currentStep ? "bg-kreoon-purple-500/50" : "bg-kreoon-border",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {/* STEP 0: Role Selection */}
        {currentStep === 0 && (
          <motion.div
            key="step0"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <KreoonSectionTitle
              title="¿Cómo quieres usar Kreoon?"
              subtitle="Elige el rol que mejor describe tu perfil"
              align="left"
              accent
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {WIZARD_ROLES.map((r) => {
                const isSelected = formData.role === r.id;
                const roleColor = ROLE_COLORS[r.id as keyof typeof ROLE_COLORS] || { primary: r.color };
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => updateData({ role: r.id })}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-300",
                      "hover:shadow-kreoon-glow-sm",
                      isSelected
                        ? "shadow-kreoon-glow-sm"
                        : "border-kreoon-border hover:border-kreoon-purple-400/40",
                    )}
                    style={{
                      borderColor: isSelected ? r.color : undefined,
                      boxShadow: isSelected ? `0 0 20px ${r.color}30` : undefined,
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                        !isSelected && "bg-kreoon-bg-card/50 text-kreoon-text-muted",
                      )}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${r.color}20`,
                              color: r.color,
                            }
                          : undefined
                      }
                    >
                      {r.icon}
                    </span>
                    <span className="font-semibold text-kreoon-text-primary">
                      {r.label}
                    </span>
                    <span className="text-sm text-kreoon-text-secondary">
                      {r.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <KreoonButton
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleContinueFrom0}
              disabled={!formData.role}
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </KreoonButton>
          </motion.div>
        )}

        {/* STEP 1: Basic Data */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <KreoonSectionTitle
              title="Cuéntanos sobre ti"
              subtitle="Datos básicos para tu cuenta"
              align="left"
              accent
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <KreoonInput
              label="Nombre completo"
              value={formData.fullName}
              onChange={(e) => updateData({ fullName: e.target.value })}
              placeholder="Tu nombre"
              disabled={loading}
            />
            <KreoonInput
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => updateData({ email: e.target.value })}
              placeholder="tu@ejemplo.com"
              disabled={loading}
              icon={<Mail className="h-4 w-4" />}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-kreoon-text-secondary">
                Contraseña (mín. 8 caracteres, 1 mayúscula, 1 número)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateData({ password: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                  className={cn(
                    "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary pl-3 pr-10 py-2 text-sm text-kreoon-text-primary",
                    "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                    "disabled:opacity-50",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted"
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-kreoon-bg-card overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                {formData.password && (
                  <span className="text-xs text-kreoon-text-muted">{passwordStrength.label}</span>
                )}
              </div>
            </div>
            <KreoonInput
              label="Confirmar contraseña"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateData({ confirmPassword: e.target.value })}
              placeholder="••••••••"
              disabled={loading}
            />
            <div className="flex gap-3 pt-2">
              <KreoonButton
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={goBack}
                disabled={loading}
              >
                Atrás
              </KreoonButton>
              <KreoonButton
                type="button"
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleContinueFrom1}
                disabled={loading}
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </KreoonButton>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Additional Info */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <KreoonSectionTitle
              title={
                formData.role === "creator"
                  ? "Perfil de Creador"
                  : formData.role === "editor"
                    ? "Perfil de Editor"
                    : formData.role === "agency"
                      ? "Cuéntanos sobre tu agencia"
                      : "Perfil de Marca"
              }
              subtitle={
                formData.role === "agency"
                  ? "Esta información nos ayuda a recomendarte el plan ideal"
                  : "Información adicional (opcional)"
              }
              align="left"
              accent
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            {/* Agency-specific fields */}
            {formData.role === "agency" && (
              <>
                <KreoonInput
                  label="Nombre de la agencia"
                  value={formData.agencyName}
                  onChange={(e) => updateData({ agencyName: e.target.value })}
                  placeholder="Mi Agencia Creativa"
                  disabled={loading}
                  icon={<Briefcase className="h-4 w-4" />}
                />
                <KreoonInput
                  label="Sitio web (opcional)"
                  value={formData.agencyWebsite}
                  onChange={(e) => updateData({ agencyWebsite: e.target.value })}
                  placeholder="https://miagencia.com"
                  disabled={loading}
                  icon={<Globe className="h-4 w-4" />}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-kreoon-text-secondary">
                      ¿Cuántas personas hay en tu equipo?
                    </label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => updateData({ teamSize: e.target.value })}
                      disabled={loading}
                      className={cn(
                        "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
                        "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                      )}
                    >
                      <option value="">Selecciona</option>
                      {TEAM_SIZE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-kreoon-text-secondary">
                      ¿Cuántos clientes gestionas?
                    </label>
                    <select
                      value={formData.clientCount}
                      onChange={(e) => updateData({ clientCount: e.target.value })}
                      disabled={loading}
                      className={cn(
                        "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
                        "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                      )}
                    >
                      <option value="">Selecciona</option>
                      {CLIENT_COUNT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Bio for all roles */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-kreoon-text-secondary">
                {formData.role === "agency" ? "Descripción de la agencia" : "Bio / Descripción"}
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => updateData({ bio: e.target.value })}
                placeholder={
                  formData.role === "agency"
                    ? "Cuéntanos sobre tu agencia, servicios y especialización..."
                    : "Cuéntanos brevemente sobre ti o tu marca..."
                }
                rows={3}
                disabled={loading}
                className={cn(
                  "w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
                  "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                  "placeholder:text-kreoon-text-muted/70 resize-none",
                )}
              />
            </div>

            {/* Creator-specific fields */}
            {formData.role === "creator" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-kreoon-text-secondary">
                  Nicho
                </label>
                <select
                  value={formData.niche}
                  onChange={(e) => updateData({ niche: e.target.value })}
                  disabled={loading}
                  className={cn(
                    "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
                    "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                  )}
                >
                  <option value="">Selecciona un nicho</option>
                  {CREATOR_NICHES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Editor-specific fields */}
            {formData.role === "editor" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-kreoon-text-secondary">
                  Habilidades
                </label>
                <div className="flex flex-wrap gap-2">
                  {EDITOR_SKILLS.map((skill) => {
                    const selected = formData.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() =>
                          updateData({
                            skills: selected
                              ? formData.skills.filter((s) => s !== skill)
                              : [...formData.skills, skill],
                          })
                        }
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm transition-all",
                          selected
                            ? "border-kreoon-purple-500 bg-kreoon-purple-500/20 text-kreoon-purple-400"
                            : "border-kreoon-border text-kreoon-text-secondary hover:border-kreoon-purple-400/50",
                        )}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client-specific fields */}
            {formData.role === "client" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-kreoon-text-secondary">
                  Industria
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateData({ industry: e.target.value })}
                  disabled={loading}
                  className={cn(
                    "flex h-10 w-full rounded-xl border bg-kreoon-bg-secondary px-3 py-2 text-sm text-kreoon-text-primary",
                    "border-kreoon-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50",
                  )}
                >
                  <option value="">Selecciona industria</option>
                  {CLIENT_INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => updateData({ acceptTerms: e.target.checked })}
                disabled={loading}
                className="mt-1 rounded border-kreoon-border"
              />
              <span className="text-sm text-kreoon-text-secondary">
                Acepto los términos y condiciones y la política de privacidad de Kreoon.
              </span>
            </label>
            <div className="flex gap-3 pt-2">
              <KreoonButton
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={goBack}
                disabled={loading}
              >
                Atrás
              </KreoonButton>
              <KreoonButton
                type="button"
                variant="primary"
                size="lg"
                className="flex-1"
                loading={loading}
                disabled={loading || !formData.acceptTerms}
                onClick={handleCreateAccount}
              >
                Crear cuenta
              </KreoonButton>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Confirmation */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-kreoon-text-primary shadow-kreoon-glow"
              style={{
                backgroundColor: selectedRoleConfig?.color || "#a855f7",
                boxShadow: `0 0 30px ${selectedRoleConfig?.color || "#a855f7"}50`,
              }}
            >
              <Check className="h-8 w-8" />
            </motion.div>
            <KreoonSectionTitle
              title={
                formData.role === "agency"
                  ? "¡Bienvenido! Tu cuenta de agencia está lista"
                  : "¡Bienvenido a Kreoon!"
              }
              subtitle={
                formData.role === "creator"
                  ? "Tu perfil de creador está listo. Comienza a recibir briefs y crear contenido."
                  : formData.role === "editor"
                    ? "Tu perfil de editor está listo. Recibe proyectos y muestra tu talento."
                    : formData.role === "agency"
                      ? "Hemos creado tu espacio de trabajo. Configura tu agencia y comienza a gestionar."
                      : "Tu perfil de marca está listo. Crea campañas y conecta con creadores."
              }
              align="center"
              accent
            />

            {/* Agency-specific benefits */}
            {formData.role === "agency" && (
              <KreoonCard className="p-4 text-left">
                <h4 className="mb-3 text-sm font-medium text-white">
                  Con tu cuenta de agencia podrás:
                </h4>
                <ul className="space-y-2">
                  {AGENCY_BENEFITS.map((benefit, index) => (
                    <motion.li
                      key={benefit}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-2 text-sm text-kreoon-text-secondary"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      {benefit}
                    </motion.li>
                  ))}
                </ul>
              </KreoonCard>
            )}

            {/* Default gamification card for non-agencies */}
            {formData.role !== "agency" && (
              <KreoonCard glow className="p-4">
                <div className="flex items-center gap-3 justify-center">
                  <Sparkles className="h-5 w-5 text-kreoon-purple-400" />
                  <span className="text-sm text-kreoon-text-secondary">
                    Has desbloqueado tu insignia inicial del sistema de gamificación.
                  </span>
                </div>
              </KreoonCard>
            )}

            <div className="space-y-3">
              <KreoonButton
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => onSuccess?.(formData.role)}
              >
                {formData.role === "agency" ? "Configurar mi agencia" : "Ir a mi dashboard"}
                <ChevronRight className="h-4 w-4" />
              </KreoonButton>

              {formData.role === "agency" && (
                <KreoonButton
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    const el = document.getElementById("pricing");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                    else window.location.href = "/#pricing";
                  }}
                >
                  Ver planes de agencia
                </KreoonButton>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSuccess?.(formData.role)}
              className="text-sm text-kreoon-purple-400 hover:text-kreoon-purple-300 transition-colors"
            >
              Explorar la comunidad
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {currentStep < 3 && (
        <p className="text-center text-sm text-kreoon-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-kreoon-purple-400 hover:text-kreoon-purple-300 underline underline-offset-2"
          >
            Inicia sesión
          </button>
        </p>
      )}
    </div>
  );
}

RegisterForm.displayName = "RegisterForm";
