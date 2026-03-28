import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShoppingCart,
  Key,
  Loader2,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { KreoonCard } from "@/components/ui/kreoon";
import { useAITokens } from "@/hooks/useAITokens";
import { useUnifiedTokens } from "@/hooks/useUnifiedTokens";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { TOKEN_PACKAGES } from "@/lib/finance/constants";

function formatTokens(n: number) {
  return n.toLocaleString("es-CO");
}

interface AITokensPanelProps {
  organizationId?: string | null;
  variant?: "full" | "compact" | "header" | "modal";
  /** Para compact/header: abre el detalle en modal */
  onOpenModal?: () => void;
  /** Para variant=modal: control del diálogo */
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
  /** Modo solo lectura (oculta compra y API propia) - para clientes */
  readonly?: boolean;
  /** Permite alternar entre tokens personales y de la org (solo para admins) */
  canSwitchContext?: boolean;
  /** ID de la organización del usuario (necesario si canSwitchContext=true) */
  userOrganizationId?: string;
}

export function AITokensPanel({
  organizationId,
  variant = "full",
  onOpenModal,
  modalOpen,
  onModalOpenChange,
  readonly = false,
  canSwitchContext = false,
  userOrganizationId,
}: AITokensPanelProps) {
  // Estado para alternar entre tokens personales y de la org
  const [viewingOrgTokens, setViewingOrgTokens] = useState(false);

  // Determinar qué organizationId usar para los hooks
  const effectiveOrgId = canSwitchContext && viewingOrgTokens && userOrganizationId
    ? userOrganizationId
    : organizationId;

  const {
    balance,
    transactions,
    loading,
    totalAvailable,
    usageByModule,
    daysUntilReset,
    isLowTokens,
    isOutOfTokens,
    customApiEnabled,
    periodEndDate,
    refetch,
  } = useAITokens(effectiveOrgId);

  const { purchaseTokens, isPurchasing } = useUnifiedTokens(effectiveOrgId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [purchasingPkg, setPurchasingPkg] = useState<string | null>(null);

  const handlePurchase = async (pkgId: string) => {
    setPurchasingPkg(pkgId);
    try {
      await purchaseTokens(pkgId);
    } catch (err: any) {
      toast.error(err?.message || "Error al comprar tokens");
    } finally {
      setPurchasingPkg(null);
    }
  };

  const monthlyIncluded = balance?.monthlyTokensIncluded ?? 0;
  const purchased = balance?.purchasedTokens ?? 0;
  const used = balance?.tokensUsedThisPeriod ?? 0;
  const usedPercent =
    monthlyIncluded > 0 ? Math.min(100, (used / monthlyIncluded) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (customApiEnabled) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
        <Key className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">API propia</span>
      </div>
    );
  }

  // Compact: solo número (sidebar colapsado)
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onOpenModal}
        className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
        title="Tokens IA"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-medium tabular-nums">{formatTokens(totalAvailable)}</span>
      </button>
    );
  }

  // Header: número + barra mini
  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={onOpenModal}
        className="flex items-center gap-2 rounded-sm border border-border bg-card/50 px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-semibold tabular-nums leading-tight">
            {formatTokens(totalAvailable)} tokens
          </span>
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${100 - usedPercent}%` }}
            />
          </div>
        </div>
      </button>
    );
  }

  // Modal content (reutilizable)
  const panelContent = (
    <div className="space-y-6">
      {/* 0. Toggle personal/org (solo para admins) */}
      {canSwitchContext && userOrganizationId && (
        <div className="flex items-center justify-center gap-3 p-2 rounded-lg bg-muted/50 border border-border">
          <span className={`text-sm transition-colors ${!viewingOrgTokens ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            Mis tokens
          </span>
          <Switch
            checked={viewingOrgTokens}
            onCheckedChange={setViewingOrgTokens}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`text-sm transition-colors ${viewingOrgTokens ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            Tokens de la org
          </span>
        </div>
      )}

      {/* 1. Header con balance */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          {canSwitchContext && viewingOrgTokens ? "Balance de la organización" : "Balance actual"}
        </p>
        <p className="text-3xl font-bold tabular-nums">{formatTokens(totalAvailable)} <span className="text-primary">Tokens IA</span></p>
        <div className="mt-2">
          <Progress value={100 - usedPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {formatTokens(used)} de {formatTokens(monthlyIncluded)} tokens mensuales usados
          </p>
          {purchased > 0 && (
            <p className="text-xs text-primary mt-0.5">+ {formatTokens(purchased)} tokens extra</p>
          )}
        </div>
      </div>

      {/* 2. Uso por módulo */}
      <div>
        <p className="text-sm font-medium mb-2">Uso por módulo</p>
        <div className="space-y-2">
          {usageByModule.slice(0, 5).map((u) => (
            <div key={u.module} className="flex items-center gap-2">
              <div className="w-20 text-xs text-muted-foreground">{u.label}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full"
                  style={{ width: `${u.percentage}%` }}
                />
              </div>
              <span className="text-xs tabular-nums w-10">{u.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Días restantes */}
      {daysUntilReset != null && periodEndDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Se reinician en {daysUntilReset} días</span>
          <span className="text-xs">({format(new Date(periodEndDate), "d MMM yyyy", { locale: es })})</span>
        </div>
      )}

      {/* 4. Alerta tokens bajos */}
      {isLowTokens && !isOutOfTokens && (
        <KreoonCard className="p-4 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">Te quedan pocos Tokens IA</p>
              {!readonly && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handlePurchase("popular")} disabled={isPurchasing}>
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                    {isPurchasing ? "Procesando..." : "Comprar más"}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/settings?section=ai_settings&tab=providers&subTab=custom-api">
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      Conectar tu API
                    </Link>
                  </Button>
                </div>
              )}
              {readonly && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Contacta al administrador para obtener más tokens.
                </p>
              )}
            </div>
          </div>
        </KreoonCard>
      )}

      {/* 5. Comprar Tokens IA extra */}
      {!readonly && (
      <div>
        <p className="text-sm font-medium mb-3">Comprar Tokens IA extra</p>
        <p className="text-xs text-muted-foreground mb-3">Los Tokens IA extra no expiran</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TOKEN_PACKAGES.map((pkg) => (
            <KreoonCard
              key={pkg.tokens}
              className={`p-4 text-center cursor-pointer transition-all hover:border-primary/50 ${pkg.popular ? "ring-1 ring-primary" : ""} ${purchasingPkg === pkg.id ? "opacity-70" : ""}`}
              onClick={() => handlePurchase(pkg.id)}
            >
              {pkg.popular && (
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                  Más popular
                </span>
              )}
              <p className="text-xl font-bold tabular-nums mt-1">{formatTokens(pkg.tokens)}</p>
              <p className="text-sm text-muted-foreground">tokens</p>
              <p className="text-lg font-semibold mt-2">${pkg.price}</p>
            </KreoonCard>
          ))}
        </div>
      </div>
      )}

      {/* 6. Link API propia */}
      {!readonly && (
        <Button variant="outline" className="w-full" asChild>
          <Link to="/settings?section=ai_settings&tab=providers&subTab=custom-api">
            <Key className="h-4 w-4 mr-2" />
            Usar mi propia API
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      )}

      {/* 7. Historial (collapsible) */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            Historial reciente
            {historyOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {transactions.slice(0, 10).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Sin transacciones recientes</p>
            ) : (
              transactions.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 px-2 rounded-sm text-sm hover:bg-muted/50"
                >
                  <div>
                    <span className="text-muted-foreground">
                      {format(new Date(t.created_at), "dd MMM HH:mm", { locale: es })}
                    </span>
                    <span className="ml-2">
                      {t.module_key || "—"} / {t.action || "—"}
                    </span>
                  </div>
                  <span
                    className={`tabular-nums font-medium ${t.tokens_amount < 0 ? "text-destructive" : "text-green-600"}`}
                  >
                    {t.tokens_amount < 0 ? "" : "+"}
                    {t.tokens_amount}
                  </span>
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  // Modal variant: panel dentro de un diálogo controlado por el padre
  if (variant === "modal") {
    return (
      <Dialog open={modalOpen} onOpenChange={onModalOpenChange ?? (() => {})}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-md max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tokens IA
            </DialogTitle>
          </DialogHeader>
          {panelContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Full variant
  return (
    <KreoonCard className="p-4" glow>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Tokens IA</h3>
      </div>
      {panelContent}
    </KreoonCard>
  );
}

/** Panel con trigger: muestra compact/header y al hacer clic abre el detalle en modal */
export function AITokensPanelTrigger({
  organizationId,
  variant = "compact",
  readonly = false,
  canSwitchContext = false,
  userOrganizationId,
}: {
  organizationId?: string | null;
  variant?: "compact" | "header";
  /** Modo solo lectura (oculta compra y API propia) - para clientes */
  readonly?: boolean;
  /** Permite alternar entre tokens personales y de la org (solo para admins) */
  canSwitchContext?: boolean;
  /** ID de la organización del usuario (necesario si canSwitchContext=true) */
  userOrganizationId?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <AITokensPanel
        organizationId={organizationId}
        variant={variant}
        onOpenModal={() => setModalOpen(true)}
        readonly={readonly}
        canSwitchContext={canSwitchContext}
        userOrganizationId={userOrganizationId}
      />
      <AITokensPanel
        organizationId={organizationId}
        variant="modal"
        modalOpen={modalOpen}
        onModalOpenChange={setModalOpen}
        readonly={readonly}
        canSwitchContext={canSwitchContext}
        userOrganizationId={userOrganizationId}
      />
    </>
  );
}

/** Modal cuando se quedan sin tokens */
export function AITokensOutModal({
  open,
  onOpenChange,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
}) {
  const { isOutOfTokens, customApiEnabled } = useAITokens(organizationId);
  const show = open && (isOutOfTokens || false) && !customApiEnabled;

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Sin Tokens IA disponibles
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Te has quedado sin Tokens IA. Compra más tokens o conecta tu propia API para continuar.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/settings?section=ai_settings&tab=providers&subTab=custom-api">
                <Key className="h-4 w-4 mr-2" />
                Conectar mi API
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/settings" onClick={() => onOpenChange(false)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Comprar Tokens IA
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
