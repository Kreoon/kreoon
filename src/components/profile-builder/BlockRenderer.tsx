import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import type { BlockProps, BlockType } from './types/profile-builder';

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
  import('./blocks/FaqBlock').then((m) => ({ default: m.FaqBlock })),
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

export function BlockRenderer(props: BlockProps) {
  const BlockComponent = BLOCK_COMPONENT_MAP[props.block.type];

  if (!BlockComponent) {
    return <BlockNotImplemented type={props.block.type} />;
  }

  return (
    <Suspense fallback={<BlockSkeleton />}>
      <BlockComponent {...props} />
    </Suspense>
  );
}
