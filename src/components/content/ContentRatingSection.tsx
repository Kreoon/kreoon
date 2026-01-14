import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentRatingSectionProps {
  contentId: string;
  userId?: string;
  creatorRating?: number | null;
  editorRating?: number | null;
  strategyRating?: number | null;
  hasCreator?: boolean;
  hasEditor?: boolean;
  hasStrategist?: boolean;
  onUpdate?: () => void;
  canRate?: boolean;
}

function StarRating({ 
  value, 
  onChange, 
  disabled = false,
  size = 'sm'
}: { 
  value: number; 
  onChange?: (v: number) => void; 
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={cn(
            "transition-colors",
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star 
            className={cn(
              sizeClass,
              "transition-colors",
              (hover || value) >= star 
                ? "fill-amber-400 text-amber-400" 
                : "fill-transparent text-muted-foreground/40"
            )} 
          />
        </button>
      ))}
    </div>
  );
}

export function ContentRatingSection({
  contentId,
  userId,
  creatorRating,
  editorRating,
  strategyRating,
  hasCreator = true,
  hasEditor = true,
  hasStrategist = true,
  onUpdate,
  canRate = true
}: ContentRatingSectionProps) {
  const { toast } = useToast();
  const [localCreatorRating, setLocalCreatorRating] = useState(creatorRating || 0);
  const [localEditorRating, setLocalEditorRating] = useState(editorRating || 0);
  const [localStrategyRating, setLocalStrategyRating] = useState(strategyRating || 0);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleCreatorChange = (v: number) => {
    setLocalCreatorRating(v);
    setHasChanges(true);
  };

  const handleEditorChange = (v: number) => {
    setLocalEditorRating(v);
    setHasChanges(true);
  };

  const handleStrategyChange = (v: number) => {
    setLocalStrategyRating(v);
    setHasChanges(true);
  };

  const handleSaveRatings = async () => {
    if (!userId) return;
    setSaving(true);
    
    try {
      const updateData: any = {};
      const now = new Date().toISOString();
      
      if (localCreatorRating > 0 && localCreatorRating !== creatorRating) {
        updateData.creator_rating = localCreatorRating;
        updateData.creator_rated_at = now;
        updateData.creator_rated_by = userId;
      }
      
      if (localEditorRating > 0 && localEditorRating !== editorRating) {
        updateData.editor_rating = localEditorRating;
        updateData.editor_rated_at = now;
        updateData.editor_rated_by = userId;
      }
      
      if (localStrategyRating > 0 && localStrategyRating !== strategyRating) {
        updateData.strategy_rating = localStrategyRating;
        updateData.strategy_rated_at = now;
        updateData.strategy_rated_by = userId;
      }

      if (Object.keys(updateData).length === 0) {
        toast({ title: 'No hay cambios para guardar' });
        return;
      }

      const { error } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', contentId);

      if (error) throw error;

      toast({ title: 'Calificaciones guardadas', description: '¡Gracias por tu feedback!' });
      setHasChanges(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving ratings:', error);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hasAnyRating = (creatorRating && creatorRating > 0) || 
                       (editorRating && editorRating > 0) || 
                       (strategyRating && strategyRating > 0);

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Calificar Proyecto
        </h4>
        {hasAnyRating && !hasChanges && (
          <span className="text-xs text-success">✓ Calificado</span>
        )}
      </div>
      
      <div className="space-y-2">
        {hasStrategist && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Estrategia</span>
              <span className="text-[10px] text-muted-foreground/60">Guión, investigación, concepto</span>
            </div>
            <StarRating 
              value={localStrategyRating} 
              onChange={canRate ? handleStrategyChange : undefined}
              disabled={!canRate}
            />
          </div>
        )}
        
        {hasCreator && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Creación</span>
              <span className="text-[10px] text-muted-foreground/60">Grabación, actuación, calidad</span>
            </div>
            <StarRating 
              value={localCreatorRating} 
              onChange={canRate ? handleCreatorChange : undefined}
              disabled={!canRate}
            />
          </div>
        )}
        
        {hasEditor && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Edición</span>
              <span className="text-[10px] text-muted-foreground/60">Montaje, efectos, audio</span>
            </div>
            <StarRating 
              value={localEditorRating} 
              onChange={canRate ? handleEditorChange : undefined}
              disabled={!canRate}
            />
          </div>
        )}
      </div>

      {canRate && hasChanges && (
        <Button 
          size="sm" 
          onClick={handleSaveRatings}
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Guardando...' : 'Guardar Calificaciones'}
        </Button>
      )}
    </div>
  );
}
