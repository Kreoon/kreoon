import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Camera, FlaskConical, Dna } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGenerateBanner } from '../hooks/useGenerateBanner';
import { useProductResearchContext } from '../hooks/useProductResearchContext';
import { ImageUploader } from './ImageUploader';
import { OutputSizeSelector } from './OutputSizeSelector';
import { CreditCounter } from './CreditCounter';
import { ResearchFieldsPanel } from './ResearchFieldsPanel';
import { COPY_LANGUAGES, MAX_PRODUCT_IMAGES, STYLE_PRESETS } from '../config';
import type { VisualStyle, ResearchVariables } from '../types/ad-generator.types';

interface BannerGenerationFormProps {
  productId: string;
  organizationId: string;
  clientId?: string | null;
  crmProductId?: string | null;
}

export function BannerGenerationForm({ productId, organizationId, clientId, crmProductId }: BannerGenerationFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const generateBanner = useGenerateBanner();
  const { researchContext, brandDNA, hasResearch, hasDNA, isLoading: loadingResearch, parsedResearch } = useProductResearchContext(crmProductId || null, clientId || null);

  const [referenceImage, setReferenceImage] = useState<string | undefined>();
  const [productImages, setProductImages] = useState<(string | undefined)[]>([undefined, undefined, undefined]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [copyLanguage, setCopyLanguage] = useState('es');
  const [stylePreset, setStylePreset] = useState<VisualStyle>('professional');
  const [customization, setCustomization] = useState('');
  const [researchVars, setResearchVars] = useState<ResearchVariables>({});

  const handleResearchVarChange = (field: keyof ResearchVariables, value: string) => {
    setResearchVars((prev) => ({ ...prev, [field]: value }));
  };

  const setProductImage = (index: number, url: string | undefined) => {
    setProductImages((prev) => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
  };

  const validProductImages = productImages.filter(Boolean) as string[];
  const canGenerate = !generateBanner.isPending;

  const handleGenerate = async () => {
    if (!canGenerate || !profile) return;

    try {
      const result = await generateBanner.mutateAsync({
        organizationId,
        productId,
        userId: profile.id,
        referenceImageUrl: referenceImage,
        productImageUrls: validProductImages,
        aspectRatio,
        copyLanguage,
        stylePreset,
        customization: customization.trim() || undefined,
        researchContext,
        researchVariables: Object.values(researchVars).some(Boolean) ? researchVars : undefined,
        brandDNA,
      });

      toast({
        title: 'Banner generado',
        description: `Generado en ${(result.generation_time_ms / 1000).toFixed(1)}s`,
      });

      setReferenceImage(undefined);
      setCustomization('');
    } catch (err: any) {
      toast({
        title: 'Error al generar',
        description: err.message || 'No se pudo generar el banner.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-muted/20 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Crear Anuncio</h3>
          </div>
          {/* Research badges */}
          {(crmProductId || clientId) && !loadingResearch && (
            <div className="flex items-center gap-1.5">
              {hasResearch && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-green-500/50 text-green-600">
                  <FlaskConical className="h-2.5 w-2.5 mr-0.5" />
                  Investigación conectada
                </Badge>
              )}
              {hasDNA && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-purple-500/50 text-purple-600">
                  <Dna className="h-2.5 w-2.5 mr-0.5" />
                  ADN de marca
                </Badge>
              )}
              {!hasResearch && !hasDNA && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                  Sin investigación
                </Badge>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Sube fotos y genera banners profesionales con Nano Banana Pro AI
          {hasResearch && ' — enriquecido con investigación del CRM'}
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Reference image + Product images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reference image */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Imagen de referencia (opcional)</Label>
            <ImageUploader
              value={referenceImage}
              onChange={setReferenceImage}
              label="Estilo / Layout de referencia"
              storagePath={`references/${organizationId}`}
            />
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              Sube una imagen de referencia para que el AI copie el estilo y composición.
            </p>
          </div>

          {/* Product images */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium">Fotos del producto</Label>
              <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 bg-muted/50 rounded">Opcional</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: MAX_PRODUCT_IMAGES }).map((_, i) => (
                <ImageUploader
                  key={i}
                  value={productImages[i]}
                  onChange={(url) => setProductImage(i, url)}
                  label={`Imagen ${i + 1}`}
                  storagePath={`products/${organizationId}`}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              Sube fotos del producto, logo o elementos visuales para incluirlos en el banner.
            </p>
          </div>
        </div>

        {/* Research variable selectors */}
        {(hasResearch || hasDNA) && (
          <ResearchFieldsPanel
            parsedResearch={parsedResearch}
            brandDNA={brandDNA}
            values={researchVars}
            onChange={handleResearchVarChange}
          />
        )}

        {/* Size, Language, Style row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OutputSizeSelector value={aspectRatio} onChange={setAspectRatio} />
          <div className="space-y-1.5">
            <Label className="text-xs">Idioma del copy</Label>
            <Select value={copyLanguage} onValueChange={setCopyLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COPY_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Estilo visual</Label>
            <Select value={stylePreset} onValueChange={(v) => setStylePreset(v as VisualStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_PRESETS.map((style) => (
                  <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Customization — always visible when style is "custom", optional otherwise */}
        {stylePreset === 'custom' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Instrucciones adicionales</Label>
            <Textarea
              placeholder="Describe el estilo que quieres: colores, composición, fondo, ambiente..."
              value={customization}
              onChange={(e) => setCustomization(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        )}

        {/* Generate button + credits */}
        <div className="space-y-3 pt-1">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-12"
          >
            {generateBanner.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Generando... <span className="text-xs opacity-70">10-30 segundos</span></span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Banner
              </>
            )}
          </Button>
          <CreditCounter organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}
