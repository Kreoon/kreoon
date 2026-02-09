import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorProfileWizard from '@/components/marketplace/wizard/CreatorProfileWizard';

export default function CreatorProfileSetup() {
  const navigate = useNavigate();
  const [isOpen] = useState(true);

  return (
    <CreatorProfileWizard
      isOpen={isOpen}
      onClose={() => navigate(-1)}
      onComplete={() => navigate('/marketplace/dashboard')}
    />
  );
}
