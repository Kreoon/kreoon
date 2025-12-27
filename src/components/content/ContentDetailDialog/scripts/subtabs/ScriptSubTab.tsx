import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { TeleprompterMode } from '@/components/content/TeleprompterMode';
import { CommentsSection } from '@/components/content/CommentsSection';
import { SectionCard } from '../../components/SectionCard';
import { CheckCircle, FileText, Tv } from 'lucide-react';
import { SubTabProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function ScriptSubTab({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  onUpdate,
  scriptPermissions,
  advancedConfig,
}: SubTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  
  const canEdit = scriptPermissions.canEdit('script');
  const canApprove = scriptPermissions.canApprove();
  const isReadOnly = scriptPermissions.isReadOnly('script');
  const hasScript = !!formData.script?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  const handleApproveScript = async () => {
    if (!content?.id) return;
    try {
      const { error } = await supabase
        .from('content')
        .update({
          script_approved_at: new Date().toISOString(),
          script_approved_by: user?.id,
        })
        .eq('id', content.id);

      if (error) throw error;
      toast({ title: 'Guión aprobado' });
      onUpdate?.();
    } catch (err) {
      toast({ title: 'Error al aprobar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Content */}
      <SectionCard title="Guión Completo" iconEmoji="📝">
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {content?.script_approved_at && (
                <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3" />
                  Aprobado
                </Badge>
              )}
            </div>
            {hasScript && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTeleprompter(true)}
                className="gap-1"
              >
                <Tv className="h-4 w-4" />
                Teleprompter
              </Button>
            )}
          </div>

          {/* Script editor/viewer */}
          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.script || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, script: value }))}
              placeholder="Escribe el guión aquí..."
              features={editorFeatures}
            />
          ) : hasScript ? (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-lg p-4">
              <RichTextViewer content={formData.script || ''} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No hay guión todavía</p>
              <p className="text-xs text-muted-foreground mt-1">
                Genera uno desde la pestaña IA
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Script Approval */}
      {canApprove && hasScript && !content?.script_approved_at && (
        <SectionCard title="Aprobación" iconEmoji="✅" variant="highlight">
          <p className="text-sm text-muted-foreground mb-3">
            ¿El guión está listo para producción?
          </p>
          <Button onClick={handleApproveScript} className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aprobar Guión
          </Button>
        </SectionCard>
      )}

      {content?.script_approved_at && (
        <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm">Guión aprobado</span>
          <Badge variant="secondary" className="ml-auto">
            {new Date(content.script_approved_at).toLocaleDateString()}
          </Badge>
        </div>
      )}

      {/* Comments */}
      {content?.id && (
        <SectionCard title="Comentarios del Guión" iconEmoji="💬">
          <CommentsSection contentId={content.id} />
        </SectionCard>
      )}

      {/* Teleprompter Modal */}
      <TeleprompterMode
        content={formData.script || ''}
        isOpen={showTeleprompter}
        onClose={() => setShowTeleprompter(false)}
      />
    </div>
  );
}
