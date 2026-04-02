// Core blocks
export { HeroBannerBlock } from './HeroBannerBlock';
export { AboutBlock } from './AboutBlock';
export { PortfolioBlock } from './PortfolioBlock';
export { StatsBlock } from './StatsBlock';
export { ContactBlock } from './ContactBlock';

// Content blocks
export { TextBlock } from './TextBlock';
export { ServicesBlock } from './ServicesBlock';
export { ReviewsBlock } from './ReviewsBlock';
export { PricingBlock } from './PricingBlock';
export { FAQBlock, FaqBlock } from './FAQBlock';
export { TestimonialsBlock } from './TestimonialsBlock';
export { BrandsBlock } from './BrandsBlock';
export { SkillsBlock } from './SkillsBlock';
export { TimelineBlock } from './TimelineBlock';
export { SocialLinksBlock } from './SocialLinksBlock';

// Media blocks
export { VideoEmbedBlock } from './VideoEmbedBlock';
export { ImageGalleryBlock } from './ImageGalleryBlock';

// Layout blocks
export { DividerBlock } from './DividerBlock';
export { SpacerBlock } from './SpacerBlock';

// === NEW: Advanced blocks v3 ===
// Layout avanzado
export { SectionBlock } from './SectionBlock';
export { ColumnsBlock } from './ColumnsBlock';
// Contenido avanzado
export { HeadlineBlock } from './HeadlineBlock';
export { ButtonBlock } from './ButtonBlock';
export { IconListBlock } from './IconListBlock';
export { CountdownBlock } from './CountdownBlock';
// Conversion
export { CTABannerBlock } from './CTABannerBlock';
export { WhatsAppButtonBlock } from './WhatsAppButtonBlock';
export { CaseStudyBlock } from './CaseStudyBlock';
export { VerifiedReviewsBlock } from './VerifiedReviewsBlock';
// Media avanzado
export { CarouselBlock } from './CarouselBlock';

// Recommended talent
export { RecommendedTalentBlock } from './RecommendedTalentBlock';

// Block component map for dynamic rendering
import type { BlockType } from '../types/profile-builder';
import type { ComponentType } from 'react';
import type { BlockProps } from '../types/profile-builder';

import { HeroBannerBlock } from './HeroBannerBlock';
import { AboutBlock } from './AboutBlock';
import { PortfolioBlock } from './PortfolioBlock';
import { StatsBlock } from './StatsBlock';
import { ContactBlock } from './ContactBlock';
import { TextBlock } from './TextBlock';
import { ServicesBlock } from './ServicesBlock';
import { ReviewsBlock } from './ReviewsBlock';
import { PricingBlock } from './PricingBlock';
import { FAQBlock } from './FAQBlock';
import { TestimonialsBlock } from './TestimonialsBlock';
import { BrandsBlock } from './BrandsBlock';
import { SkillsBlock } from './SkillsBlock';
import { TimelineBlock } from './TimelineBlock';
import { SocialLinksBlock } from './SocialLinksBlock';
import { VideoEmbedBlock } from './VideoEmbedBlock';
import { ImageGalleryBlock } from './ImageGalleryBlock';
import { DividerBlock } from './DividerBlock';
import { SpacerBlock } from './SpacerBlock';
// Advanced blocks v3
import { SectionBlock } from './SectionBlock';
import { ColumnsBlock } from './ColumnsBlock';
import { HeadlineBlock } from './HeadlineBlock';
import { ButtonBlock } from './ButtonBlock';
import { IconListBlock } from './IconListBlock';
import { CountdownBlock } from './CountdownBlock';
import { CTABannerBlock } from './CTABannerBlock';
import { WhatsAppButtonBlock } from './WhatsAppButtonBlock';
import { CaseStudyBlock } from './CaseStudyBlock';
import { VerifiedReviewsBlock } from './VerifiedReviewsBlock';
import { CarouselBlock } from './CarouselBlock';
import { RecommendedTalentBlock } from './RecommendedTalentBlock';

export const BLOCK_COMPONENTS: Partial<Record<BlockType, ComponentType<BlockProps>>> = {
  // Required
  hero_banner: HeroBannerBlock,
  // Core
  about: AboutBlock,
  portfolio: PortfolioBlock,
  services: ServicesBlock,
  stats: StatsBlock,
  reviews: ReviewsBlock,
  pricing: PricingBlock,
  contact: ContactBlock,
  // Content
  text_block: TextBlock,
  faq: FAQBlock,
  testimonials: TestimonialsBlock,
  brands: BrandsBlock,
  skills: SkillsBlock,
  timeline: TimelineBlock,
  social_links: SocialLinksBlock,
  // Media
  video_embed: VideoEmbedBlock,
  image_gallery: ImageGalleryBlock,
  // Layout
  divider: DividerBlock,
  spacer: SpacerBlock,
  // === Advanced blocks v3 ===
  // Layout avanzado
  section: SectionBlock,
  columns: ColumnsBlock,
  // Contenido avanzado
  headline: HeadlineBlock,
  button: ButtonBlock,
  icon_list: IconListBlock,
  countdown: CountdownBlock,
  // Conversion
  cta_banner: CTABannerBlock,
  whatsapp_button: WhatsAppButtonBlock,
  case_study: CaseStudyBlock,
  verified_reviews: VerifiedReviewsBlock,
  // Media avanzado
  carousel: CarouselBlock,
  // Recommended talent
  recommended_talent: RecommendedTalentBlock,
};
