import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LazyRichTextEditor as RichTextEditor } from '@/components/ui/lazy-rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard, FieldRow } from '../../components/SectionCard';
import { Shield, Lock, Unlock, CheckCircle, XCircle, AlertTriangle, Settings } from 'lucide-react';
import { SubTabProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_LABELS } from '@/types/database';

export function AdminSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  onUpdate,
  advancedConfig,
  readOnly = false,
}: SubTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  
  // Combine scriptPermissions with readOnly prop for effective edit capability
  const canEdit = scriptPermissions.canEdit('admin') && !readOnly;
  const canLock = scriptPermissions.canLock() && !readOnly;
  const hasContent = !!formData.admin_guidelines?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  const handleToggleLock = async () => {
    // This would update a lock status in the DB
    setIsLocked(!isLocked);
    toast({ 
      title: isLocked ? 'Contenido desbloqueado' : 'Contenido bloqueado',
      description: isLocked ? 'Los editores pueden modificar' : 'Ningún editor puede modificar'
    });
  };

  return (
    <div className="space-y-6">
      {/* Bloque 6 - Contenido Generado por IA */}
      <SectionCard title="Bloque 6 – Administrador / PM" iconEmoji="📋" variant="highlight">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cronograma, responsables, entregables y checklist de revisión generados por IA.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.admin_guidelines || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, admin_guidelines: value }))}
              placeholder="Genera el contenido desde la pestaña IA o escribe aquí el bloque de administración..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <RichTextViewer content={formData.admin_guidelines || ''} maxHeight="" />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-sm">
              <Shield className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm font-medium">Sin contenido generado</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Ve a la pestaña IA para generar el Bloque 6 automáticamente
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Status Overview */}
      <SectionCard title="Estado del Contenido" iconEmoji="📊">
        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-sm">
            <span className="text-sm font-medium">Estado actual</span>
            <Badge variant="outline" className="gap-1">
              {content?.status ? STATUS_LABELS[content.status] || content.status : 'Desconocido'}
            </Badge>
          </div>

          {/* Key Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/30 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">Creado</p>
              <p className="text-sm font-medium">
                {content?.created_at ? new Date(content.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">Actualizado</p>
              <p className="text-sm font-medium">
                {content?.updated_at ? new Date(content.updated_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Approval Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {content?.script_approved_at ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">Guión aprobado</span>
            </div>
            <div className="flex items-center gap-2">
              {content?.approved_at ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">Contenido aprobado</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Lock Control */}
      {canLock && (
        <SectionCard title="Control de Edición" iconEmoji="🔐" variant="highlight">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="h-4 w-4 text-warning" />
                ) : (
                  <Unlock className="h-4 w-4 text-success" />
                )}
                <span className="text-sm font-medium">
                  {isLocked ? 'Edición bloqueada' : 'Edición permitida'}
                </span>
              </div>
              <Switch
                checked={isLocked}
                onCheckedChange={handleToggleLock}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isLocked 
                ? 'Nadie puede editar este contenido hasta que lo desbloquees'
                : 'Los usuarios con permisos pueden editar según su rol'
              }
            </p>
          </div>
        </SectionCard>
      )}

      {/* Warnings */}
      {(!content?.creator_id || !content?.editor_id) && (
        <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-sm">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Asignaciones pendientes</p>
            <p className="text-xs text-muted-foreground mt-1">
              {!content?.creator_id && 'Falta asignar creador. '}
              {!content?.editor_id && 'Falta asignar editor.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
