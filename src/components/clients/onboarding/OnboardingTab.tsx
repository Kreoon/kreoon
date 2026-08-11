import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Link2,
  Loader2,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
import { KreoonBadge, KreoonButton } from '@/components/ui/kreoon';
import type { OnboardingFormData } from '@/components/client-onboarding/schemas';
import { OnboardingLinkDialog } from './OnboardingLinkDialog';
import { OnboardingResponseView } from './OnboardingResponseView';

/**
 * Pestaña de Onboarding dentro del detalle del cliente.
 *
 * Junta las tres piezas del lado admin: generar/copiar el link, ver lo que el
 * cliente respondió, y procesar el onboarding hacia el resto del sistema.
 *
 * El gating es por getPermissionGroup, no comparando strings de rol a mano. Es
 * solo UX: las edge functions client-portal-invite y client-onboarding-process
 * revalidan el rol server-side contra la organización DEL FORMULARIO, así que
 * ocultar el botón no es la defensa.
 */

interface OnboardingTabProps {
  clientId: string;
  clientName: string;
  organizationId: string | null | undefined;
}

type EstadoForm = 'pending' | 'in_progress' | 'submitted' | 'processed';

interface FormRow {
  id: string;
  status: EstadoForm;
  form_data: OnboardingFormData;
  submitted_at: string | null;
  processed_at: string | null;
  processing: {
    pasos?: Record<
      string,
      { ok?: boolean; detalle?: string; product_dna_id?: string } | undefined
    >;
  } | null;
}

const ETIQUETA_ESTADO: Record<EstadoForm, string> = {
  pending: 'Sin enviar',
  in_progress: 'En progreso',
  submitted: 'Completado',
  processed: 'Procesado',
};

const VARIANTE_ESTADO: Record<
  EstadoForm,
  'default' | 'success' | 'warning' | 'purple'
> = {
  pending: 'default',
  in_progress: 'warning',
  submitted: 'purple',
  processed: 'success',
};

const NOMBRE_PASO: Record<string, string> = {
  cliente: 'Datos del cliente',
  invitacion: 'Invitación al portal',
  adn: 'ADN del producto',
};

export function OnboardingTab({
  clientId,
  clientName,
  organizationId,
}: OnboardingTabProps) {
  const { roles } = useAuth();
  const [form, setForm] = useState<FormRow | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [linkAbierto, setLinkAbierto] = useState(false);

  // admin o estratega: mismo criterio que revalidan las edge functions.
  const puedeGestionar = (roles ?? []).some((r) => {
    const grupo = getPermissionGroup(r);
    return grupo === 'admin' || grupo === 'talent';
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('client_onboarding_forms')
        .select('id, status, form_data, submitted_at, processed_at, processing')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setForm((data as FormRow | null) ?? null);
    } catch {
      setForm(null);
    } finally {
      setCargando(false);
    }
  }, [clientId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const procesar = async () => {
    if (!form) return;
    setProcesando(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'client-onboarding-process',
        { body: { form_id: form.id } },
      );

      if (error) throw error;

      if (data?.ok) {
        toast.success('Onboarding procesado', {
          description: 'Ya se volcaron los datos y se disparó el ADN.',
        });
      } else {
        toast.warning('Se procesó con errores', {
          description: 'Revisa el detalle de cada paso. Puedes reintentar.',
        });
      }
      await cargar();
    } catch (err) {
      toast.error('No se pudo procesar', {
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!puedeGestionar) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No tienes permisos para ver el onboarding de este cliente.
      </p>
    );
  }

  const estado = form?.status ?? 'pending';
  const yaRespondio = estado === 'submitted' || estado === 'processed';
  const pasos = form?.processing?.pasos ?? {};

  return (
    <div className="space-y-5">
      {/* Encabezado: estado + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Estado:</span>
          <KreoonBadge variant={VARIANTE_ESTADO[estado]} size="sm">
            {ETIQUETA_ESTADO[estado]}
          </KreoonBadge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <KreoonButton
            variant="outline"
            size="sm"
            onClick={() => setLinkAbierto(true)}
            disabled={!organizationId}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Link de onboarding
          </KreoonButton>

          {estado === 'submitted' && (
            <KreoonButton
              variant="primary"
              size="sm"
              onClick={procesar}
              loading={procesando}
            >
              <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
              Procesar onboarding
            </KreoonButton>
          )}

          {estado === 'processed' && (
            <KreoonButton
              variant="ghost"
              size="sm"
              onClick={procesar}
              loading={procesando}
            >
              Reintentar procesamiento
            </KreoonButton>
          )}
        </div>
      </div>

      {/* Resultado por paso del procesamiento */}
      {Object.keys(pasos).length > 0 && (
        <div className="space-y-2 rounded-sm border border-kreoon-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Procesamiento
          </p>
          {Object.entries(pasos).map(([clave, paso]) => (
            <div key={clave} className="flex items-start gap-2 text-sm">
              {paso?.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0">
                <span className="text-kreoon-text-primary">
                  {NOMBRE_PASO[clave] ?? clave}
                </span>
                {paso?.detalle && (
                  <p className="text-xs text-muted-foreground">{paso.detalle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Respuesta del cliente */}
      {yaRespondio && form ? (
        <OnboardingResponseView
          formData={form.form_data ?? {}}
          submittedAt={form.submitted_at}
        />
      ) : (
        <div className="rounded-sm border border-dashed border-kreoon-border py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {estado === 'in_progress'
              ? 'El cliente empezó a llenar el formulario pero todavía no lo envió.'
              : 'Todavía no le enviaste el formulario a este cliente.'}
          </p>
        </div>
      )}

      {organizationId && (
        <OnboardingLinkDialog
          clientId={clientId}
          clientName={clientName}
          organizationId={organizationId}
          open={linkAbierto}
          onOpenChange={setLinkAbierto}
          onChanged={cargar}
        />
      )}
    </div>
  );
}
