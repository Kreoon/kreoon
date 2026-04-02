import { useState } from 'react';
import { Crown, Sparkles, Zap, Check, Lock, Eye, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCreatorPlanFeatures, type CreatorTier } from '@/hooks/useCreatorPlanFeatures';
import type { ProfileTemplate, ProfileBlock } from '../types/profile-builder';
import {
  FREE_TEMPLATES,
  PRO_TEMPLATES,
  PREMIUM_TEMPLATES,
  getRequiredTierForTemplate,
} from './profile-templates';
import { TemplatePreview } from './TemplatePreview';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTemplate?: string;
  onSelectTemplate: (template: ProfileTemplate) => void;
  onUpgradeClick?: () => void;
}

const TIER_CONFIG: Record<
  CreatorTier,
  { label: string; icon: typeof Crown; color: string; bgColor: string }
> = {
  creator_free: {
    label: 'Free',
    icon: Sparkles,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
  },
  creator_pro: {
    label: 'Pro',
    icon: Zap,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  creator_premium: {
    label: 'Premium',
    icon: Crown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
};

function TemplateCard({
  template,
  isSelected,
  isLocked,
  requiredTier,
  onSelect,
  onPreview,
  onUpgrade,
}: {
  template: ProfileTemplate;
  isSelected: boolean;
  isLocked: boolean;
  requiredTier: CreatorTier;
  onSelect: () => void;
  onPreview: () => void;
  onUpgrade: () => void;
}) {
  const tierConfig = TIER_CONFIG[requiredTier];
  const TierIcon = tierConfig.icon;

  return (
    <div
      className={cn(
        'group relative rounded-xl border-2 transition-all overflow-hidden',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : isLocked
            ? 'border-border/50 bg-muted/20 opacity-75'
            : 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
      )}
      onClick={isLocked ? undefined : onSelect}
    >
      {/* Preview Image - Muestra screenshot o miniatura generada */}
      <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden">
        {template.preview ? (
          /* Imagen de mockup */
          <img
            src={template.preview}
            alt={template.label}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          /* Miniatura generada como fallback */
          <div className="w-full h-full overflow-hidden scale-[0.35] origin-top-left" style={{ width: '285%', height: '285%' }}>
            <TemplatePreview template={template} />
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 z-10">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        )}

        {/* Locked badge indicator */}
        {isLocked && (
          <div className="absolute top-2 left-2 z-10">
            <Badge
              variant="outline"
              className={cn(
                'gap-1 text-xs border-0',
                tierConfig.bgColor,
                tierConfig.color
              )}
            >
              <Lock className="h-3 w-3" />
              {tierConfig.label}
            </Badge>
          </div>
        )}

        {/* Preview button on hover - SIEMPRE visible en hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Vista previa
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-sm truncate">{template.label}</h3>
          {requiredTier !== 'creator_free' && (
            <Badge
              variant="outline"
              className={cn(
                'gap-1 text-[10px] flex-shrink-0 border-0',
                tierConfig.bgColor,
                tierConfig.color
              )}
            >
              <TierIcon className="h-2.5 w-2.5" />
              {tierConfig.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>

        {/* Actions */}
        {isLocked && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'w-full mt-3 gap-1.5 text-xs',
              requiredTier === 'creator_premium'
                ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onUpgrade();
            }}
          >
            <TierIcon className="h-3.5 w-3.5" />
            Desbloquear
          </Button>
        )}
      </div>
    </div>
  );
}

export function TemplateSelector({
  open,
  onOpenChange,
  currentTemplate,
  onSelectTemplate,
  onUpgradeClick,
}: TemplateSelectorProps) {
  const { tier, canUseTemplate } = useCreatorPlanFeatures();
  const [previewTemplate, setPreviewTemplate] = useState<ProfileTemplate | null>(null);

  const handleSelect = (template: ProfileTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
  };

  const handlePreview = (template: ProfileTemplate) => {
    setPreviewTemplate(template);
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    onUpgradeClick?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Elegir plantilla</DialogTitle>
            <DialogDescription>
              Selecciona una plantilla para empezar. Puedes personalizarla completamente despues.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* FREE Templates */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium">Plantillas Gratuitas</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {FREE_TEMPLATES.length} disponibles
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {FREE_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.name}
                    template={template}
                    isSelected={currentTemplate === template.name}
                    isLocked={false}
                    requiredTier="creator_free"
                    onSelect={() => handleSelect(template)}
                    onPreview={() => handlePreview(template)}
                    onUpgrade={handleUpgrade}
                  />
                ))}
              </div>
            </div>

            {/* PRO Templates */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-purple-400" />
                  Plantillas Pro
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] border-purple-500/50 text-purple-400 bg-purple-500/10"
                >
                  {PRO_TEMPLATES.length} exclusivas
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {PRO_TEMPLATES.map((template) => {
                  const isLocked = tier === 'creator_free';
                  return (
                    <TemplateCard
                      key={template.name}
                      template={template}
                      isSelected={currentTemplate === template.name}
                      isLocked={isLocked}
                      requiredTier="creator_pro"
                      onSelect={() => handleSelect(template)}
                      onPreview={() => handlePreview(template)}
                      onUpgrade={handleUpgrade}
                    />
                  );
                })}
              </div>
            </div>

            {/* PREMIUM Templates */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-400" />
                  Plantillas Premium
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500/50 text-amber-400 bg-amber-500/10"
                >
                  Todas las funciones
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {PREMIUM_TEMPLATES.map((template) => {
                  const isLocked = tier !== 'creator_premium';
                  return (
                    <TemplateCard
                      key={template.name}
                      template={template}
                      isSelected={currentTemplate === template.name}
                      isLocked={isLocked}
                      requiredTier="creator_premium"
                      onSelect={() => handleSelect(template)}
                      onPreview={() => handlePreview(template)}
                      onUpgrade={handleUpgrade}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Todas las plantillas son completamente personalizables
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - Vista previa visual realista */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: previewTemplate?.config.accentColor + '20' }}
                >
                  <Sparkles
                    className="h-5 w-5"
                    style={{ color: previewTemplate?.config.accentColor }}
                  />
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    {previewTemplate?.label}
                    {previewTemplate && getRequiredTierForTemplate(previewTemplate.name) !== 'creator_free' && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          getRequiredTierForTemplate(previewTemplate.name) === 'creator_premium'
                            ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                            : 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                        )}
                      >
                        {getRequiredTierForTemplate(previewTemplate.name) === 'creator_premium' ? 'Premium' : 'Pro'}
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription>{previewTemplate?.description}</DialogDescription>
                </div>
              </div>

              {/* Badges de info */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {previewTemplate?.blocks.length} bloques
                </Badge>
                {previewTemplate && !previewTemplate.config.showKreoonBranding && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Sin branding
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {previewTemplate && (
            <div className="flex-1 overflow-y-auto bg-zinc-900/50">
              {/* Preview - Imagen de mockup o generada */}
              <div className="p-6">
                {previewTemplate.preview ? (
                  /* Imagen de mockup - Vista completa */
                  <div className="flex justify-center">
                    <div className="max-w-[800px] w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Vista previa del diseño</span>
                      </div>
                      <div className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 bg-zinc-950">
                        <img
                          src={previewTemplate.preview}
                          alt={previewTemplate.label}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Previews generados - Desktop y Mobile */
                  <div className="flex gap-6 justify-center items-start">
                    {/* Desktop Preview */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Desktop</span>
                      </div>
                      <div className="w-[400px] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                        <TemplatePreview template={previewTemplate} />
                      </div>
                    </div>

                    {/* Mobile Preview */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Mobile</span>
                      </div>
                      <div className="w-[220px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                        {/* Phone frame */}
                        <div className="bg-zinc-950 p-1">
                          <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-1" />
                          <TemplatePreview template={previewTemplate} className="rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info panel con bloques incluidos */}
              <div className="p-4 bg-background border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1.5">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: previewTemplate.config.accentColor }}
                      />
                      {previewTemplate.config.accentColor}
                    </Badge>
                    <Badge variant="outline">
                      Tema: {previewTemplate.config.theme}
                    </Badge>
                    <Badge variant="outline">
                      Espaciado: {previewTemplate.config.spacing}
                    </Badge>
                  </div>
                </div>

                {/* Bloques de conversion destacados */}
                {previewTemplate.blocks.some(b =>
                  ['cta_banner', 'lead_form', 'whatsapp_button', 'countdown', 'carousel', 'headline', 'icon_list', 'social_proof'].includes(b.type)
                ) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Bloques avanzados incluidos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewTemplate.blocks
                        .filter(b => ['cta_banner', 'lead_form', 'whatsapp_button', 'countdown', 'carousel', 'social_proof', 'headline', 'icon_list', 'contact', 'social_links'].includes(b.type))
                        .map((block, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] capitalize"
                            style={{
                              borderColor: previewTemplate.config.accentColor + '50',
                              color: previewTemplate.config.accentColor,
                            }}
                          >
                            {block.type.replace(/_/g, ' ')}
                          </Badge>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-2 p-4 border-t bg-background flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              Esta es una vista previa. Podras personalizar todo despues de aplicar la plantilla.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Cerrar
              </Button>
              {previewTemplate && (
                <Button
                  onClick={() => {
                    const requiredTier = getRequiredTierForTemplate(previewTemplate.name);
                    const isLocked =
                      (requiredTier === 'creator_pro' && tier === 'creator_free') ||
                      (requiredTier === 'creator_premium' && tier !== 'creator_premium');

                    if (isLocked) {
                      setPreviewTemplate(null);
                      handleUpgrade();
                    } else {
                      handleSelect(previewTemplate);
                      setPreviewTemplate(null);
                    }
                  }}
                  style={{ backgroundColor: previewTemplate.config.accentColor }}
                  className="text-white"
                >
                  {(() => {
                    const requiredTier = getRequiredTierForTemplate(previewTemplate.name);
                    const isLocked =
                      (requiredTier === 'creator_pro' && tier === 'creator_free') ||
                      (requiredTier === 'creator_premium' && tier !== 'creator_premium');

                    return isLocked ? (
                      <>
                        <Lock className="h-4 w-4 mr-1.5" />
                        Desbloquear plantilla
                      </>
                    ) : (
                      'Usar esta plantilla'
                    );
                  })()}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
