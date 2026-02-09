import { useParams, useNavigate } from 'react-router-dom';
import HiringWizard from '@/components/marketplace/hiring/HiringWizard';

export default function HiringWizardPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();

  if (!creatorId) {
    navigate('/marketplace');
    return null;
  }

  return (
    <HiringWizard
      creatorId={creatorId}
      onClose={() => navigate(`/marketplace/creator/${creatorId}`)}
    />
  );
}
