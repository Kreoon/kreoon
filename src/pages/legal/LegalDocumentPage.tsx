import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Download, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';

// Mapeo de rutas a tipos de documento
const ROUTE_TO_TYPE: Record<string, string> = {
  'terms': 'terms_of_service',
  'privacy': 'privacy_policy',
  'cookies': 'cookie_policy',
  'creator-agreement': 'creator_agreement',
  'brand-agreement': 'brand_agreement',
  'acceptable-use': 'acceptable_use_policy',
  'dmca': 'dmca_policy',
  'moderation': 'content_moderation_policy',
  'escrow': 'escrow_payment_terms',
  'age-verification': 'age_verification_policy',
  'white-label': 'white_label_agreement',
  'dpa': 'data_processing_agreement',
};

export function LegalDocumentPage() {
  const { documentType } = useParams<{ documentType: string }>();
  const docType = documentType ? ROUTE_TO_TYPE[documentType] || documentType : null;
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['legal-document', docType],
    queryFn: async () => {
      if (!docType) return null;

      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('document_type', docType)
        .eq('is_current', true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!docType,
  });

  // Si el contenido de la BD es un placeholder, cargar desde archivo HTML
  useEffect(() => {
    const loadHtmlFile = async () => {
      if (!document) return;

      const content = document.content_html || '';
      // Detectar si es un placeholder (vacío, solo comentario, o muy corto)
      const isPlaceholder = !content ||
        content.trim().startsWith('<!--') ||
        content.length < 100;

      if (isPlaceholder) {
        setLoadingHtml(true);
        try {
          // Extraer versión mayor
          const version = document.version || '1';
          const majorVersion = version.replace(/^v/i, '').split('.')[0] || '1';
          const filename = `${docType}_v${majorVersion}.html`;

          const response = await fetch(`/legal/${filename}`);
          if (response.ok) {
            const html = await response.text();
            setHtmlContent(html);
          } else {
            console.warn(`[LegalDocumentPage] No se encontró /legal/${filename}`);
            setHtmlContent(null);
          }
        } catch (err) {
          console.error('[LegalDocumentPage] Error cargando HTML:', err);
          setHtmlContent(null);
        } finally {
          setLoadingHtml(false);
        }
      } else {
        setHtmlContent(content);
      }
    };

    loadHtmlFile();
  }, [document, docType]);

  if (isLoading || loadingHtml) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document || !htmlContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground px-4 text-center">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Documento no encontrado</h1>
        <p className="text-muted-foreground">
          El documento legal solicitado no existe o no está disponible.
        </p>
        {docType === 'privacy-request' && (
          <p className="text-muted-foreground">
            Para ejercer tus derechos sobre tus datos personales escríbenos a{' '}
            <a href="mailto:dpo@kreoon.com" className="text-primary underline">dpo@kreoon.com</a>.
          </p>
        )}
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Link>
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Versión {document.version}</span>
              <span className="mx-2">•</span>
              <span>
                {new Date(document.version_date).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <article className="legal-document prose max-w-none [--tw-prose-body:hsl(var(--foreground))] [--tw-prose-headings:hsl(var(--foreground))] [--tw-prose-bold:hsl(var(--foreground))] [--tw-prose-links:hsl(var(--primary))] [--tw-prose-bullets:hsl(var(--muted-foreground))] [--tw-prose-counters:hsl(var(--muted-foreground))] [--tw-prose-th-borders:hsl(var(--border))] [--tw-prose-td-borders:hsl(var(--border))]">
          {/* Si el contenido es HTML, renderizarlo */}
          {htmlContent && htmlContent.startsWith('<') ? (
            <div
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(htmlContent) }}
              className={cn(
                // Estilos para el contenido HTML legal
                "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:text-foreground",
                "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-foreground",
                "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-foreground",
                "[&_p]:text-foreground [&_p]:leading-relaxed [&_p]:mb-4",
                "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-2",
                "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-2",
                "[&_li]:text-foreground [&_strong]:text-foreground",
                "[&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80",
                "[&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:mb-6",
                "[&_th]:bg-muted/50 [&_th]:border [&_th]:border-border [&_th]:p-3 [&_th]:text-left [&_th]:font-medium",
                "[&_td]:border [&_td]:border-border [&_td]:p-3",
                "[&_address]:not-italic [&_address]:text-foreground",
                "[&_.legal-meta]:text-sm [&_.legal-meta]:text-muted-foreground [&_.legal-meta]:mb-8 [&_.legal-meta]:p-4 [&_.legal-meta]:bg-muted/50 [&_.legal-meta]:rounded-sm",
                "[&_.legal-warning]:bg-orange-500/10 [&_.legal-warning]:border [&_.legal-warning]:border-orange-500/30 [&_.legal-warning]:p-4 [&_.legal-warning]:rounded-sm [&_.legal-warning]:my-4",
                "[&_.legal-highlight]:bg-purple-500/10 [&_.legal-highlight]:border [&_.legal-highlight]:border-purple-500/30 [&_.legal-highlight]:p-4 [&_.legal-highlight]:rounded-sm [&_.legal-highlight]:my-4",
                "[&_.legal-table]:overflow-x-auto",
                "[&_.legal-footer]:mt-12 [&_.legal-footer]:pt-6 [&_.legal-footer]:border-t [&_.legal-footer]:border-border [&_.legal-footer]:text-sm [&_.legal-footer]:text-muted-foreground",
                "[&_section]:mb-8",
                "[&_dl]:space-y-4 [&_dl]:mb-6",
                "[&_dt]:font-medium [&_dt]:text-foreground",
                "[&_dd]:text-foreground [&_dd]:ml-4 [&_dd]:mb-3"
              )}
            />
          ) : (
            // Si es texto plano, mostrarlo con formato
            <div>
              <h1>{document.title}</h1>
              <pre className="whitespace-pre-wrap font-sans">
                {htmlContent}
              </pre>
            </div>
          )}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2026 SICOMMER INT LLC. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/legal/terms" className="text-muted-foreground hover:text-foreground">
                Términos
              </Link>
              <Link to="/legal/privacy" className="text-muted-foreground hover:text-foreground">
                Privacidad
              </Link>
              <Link to="/legal/cookies" className="text-muted-foreground hover:text-foreground">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LegalDocumentPage;
