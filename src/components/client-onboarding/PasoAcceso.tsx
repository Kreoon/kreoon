import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KreoonButton } from '@/components/ui/kreoon';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { cn } from '@/lib/utils';
import { claimAccount, type LegalDocument } from './api';

/**
 * Paso 0 del wizard público: crea la cuenta del cliente antes de llenar el
 * formulario. Mismo lenguaje visual (`INPUT_CLASSES` de `fields.tsx`) y mismo
 * patrón de formulario (react-hook-form + zod) que el resto de los pasos.
 */

const INPUT_CLASSES =
  'min-h-[44px] text-base bg-kreoon-bg-secondary border-kreoon-border ' +
  'placeholder:text-kreoon-text-muted/60 focus-visible:ring-kreoon-purple-500/50 ' +
  'focus-visible:border-kreoon-purple-400';

const accesoSchema = z.object({
  fullName: z.string().trim().min(1, 'Escribe tu nombre completo'),
  email: z.string().trim().min(1, 'Escribe tu correo').email('Escribe un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type AccesoData = z.infer<typeof accesoSchema>;

interface PasoAccesoProps {
  token: string;
  initialFullName: string | null;
  initialEmail: string | null;
  legalDocuments: LegalDocument[];
  onSuccess: (result: { userId: string; email: string; password: string }) => void;
}

export function PasoAcceso({
  token,
  initialFullName,
  initialEmail,
  legalDocuments,
  onSuccess,
}: PasoAccesoProps) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [documentoAbierto, setDocumentoAbierto] = useState<LegalDocument | null>(null);
  const [contenidoResuelto, setContenidoResuelto] = useState<Record<string, string>>({});
  const [cargandoContenido, setCargandoContenido] = useState(false);
  const [aceptados, setAceptados] = useState<Record<string, boolean>>({});
  const [errorAceptacion, setErrorAceptacion] = useState<string | null>(null);
  const [correoExistente, setCorreoExistente] = useState(false);

  const form = useForm<AccesoData>({
    resolver: zodResolver(accesoSchema),
    defaultValues: {
      fullName: initialFullName ?? '',
      email: initialEmail ?? '',
      password: '',
      confirmPassword: '',
    },
  });

  const alternarAceptado = (id: string) => {
    setAceptados((previo) => ({ ...previo, [id]: !previo[id] }));
    setErrorAceptacion(null);
  };

  /**
   * Resuelve el HTML a mostrar en el diálogo "Leer".
   *
   * Réplica exacta de `NovaLegalConsentStep.tsx` (loadDocumentContent):
   * algunos documentos (`age_declaration`, `general_terms`) traen en
   * `content_html` un comentario placeholder (`<!-- Ver public/legal/... -->`)
   * en vez del texto real — el texto real vive como archivo estático en
   * `/legal/{document_type}_v{major}.html`. Se detecta por: vacío, empieza
   * con `<!--`, o mide menos de 100 caracteres. Se cachea por id de
   * documento para no re-fetchear al reabrir.
   */
  const abrirDocumento = useCallback(
    async (doc: LegalDocument) => {
      setDocumentoAbierto(doc);

      if (contenidoResuelto[doc.id] !== undefined) return;

      setCargandoContenido(true);
      let contenido = doc.contentHtml || '';

      if (!contenido || contenido.trim().startsWith('<!--') || contenido.length < 100) {
        const version = doc.version || '1';
        const majorVersion = version.replace(/^v/i, '').split('.')[0] || '1';
        const filename = `${doc.documentType}_v${majorVersion}.html`;

        try {
          const response = await fetch(`/legal/${filename}`);
          if (response.ok) {
            contenido = await response.text();
          }
        } catch {
          // silently fail — se cae al mensaje de "no disponible" de abajo
        }
      }

      setContenidoResuelto((previo) => ({
        ...previo,
        [doc.id]: contenido || '<p>Contenido del documento no disponible.</p>',
      }));
      setCargandoContenido(false);
    },
    [contenidoResuelto],
  );

  const onSubmit = async (datos: AccesoData) => {
    const faltantes = legalDocuments.filter((doc) => !aceptados[doc.id]);
    if (faltantes.length > 0) {
      setErrorAceptacion('Debes aceptar todos los documentos para continuar');
      return;
    }

    setCorreoExistente(false);
    setEnviando(true);
    const resultado = await claimAccount(token, {
      email: datos.email,
      password: datos.password,
      fullName: datos.fullName,
      acceptedDocumentIds: legalDocuments.map((doc) => doc.id),
    });
    setEnviando(false);

    if (resultado.ok) {
      onSuccess({
        userId: resultado.userId,
        email: resultado.email,
        password: datos.password,
      });
      return;
    }

    if (resultado.kind === 'invalid_fields') {
      toast.error('Revisa los datos', { description: resultado.message });
      return;
    }

    if (resultado.kind === 'email_exists') {
      setCorreoExistente(true);
      return;
    }

    if (resultado.kind === 'already_claimed') {
      toast.error('Ya tienes una cuenta creada para este enlace', {
        description: 'Recarga la página para continuar.',
      });
      return;
    }

    if (resultado.kind === 'missing_consents') {
      setErrorAceptacion('Debes aceptar todos los documentos para continuar');
      return;
    }

    if (resultado.kind === 'rate_limit') {
      toast.error('Demasiados intentos', {
        description: resultado.retryAfterSeconds
          ? `Intenta de nuevo en ${resultado.retryAfterSeconds} segundos.`
          : resultado.message,
      });
      return;
    }

    toast.error('No pudimos crear tu acceso', { description: resultado.message });
  };

  const htmlDocumentoAbierto = documentoAbierto
    ? contenidoResuelto[documentoAbierto.id]
    : undefined;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-kreoon-text-primary">
                  Nombre completo
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kreoon-text-muted" />
                    <Input
                      {...field}
                      placeholder="Ana Ruiz"
                      className={cn(INPUT_CLASSES, 'pl-10')}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-kreoon-text-primary">
                  Correo
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kreoon-text-muted" />
                    <Input
                      {...field}
                      type="email"
                      inputMode="email"
                      placeholder="ana@empresa.com"
                      className={cn(INPUT_CLASSES, 'pl-10')}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
                {correoExistente && (
                  <p className="mt-1 rounded-sm border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-200">
                    Ese correo ya tiene cuenta en Kreoon. Inicia sesión y pídele
                    al equipo que te vincule a la empresa.{' '}
                    <a href="/auth" className="font-medium underline">
                      Iniciar sesión
                    </a>
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-kreoon-text-primary">
                  Contraseña
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kreoon-text-muted" />
                    <Input
                      {...field}
                      type={mostrarPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      className={cn(INPUT_CLASSES, 'pl-10 pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted hover:text-kreoon-text-secondary"
                      aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      {mostrarPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-kreoon-text-primary">
                  Confirma tu contraseña
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kreoon-text-muted" />
                    <Input
                      {...field}
                      type={mostrarConfirmar ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repite tu contraseña"
                      className={cn(INPUT_CLASSES, 'pl-10 pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmar((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-kreoon-text-muted hover:text-kreoon-text-secondary"
                      aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      {mostrarConfirmar ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {legalDocuments.length > 0 && (
            <div className="space-y-3 rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/50 p-3">
              {legalDocuments.map((doc) => (
                <div key={doc.id} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`legal-${doc.id}`}
                    checked={!!aceptados[doc.id]}
                    onCheckedChange={() => alternarAceptado(doc.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`legal-${doc.id}`}
                    className="flex-1 text-xs leading-relaxed text-kreoon-text-secondary"
                  >
                    Acepto{' '}
                    <span className="font-medium text-kreoon-text-primary">
                      {doc.title}
                    </span>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => abrirDocumento(doc)}
                      className="font-medium text-kreoon-purple-400 underline underline-offset-2"
                    >
                      Leer
                    </button>
                  </label>
                </div>
              ))}
              {errorAceptacion && (
                <p className="text-xs font-medium text-destructive">{errorAceptacion}</p>
              )}
            </div>
          )}

          <KreoonButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={enviando}
            className="min-h-[48px] w-full"
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando tu acceso...
              </>
            ) : (
              <>
                Crear mi acceso y continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </KreoonButton>
        </form>
      </Form>

      <Dialog
        open={!!documentoAbierto}
        onOpenChange={(open) => !open && setDocumentoAbierto(null)}
      >
        <DialogContent className="max-h-[70vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{documentoAbierto?.title}</DialogTitle>
          </DialogHeader>
          {documentoAbierto && (
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {cargandoContenido && htmlDocumentoAbierto === undefined ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-kreoon-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando documento...
                </div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHTML(
                      htmlDocumentoAbierto ?? documentoAbierto.contentHtml,
                    ),
                  }}
                  className={cn(
                    '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-foreground',
                    '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-foreground',
                    '[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground',
                    '[&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-3',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3',
                    '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3',
                    '[&_li]:text-muted-foreground [&_li]:mb-1',
                    '[&_a]:text-primary [&_a]:underline',
                  )}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
