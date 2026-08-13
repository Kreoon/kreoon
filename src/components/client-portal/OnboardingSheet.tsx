import { useEffect, useState } from 'react';
import { Loader2, Mic, PenLine, Paperclip } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { StepIndicator } from '@/components/auth/StepIndicator';
import { AudioRecorder } from '@/components/client-dna/AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import {
  PasoContenido,
  PasoEquipo,
  PasoLegal,
  PasoLogistica,
  PasoMarca,
  PasoProducto,
} from '@/components/client-onboarding/steps';
import { SCHEMAS, STEPS, type OnboardingFormData, type SectionKey } from '@/components/client-onboarding/schemas';
import type { SubmitOnboardingResult } from '@/hooks/useClientPipeline';
import { DocumentosUploader } from './DocumentosUploader';
import type { UseClientDocumentsReturn } from '@/hooks/useClientDocuments';

/**
 * Panel lateral para que el cliente cuente de su marca desde el portal — la
 * versión con sesión (sin token público) de `client-onboarding/OnboardingWizard`.
 *
 * Dos modos:
 *  · 'escribir' — los mismos 6 pasos del wizard público, guardando cada uno
 *    con `onSaveSection` en vez del token.
 *  · 'hablar'   — graba un audio, lo transcribe, deja revisar/corregir el
 *    texto y usa IA para llenar lo que se entendió.
 *
 * Hablar NO se salta el teclado, es un mix: lo que se cuenta se cuenta
 * (historia, tono, público, objeciones) y lo que se transcribe mal se teclea.
 * Por eso los 3 pasos obligatorios se revisan SIEMPRE por escrito, aunque la
 * IA los haya dado por buenos: ahí están el NIT, los correos, el celular, el
 * precio y el link de compra. Un correo mal oído lo caza el validador; un NIT
 * mal oído, no — y ese acaba en una factura.
 */

export type OnboardingSheetModo = 'escribir' | 'hablar';

interface OnboardingSheetProps {
  open: boolean;
  modo: OnboardingSheetModo;
  /** Lo ya guardado del formulario (para retomar donde se quedó). */
  formData: OnboardingFormData;
  onOpenChange: (open: boolean) => void;
  onSaveSection: (section: string, data: unknown) => Promise<unknown>;
  onSubmit: () => Promise<SubmitOnboardingResult>;
  /** El formulario quedó enviado: cerrar el panel y refrescar el portal. */
  onCompleted: () => void;
  /**
   * Cambiar de escribir a hablar (o al revés) sin cerrar ni perder lo guardado.
   * Elegir un camino no puede ser una puerta de un solo sentido: quien empieza
   * a escribir y se cansa tiene que poder pasarse a contarlo, y al revés.
   */
  onCambiarModo?: (modo: OnboardingSheetModo) => void;
  /** Documentos adjuntos del cliente — misma instancia que en `ClientPipelineChecklist`. */
  documentos: UseClientDocumentsReturn;
}

/** Los únicos 3 pasos obligatorios (ver schemas.ts). */
type CampoObligatorio = 'legal' | 'equipo' | 'producto';
const OBLIGATORIOS: CampoObligatorio[] = ['legal', 'equipo', 'producto'];
const CAMPOS_ONBOARDING: SectionKey[] = STEPS.map((paso) => paso.key);

type FaseHablar = 'grabar' | 'transcribiendo' | 'revisar' | 'extrayendo' | 'completando' | 'enviando';

const PUNTOS_GUIA = [
  { emoji: '🏢', texto: 'El nombre de tu empresa y quién la representa' },
  { emoji: '👥', texto: 'Quién revisa y aprueba tus videos' },
  { emoji: '🛍️', texto: 'Qué vendes, a quién y en cuánto' },
  { emoji: '🎯', texto: 'A quién le hablas y qué problema le resuelves' },
  { emoji: '🎬', texto: 'Dónde vas a publicar los videos' },
];

/** Convierte un Blob a base64 puro (sin el prefijo data:...;base64,). */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Le pide a la IA que llene el formulario a partir de la transcripción. Si
 * algo no se entiende bien, mejor null (y se pide suelto) que inventar datos.
 */
async function extraerDatosDeTranscripcion(transcripcion: string): Promise<Partial<OnboardingFormData> | null> {
  const prompt = `Eres un asistente que extrae datos de un formulario a partir de un audio donde el dueño de un negocio cuenta sobre su marca.

Devuelve SOLO un JSON (sin texto adicional, sin markdown, sin comentarios) con esta forma EXACTA. Si un dato no se menciona en la transcripción, deja ese campo como cadena vacía "" (o el array de 3 cadenas vacías donde corresponda). No inventes nada que no se haya dicho.

{"legal":{"razon_social":"","nit":"","representante":"","correo_representante":"","direccion_fiscal":"","ciudad":"","pais":"","correo_facturacion":""},"equipo":{"aprobador":{"nombre":"","cargo":"","correo":"","celular":""},"correo_portal":"","miembros_whatsapp":""},"marca":{"instagram":"","tiktok":"","website":"","historia":"","tono_deseado":"","tono_evitar":"","competidores":["","",""],"referentes":["","",""],"restricciones_legales":""},"producto":{"tipo_oferta":"producto","nombre":"","presentaciones":"","componentes":"","beneficios":"","diferenciales":"","precio":"","promociones":"","garantias":"","link_tienda":"","audiencia":{"edad":"","genero":"","pais":"","dolor":""},"objeciones":["","",""],"testimonios":""},"contenido":{"objetivo":"","plataformas":[],"historial_contenido":""}}

"tipo_oferta" debe ser exactamente "producto", "servicio" o "digital", según lo que se entienda que vende.

Transcripción:
"""
${transcripcion}
"""`;

  try {
    const { data, error } = await supabase.functions.invoke<{ response?: string }>('multi-ai', {
      body: { mode: 'first', models: ['gemini'], messages: [{ role: 'user', content: prompt }] },
    });
    if (error || typeof data?.response !== 'string') return null;
    const match = data.response.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Partial<OnboardingFormData>;
  } catch {
    return null;
  }
}

export function OnboardingSheet({
  open,
  modo,
  formData,
  onOpenChange,
  onSaveSection,
  onSubmit,
  onCompleted,
  onCambiarModo,
  documentos,
}: OnboardingSheetProps) {
  const { toast } = useToast();
  const [datos, setDatos] = useState<OnboardingFormData>(formData);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // modo 'escribir'
  const [stepIndex, setStepIndex] = useState(0);

  // modo 'hablar'
  const [fase, setFase] = useState<FaseHablar>('grabar');
  const [transcripcion, setTranscripcion] = useState('');
  const [colaCompletar, setColaCompletar] = useState<CampoObligatorio[]>([]);
  const [colaIndex, setColaIndex] = useState(0);

  // Al abrir, se parte siempre de lo ya guardado (no de lo que haya cambiado
  // en segundo plano mientras el panel estaba abierto).
  useEffect(() => {
    if (!open) return;
    setDatos(formData);
    setEnviando(false);
    if (modo === 'escribir') {
      const primerPendiente = STEPS.findIndex(
        (paso) => paso.obligatorio && Object.keys(formData[paso.key] ?? {}).length === 0,
      );
      setStepIndex(primerPendiente === -1 ? 0 : primerPendiente);
    } else {
      setFase('grabar');
      setTranscripcion('');
      setColaCompletar([]);
      setColaIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modo]);

  const persistirSeccion = async (seccion: SectionKey, data: object): Promise<boolean> => {
    setGuardando(true);
    try {
      await onSaveSection(seccion, data);
      setDatos((prev) => ({ ...prev, [seccion]: { ...(prev[seccion] ?? {}), ...data } }));
      return true;
    } catch (err) {
      toast({
        title: 'No pudimos guardar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const intentarEnviar = async () => {
    setFase('enviando');
    setEnviando(true);
    try {
      const resultado = await onSubmit();
      if (resultado.ok) {
        onCompleted();
        return;
      }
      // Muy raro llegar aquí (ya se validó localmente): se completa solo lo
      // que el backend diga que sigue faltando.
      const secciones = new Set(resultado.missingFields.map((campo) => campo.split('.')[0]));
      const cola = OBLIGATORIOS.filter((key) => secciones.has(key));
      toast({ title: 'Te faltan algunos datos', description: 'Sigamos completando lo que falta.' });
      if (cola.length > 0) {
        setColaCompletar(cola);
        setColaIndex(0);
        setFase('completando');
      } else {
        setFase(modo === 'hablar' ? 'revisar' : 'completando');
      }
    } catch (err) {
      toast({
        title: 'No pudimos enviar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
      setFase('completando');
    } finally {
      setEnviando(false);
    }
  };

  // ── modo 'escribir' ──────────────────────────────────────────────────
  const pasoEscribir = STEPS[stepIndex];

  const avanzarEscribir = async (seccion: SectionKey, data: object) => {
    const ok = await persistirSeccion(seccion, data);
    if (!ok) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const retrocederEscribir = () => setStepIndex((i) => Math.max(i - 1, 0));

  const enviarDesdeEscribir = async (logisticaData: object) => {
    const ok = await persistirSeccion('logistica', logisticaData);
    if (!ok) return;
    await intentarEnviar();
  };

  // ── modo 'hablar' ────────────────────────────────────────────────────
  const handleAudioReady = async (blob: Blob | null) => {
    if (!blob) return;
    setFase('transcribiendo');
    try {
      const audio_base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke<{ transcription?: string }>(
        'transcribe-audio-gemini',
        { body: { audio_base64, audio_type: blob.type || 'audio/webm' } },
      );
      const texto = typeof data?.transcription === 'string' ? data.transcription : '';
      if (error || !texto.trim()) {
        throw new Error('No pudimos entender el audio. Intenta de nuevo.');
      }
      setTranscripcion(texto);
      setFase('revisar');
    } catch (err) {
      toast({
        title: 'No pudimos procesar tu audio',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo en un momento.',
        variant: 'destructive',
      });
      setFase('grabar');
    }
  };

  const handleConfirmarTranscripcion = async () => {
    setFase('extrayendo');
    const extraido = await extraerDatosDeTranscripcion(transcripcion);

    let datosConExtraccion = datos;
    if (extraido) {
      for (const key of CAMPOS_ONBOARDING) {
        const valor = extraido[key];
        if (valor && typeof valor === 'object' && Object.keys(valor).length > 0) {
          await persistirSeccion(key, valor as object);
          datosConExtraccion = {
            ...datosConExtraccion,
            [key]: { ...(datosConExtraccion[key] ?? {}), ...valor },
          };
        }
      }
    } else {
      toast({
        title: 'No entendimos todo',
        description: 'No pasa nada: ahora lo confirmas escribiendo.',
      });
    }

    // Los tres pasos obligatorios SIEMPRE se revisan por escrito, aunque la IA
    // los haya dado por entendidos. Ahí viven los datos que hay que teclear sí
    // o sí — NIT, correos, celular, precio, link de compra —: dictados en voz
    // alta salen mal, y el validador no los salva. Un correo torcido lo caza
    // (`.email()`), pero el NIT solo exige "algo escrito", así que un número
    // mal oído pasaría como bueno y acabaría en una factura.
    //
    // De ahí el mix: se habla lo que se cuenta (historia, tono, público,
    // objeciones) y se teclea lo que se transcribe mal. Llegan prellenados con
    // lo que sí se entendió, así que revisarlos es rápido.
    setColaCompletar([...OBLIGATORIOS]);
    setColaIndex(0);
    setFase('completando');
  };

  const avanzarCola = async (seccion: CampoObligatorio, data: object) => {
    const ok = await persistirSeccion(seccion, data);
    if (!ok) return;
    const siguiente = colaIndex + 1;
    if (siguiente >= colaCompletar.length) {
      await intentarEnviar();
      return;
    }
    setColaIndex(siguiente);
  };

  const enPaso = colaCompletar[colaIndex];

  const { titulo, descripcion } = tituloYDescripcion(modo, fase, pasoEscribir?.titulo, pasoEscribir?.ayuda);

  const cantidadDocumentos = documentos.documents.length;
  const textoAccesoDocumentos = cantidadDocumentos > 0
    ? `${cantidadDocumentos} documento${cantidadDocumentos === 1 ? '' : 's'} adjunto${cantidadDocumentos === 1 ? '' : 's'}`
    : '¿Tienes documentos que nos ayuden a entender tu marca?';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-5 sm:max-w-lg sm:p-6"
      >
        <SheetHeader className="mb-5 text-left">
          <div className="flex items-center gap-2">
            {modo === 'escribir' ? (
              <PenLine className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <Mic className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <SheetTitle>{titulo}</SheetTitle>
          </div>
          <SheetDescription>{descripcion}</SheetDescription>

          {/* Salida al otro camino. Al escribir siempre está disponible (lo
              guardado por pasos no se pierde). Al hablar, solo antes de grabar:
              después ya hay transcripción encima y cambiar tiraría trabajo. */}
          {onCambiarModo && !enviando && (modo === 'escribir' || fase === 'grabar') && (
            <button
              type="button"
              onClick={() => onCambiarModo(modo === 'escribir' ? 'hablar' : 'escribir')}
              className="mt-2 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {modo === 'escribir' ? (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  Mejor te lo cuento hablando
                </>
              ) : (
                <>
                  <PenLine className="h-3.5 w-3.5" />
                  Mejor lo escribo
                </>
              )}
            </button>
          )}
        </SheetHeader>

        {/* Acceso a documentos: visible sin importar el camino (escribir o
            hablar) y en cualquier paso — el cliente puede adjuntar cuando
            quiera, no solo al final. */}
        <div className="mb-5">
          <DocumentosUploader
            documentos={documentos}
            trigger={
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{textoAccesoDocumentos}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground underline underline-offset-4">
                  {cantidadDocumentos > 0 ? 'Ver' : 'Adjuntar'}
                </span>
              </button>
            }
          />
        </div>

        {modo === 'escribir' && (
          <div className="space-y-5">
            <StepIndicator
              steps={STEPS.map((paso) => ({ label: paso.titulo }))}
              currentStep={stepIndex}
            />

            {pasoEscribir.key === 'legal' && (
              <PasoLegal
                initialData={datos.legal ?? {}}
                onNext={(data) => avanzarEscribir('legal', data)}
                guardando={guardando}
              />
            )}
            {pasoEscribir.key === 'equipo' && (
              <PasoEquipo
                initialData={datos.equipo ?? {}}
                onNext={(data) => avanzarEscribir('equipo', data)}
                onBack={retrocederEscribir}
                guardando={guardando}
              />
            )}
            {pasoEscribir.key === 'marca' && (
              <PasoMarca
                initialData={datos.marca ?? {}}
                onNext={(data) => avanzarEscribir('marca', data)}
                onBack={retrocederEscribir}
                guardando={guardando}
              />
            )}
            {pasoEscribir.key === 'producto' && (
              <PasoProducto
                initialData={datos.producto ?? {}}
                onNext={(data) => avanzarEscribir('producto', data)}
                onBack={retrocederEscribir}
                guardando={guardando}
              />
            )}
            {pasoEscribir.key === 'contenido' && (
              <PasoContenido
                initialData={datos.contenido ?? {}}
                onNext={(data) => avanzarEscribir('contenido', data)}
                onBack={retrocederEscribir}
                guardando={guardando}
              />
            )}
            {pasoEscribir.key === 'logistica' && (
              <PasoLogistica
                initialData={datos.logistica ?? {}}
                onNext={enviarDesdeEscribir}
                onBack={retrocederEscribir}
                guardando={guardando || enviando}
                resumen={datos}
              />
            )}
          </div>
        )}

        {modo === 'hablar' && (
          <div className="space-y-5">
            {fase === 'grabar' && (
              <div className="space-y-5">
                <div className="rounded-sm border bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Cuéntanos, por ejemplo:</p>
                  <ul className="space-y-1.5">
                    {PUNTOS_GUIA.map((punto) => (
                      <li key={punto.texto} className="flex items-start gap-2 text-sm">
                        <span>{punto.emoji}</span>
                        <span>{punto.texto}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center py-2">
                  <AudioRecorder onAudioReady={handleAudioReady} />
                </div>
              </div>
            )}

            {(fase === 'transcribiendo' || fase === 'extrayendo' || fase === 'enviando') && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{descripcion}</p>
              </div>
            )}

            {fase === 'revisar' && (
              <div className="space-y-4">
                <Textarea
                  autoFocus
                  rows={10}
                  value={transcripcion}
                  onChange={(e) => setTranscripcion(e.target.value)}
                  className="text-sm leading-relaxed"
                />
                <Button
                  className="w-full"
                  onClick={handleConfirmarTranscripcion}
                  disabled={!transcripcion.trim()}
                >
                  Continuar
                </Button>
              </div>
            )}

            {fase === 'completando' && enPaso === 'legal' && (
              <PasoLegal
                initialData={datos.legal ?? {}}
                onNext={(data) => avanzarCola('legal', data)}
                guardando={guardando || enviando}
              />
            )}
            {fase === 'completando' && enPaso === 'equipo' && (
              <PasoEquipo
                initialData={datos.equipo ?? {}}
                onNext={(data) => avanzarCola('equipo', data)}
                guardando={guardando || enviando}
              />
            )}
            {fase === 'completando' && enPaso === 'producto' && (
              <PasoProducto
                initialData={datos.producto ?? {}}
                onNext={(data) => avanzarCola('producto', data)}
                guardando={guardando || enviando}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function tituloYDescripcion(
  modo: OnboardingSheetModo,
  fase: FaseHablar,
  pasoTitulo?: string,
  pasoAyuda?: string,
): { titulo: string; descripcion: string } {
  if (modo === 'escribir') {
    return {
      titulo: pasoTitulo ?? 'Cuéntanos de tu marca',
      descripcion: pasoAyuda ?? 'Se guarda solo. Puedes cerrar y seguir después.',
    };
  }
  switch (fase) {
    case 'transcribiendo':
      return { titulo: 'Escuchando tu audio', descripcion: 'Un momento, ya casi.' };
    case 'revisar':
      return { titulo: 'Revisa lo que entendimos', descripcion: 'Corrígelo si algo quedó mal.' };
    case 'extrayendo':
      return { titulo: 'Entendiendo lo que dijiste', descripcion: 'Un momento, ya casi.' };
    case 'completando':
      // No es "faltó": es que estos datos hay que verlos escritos. Un NIT o un
      // correo dictados se transcriben mal y nadie lo nota hasta la factura.
      return {
        titulo: 'Revisa estos datos',
        descripcion: 'Van escritos para que queden exactos. Ya pusimos lo que entendimos.',
      };
    case 'enviando':
      return { titulo: 'Enviando todo', descripcion: 'Un momento, ya casi.' };
    case 'grabar':
    default:
      return { titulo: 'Cuéntanos hablando', descripcion: 'Graba un audio corto contándonos de tu marca.' };
  }
}
