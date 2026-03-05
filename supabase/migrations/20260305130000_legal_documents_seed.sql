-- ============================================
-- SEED: Documentos Legales de KREOON v1.0
-- Fecha: 2026-03-05
-- Descripción: Inserta los documentos legales iniciales
-- ============================================

-- Limpiar documentos existentes (si se está re-ejecutando)
-- DELETE FROM legal_documents WHERE version = '1.0';

-- ============================================
-- Términos de Servicio
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'terms_of_service',
  '1.0',
  '2026-03-05',
  'Términos y Condiciones de Uso',
  'Terms of Service',
  'Establece las reglas de uso de la plataforma KREOON, incluyendo registro, servicios, propiedad intelectual, pagos, y responsabilidades.',
  '<!-- Ver archivo HTML completo en src/pages/legal/content/terms_of_service_v1.html -->',
  true,
  true,
  ARRAY['all'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Política de Privacidad
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'privacy_policy',
  '1.0',
  '2026-03-05',
  'Política de Privacidad',
  'Privacy Policy',
  'Describe cómo recopilamos, usamos y protegemos tus datos personales, cumpliendo con GDPR, Ley 1581 (Colombia), CCPA y otras normativas.',
  '<!-- Ver archivo HTML completo en src/pages/legal/content/privacy_policy_v1.html -->',
  true,
  true,
  ARRAY['all'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Acuerdo de Creador
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'creator_agreement',
  '1.0',
  '2026-03-05',
  'Acuerdo de Creador',
  'Creator Agreement',
  'Términos específicos para creadores de contenido: licenciamiento (no cesión), derechos de imagen, pagos, comisiones, y sistema de reputación UP.',
  '<!-- Ver archivo HTML completo en src/pages/legal/content/creator_agreement_v1.html -->',
  true,
  true,
  ARRAY['creator'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Acuerdo de Marca/Cliente
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'brand_agreement',
  '1.0',
  '2026-03-05',
  'Acuerdo de Marca/Cliente',
  'Brand/Client Agreement',
  'Términos para marcas y clientes que contratan servicios de creadores: licencias de uso, escrow, y responsabilidades.',
  '<!-- Documento pendiente de generar -->',
  true,
  true,
  ARRAY['brand', 'client'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Política de Uso Aceptable
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'acceptable_use_policy',
  '1.0',
  '2026-03-05',
  'Política de Uso Aceptable',
  'Acceptable Use Policy',
  'Define el contenido prohibido, conductas inaceptables, y las consecuencias por violaciones (sistema de strikes).',
  '<!-- Ver archivo HTML completo en src/pages/legal/content/acceptable_use_policy_v1.html -->',
  true,
  true,
  ARRAY['all'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Política DMCA
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'dmca_policy',
  '1.0',
  '2026-03-05',
  'Política de Derechos de Autor (DMCA)',
  'DMCA Policy',
  'Procedimiento para reportar infracciones de derechos de autor, contra-notificaciones, y política de infractores reincidentes.',
  '<!-- Ver archivo HTML completo en src/pages/legal/content/dmca_policy_v1.html -->',
  true,
  true,
  ARRAY['creator'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Política de Moderación de Contenido
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'content_moderation_policy',
  '1.0',
  '2026-03-05',
  'Política de Moderación de Contenido',
  'Content Moderation Policy',
  'Describe cómo moderamos el contenido, categorías de severidad, y proceso de apelación.',
  '<!-- Documento pendiente de generar -->',
  true,
  true,
  ARRAY['creator'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Términos de Escrow y Pagos
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'escrow_payment_terms',
  '1.0',
  '2026-03-05',
  'Términos de Escrow y Pagos',
  'Escrow & Payment Terms',
  'Funcionamiento del sistema de pagos, comisiones de KREOON, disputas, reembolsos, e impuestos.',
  '<!-- Ver archivo HTML completo en src/pages/legal/content/escrow_payment_terms_v1.html -->',
  true,
  true,
  ARRAY['brand', 'client'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Política de Verificación de Edad
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'age_verification_policy',
  '1.0',
  '2026-03-05',
  'Política de Verificación de Edad',
  'Age Verification Policy',
  'KREOON requiere que todos los usuarios sean mayores de 18 años. Al usar la plataforma, declaras bajo juramento cumplir con este requisito.',
  '<article class="legal-document">
    <h1>Política de Verificación de Edad</h1>
    <p><strong>Vigencia:</strong> 5 de marzo de 2026</p>

    <h2>1. Requisito de Edad</h2>
    <p>
      KREOON está destinado exclusivamente a personas mayores de <strong>18 años de edad</strong>
      o la mayoría de edad legal en su jurisdicción, lo que sea mayor.
    </p>

    <h2>2. Declaración del Usuario</h2>
    <p>
      Al registrarse y utilizar KREOON, usted declara y garantiza bajo juramento que:
    </p>
    <ul>
      <li>Tiene al menos 18 años de edad</li>
      <li>Tiene la capacidad legal para celebrar contratos vinculantes</li>
      <li>No tiene restricciones legales que le impidan utilizar la plataforma</li>
    </ul>

    <h2>3. Verificación</h2>
    <p>
      KREOON puede requerir verificación adicional de edad mediante:
    </p>
    <ul>
      <li>Documento de identidad</li>
      <li>Verificación de terceros</li>
      <li>Otros medios apropiados</li>
    </ul>

    <h2>4. Menores de Edad</h2>
    <p>
      Si descubrimos que un usuario es menor de 18 años, procederemos a:
    </p>
    <ul>
      <li>Terminar inmediatamente su cuenta</li>
      <li>Eliminar sus datos personales</li>
      <li>Revocar cualquier contenido subido</li>
    </ul>

    <h2>5. Responsabilidad</h2>
    <p>
      La declaración falsa de edad constituye una violación grave de nuestros Términos de
      Servicio y puede resultar en acciones legales.
    </p>

    <footer>
      <p>© 2026 SICOMMER INT LLC. Todos los derechos reservados.</p>
    </footer>
  </article>',
  true,
  true,
  ARRAY['all'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Política de Cookies
-- ============================================
INSERT INTO legal_documents (
  document_type,
  version,
  version_date,
  title,
  title_en,
  summary,
  content_html,
  is_current,
  is_required,
  applies_to,
  published_at
) VALUES (
  'cookie_policy',
  '1.0',
  '2026-03-05',
  'Política de Cookies',
  'Cookie Policy',
  'Describe cómo utilizamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso del sitio y personalizar contenido.',
  '<article class="legal-document">
    <h1>Política de Cookies</h1>
    <div class="legal-meta">
      <p><strong>Vigencia:</strong> 5 de marzo de 2026</p>
      <p><strong>Versión:</strong> 1.0</p>
    </div>

    <section>
      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando
        visitas un sitio web. Nos permiten recordar tus preferencias, entender cómo utilizas
        nuestra plataforma, y mejorar tu experiencia de usuario.
      </p>
    </section>

    <section>
      <h2>2. Tipos de cookies que utilizamos</h2>

      <h3>2.1 Cookies esenciales</h3>
      <p>
        Son necesarias para el funcionamiento básico del sitio. Sin ellas, no podrías
        navegar por la plataforma ni usar funciones como el inicio de sesión.
      </p>
      <ul>
        <li><strong>sb-*</strong>: Autenticación de Supabase</li>
        <li><strong>kreoon-session</strong>: Sesión del usuario</li>
        <li><strong>kreoon-theme</strong>: Preferencia de tema (claro/oscuro)</li>
      </ul>

      <h3>2.2 Cookies de rendimiento y analíticas</h3>
      <p>
        Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio, qué
        páginas son más populares, y cómo podemos mejorar.
      </p>
      <ul>
        <li><strong>_ga, _gid</strong>: Google Analytics</li>
        <li><strong>kreoon-analytics</strong>: Análisis interno</li>
      </ul>

      <h3>2.3 Cookies de funcionalidad</h3>
      <p>
        Permiten recordar tus elecciones (idioma, región, configuraciones) para
        proporcionarte una experiencia más personalizada.
      </p>

      <h3>2.4 Cookies de publicidad</h3>
      <p>
        Utilizamos cookies de terceros para mostrar anuncios relevantes y medir la
        efectividad de nuestras campañas de marketing.
      </p>
      <ul>
        <li><strong>fbp, _fbc</strong>: Meta Pixel (Facebook/Instagram)</li>
        <li><strong>_gcl_*</strong>: Google Ads</li>
      </ul>
    </section>

    <section>
      <h2>3. Cómo gestionar las cookies</h2>
      <p>
        Puedes controlar y/o eliminar las cookies como desees. Puedes eliminar todas las
        cookies que ya están en tu dispositivo y puedes configurar la mayoría de los
        navegadores para que no las acepten.
      </p>
      <p>
        Para gestionar cookies específicas:
      </p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies" target="_blank" rel="noopener">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a></li>
        <li><a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies" target="_blank" rel="noopener">Microsoft Edge</a></li>
      </ul>
    </section>

    <section>
      <h2>4. Cookies de terceros</h2>
      <p>
        Algunos de nuestros socios pueden establecer cookies en tu dispositivo.
        Estos terceros tienen sus propias políticas de privacidad:
      </p>
      <ul>
        <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Analytics</a></li>
        <li><a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener">Meta (Facebook/Instagram)</a></li>
        <li><a href="https://stripe.com/privacy" target="_blank" rel="noopener">Stripe</a></li>
        <li><a href="https://supabase.com/privacy" target="_blank" rel="noopener">Supabase</a></li>
      </ul>
    </section>

    <section>
      <h2>5. Actualizaciones de esta política</h2>
      <p>
        Podemos actualizar esta política de cookies periódicamente. Te notificaremos
        sobre cambios significativos a través de un aviso en nuestra plataforma.
      </p>
    </section>

    <section>
      <h2>6. Contacto</h2>
      <p>
        Si tienes preguntas sobre nuestra política de cookies, contáctanos en:
      </p>
      <address>
        <strong>SICOMMER INT LLC</strong><br>
        12550 Biscayne Blvd, Ste 218<br>
        North Miami, FL 33181<br>
        Email: privacy@kreoon.com
      </address>
    </section>

    <footer class="legal-footer">
      <p>© 2026 SICOMMER INT LLC. Todos los derechos reservados.</p>
    </footer>
  </article>',
  true,
  false,
  ARRAY['all'],
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Notificar cambio de esquema
-- ============================================
NOTIFY pgrst, 'reload schema';
