import { Calendar, User, GripVertical, DollarSign, CheckCircle, Video, FileVideo, Crown, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Content, STATUS_LABELS, STATUS_COLORS } from "@/types/database";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay, CurrencyBadge, type CurrencyType } from "@/components/ui/currency-input";

interface DraggableContentCardProps {
  content: Content;
  onDragStart: (e: React.DragEvent, content: Content) => void;
  onClick?: (content: Content) => void;
  isDragging?: boolean;
  onPaymentUpdate?: () => void;
  onStatusChange?: (contentId: string, newStatus: string) => void;
}

export function DraggableContentCard({ 
  content, 
  onDragStart,
  onClick,
  isDragging,
  onPaymentUpdate,
  onStatusChange
}: DraggableContentCardProps) {
  const { isAdmin, isCreator, isEditor, user } = useAuth();
  const { toast } = useToast();

  // Determine what payment to show based on user role
  const isUserCreator = user?.id === content.creator_id;
  const isUserEditor = user?.id === content.editor_id;
  
  const getDisplayPayment = () => {
    if (isAdmin) {
      // Admin sees total
      return {
        value: (content.creator_payment || 0) + (content.editor_payment || 0),
        currency: ((content as any).creator_payment_currency as CurrencyType) || 'COP'
      };
    }
    if (isUserCreator) {
      // Creator sees their payment
      return {
        value: content.creator_payment || 0,
        currency: ((content as any).creator_payment_currency as CurrencyType) || 'COP'
      };
    }
    if (isUserEditor) {
      // Editor sees their payment
      return {
        value: content.editor_payment || 0,
        currency: ((content as any).editor_payment_currency as CurrencyType) || 'COP'
      };
    }
    // Others don't see payment
    return null;
  };
  
  const displayPayment = getDisplayPayment();

  const statusInfo = {
    label: STATUS_LABELS[content.status],
    className: STATUS_COLORS[content.status]
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Sin fecha';
    return format(new Date(date), 'd MMM', { locale: es });
  };

  const getPriorityClass = () => {
    if (!content.deadline) return 'border-l-muted';
    const deadline = new Date(content.deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'border-l-destructive';
    if (diffDays <= 2) return 'border-l-warning';
    return 'border-l-success';
  };

  const handleMarkCreatorPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updates: any = { creator_paid: true };
      
      if (content.editor_paid) {
        updates.status = 'paid';
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: `Creador pagado - $${content.creator_payment}`
      });
      
      onPaymentUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    }
  };

  const handleMarkEditorPaid = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updates: any = { editor_paid: true };
      
      if (content.creator_paid) {
        updates.status = 'paid';
        updates.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Pago registrado",
        description: `Editor pagado - $${content.editor_payment}`
      });
      
      onPaymentUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    }
  };

  // Show pay buttons only for admin on approved content
  const showPayButtons = isAdmin && content.status === 'approved' && (!content.creator_paid || !content.editor_paid);

  // Check if current user is the creator and can change status
  const isCreatorOfContent = isCreator && content.creator_id === user?.id;
  const canStartRecording = isCreatorOfContent && content.status === 'assigned';
  const canMarkRecorded = isCreatorOfContent && content.status === 'recording';

  // Check if current user is the editor and can change status
  const isEditorOfContent = isEditor && content.editor_id === user?.id;
  const canStartEditing = isEditorOfContent && content.status === 'recorded';
  const canMarkDelivered = isEditorOfContent && content.status === 'editing';

  // Check if current user is a client and can approve/reject
  const { isClient } = useAuth();
  const canClientApprove = isClient && (content.status === 'delivered' || content.status === 'corrected');

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, content)}
      onClick={() => onClick?.(content)}
      className={cn(
        "group relative overflow-hidden rounded-lg border-l-4 bg-card border border-border p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-grab active:cursor-grabbing",
        getPriorityClass(),
        isDragging && "opacity-50 scale-95"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusInfo.className
            )}>
              {statusInfo.label}
            </span>
            {content.is_ambassador_content && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
                <Crown className="h-3 w-3" />
                Embajador
              </span>
            )}
          </div>
          
          <h3 className="font-semibold text-card-foreground truncate mb-1">
            {content.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-3 truncate">
            {content.client?.name || 'Sin cliente'}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {content.creator && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{content.creator.full_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(content.deadline)}</span>
            </div>
            {displayPayment && displayPayment.value > 0 && (
              <div className="flex items-center gap-1 text-success">
                <CurrencyDisplay 
                  value={displayPayment.value} 
                  currency={displayPayment.currency}
                  size="sm"
                  showFlag
                />
              </div>
            )}
          </div>

          {/* Video Variants Info */}
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Show hooks/variables count */}
            {(content as any).hooks_count > 1 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Video className="h-3 w-3" />
                {(content as any).hooks_count} variables
              </Badge>
            )}
            
            {/* Show uploaded videos count */}
            {(() => {
              const videoUrls = (content as any).video_urls || [];
              const uploadedCount = videoUrls.filter((url: string) => url && url.trim() !== '').length;
              const totalCount = (content as any).hooks_count || 1;
              
              if (uploadedCount > 0) {
                return (
                  <Badge 
                    variant={uploadedCount === totalCount ? "default" : "secondary"} 
                    className={cn(
                      "text-xs gap-1",
                      uploadedCount === totalCount 
                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    )}
                  >
                    <FileVideo className="h-3 w-3" />
                    {uploadedCount}/{totalCount} videos
                  </Badge>
                );
              }
              return null;
            })()}
            
            {/* Show raw material status */}
            {(content as any).drive_url && (
              <Badge variant="outline" className="text-xs gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                <FileVideo className="h-3 w-3" />
                Material crudo
              </Badge>
            )}
          </div>

          {/* Quick Pay Buttons for Admin */}
          {showPayButtons && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              {!content.creator_paid && content.creator_payment > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkCreatorPaid}
                  className="h-7 px-2 text-xs border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Creador <CurrencyDisplay value={content.creator_payment} currency={((content as any).creator_payment_currency as CurrencyType) || 'COP'} size="sm" />
                </Button>
              )}
              {!content.editor_paid && content.editor_payment > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkEditorPaid}
                  className="h-7 px-2 text-xs border-info/50 text-info hover:bg-info/10 hover:text-info"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Editor <CurrencyDisplay value={content.editor_payment} currency={((content as any).editor_payment_currency as CurrencyType) || 'COP'} size="sm" />
                </Button>
              )}
            </div>
          )}

          {/* Creator Status Change Buttons */}
          {(canStartRecording || canMarkRecorded) && onStatusChange && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              {canStartRecording && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(content.id, 'recording');
                  }}
                  className="h-7 px-2 text-xs border-blue-500/50 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400"
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
                    onStatusChange(content.id, 'recorded');
                  }}
                  className="h-7 px-2 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10 hover:text-green-400"
                >
                  <Video className="h-3 w-3 mr-1" />
                  Marcar Grabado
                </Button>
              )}
            </div>
          )}

          {/* Editor Status Change Buttons */}
          {(canStartEditing || canMarkDelivered) && onStatusChange && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              {canStartEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(content.id, 'editing');
                  }}
                  className="h-8 px-3 text-xs bg-pink-500 text-white hover:bg-pink-600"
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
                    onStatusChange(content.id, 'delivered');
                  }}
                  className="h-8 px-3 text-xs bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  📤 Entregar
                </Button>
              )}
            </div>
          )}

          {/* Client Approve/Reject Buttons */}
          {canClientApprove && onStatusChange && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(content.id, 'approved');
                }}
                className="h-8 px-3 text-xs bg-green-500 text-white hover:bg-green-600 flex-1"
              >
                ✅ Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(content.id, 'issue');
                }}
                className="h-8 px-3 text-xs border-red-500 text-red-500 hover:bg-red-500/10"
              >
                ❌ Novedad
              </Button>
            </div>
          )}
        </div>

        {content.thumbnail_url && (
          <div className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
            <img 
              src={content.thumbnail_url} 
              alt={content.title} 
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
