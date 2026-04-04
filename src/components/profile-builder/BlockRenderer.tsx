import { lazy, Suspense, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps, BlockType, DeviceType, ProfileBlock } from './types/profile-builder';
import { resolveBlockForDevice } from './types/profile-builder';

// Props extendidas con soporte de dispositivo
interface BlockRendererProps extends BlockProps {
  /** Dispositivo actual para resolver configuración responsive */
  currentDevice?: DeviceType;
}

// Lazy loading de cada bloque para code-splitting
const HeroBannerBlock = lazy(() =>
  import('./blocks/HeroBannerBlock').then((m) => ({ default: m.HeroBannerBlock })),
);
const AboutBlock = lazy(() =>
  import('./blocks/AboutBlock').then((m) => ({ default: m.AboutBlock })),
);
const PortfolioBlock = lazy(() =>
  import('./blocks/PortfolioBlock').then((m) => ({ default: m.PortfolioBlock })),
);
const ServicesBlock = lazy(() =>
  import('./blocks/ServicesBlock').then((m) => ({ default: m.ServicesBlock })),
);
const StatsBlock = lazy(() =>
  import('./blocks/StatsBlock').then((m) => ({ default: m.StatsBlock })),
);
const ReviewsBlock = lazy(() =>
  import('./blocks/ReviewsBlock').then((m) => ({ default: m.ReviewsBlock })),
);
const PricingBlock = lazy(() =>
  import('./blocks/PricingBlock').then((m) => ({ default: m.PricingBlock })),
);
const ContactBlock = lazy(() =>
  import('./blocks/ContactBlock').then((m) => ({ default: m.ContactBlock })),
);
const TextBlock = lazy(() =>
  import('./blocks/TextBlock').then((m) => ({ default: m.TextBlock })),
);
const VideoEmbedBlock = lazy(() =>
  import('./blocks/VideoEmbedBlock').then((m) => ({ default: m.VideoEmbedBlock })),
);
const ImageGalleryBlock = lazy(() =>
  import('./blocks/ImageGalleryBlock').then((m) => ({ default: m.ImageGalleryBlock })),
);
const SocialLinksBlock = lazy(() =>
  import('./blocks/SocialLinksBlock').then((m) => ({ default: m.SocialLinksBlock })),
);
const FaqBlock = lazy(() =>
  import('./blocks/FAQBlock').then((m) => ({ default: m.FAQBlock })),
);
const TestimonialsBlock = lazy(() =>
  import('./blocks/TestimonialsBlock').then((m) => ({ default: m.TestimonialsBlock })),
);
const BrandsBlock = lazy(() =>
  import('./blocks/BrandsBlock').then((m) => ({ default: m.BrandsBlock })),
);
const SkillsBlock = lazy(() =>
  import('./blocks/SkillsBlock').then((m) => ({ default: m.SkillsBlock })),
);
const TimelineBlock = lazy(() =>
  import('./blocks/TimelineBlock').then((m) => ({ default: m.TimelineBlock })),
);
const DividerBlock = lazy(() =>
  import('./blocks/DividerBlock').then((m) => ({ default: m.DividerBlock })),
);
const SpacerBlock = lazy(() =>
  import('./blocks/SpacerBlock').then((m) => ({ default: m.SpacerBlock })),
);
const RecommendedTalentBlock = lazy(() =>
  import('./blocks/RecommendedTalentBlock').then((m) => ({ default: m.RecommendedTalentBlock })),
);
const SectionBlock = lazy(() =>
  import('./blocks/SectionBlock').then((m) => ({ default: m.SectionBlock })),
);
const ColumnsBlock = lazy(() =>
  import('./blocks/ColumnsBlock').then((m) => ({ default: m.ColumnsBlock })),
);
const ContainerBlock = lazy(() =>
  import('./blocks/ContainerBlock').then((m) => ({ default: m.ContainerBlock })),
);

// Mapa de tipo de bloque a componente lazy
const BLOCK_COMPONENT_MAP: Record<BlockType, React.LazyExoticComponent<React.ComponentType<BlockProps>>> = {
  hero_banner: HeroBannerBlock,
  recommended_talent: RecommendedTalentBlock,
  about: AboutBlock,
  portfolio: PortfolioBlock,
  services: ServicesBlock,
  stats: StatsBlock,
  reviews: ReviewsBlock,
  pricing: PricingBlock,
  contact: ContactBlock,
  text_block: TextBlock,
  video_embed: VideoEmbedBlock,
  image_gallery: ImageGalleryBlock,
  social_links: SocialLinksBlock,
  faq: FaqBlock,
  testimonials: TestimonialsBlock,
  brands: BrandsBlock,
  skills: SkillsBlock,
  timeline: TimelineBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  // Contenedores
  section: SectionBlock,
  columns: ColumnsBlock,
  container: ContainerBlock,
};

function BlockSkeleton() {
  return (
    <div
      className="animate-pulse rounded-lg bg-zinc-800/50 h-32 w-full"
      aria-hidden="true"
    />
  );
}

function BlockNotImplemented({ type }: { type: BlockType }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center h-24 rounded-lg',
        'border border-dashed border-zinc-700',
        'bg-zinc-800/30',
      )}
      role="status"
      aria-label={`Bloque ${type} no implementado`}
    >
      <p className="text-xs text-zinc-500">
        Bloque <code className="font-mono text-zinc-400">{type}</code> no disponible aún
      </p>
    </div>
  );
}

export function BlockRenderer({ currentDevice = 'desktop', ...props }: BlockRendererProps) {
  const BlockComponent = BLOCK_COMPONENT_MAP[props.block.type];

  // Resolver config/content/styles según el dispositivo actual
  const resolvedBlock: ProfileBlock = useMemo(() => {
    const resolved = resolveBlockForDevice(props.block, currentDevice);
    return {
      ...props.block,
      config: resolved.config,
      content: resolved.content,
      styles: resolved.styles,
    };
  }, [props.block, currentDevice]);

  if (!BlockComponent) {
    return <BlockNotImplemented type={props.block.type} />;
  }

  // Resolver config y styles según el dispositivo de preview
  const resolvedBlock = resolveBlockForDevice(props.block, props.previewDevice);

  // Las props de contenedores se pasan a todos los bloques
  // Los bloques que no son contenedores simplemente las ignoran
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <BlockComponent
        {...props}
        block={resolvedBlock}
        renderChild={props.renderChild}
        onAddBlockToColumn={props.onAddBlockToColumn}
        onRemoveChild={props.onRemoveChild}
      />
    </Suspense>
  );
}

/**
 * Resuelve config y styles del bloque según el dispositivo
 * Aplica configOverrides y responsiveOverrides
 */
function resolveBlockForDevice(
  block: BlockProps['block'],
  device?: 'desktop' | 'tablet' | 'mobile'
): BlockProps['block'] {
  // Si no hay dispositivo o es desktop, retornar sin cambios
  if (!device || device === 'desktop') {
    return block;
  }

  // Aplicar configOverrides
  const configOverrides = block.configOverrides?.[device] || {};
  const resolvedConfig = { ...block.config, ...configOverrides };

  // Aplicar responsiveOverrides (estilos)
  const styleOverrides = block.styles.responsiveOverrides?.[device] || {};
  const resolvedStyles = { ...block.styles, ...styleOverrides };

  return {
    ...block,
    config: resolvedConfig,
    styles: resolvedStyles,
  };
}
