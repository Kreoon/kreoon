import { useState } from "react";
import {
  Calendar,
  User,
  GripVertical,
  CheckCircle,
  Video,
  FileVideo,
  Crown,
  Circle,
  Clock,
  Tag,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Content, STATUS_LABELS } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  CurrencyDisplay,
  type CurrencyType,
} from "@/components/ui/currency-input";
import { motion } from "framer-motion";
import { KanbanVideoModal } from "@/components/board/KanbanVideoModal";
import { getStatusNeonStyle, TECH_COLORS } from "@/components/board/kanbanTechStyles";

interface DraggableContentCardProps {
  content: Content;
  onDragStart: (e: React.DragEvent, content: Content) => void;
  onClick?: (content: Content) => void;
  isDragging?: boolean;
  onPaymentUpdate?: () => void;
  onStatusChange?: (contentId: string, newStatus: string) => void;
}

function getPrimaryVideoUrl(content: Content): string | null {
  const urls = (content as any).video_urls;
  if (urls?.length > 0) {
    const first = urls.find((u: string) => u?.trim());
    if (first) return first;
  }
  return (content as any).video_url || (content as any).bunny_embed_url || null;
}

export function DraggableContentCard({
  content,
  onDragStart,
  onClick,
  isDragging,
  onPaymentUpdate,
  onStatusChange,
}: DraggableContentCardProps) {
  const { isAdmin, isCreator, isEditor, isClient, user } = useAuth();
  const { isImpersonating, effectiveRoles, impersonationTarget } =
    useImpersonation();
  const { toast } = useToast();

  const [showVideoModal, setShowVideoModal] = useState(false);
  const effectiveIsClient =
    isImpersonating ?
      effectiveRoles.includes("client") || impersonationTarget?.role === "client"
    : isClient;
  const effectiveIsAdmin =
    isImpersonating ?
      effectiveRoles.includes("admin") || impersonationTarget?.role === "admin"
    : isAdmin;
  const effectiveIsCreator =
    isImpersonating ?
      effectiveRoles.includes("creator") || impersonationTarget?.role === "creator"
    : isCreator;
  const effectiveIsEditor =
    isImpersonating ?
      effectiveRoles.includes("editor") || impersonationTarget?.role === "editor"
    : isEditor;

  const isUserCreator = user?.id === content.creator_id;
  const isUserEditor = user?.id === content.editor_id;

  const getDisplayPayment = () => {
    if (effectiveIsClient) return null;
    if (effectiveIsAdmin) {
      return {
        value: (content.creator_payment || 0) + (content.editor_payment || 0),
        currency:
          ((content as any).creator_payment_currency as CurrencyType) || "COP",
      };
    }
    if (isUserCreator && effectiveIsCreator) {
      return {
        value: content.creator_payment || 0,
        currency:
          ((content as any).creator_payment_currency as CurrencyType) || "COP",
      };
    }
    if (isUserEditor && effectiveIsEditor) {
      return {
        value: content.editor_payment || 0,
        currency:
          ((content as any).editor_payment_currency as CurrencyType) || "COP",
      };
    }
    return null;
  };

  const displayPayment = getDisplayPayment();
  const statusNeon = getStatusNeonStyle(content.status);
  const primaryVideoUrl = getPrimaryVideoUrl(content);

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM", { locale: es });
  };

  const handleMarkCreatorPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updates: any = { creator_paid: true };
      if (content.editor_paid) {
        updates.status = "paid";
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("content")
        .update(updates)
        .eq("id", content.id);
      if (error) throw error;
      toast({ title: "Pago registrado", description: `Creador pagado` });
      onPaymentUpdate?.();
    } catch {
      toast({ title: "Error", description: "No se pudo registrar el pago", variant: "destructive" });
    }
  };

  const handleMarkEditorPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updates: any = { editor_paid: true };
      if (content.creator_paid) {
        updates.status = "paid";
        updates.paid_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("content")
        .update(updates)
        .eq("id", content.id);
      if (error) throw error;
      toast({ title: "Pago registrado", description: `Editor pagado` });
      onPaymentUpdate?.();
    } catch {
      toast({ title: "Error", description: "No se pudo registrar el pago", variant: "destructive" });
    }
  };

  const showPayButtons =
    effectiveIsAdmin &&
    !effectiveIsClient &&
    content.status === "approved" &&
    (!content.creator_paid || !content.editor_paid);

  const isCreatorOfContent =
    effectiveIsCreator && !effectiveIsClient && content.creator_id === user?.id;
  const canStartRecording = isCreatorOfContent && content.status === "assigned";
  const canMarkRecorded = isCreatorOfContent && content.status === "recording";

  const isEditorOfContent =
    effectiveIsEditor && !effectiveIsClient && content.editor_id === user?.id;
  const canStartEditing = isEditorOfContent && content.status === "recorded";
  const canMarkDelivered = isEditorOfContent && content.status === "editing";

  const canClientApprove =
    effectiveIsClient &&
    (content.status === "delivered" || content.status === "corrected");

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryVideoUrl) {
      setShowVideoModal(true);
    } else {
      onClick?.(content);
    }
  };

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
        draggable
        onDragStart={(e) => onDragStart(e, content)}
        onClick={() => onClick?.(content)}
        className={cn(
          "group relative overflow-visible rounded-xl cursor-grab active:cursor-grabbing",
          "w-full min-h-[420px] flex flex-col shrink-0",
          "transition-all duration-300 ease-out",
          "hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
          "hover:border-[rgba(168,85,247,0.5)]",
          isDragging && "opacity-70 scale-[0.98] shadow-[0_0_25px_rgba(168,85,247,0.3)]"
        )}
        style={cardBaseStyle}
      >
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-[#cbd5e1]" />
        </div>

        {/* 1. VIDEO THUMBNAIL - 9:16 vertical, centered, 280px */}
        <div className="flex justify-center p-4 pt-4 pb-0">
          <div
            onClick={handleVideoClick}
            className="relative overflow-hidden rounded-xl shrink-0 cursor-pointer w-[157px] h-[280px] aspect-[9/16]"
            style={{ minWidth: 157 }}
          >
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1a0a2e] to-[#0a0118] flex items-center justify-center">
                <Video className="h-12 w-12 text-[#8b5cf6]/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
            {primaryVideoUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 0 20px rgba(168,85,247,0.6)",
                  }}
                >
                  <Play className="h-6 w-6 text-[#a855f7] fill-[#a855f7] ml-1" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. BODY */}
        <div
          className="flex-1 flex flex-col p-4 pt-3 mt-3"
          style={{ background: TECH_COLORS.cardBody }}
        >
          <h3
            className="font-semibold line-clamp-2 break-words text-sm"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {content.title}
          </h3>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              className="text-xs px-2 py-0.5 font-medium shrink-0"
              style={{
                background: statusNeon.bg,
                border: `1px solid ${statusNeon.border}`,
                color: statusNeon.text,
                boxShadow: statusNeon.glow,
              }}
            >
              {STATUS_LABELS[content.status]}
            </Badge>
            {!effectiveIsClient && content.is_ambassador_content && (
              <Badge
                variant="outline"
                className="text-xs border-amber-500/50 text-amber-400"
                style={{ boxShadow: "0 0 10px rgba(245,158,11,0.3)" }}
              >
                <Crown className="h-3 w-3 mr-0.5" />
                Embajador
              </Badge>
            )}
          </div>

          {effectiveIsClient ? (
            (content as any).product?.name && (
              <Badge
                variant="outline"
                className="text-xs gap-1 mt-3 border-white/20 text-[#cbd5e1]"
              >
                <Tag className="h-3 w-3" />
                {(content as any).product.name}
              </Badge>
            )
          ) : (
            <p className="text-xs text-[#cbd5e1] mt-3 truncate">
              {content.client?.name || "Sin cliente"}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-[#cbd5e1] mt-3">
            {!effectiveIsClient && content.creator && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-[#8b5cf6]" />
                <span className="truncate max-w-[100px]">{content.creator.full_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#8b5cf6]" />
              <span>{formatDate(content.deadline)}</span>
            </div>
            {!effectiveIsClient && displayPayment && displayPayment.value > 0 && (
              <div className="flex items-center gap-1 text-emerald-400">
                <CurrencyDisplay
                  value={displayPayment.value}
                  currency={displayPayment.currency}
                  size="sm"
                  showFlag
                />
              </div>
            )}
            {effectiveIsClient && content.created_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#8b5cf6]" />
                <span>Creado {formatDate(content.created_at)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {(content as any).hooks_count > 1 && (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-white/20 text-[#cbd5e1]"
              >
                <Video className="h-3 w-3" />
                {(content as any).hooks_count}{" "}
                {effectiveIsClient ? "versiones" : "variables"}
              </Badge>
            )}
            {(() => {
              const videoUrls = (content as any).video_urls || [];
              const uploadedCount = videoUrls.filter(
                (url: string) => url?.trim() !== ""
              ).length;
              const totalCount = (content as any).hooks_count || 1;
              if (uploadedCount > 0) {
                return (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs gap-1",
                      uploadedCount === totalCount
                        ? "border-emerald-500/50 text-emerald-400"
                        : "border-amber-500/50 text-amber-400"
                    )}
                  >
                    <FileVideo className="h-3 w-3" />
                    {uploadedCount}/{totalCount} videos
                  </Badge>
                );
              }
              return null;
            })()}
            {!effectiveIsClient && (content as any).drive_url && (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-blue-500/50 text-blue-400"
              >
                <FileVideo className="h-3 w-3" />
                Material crudo
              </Badge>
            )}
          </div>
        </div>

        {/* 3. FOOTER - Action Buttons */}
        {(showPayButtons ||
          (canStartRecording || canMarkRecorded) ||
          (canStartEditing || canMarkDelivered) ||
          canClientApprove) && (
          <div
            className="px-4 py-3 mt-auto border-t border-white/5 flex flex-wrap gap-2"
            style={{
              background: "rgba(255,255,255,0.02)",
              backdropFilter: "blur(8px)",
            }}
          >
            {showPayButtons && (
              <>
                {!content.creator_paid && content.creator_payment > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkCreatorPaid}
                    className="h-7 px-2 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Creador{" "}
                    <CurrencyDisplay
                      value={content.creator_payment}
                      currency={
                        ((content as any).creator_payment_currency as CurrencyType) ||
                        "COP"
                      }
                      size="sm"
                    />
                  </Button>
                )}
                {!content.editor_paid && content.editor_payment > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkEditorPaid}
                    className="h-7 px-2 text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Editor{" "}
                    <CurrencyDisplay
                      value={content.editor_payment}
                      currency={
                        ((content as any).editor_payment_currency as CurrencyType) ||
                        "COP"
                      }
                      size="sm"
                    />
                  </Button>
                )}
              </>
            )}
            {(canStartRecording || canMarkRecorded) && onStatusChange && (
              <>
                {canStartRecording && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(content.id, "recording");
                    }}
                    className="h-7 px-2 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Circle className="h-3 w-3 mr-1 fill-current animate-pulse" />
                    Iniciar Grabación
                  </Button>
                )}
                {canMarkRecorded && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(content.id, "recorded");
                    }}
                    className="h-7 px-2 text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Marcar Grabado
                  </Button>
                )}
              </>
            )}
            {(canStartEditing || canMarkDelivered) && onStatusChange && (
              <>
                {canStartEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(content.id, "editing");
                    }}
                    className="h-7 px-2 text-xs border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                  >
                    ✂️ Iniciar Edición
                  </Button>
                )}
                {canMarkDelivered && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(content.id, "delivered");
                    }}
                    className="h-7 px-2 text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    📤 Entregar
                  </Button>
                )}
              </>
            )}
            {canClientApprove && onStatusChange && (
              <div className="flex gap-2 w-full">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(content.id, "approved");
                  }}
                  className="flex-1 h-8 text-xs bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                >
                  ✅ Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(content.id, "issue");
                  }}
                  className="flex-1 h-8 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  ❌ Novedad
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <KanbanVideoModal
        open={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoUrl={primaryVideoUrl}
        posterUrl={content.thumbnail_url}
        title={content.title}
      />
    </>
  );
}
