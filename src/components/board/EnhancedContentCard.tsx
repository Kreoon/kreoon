import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  Building2,
  Video,
  FileText,
  MoreVertical,
  Brain,
  AlertTriangle,
  Clock4,
  Zap,
  Lightbulb,
  RefreshCw,
  Heart,
  Calendar,
  Crown,
  Megaphone,
  CheckCircle,
  XCircle,
  GripVertical,
  Share2,
  DollarSign,
  Package,
  Eye,
  Star,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Content,
  STATUS_LABELS,
  ContentStatus,
  AppRole,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { StatusChangeDropdown, QuickStatusButtons } from "./StatusChangeDropdown";
import { KanbanCardVideoPreview, shouldShowVideoArea } from "./KanbanCardVideoPreview";
import { UserAssignmentSection } from "./UserAssignmentSection";
import { CardFieldsCustomizer } from "./CardFieldsCustomizer";
import { BOARD_CLASSES, getStatusNeonStyle, getSpherePhaseStyle } from "./kanbanTechStyles";
import { QuickShareButton } from "@/modules/social/components/Dashboard/QuickShareButton";
import { PostComposer } from "@/modules/social/components/Composer/PostComposer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PromoteContentDialog } from "@/modules/marketing/components/Promote/PromoteContentDialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { ContentSocialStatus } from "@/modules/social/hooks/useContentSocialStatus";
import { useTheme } from "next-themes";

const SPHERE_PHASE_DISPLAY: Record<
  string,
  { label: string; shortLabel: string; icon: typeof Zap; color: string }
> = {
  engage: { label: "Enganchar", shortLabel: "ENG", icon: Zap, color: "#22d3ee" },
  solution: { label: "Solución", shortLabel: "SOL", icon: Lightbulb, color: "#34d399" },
  remarketing: { label: "Remarketing", shortLabel: "RMK", icon: RefreshCw, color: "#fbbf24" },
  fidelize: { label: "Fidelizar", shortLabel: "FID", icon: Heart, color: "#c084fc" },
};

interface OrganizationStatus {
  id: string;
  status_key: string;
  label: string;
  color: string;
  sort_order: number;
}

interface EnhancedContentCardProps {
  content: Content;
  cardSize?: "compact" | "normal" | "large";
  visibleFields?: string[];
  /** Callback para persistir cambios de campos visibles */
  onVisibleFieldsChange?: (fields: string[]) => void;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  onAnalyzeWithAI?: (contentId: string, title: string) => void;
  showAIIndicators?: boolean;
  organizationStatuses?: OrganizationStatus[];
  userRole?: AppRole | null;
  userId?: string | null;
  onStatusChange?: (contentId: string, newStatus: ContentStatus) => Promise<void>;
  showStatusControls?: boolean;
  ambassadorIds?: Set<string>;
  onShowMarketingInfo?: (content: Content) => void;
  /** Equipo asignable - creadores y editores para dropdown */
  creators?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  editors?: Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
  onAssignCreator?: (contentId: string, userId: string) => Promise<void>;
  onAssignEditor?: (contentId: string, userId: string) => Promise<void>;
  onUpdate?: () => void;
  /** Social publishing status for this content */
  socialStatus?: ContentSocialStatus;
  /** Mostrar personalizador de campos */
  showFieldsCustomizer?: boolean;
}

const SIZE_CONFIG = {
  compact: {
    padding: "p-2",
    titleSize: "text-xs",
    thumbnailHeight: "h-12",
    avatarSize: "h-5 w-5",
    badgeSize: "text-[10px] px-1.5 py-0.5",
    spacing: "gap-1",
    iconSize: "h-2.5 w-2.5",
  },
  normal: {
    padding: "p-4",
    titleSize: "text-sm",
    thumbnailHeight: "h-[280px]",
    avatarSize: "h-6 w-6",
    badgeSize: "text-xs px-2 py-0.5",
    spacing: "gap-2",
    iconSize: "h-3 w-3",
  },
  large: {
    padding: "p-4",
    titleSize: "text-base",
    thumbnailHeight: "h-[280px]",
    avatarSize: "h-8 w-8",
    badgeSize: "text-sm px-2.5 py-0.5",
    spacing: "gap-3",
    iconSize: "h-4 w-4",
  },
};

function getPrimaryVideoUrl(content: Content): string | null {
  const urls = (content as any).video_urls;
  if (urls?.length > 0) {
    const first = urls.find((u: string) => u?.trim());
    if (first) return first;
  }
  return (content as any).video_url || (content as any).bunny_embed_url || null;
}

export function EnhancedContentCard({
  content,
  cardSize = "normal",
  visibleFields = ["title", "status", "client", "deadline", "creator", "editor", "sphere_phase", "campaign_week", "marketing_status", "progress"],
  onVisibleFieldsChange,
  onClick,
  onDragStart,
  isDragging,
  onAnalyzeWithAI,
  showAIIndicators = false,
  organizationStatuses = [],
  userRole,
  userId,
  onStatusChange,
  showStatusControls = false,
  ambassadorIds = new Set(),
  onShowMarketingInfo,
  creators = [],
  editors = [],
  onAssignCreator,
  onAssignEditor,
  onUpdate,
  socialStatus,
  showFieldsCustomizer = false,
}: EnhancedContentCardProps) {
  const sizeConfig = SIZE_CONFIG[cardSize] || SIZE_CONFIG.normal;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const currentStatusConfig = useMemo(
    () => organizationStatuses.find((s) => s.status_key === content.status),
    [organizationStatuses, content.status]
  );

  const statusLabel =
    currentStatusConfig?.label || STATUS_LABELS[content.status] || content.status;
  const statusNeon = getStatusNeonStyle(
    content.status,
    currentStatusConfig?.color,
    isDark
  );

  const getProgress = (): number => {
    if (organizationStatuses.length > 0 && currentStatusConfig) {
      const maxOrder = Math.max(...organizationStatuses.map((s) => s.sort_order));
      if (maxOrder === 0) return 0;
      return Math.round((currentStatusConfig.sort_order / maxOrder) * 100);
    }
    const statusProgress: Record<string, number> = {
      draft: 5,
      script_approved: 30,
      assigned: 40,
      recording: 50,
      recorded: 60,
      editing: 70,
      delivered: 80,
      issue: 75,
      approved: 90,
      paid: 100,
    };
    return statusProgress[content.status] || 0;
  };

  const isOverdue = useMemo(() => {
    if (!content.deadline) return false;
    return (
      new Date(content.deadline) < new Date() &&
      !["approved", "paid", "delivered"].includes(content.status)
    );
  }, [content.deadline, content.status]);

  const showField = (field: string) => visibleFields.includes(field);
  const responsible = content.creator || content.editor;
  const hasVideoArea = shouldShowVideoArea(content);
  const hasVideo =
    content.video_url || ((content as any).video_urls?.length ?? 0) > 0;
  const hasRawVideo =
    (content as any).raw_video_urls?.length > 0;
  const primaryVideoUrl = getPrimaryVideoUrl(content);

  const isStale = useMemo(() => {
    if (!content.updated_at) return false;
    const days =
      (Date.now() - new Date(content.updated_at).getTime()) /
      (1000 * 60 * 60 * 24);
    const staleStatuses = ["draft", "assigned", "recording", "editing", "review"];
    return staleStatuses.includes(content.status) && days >= 3;
  }, [content.updated_at, content.status]);

  const isAssignedCreator = userId && content.creator_id === userId;
  const isAssignedEditor = userId && content.editor_id === userId;
  const isAssignedStrategist = userId && content.strategist_id === userId;

  const handleAnalyzeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAnalyzeWithAI?.(content.id, content.title);
  };

  const handleMarketingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowMarketingInfo?.(content);
  };

  // Wrap onStatusChange to show share prompt when content is approved
  const handleStatusChange = useCallback(async (contentId: string, newStatus: ContentStatus) => {
    if (!onStatusChange) return;
    await onStatusChange(contentId, newStatus);
    if (newStatus === 'approved') {
      toast({
        title: "Contenido aprobado",
        description: "Puedes compartirlo en redes sociales",
        action: (
          <ToastAction altText="Compartir en redes" onClick={() => setShowShareDialog(true)}>
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Compartir
          </ToastAction>
        ),
        duration: 8000,
      });
    }
  }, [onStatusChange, toast]);

  const isShareableStatus = ['approved', 'review', 'paid'].includes(content.status);

  const marketingIndicator = (() => {
    if (content.marketing_approved_at)
      return { icon: CheckCircle, color: "#4ade80", label: "Aprobado MKT" };
    if (content.marketing_rejected_at)
      return { icon: XCircle, color: "#f87171", label: "Rechazado MKT" };
    if (content.marketing_campaign_id)
      return { icon: Megaphone, color: "#60a5fa", label: "En Campaña" };
    return null;
  })();

  return (
    <>
      <div
        className={cn(
          "group cursor-pointer relative rounded-lg overflow-visible cursor-grab active:cursor-grabbing",
          "w-full flex flex-col shrink-0 transition-colors duration-150",
          BOARD_CLASSES.card,
          "border",
          hasVideoArea ? "min-h-[420px]" : "min-h-[280px]",
          BOARD_CLASSES.cardHover,
          isDragging && "opacity-70 ring-2 ring-purple-500/30",
          isOverdue && "border-l-4 border-l-red-500",
          isStale && !isOverdue && "border-l-4 border-l-amber-500",
          cardSize === "compact" && "rounded-lg min-h-0"
        )}
        draggable
        onDragStart={onDragStart}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-no-click]")) return;
          if ((e.target as HTMLElement).closest("[data-video-trigger]")) return;
          onClick?.();
        }}
      >
        {/* Drag handle + Social share button + Fields customizer */}
        <div
          data-no-click
          className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          {/* Personalizador de campos - estilo Notion */}
          {showFieldsCustomizer && onVisibleFieldsChange && (
            <CardFieldsCustomizer
              visibleFields={visibleFields}
              onFieldsChange={onVisibleFieldsChange}
              className="opacity-100"
            />
          )}
          {isShareableStatus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-no-click
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 dark:hover:bg-purple-500/40 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-white border border-purple-300 dark:border-purple-500/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareDialog(true);
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Compartir en redes sociales</TooltipContent>
            </Tooltip>
          )}
          <GripVertical className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
        </div>

        {/* AI indicators */}
        {showAIIndicators && (isOverdue || isStale) && (
          <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
            {isOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Proyecto vencido</TooltipContent>
              </Tooltip>
            )}
            {isStale && !isOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm dark:shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                    <Clock4 className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Sin cambios recientes</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Actions menu */}
        {(onAnalyzeWithAI || onShowMarketingInfo) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                data-no-click
                variant="ghost"
                size="icon"
                className="absolute top-2 left-2 h-7 w-7 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-lg bg-zinc-900/30 dark:bg-black/30 hover:bg-zinc-900/50 dark:hover:bg-black/50 text-white"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-[#1f1f2e] border-zinc-200 dark:border-purple-500/30">
              {onShowMarketingInfo && (
                <DropdownMenuItem onClick={handleMarketingClick} className="gap-2 text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-white/10">
                  <Megaphone className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  Ver info Marketing
                </DropdownMenuItem>
              )}
              {onShowMarketingInfo && onAnalyzeWithAI && <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10" />}
              {onAnalyzeWithAI && (
                <DropdownMenuItem onClick={handleAnalyzeClick} className="gap-2 text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-white/10">
                  <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Analizar con IA
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10" />
              <DropdownMenuItem asChild className="gap-2 text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-white/10 p-0">
                <QuickShareButton
                  contentId={content.id}
                  title={content.title || ""}
                  videoUrl={primaryVideoUrl}
                  thumbnailUrl={content.thumbnail_url}
                  caption={content.title || ""}
                  variant="button"
                  className="w-full justify-start gap-2 px-2 py-1.5 h-auto font-normal text-sm border-0 hover:bg-zinc-100 dark:hover:bg-white/10"
                />
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 text-zinc-900 dark:text-zinc-100 focus:bg-zinc-100 dark:focus:bg-white/10 p-0">
                <PromoteContentDialog
                  content={{
                    contentId: content.id,
                    title: content.title || "",
                    videoUrl: content.video_url || (content as any).bunny_embed_url || null,
                    thumbnailUrl: content.thumbnail_url || null,
                    description: content.title || "",
                  }}
                  trigger={
                    <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg">
                      <Megaphone className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      Pautar contenido
                    </button>
                  }
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 1. VIDEO PREVIEW - Solo si shouldShowVideoArea (sin placeholder cuando no hay video) */}
        {cardSize !== "compact" && (
          <KanbanCardVideoPreview
            content={content}
            cardSize={cardSize}
            hooksCount={(content as any).hooks_count}
          />
        )}

        {/* 2. Separator + BODY - layout fluido, pt/mt solo cuando hay video arriba */}
        <div
          className={cn(
            "flex-1 flex flex-col p-4 bg-zinc-50/50 dark:bg-white/[0.02]",
            cardSize !== "compact" && hasVideoArea && "pt-3 mt-3"
          )}
        >
          {/* Title - 2 lines max with ellipsis */}
          {showField("title") && (
            <h4
              className={cn(
                "font-medium line-clamp-2 break-words bg-gradient-to-br from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent",
                sizeConfig.titleSize
              )}
            >
              {content.title}
            </h4>
          )}

          {/* Status badge - margin-top 8px */}
          {showField("status") && (
            <div className="mt-2">
              {showStatusControls && onStatusChange && userRole ? (
                <StatusChangeDropdown
                  currentStatus={content.status as ContentStatus}
                  contentId={content.id}
                  userRole={userRole}
                  isAssignedCreator={isAssignedCreator}
                  isAssignedEditor={isAssignedEditor}
                  isAssignedStrategist={isAssignedStrategist}
                  onStatusChange={handleStatusChange}
                  size={cardSize === "compact" ? "sm" : "default"}
                />
              ) : (
                <Badge
                  className={cn("shrink-0 font-medium", sizeConfig.badgeSize)}
                  style={{
                    background: statusNeon.bg,
                    border: `1px solid ${statusNeon.border}`,
                    color: statusNeon.text,
                    boxShadow: statusNeon.glow,
                  }}
                >
                  {cardSize === "compact" ? statusLabel?.slice(0, 3) : statusLabel}
                </Badge>
              )}
            </div>
          )}

          {/* Sección Equipo: Creador, Editor, Cliente, Fechas - Respeta visibleFields */}
          {cardSize !== "compact" && (showField('creator') || showField('editor') || showField('client')) && (
            <UserAssignmentSection
              content={content}
              creators={creators}
              editors={editors}
              userRole={userRole}
              onAssignCreator={onAssignCreator ? async (userId) => onAssignCreator(content.id, userId) : undefined}
              onAssignEditor={onAssignEditor ? async (userId) => onAssignEditor(content.id, userId) : undefined}
              onUpdate={onUpdate}
              showCreator={showField('creator')}
              showEditor={showField('editor')}
              showClient={showField('client')}
            />
          )}

          {/* Marketing badges - Respetan visibleFields */}
          {((showField('sphere_phase') && content.sphere_phase) ||
            (showField('campaign_week') && content.campaign_week) ||
            (showField('marketing_status') && marketingIndicator)) && (
            <div className={cn("flex flex-wrap items-center mt-3", sizeConfig.spacing)}>
              {showField('sphere_phase') && content.sphere_phase && SPHERE_PHASE_DISPLAY[content.sphere_phase] && (() => {
                const phase = SPHERE_PHASE_DISPLAY[content.sphere_phase];
                const phaseStyle = getSpherePhaseStyle(content.sphere_phase, isDark);
                const Icon = phase.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn(sizeConfig.badgeSize)}
                    style={{
                      backgroundColor: phaseStyle.bg,
                      borderColor: phaseStyle.border,
                      color: phaseStyle.text
                    }}
                  >
                    <Icon className={cn(sizeConfig.iconSize, "mr-0.5")} />
                    {cardSize === "compact" ? phase.shortLabel : phase.label}
                  </Badge>
                );
              })()}
              {showField('campaign_week') && content.campaign_week && (
                <Badge
                  variant="outline"
                  className={cn(sizeConfig.badgeSize, "border-zinc-300 dark:border-white/20 text-zinc-600 dark:text-zinc-400")}
                >
                  <Calendar className={cn(sizeConfig.iconSize, "mr-0.5")} />
                  S{content.campaign_week}
                </Badge>
              )}
              {showField('marketing_status') && marketingIndicator && (() => {
                const MIcon = marketingIndicator.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn(sizeConfig.badgeSize, "border-zinc-300 dark:border-white/20 cursor-pointer")}
                    style={{ color: marketingIndicator.color }}
                    onClick={handleMarketingClick}
                  >
                    <MIcon className={cn(sizeConfig.iconSize, "mr-0.5")} />
                    {cardSize !== "compact" && marketingIndicator.label}
                  </Badge>
                );
              })()}
            </div>
          )}

          {/* Producto y Ángulo de ventas */}
          {((showField('product') && content.product) || (showField('sales_angle') && content.sales_angle)) && (
            <div className={cn("flex flex-wrap items-center mt-2", sizeConfig.spacing)}>
              {showField('product') && content.product && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(sizeConfig.badgeSize, "border-blue-500/30 text-blue-600 dark:text-blue-400 max-w-[120px]")}
                    >
                      <Package className={cn(sizeConfig.iconSize, "mr-0.5 flex-shrink-0")} />
                      <span className="truncate">{content.product.name}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{content.product.name}</TooltipContent>
                </Tooltip>
              )}
              {showField('sales_angle') && content.sales_angle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(sizeConfig.badgeSize, "border-amber-500/30 text-amber-600 dark:text-amber-400 max-w-[100px]")}
                    >
                      <span className="truncate">{content.sales_angle}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">{content.sales_angle}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Sección de Pagos */}
          {((showField('creator_payment') && content.creator_payment != null) ||
            (showField('editor_payment') && content.editor_payment != null) ||
            showField('payment_status') ||
            showField('invoiced')) && (
            <div className={cn("flex flex-wrap items-center mt-2 gap-2", sizeConfig.spacing)}>
              {showField('creator_payment') && content.creator_payment != null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        sizeConfig.badgeSize,
                        content.creator_paid
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "border-zinc-300 dark:border-white/20 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <DollarSign className={cn(sizeConfig.iconSize, "mr-0.5")} />
                      C: ${content.creator_payment.toLocaleString()}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Pago creador {content.creator_paid ? '(Pagado)' : '(Pendiente)'}
                  </TooltipContent>
                </Tooltip>
              )}
              {showField('editor_payment') && content.editor_payment != null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        sizeConfig.badgeSize,
                        content.editor_paid
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "border-zinc-300 dark:border-white/20 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <DollarSign className={cn(sizeConfig.iconSize, "mr-0.5")} />
                      E: ${content.editor_payment.toLocaleString()}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Pago editor {content.editor_paid ? '(Pagado)' : '(Pendiente)'}
                  </TooltipContent>
                </Tooltip>
              )}
              {showField('invoiced') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "flex items-center",
                      content.invoiced ? "text-emerald-500" : "text-zinc-400"
                    )}>
                      <Receipt className={sizeConfig.iconSize} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {content.invoiced ? 'Facturado' : 'Sin facturar'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Puntos UP y Vistas */}
          {((showField('points') && content.up_points) || (showField('views_count') && content.views_count)) && (
            <div className={cn("flex items-center mt-2", sizeConfig.spacing)}>
              {showField('points') && content.up_points != null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <Star className={cn(sizeConfig.iconSize, "fill-current")} />
                      <span className="text-xs font-medium">{content.up_points}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Puntos UP</TooltipContent>
                </Tooltip>
              )}
              {showField('views_count') && content.views_count != null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 text-blue-500 ml-2">
                      <Eye className={sizeConfig.iconSize} />
                      <span className="text-xs font-medium">{content.views_count.toLocaleString()}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Vistas</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

        </div>

        {/* 3. FOOTER */}
        <div className="flex flex-wrap items-center px-3 py-2 border-t border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
          {showField("deadline") && content.deadline && (
            <div
              className={cn(
                "flex items-center ml-auto",
                sizeConfig.spacing,
                isOverdue && "text-red-500 font-medium"
              )}
            >
              <Clock className={cn(sizeConfig.iconSize, "text-purple-600 dark:text-purple-400")} />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {format(new Date(content.deadline), "dd MMM", { locale: es })}
              </span>
            </div>
          )}
          <div className={cn("flex items-center ml-auto", sizeConfig.spacing)}>
            {socialStatus && socialStatus.count > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex items-center gap-0.5">
                    <Share2 className={cn(sizeConfig.iconSize, socialStatus.hasPublished ? "text-emerald-500 dark:text-emerald-400" : "text-purple-600 dark:text-purple-400")} />
                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{socialStatus.count}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {socialStatus.count} publicaci{socialStatus.count === 1 ? 'ón' : 'ones'} social{socialStatus.count === 1 ? '' : 'es'}
                  {socialStatus.hasPublished && ' (publicado)'}
                  {socialStatus.hasScheduled && !socialStatus.hasPublished && ' (programado)'}
                </TooltipContent>
              </Tooltip>
            )}
            {hasRawVideo && (
              <Tooltip>
                <TooltipTrigger>
                  <Video className={cn(sizeConfig.iconSize, "text-orange-500 dark:text-orange-400")} />
                </TooltipTrigger>
                <TooltipContent>Material crudo</TooltipContent>
              </Tooltip>
            )}
            {hasVideo && (
              <Tooltip>
                <TooltipTrigger>
                  <Video className={cn(sizeConfig.iconSize, "text-emerald-500 dark:text-emerald-400 fill-emerald-500/50 dark:fill-emerald-400/50")} />
                </TooltipTrigger>
                <TooltipContent>Video editado</TooltipContent>
              </Tooltip>
            )}
            {content.script && (
              <Tooltip>
                <TooltipTrigger>
                  <FileText className={cn(sizeConfig.iconSize, "text-blue-500 dark:text-blue-400")} />
                </TooltipTrigger>
                <TooltipContent>Tiene guión</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {showField("progress") && (
          <div className="px-4 pb-3">
            <Progress
              value={getProgress()}
              className="h-1.5 bg-zinc-200 dark:bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-pink-600 dark:[&>div]:from-purple-500 dark:[&>div]:to-pink-500"
            />
          </div>
        )}

        {content.is_ambassador_content && (
          <div className="px-3 pb-2">
            <Badge
              variant="outline"
              className={cn("text-amber-600 dark:text-amber-400 border-amber-500/50", sizeConfig.badgeSize)}
            >
              <Crown className="h-3 w-3 mr-0.5" />
              Embajador
            </Badge>
          </div>
        )}

        {showStatusControls && onStatusChange && userRole && cardSize !== "compact" && (
          <div className="p-4 pt-0">
            <QuickStatusButtons
              currentStatus={content.status as ContentStatus}
              contentId={content.id}
              userRole={userRole}
              isAssignedCreator={isAssignedCreator}
              isAssignedEditor={isAssignedEditor}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>

      {/* Standalone Share Dialog (triggered by share button or approval toast) */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-lg max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Compartir en Redes Sociales</DialogTitle>
          </DialogHeader>
          {/* Navigate to Social Hub option */}
          <button
            onClick={() => {
              setShowShareDialog(false);
              navigate('/social-hub', {
                state: {
                  shareContent: {
                    contentId: content.id,
                    title: content.title || "",
                    videoUrl: primaryVideoUrl,
                    thumbnailUrl: content.thumbnail_url || null,
                    caption: content.title || "",
                  },
                },
              });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors duration-150 text-left mb-4"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Crear publicación en Social Hub</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ir al Social Hub con este contenido precargado
              </p>
            </div>
          </button>
          <div className="relative">
            <div className="absolute inset-x-0 top-0 flex items-center gap-2">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] text-muted-foreground uppercase">o publicar rápido</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>
          <div className="pt-4">
            <PostComposer
              initialData={{
                contentId: content.id,
                title: content.title || "",
                videoUrl: primaryVideoUrl,
                thumbnailUrl: content.thumbnail_url || null,
                caption: content.title || "",
              }}
              onSuccess={() => setShowShareDialog(false)}
              onClose={() => setShowShareDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
