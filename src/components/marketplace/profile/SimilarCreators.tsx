import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { CreatorCarousel } from '../CreatorCarousel';
import { useMarketplaceCreators } from '@/hooks/useMarketplaceCreators';

interface SimilarCreatorsProps {
  creatorIds: string[];
  currentCreatorId: string;
  categories?: string[];
}

export function SimilarCreators({ creatorIds, currentCreatorId, categories = [] }: SimilarCreatorsProps) {
  const navigate = useNavigate();
  const { getSimilarCreators, isLoading } = useMarketplaceCreators();

  // Use categories from the current creator to find similar ones
  const creators = getSimilarCreators(categories, currentCreatorId, 6);

  const handleClick = useCallback(
    (id: string) => {
      navigate(`/marketplace/creator/${id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate],
  );

  if (creators.length === 0 && !isLoading) return null;

  return (
    <div className="pt-4">
      <CreatorCarousel
        title="Creadores similares"
        subtitle="También te puede interesar"
        creators={creators}
        isLoading={isLoading}
        onCreatorClick={handleClick}
      />
    </div>
  );
}
