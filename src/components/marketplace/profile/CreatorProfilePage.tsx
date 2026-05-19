/**
 * Pagina de perfil de creador en el marketplace.
 *
 * Usa el sistema de plantillas del Profile Builder para renderizar:
 * - Plantilla por defecto: Profesional B2B
 * - Los creadores pueden cambiar su plantilla desde Settings > Profile Builder
 *
 * Soporta acceso por:
 * - UUID: /marketplace/creator/550e8400-e29b-41d4-a716-446655440000
 * - Slug: /marketplace/creator/carloslima
 */

import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { TemplateProfileRenderer } from '@/components/profile-viewer/TemplateProfileRenderer';
import { useToast } from '@/hooks/use-toast';

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;

    if (payment === 'success') {
      toast({
        title: '¡Pago exitoso!',
        description: 'Tu contratación fue procesada. El creador recibirá tu proyecto pronto.',
      });
    } else if (payment === 'cancelled') {
      toast({
        title: 'Pago cancelado',
        description: 'Puedes volver a intentarlo cuando quieras.',
        variant: 'destructive',
      });
    }

    // Limpiar el query param de la URL
    const params = new URLSearchParams(searchParams);
    params.delete('payment');
    navigate({ search: params.toString() }, { replace: true });
  }, []);

  if (!id) return null;

  return (
    <TemplateProfileRenderer
      creatorProfileId={id}
      templateName="profesional"
      showBackButton={false}
      showSimilarCreators={true}
    />
  );
}
