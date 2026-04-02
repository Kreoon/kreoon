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

import { useParams } from 'react-router-dom';
import { TemplateProfileRenderer } from '@/components/profile-viewer/TemplateProfileRenderer';

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();

  // Si no hay ID, no renderizar nada
  if (!id) {
    return null;
  }

  // El hook useCreatorPublicProfile maneja tanto UUIDs como slugs
  return (
    <TemplateProfileRenderer
      creatorProfileId={id}
      templateName="profesional"
      showBackButton={true}
      showSimilarCreators={true}
    />
  );
}
