import { useMemo, useState } from "react";
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
import { TECH_COLORS, getStatusNeonStyle } from "./kanbanTechStyles";
import { motion } from "framer-motion";

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
  visibleFields = ["title", "status", "client", "deadline", "creator", "editor"],
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
}: EnhancedContentCardProps) {
  const sizeConfig = SIZE_CONFIG[cardSize] || SIZE_CONFIG.normal;

  const currentStatusConfig = useMemo(
    () => organizationStatuses.find((s) => s.status_key === content.status),
    [organizationStatuses, content.status]
  );

  const statusLabel =
    currentStatusConfig?.label || STATUS_LABELS[content.status] || content.status;
  const statusNeon = getStatusNeonStyle(
    content.status,
    currentStatusConfig?.color
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

  const marketingIndicator = (() => {
    if (content.marketing_approved_at)
      return { icon: CheckCircle, color: "#4ade80", label: "Aprobado MKT" };
    if (content.marketing_rejected_at)
      return { icon: XCircle, color: "#f87171", label: "Rechazado MKT" };
    if (content.marketing_campaign_id)
      return { icon: Megaphone, color: "#60a5fa", label: "En Campaña" };
    return null;
  })();

  const cardBaseStyle = {
    background: TECH_COLORS.card,
    backdropFilter: "blur(16px) saturate(180%)",
    border: `1px solid ${TECH_COLORS.border}`,
    boxShadow: `0 0 20px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "group cursor-pointer relative rounded-xl overflow-visible cursor-grab active:cursor-grabbing",
          "w-full flex flex-col shrink-0 transition-[min-height] duration-300 ease-out",
          hasVideoArea ? "min-h-[420px]" : "min-h-[280px]",
          "hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
          "hover:border-[rgba(168,85,247,0.5)]",
          isDragging && "opacity-70 scale-[0.98] shadow-[0_0_25px_rgba(168,85,247,0.3)]",
          isOverdue && "border-l-4 border-l-[#ef4444]",
          isStale && !isOverdue && "border-l-4 border-l-[#f59e0b]",
          cardSize === "compact" && "rounded-lg min-h-0"
        )}
        style={cardBaseStyle}
        draggable
        onDragStart={onDragStart}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-no-click]")) return;
          if ((e.target as HTMLElement).closest("[data-video-trigger]")) return;
          onClick?.();
        }}
      >
        {/* Drag handle */}
        <div
          data-no-click
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-[#cbd5e1]" />
        </div>

        {/* AI indicators */}
        {showAIIndicators && (isOverdue || isStale) && (
          <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
            {isOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ef4444]/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    <AlertTriangle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Proyecto vencido</TooltipContent>
              </Tooltip>
            )}
            {isStale && !isOverdue && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f59e0b]/90 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]">
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
                className="absolute top-2 left-2 h-7 w-7 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/30 hover:bg-black/50 text-white"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-popover border-[#8b5cf6]/30">
              {onShowMarketingInfo && (
                <DropdownMenuItem onClick={handleMarketingClick} className="gap-2 text-[#f8fafc] focus:bg-white/10">
                  <Megaphone className="h-4 w-4 text-[#60a5fa]" />
                  Ver info Marketing
                </DropdownMenuItem>
              )}
              {onShowMarketingInfo && onAnalyzeWithAI && <DropdownMenuSeparator className="bg-white/10" />}
              {onAnalyzeWithAI && (
                <DropdownMenuItem onClick={handleAnalyzeClick} className="gap-2 text-[#f8fafc] focus:bg-white/10">
                  <Brain className="h-4 w-4 text-[#a855f7]" />
                  Analizar con IA
                </DropdownMenuItem>
              )}
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
            "flex-1 flex flex-col p-4",
            cardSize !== "compact" && hasVideoArea && "pt-3 mt-3"
          )}
          style={{ background: TECH_COLORS.cardBody }}
        >
          {/* Title - 2 lines max with ellipsis */}
          {showField("title") && (
            <h4
              className={cn(
                "font-medium line-clamp-2 break-words",
                sizeConfig.titleSize
              )}
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
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
                  onStatusChange={onStatusChange}
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

          {/* Sección Equipo: Creador, Editor, Cliente, Fechas */}
          {cardSize !== "compact" && (
            <UserAssignmentSection
              content={content}
              creators={creators}
              editors={editors}
              userRole={userRole}
              onAssignCreator={onAssignCreator ? async (userId) => onAssignCreator(content.id, userId) : undefined}
              onAssignEditor={onAssignEditor ? async (userId) => onAssignEditor(content.id, userId) : undefined}
              onUpdate={onUpdate}
            />
          )}

          {(content.sphere_phase || content.campaign_week || marketingIndicator) && (
            <div className={cn("flex flex-wrap items-center mt-3", sizeConfig.spacing)}>
              {content.sphere_phase && SPHERE_PHASE_DISPLAY[content.sphere_phase] && (() => {
                const phase = SPHERE_PHASE_DISPLAY[content.sphere_phase];
                const Icon = phase.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn(sizeConfig.badgeSize, "border-white/20")}
                    style={{ color: phase.color }}
                  >
                    <Icon className={cn(sizeConfig.iconSize, "mr-0.5")} />
                    {cardSize === "compact" ? phase.shortLabel : phase.label}
                  </Badge>
                );
              })()}
              {content.campaign_week && (
                <Badge
                  variant="outline"
                  className={cn(sizeConfig.badgeSize, "border-white/20 text-[#cbd5e1]")}
                >
                  <Calendar className={cn(sizeConfig.iconSize, "mr-0.5")} />
                  S{content.campaign_week}
                </Badge>
              )}
              {marketingIndicator && (() => {
                const MIcon = marketingIndicator.icon;
                return (
                  <Badge
                    variant="outline"
                    className={cn(sizeConfig.badgeSize, "border-white/20 cursor-pointer")}
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

        </div>

        {/* 3. FOOTER */}
        <div
          className="flex flex-wrap items-center px-3 py-2 border-t border-white/5"
          style={{
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(8px)",
          }}
        >
          {showField("deadline") && content.deadline && (
            <div
              className={cn(
                "flex items-center ml-auto",
                sizeConfig.spacing,
                isOverdue && "text-[#f87171] font-medium"
              )}
            >
              <Clock className={cn(sizeConfig.iconSize, "text-[#8b5cf6]")} />
              <span className="text-xs text-[#cbd5e1]">
                {format(new Date(content.deadline), "dd MMM", { locale: es })}
              </span>
            </div>
          )}
          <div className={cn("flex items-center ml-auto", sizeConfig.spacing)}>
            {hasRawVideo && (
              <Tooltip>
                <TooltipTrigger>
                  <Video className={cn(sizeConfig.iconSize, "text-orange-400")} />
                </TooltipTrigger>
                <TooltipContent>Material crudo</TooltipContent>
              </Tooltip>
            )}
            {hasVideo && (
              <Tooltip>
                <TooltipTrigger>
                  <Video className={cn(sizeConfig.iconSize, "text-emerald-400 fill-emerald-400/50")} />
                </TooltipTrigger>
                <TooltipContent>Video editado</TooltipContent>
              </Tooltip>
            )}
            {content.script && (
              <Tooltip>
                <TooltipTrigger>
                  <FileText className={cn(sizeConfig.iconSize, "text-[#60a5fa]")} />
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
              className="h-1.5 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-[#8b5cf6] [&>div]:to-[#ec4899]"
            />
          </div>
        )}

        {content.is_ambassador_content && (
          <div className="px-3 pb-2">
            <Badge
              variant="outline"
              className={cn("text-amber-400 border-amber-500/50", sizeConfig.badgeSize)}
              style={{ boxShadow: "0 0 10px rgba(245,158,11,0.3)" }}
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
              onStatusChange={onStatusChange}
            />
          </div>
        )}
      </motion.div>
    </>
  );
}
