import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import HiringWizard from '@/components/marketplace/hiring/HiringWizard';

export default function HiringWizardPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preferredServiceId = searchParams.get('service') || undefined;

  if (!creatorId) {
    navigate('/marketplace');
    return null;
  }

  return (
    <HiringWizard
      creatorId={creatorId}
      preferredServiceId={preferredServiceId}
      onClose={() => navigate(`/marketplace/creator/${creatorId}`)}
    />
  );
}
