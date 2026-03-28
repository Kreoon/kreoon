import { useSearchParams } from 'react-router-dom';
import { WizardContainer } from '@/components/registration-v2';
import { useUTMTracking } from '@/hooks/useUTMTracking';

export default function Register() {
  const [searchParams] = useSearchParams();

  // Initialize UTM tracking
  useUTMTracking();

  // Check for referral code in URL
  const referralCode = searchParams.get('ref') || searchParams.get('code');
  const partnerCommunity = searchParams.get('community');

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/favicon.png" alt="KREOON" className="h-8 w-8 rounded-sm object-cover" />
          <span className="text-lg font-bold text-white tracking-tight">KREOON</span>
        </div>

        <WizardContainer
          flow="general"
        />
      </div>
    </div>
  );
}
