import { useParams } from 'react-router-dom';
import { CampaignDetail } from '@/components/marketplace/campaigns/feed/CampaignDetail';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CampaignDetail campaignId={id} />;
}
