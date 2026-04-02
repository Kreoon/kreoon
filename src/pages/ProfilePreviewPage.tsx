import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Clock } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type PreviewStatus = 'loading' | 'valid' | 'invalid' | 'expired';

interface PreviewData {
  profileId: string;
  creatorSlug: string | null;
}

// ─── Componente de error ───────────────────────────────────────────────────────

interface PreviewErrorProps {
  status: 'invalid' | 'expired';
}

function PreviewError({ status }: PreviewErrorProps) {
  const isExpired = status === 'expired';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div
        className="text-center space-y-4 max-w-sm"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex justify-center">
          {isExpired ? (
            <Clock className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          )}
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {isExpired ? 'Vista previa expirada' : 'Enlace inválido'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isExpired
            ? 'Este enlace de vista previa ya no es válido. Genera un nuevo enlace desde el editor de perfil.'
            : 'El enlace que intentas acceder no existe o no es válido.'}
        </p>
        <a
          href="/marketplace"
          className="inline-block text-sm text-primary hover:underline mt-2"
        >
          Ir al marketplace
        </a>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProfilePreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    async function validateToken() {
      try {
        const { data, error } = await supabase.rpc('validate_preview_token', {
          preview_token: token,
        });

        if (error) throw error;

        if (!data) {
          setStatus('invalid');
          return;
        }

        // El RPC retorna un objeto con profile_id, slug, o un string de estado
        if (typeof data === 'object' && data !== null) {
          const result = data as { profile_id?: string; slug?: string; status?: string };

          if (result.status === 'expired') {
            setStatus('expired');
            return;
          }

          if (result.profile_id) {
            setPreviewData({
              profileId: result.profile_id,
              creatorSlug: result.slug ?? null,
            });
            setStatus('valid');
            return;
          }
        }

        setStatus('invalid');
      } catch {
        setStatus('invalid');
      }
    }

    validateToken();
  }, [token]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background"
        role="status"
        aria-label="Validando vista previa"
      >
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === 'invalid' || status === 'expired') {
    return <PreviewError status={status} />;
  }

  if (!previewData) {
    return <PreviewError status="invalid" />;
  }

  // Si el perfil tiene slug, redirigir al perfil público del marketplace
  if (previewData.creatorSlug) {
    return <Navigate to={`/marketplace/creator/${previewData.profileId}`} replace />;
  }

  // Fallback: redirigir con el profileId directamente
  return <Navigate to={`/marketplace/creator/${previewData.profileId}`} replace />;
}
