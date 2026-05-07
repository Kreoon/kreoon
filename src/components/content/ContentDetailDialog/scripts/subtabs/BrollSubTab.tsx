import { LazyRichTextEditor as RichTextEditor } from '@/components/ui/lazy-rich-text-editor';
import { RichTextViewer } from '@/components/scripts/RichTextViewer';
import { SectionCard } from '../../components/SectionCard';
import { Film, Video, Camera, Lightbulb } from 'lucide-react';
import { SubTabProps } from './types';

export function BrollSubTab({
  content,
  formData,
  setFormData,
  editMode,
  scriptPermissions,
  advancedConfig,
  readOnly = false,
}: SubTabProps) {
  const canEdit = scriptPermissions.canEdit('director') && !readOnly;
  const hasContent = !!formData.broll_output?.trim();
  const editorFeatures = advancedConfig?.text_editor_features;

  return (
    <div className="space-y-6">
      {/* B-Roll Output */}
      <SectionCard title="Ideas de B-Roll" iconEmoji="🎬">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tomas de cobertura (B-Roll) para intercalar con el creador hablando a cámara.
            Hace el video más dinámico y profesional.
          </p>

          {editMode && canEdit ? (
            <RichTextEditor
              content={formData.broll_output || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, broll_output: value }))}
              placeholder="Ideas de B-Roll: tomas de producto, contexto, proceso..."
              features={editorFeatures}
            />
          ) : hasContent ? (
            <RichTextViewer content={formData.broll_output || ''} maxHeight="" />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-sm">
              <Film className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">Sin ideas de B-Roll</p>
              <p className="text-muted-foreground text-xs mt-1">Genera desde la pestaña IA</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Quick Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Planos</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>PD</strong> - Primer Detalle</li>
            <li><strong>PP</strong> - Primer Plano</li>
            <li><strong>PM</strong> - Plano Medio</li>
            <li><strong>PE</strong> - Plano Entero</li>
          </ul>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Tipos de Tomas</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <strong>Producto:</strong> Hero shots, close-ups</li>
            <li>• <strong>Lifestyle:</strong> Contexto de uso</li>
            <li>• <strong>Proceso:</strong> Aplicación paso a paso</li>
          </ul>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Film className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Duración</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• 2-5 segundos por toma</li>
            <li>• Cambio visual cada 3-5s</li>
            <li>• 10-14 B-Rolls total</li>
          </ul>
        </div>

        <div className="p-4 bg-muted/30 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Tips</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• 1080p mínimo (4K ideal)</li>
            <li>• 30-60 FPS</li>
            <li>• Bloquear exposición</li>
          </ul>
        </div>
      </div>

      {/* Setup Guide */}
      <SectionCard title="Guía de Setup" iconEmoji="📱">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-sm border border-green-200 dark:border-green-800">
            <p className="font-medium text-sm text-green-800 dark:text-green-200 mb-1">Setup 1: Cenital</p>
            <p className="text-xs text-green-700 dark:text-green-300">Celular arriba mirando hacia abajo. Ideal para productos planos, unboxing, manos trabajando.</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-sm border border-blue-200 dark:border-blue-800">
            <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-1">Setup 2: Lateral</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">Celular a nivel del producto. Ideal para hero shots, packaging, comparativas.</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-sm border border-purple-200 dark:border-purple-800">
            <p className="font-medium text-sm text-purple-800 dark:text-purple-200 mb-1">Setup 3: En uso</p>
            <p className="text-xs text-purple-700 dark:text-purple-300">Celular capturando aplicación/uso. Ideal para demos, antes/después, lifestyle.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
