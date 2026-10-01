/**
 * Perfil público del creador — URL canónica única `/p/:username` (el parámetro es el slug).
 *
 * Renderiza EXACTAMENTE lo mismo que `/marketplace/creator/:id` (TemplateProfileRenderer →
 * estilo «Estudio UGC»), a través de PublicProfileView. Antes esta página usaba otro renderer
 * (ProfilePageRenderer, bloques del constructor) que podía mostrar a la vez el spinner y «Este
 * perfil no tiene contenido publicado aún»; ahora hay un solo estado de carga (el del renderer).
 *
 * Reglas que se conservan (las aplica el renderer y la RLS): perfil privado hasta publicar,
 * sin redes ni datos de contacto del creador.
 */
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { User } from 'lucide-react';
import { PublicProfileView } from '@/components/routing/PublicProfileRoutes';
import { getPublicProfileUrl, normalizeProfileSlug } from '@/lib/routing/publicProfile';

function ProfileNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-sm" role="alert">
        <div className="flex justify-center">
          <User className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Perfil no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          El enlace no es válido o el perfil no está disponible.
        </p>
      </div>
    </div>
  );
}

export default function PublicCreatorPage() {
  const { username } = useParams<{ username: string }>();
  const slug = normalizeProfileSlug(username);

  if (!slug) return <ProfileNotFound />;

  const canonicalUrl = getPublicProfileUrl(slug);

  return (
    <>
      <Helmet>
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
      </Helmet>
      <PublicProfileView key={slug} profileKey={slug} />
    </>
  );
}
