import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Circle, CircleDashed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { KreoonBadge } from '@/components/ui/kreoon';
import {
  SCHEMAS,
  STEPS,
  type OnboardingFormData,
  type SectionKey,
} from '@/components/client-onboarding/schemas';

/**
 * Checklist de "qué le falta a esta cuenta" dentro de la pestaña Onboarding.
 *
 * Dos bloques:
 *  - Inicio: hitos de acceso (cuenta creada, personas vinculadas, envío, proceso).
 *  - Secciones del formulario: estado de cada paso del wizard + interruptor
 *    "Debe llenarlo". Lo que se apaga queda en `omitted_sections`: el wizard lo
 *    salta y el servidor deja de exigirlo al enviar.
 *
 * El paso de cierre ('logistica') no es omitible: es el que trae el botón de
 * envío. RLS ya permite a staff de la org actualizar el formulario.
 */

export interface ChecklistForm {
  id: string;
  status: string;
  form_data: OnboardingFormData;
  submitted_at: string | null;
  processed_at: string | null;
  claimed_at: string | null;
  omitted_sections: SectionKey[] | null;
}

interface Props {
  clientId: string;
  form: ChecklistForm;
  onChanged: () => void;
}

type EstadoSeccion = 'completo' | 'incompleto' | 'vacio';

/** Secciones sin las cuales el resto del sistema pierde información clave. */
const ADVERTENCIA_AL_OMITIR: Partial<Record<SectionKey, string>> = {
  legal: 'Sin datos legales no hay factura ni contrato: tendrás que cargarlos tú.',
  producto: 'Sin producto no se puede generar el ADN ni la estrategia.',
};

function estadoSeccion(datos: unknown, key: SectionKey): EstadoSeccion {
  const tieneAlgo =
    !!datos &&
    typeof datos === 'object' &&
    Object.keys(datos as Record<string, unknown>).length > 0;
  if (!tieneAlgo) return 'vacio';
  return SCHEMAS[key].safeParse(datos).success ? 'completo' : 'incompleto';
}

function Icono({ ok, parcial }: { ok: boolean; parcial?: boolean }) {
  if (ok) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (parcial) return <CircleDashed className="h-4 w-4 shrink-0 text-amber-400" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function OnboardingChecklist({ clientId, form, onChanged }: Props) {
  const [personas, setPersonas] = useState<number | null>(null);
  const [guardando, setGuardando] = useState<SectionKey | null>(null);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      const { count } = await supabase
        .from('client_users')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);
      if (!cancelado) setPersonas(count ?? 0);
    })();
    return () => {
      cancelado = true;
    };
  }, [clientId]);

  const omitidas = form.omitted_sections ?? [];

  const alternar = async (key: SectionKey, debeLlenar: boolean) => {
    const siguiente = debeLlenar
      ? omitidas.filter((s) => s !== key)
      : [...omitidas, key];

    setGuardando(key);
    try {
      const { error } = await supabase
        .from('client_onboarding_forms')
        .update({ omitted_sections: siguiente })
        .eq('id', form.id);
      if (error) throw error;

      if (!debeLlenar && ADVERTENCIA_AL_OMITIR[key]) {
        toast.warning('Sección omitida', { description: ADVERTENCIA_AL_OMITIR[key] });
      }
      onChanged();
    } catch {
      toast.error('No se pudo actualizar', { description: 'Intenta de nuevo.' });
    } finally {
      setGuardando(null);
    }
  };

  const secciones = STEPS.filter((s) => s.key !== 'logistica').map((paso) => {
    const omitida = omitidas.includes(paso.key);
    return {
      paso,
      omitida,
      estado: estadoSeccion(form.form_data?.[paso.key], paso.key),
    };
  });

  const pendientes = secciones.filter(
    (s) => !s.omitida && s.estado !== 'completo',
  ).length;

  const hitos = [
    { label: 'Cuenta creada por el cliente', ok: !!form.claimed_at },
    {
      label:
        personas === null
          ? 'Personas con acceso a la empresa'
          : `Personas con acceso a la empresa (${personas})`,
      ok: (personas ?? 0) > 0,
    },
    { label: 'Formulario enviado', ok: !!form.submitted_at },
    { label: 'Onboarding procesado (ADN y estrategia)', ok: !!form.processed_at },
  ];

  return (
    <div className="space-y-4 rounded-sm border border-kreoon-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Qué le falta a esta cuenta
        </p>
        <KreoonBadge variant={pendientes === 0 ? 'success' : 'warning'} size="sm">
          {pendientes === 0
            ? 'Al día'
            : `${pendientes} sección${pendientes === 1 ? '' : 'es'} por llenar`}
        </KreoonBadge>
      </div>

      {/* Inicio */}
      <div className="space-y-1.5">
        {hitos.map((h) => (
          <div key={h.label} className="flex items-center gap-2 text-sm">
            <Icono ok={h.ok} />
            <span className={h.ok ? 'text-kreoon-text-primary' : 'text-muted-foreground'}>
              {h.label}
            </span>
          </div>
        ))}
      </div>

      {/* Secciones del formulario */}
      <div className="space-y-2 border-t border-kreoon-border pt-3">
        <p className="text-[11px] text-muted-foreground">
          Marca qué debe llenar el cliente. Lo que apagues se salta en su
          formulario y deja de ser obligatorio.
        </p>
        {secciones.map(({ paso, omitida, estado }) => (
          <div
            key={paso.key}
            className="flex items-center justify-between gap-3 rounded-sm bg-kreoon-bg-secondary/40 px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icono ok={!omitida && estado === 'completo'} parcial={estado === 'incompleto'} />
              <div className="min-w-0">
                <p className="truncate text-sm text-kreoon-text-primary">
                  {paso.emoji} {paso.titulo}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {omitida
                    ? 'No se le pide al cliente'
                    : estado === 'completo'
                      ? 'Completo'
                      : estado === 'incompleto'
                        ? 'Incompleto'
                        : 'Sin empezar'}
                  {omitida && ADVERTENCIA_AL_OMITIR[paso.key] && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> afecta el proceso
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                Debe llenarlo
              </span>
              <Switch
                checked={!omitida}
                disabled={guardando === paso.key || form.status === 'processed'}
                onCheckedChange={(v) => void alternar(paso.key, v)}
                aria-label={`El cliente debe llenar: ${paso.titulo}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
