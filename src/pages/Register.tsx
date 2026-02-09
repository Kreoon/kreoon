import { useSearchParams, useParams } from 'react-router-dom';
import { UnifiedRegistrationWizard } from '@/components/registration';
import type { RegistrationIntent } from '@/components/registration';

export default function Register() {
  const [searchParams] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();

  // Resolve intent from URL params or slug
  const intentParam = searchParams.get('intent');
  let initialIntent: RegistrationIntent | null = null;

  if (intentParam === 'talent' || intentParam === 'brand' || intentParam === 'organization' || intentParam === 'join') {
    initialIntent = intentParam;
  } else if (slug) {
    initialIntent = 'join';
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/favicon.png" alt="KREOON" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-bold text-white tracking-tight">KREOON</span>
        </div>

        <UnifiedRegistrationWizard
          mode="full"
          initialIntent={initialIntent}
        />

        <p className="text-center text-xs text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/auth" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
