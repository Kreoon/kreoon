/**
 * Renderizador de perfiles usando plantillas del Profile Builder.
 *
 * Combina:
 * - Estructura visual de la plantilla (bloques, colores, layout)
 * - Datos reales del creador (portfolio, servicios, reviews)
 *
 * Plantilla por defecto: Profesional B2B
 */

import { useMemo, Suspense } from 'react';
import { Loader2, AlertCircle, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCreatorPublicProfile } from '@/hooks/useCreatorPublicProfile';
import { PROFILE_TEMPLATES, getTemplateByName } from '@/lib/profile-builder/templates';
import { generateBlocksFromTemplate, type CreatorDataForTemplate } from '@/lib/profile-builder/generateBlocksFromTemplate';
import { CreatorThemeProvider } from './CreatorThemeProvider';
import { PublicBlockRenderer } from './PublicBlockRenderer';
import type { ProfileBlock, ProfileTemplate } from '@/components/profile-builder/types/profile-builder';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplateProfileRendererProps {
  /** ID del creator_profile (UUID) */
  creatorProfileId: string;
  /** Nombre de plantilla a usar (default: profesional) */
  templateName?: string;
  /** Mostrar boton de volver */
  showBackButton?: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 animate-pulse" aria-busy="true">
      {/* Hero skeleton */}
      <div className="h-80 w-full bg-zinc-800/50" />
      {/* Content skeletons */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-zinc-800/40" />
        ))}
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ProfileError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-semibold text-zinc-100">Perfil no disponible</h2>
        <p className="text-sm text-zinc-400">{message}</p>
        <Button variant="outline" onClick={onBack}>
          Volver al Marketplace
        </Button>
      </div>
    </div>
  );
}

// ─── Branding Footer ──────────────────────────────────────────────────────────

function KreoonBranding() {
  return (
    <footer className="py-6 text-center border-t border-white/5" aria-label="Powered by Kreoon">
      <a
        href="https://kreoon.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Zap className="h-3.5 w-3.5" />
        <span>
          Creado con <strong className="font-semibold">Kreoon</strong>
        </span>
      </a>
    </footer>
  );
}

// ─── Back Button ──────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="fixed top-4 left-4 z-50">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className={cn(
          'h-10 w-10 rounded-full',
          'bg-black/50 backdrop-blur-sm',
          'text-white hover:bg-black/70 hover:text-white',
          'border border-white/10',
          'shadow-lg'
        )}
        aria-label="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function TemplateProfileRenderer({
  creatorProfileId,
  templateName = 'profesional',
  showBackButton = true,
}: TemplateProfileRendererProps) {
  const navigate = useNavigate();

  // 1. Cargar datos del creador
  const {
    data: creatorData,
    loading,
    error,
  } = useCreatorPublicProfile(creatorProfileId);

  // 2. Obtener plantilla (default: profesional)
  const template = useMemo<ProfileTemplate>(() => {
    // Si el creador tiene plantilla guardada, usar esa
    const savedTemplate = (creatorData?.profile as any)?.builder_template;
    if (savedTemplate) {
      const found = getTemplateByName(savedTemplate);
      if (found) return found;
    }
    // Usar la plantilla especificada o profesional por defecto
    return getTemplateByName(templateName) ?? PROFILE_TEMPLATES.find((t) => t.name === 'profesional')!;
  }, [creatorData, templateName]);

  // 3. Convertir datos a formato para plantilla
  const templateData = useMemo<CreatorDataForTemplate | null>(() => {
    if (!creatorData) return null;
    return {
      profile: creatorData.profile,
      portfolioItems: creatorData.portfolioItems,
      services: creatorData.services,
      reviews: creatorData.reviews,
      trustStats: creatorData.trustStats,
      specializations: creatorData.specializations,
    };
  }, [creatorData]);

  // 4. Generar bloques usando plantilla + datos
  const blocks = useMemo<ProfileBlock[]>(() => {
    if (!templateData || !template) return [];
    return generateBlocksFromTemplate(template, templateData);
  }, [template, templateData]);

  // 5. Filtrar bloques visibles
  const visibleBlocks = useMemo(() => {
    return blocks.filter((b) => b.isVisible && !b.isDraft).sort((a, b) => a.orderIndex - b.orderIndex);
  }, [blocks]);

  // Handlers
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/marketplace');
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        {showBackButton && <BackButton onClick={handleBack} />}
        <ProfileSkeleton />
      </>
    );
  }

  // Error state
  if (error || !creatorData) {
    return (
      <>
        {showBackButton && <BackButton onClick={handleBack} />}
        <ProfileError
          message={error || 'No pudimos cargar este perfil. Intenta de nuevo mas tarde.'}
          onBack={handleBack}
        />
      </>
    );
  }

  // Validar requisitos minimos
  const hasMinimumRequirements = creatorData.portfolioItems.length > 0;
  if (!hasMinimumRequirements) {
    return (
      <>
        {showBackButton && <BackButton onClick={handleBack} />}
        <ProfileError
          message="Este creador aun no ha completado su perfil. Se requiere al menos un contenido en el portafolio."
          onBack={handleBack}
        />
      </>
    );
  }

  const showBranding = template.config.showKreoonBranding !== false;

  return (
    <>
      {showBackButton && <BackButton onClick={handleBack} />}

      <CreatorThemeProvider config={template.config}>
        <main
          className="w-full min-h-screen"
          aria-label={`Perfil de ${creatorData.profile.display_name}`}
        >
          {/* Contenedor centrado con max-width para PC */}
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            {/* Renderizar bloques de la plantilla */}
            {visibleBlocks.length === 0 ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Cargando contenido...</p>
                </div>
              </div>
            ) : (
              <Suspense fallback={<div className="min-h-screen animate-pulse bg-zinc-900/50" />}>
                <div className="py-8 space-y-8">
                  {visibleBlocks.map((block) => (
                    <PublicBlockRenderer
                      key={block.id}
                      block={block}
                      creatorProfile={{
                        id: creatorData.profile.id,
                        user_id: creatorData.profile.user_id,
                        display_name: creatorData.profile.display_name,
                        categories: creatorData.profile.categories || [],
                      }}
                    />
                  ))}
                </div>
              </Suspense>
            )}

          </div>

          {/* Branding Kreoon */}
          {showBranding && <KreoonBranding />}
        </main>
      </CreatorThemeProvider>
    </>
  );
}

export default TemplateProfileRenderer;
