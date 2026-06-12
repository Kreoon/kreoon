import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Camera, User, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhoneInput } from '@/components/registration-v2/shared/PhoneInput';
import { LegalCheckboxes } from '@/components/registration-v2/shared/LegalCheckboxes';
import { recordLegalConsents } from '@/components/registration-v2/shared/recordLegalConsents';

interface UpgradeToCreatorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schema = z.object({
  phone: z.string()
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(20, 'El teléfono no puede exceder 20 dígitos')
    .regex(/^[0-9\s]+$/, 'Solo se permiten números'),
  phoneCountryCode: z.string().min(1, 'Selecciona un país'),
  acceptAge18Plus: z.literal(true, {
    errorMap: () => ({ message: 'Debes confirmar que eres mayor de 18 años' }),
  }),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
  }),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la política de privacidad' }),
  }),
  acceptDataTreatment: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar el tratamiento de datos' }),
  }),
});

type FormData = z.infer<typeof schema>;

/**
 * Wizard de upgrade: estudiante → creador de contenido.
 *
 * Pide los datos legales que se omitieron en el registro express + teléfono,
 * y crea el creator_profile + asigna el rol 'content_creator'.
 * El rol 'student' se conserva (el user puede tener ambos).
 */
export function UpgradeToCreatorWizard({ open, onOpenChange }: UpgradeToCreatorWizardProps) {
  const { user, profile, refetchUserData } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: '',
      phoneCountryCode: '+57',
      acceptAge18Plus: false as unknown as true,
      acceptTerms: false as unknown as true,
      acceptPrivacy: false as unknown as true,
      acceptDataTreatment: false as unknown as true,
    },
  });

  const phone = watch('phone');
  const phoneCountryCode = watch('phoneCountryCode');
  const acceptAge18Plus = watch('acceptAge18Plus');
  const acceptTerms = watch('acceptTerms');
  const acceptPrivacy = watch('acceptPrivacy');
  const acceptDataTreatment = watch('acceptDataTreatment');

  const onSubmit = async (data: FormData) => {
    if (!user) {
      setSubmitError('Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      // 1. Actualizar profile (phone + active_role) — conservamos full_name del student.
      await supabase
        .from('profiles')
        .update({
          phone: `${data.phoneCountryCode} ${data.phone}`,
          active_role: 'content_creator',
        } as any)
        .eq('id', user.id);

      // 2. Asignar el rol 'content_creator' (manteniendo 'student' si existe).
      await (supabase as any).from('user_roles').upsert(
        { user_id: user.id, role: 'content_creator' },
        { onConflict: 'user_id,role' }
      );

      // 3. Crear creator_profile.
      const displayName = profile?.full_name || user.email?.split('@')[0] || 'Creador';
      await supabase.from('creator_profiles').insert({
        user_id: user.id,
        display_name: displayName,
        is_active: true,
        profile_customization: {},
      } as any);

      // 4. Registrar consentimientos legales.
      await recordLegalConsents(user.id);

      toast.success('¡Listo! Ya puedes usar las funciones de creador.');
      await refetchUserData();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Upgrade to creator failed:', e);
      const msg = e?.message ?? 'No pudimos completar la activación. Intenta de nuevo.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-pink-500/10 text-pink-500">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Activarme como creador</DialogTitle>
              <DialogDescription>
                Completa estos datos para empezar a recibir trabajo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Identidad del estudiante (read-only, solo recordatorio) */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              {profile?.full_name || user?.email}
            </span>
          </div>

          {/* Teléfono */}
          <PhoneInput
            value={phone}
            countryCode={phoneCountryCode}
            onChange={(v) => setValue('phone', v)}
            onCountryChange={(c) => setValue('phoneCountryCode', c)}
            error={errors.phone?.message}
            disabled={submitting}
          />

          {/* Legales */}
          <LegalCheckboxes
            acceptAge18Plus={acceptAge18Plus as unknown as boolean}
            acceptTerms={acceptTerms as unknown as boolean}
            acceptPrivacy={acceptPrivacy as unknown as boolean}
            acceptDataTreatment={acceptDataTreatment as unknown as boolean}
            onAge18PlusChange={(v) => setValue('acceptAge18Plus', v as true)}
            onTermsChange={(v) => setValue('acceptTerms', v as true)}
            onPrivacyChange={(v) => setValue('acceptPrivacy', v as true)}
            onDataTreatmentChange={(v) => setValue('acceptDataTreatment', v as true)}
            errors={{
              acceptAge18Plus: errors.acceptAge18Plus?.message,
              acceptTerms: errors.acceptTerms?.message,
              acceptPrivacy: errors.acceptPrivacy?.message,
              acceptDataTreatment: errors.acceptDataTreatment?.message,
            }}
            disabled={submitting}
          />

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-500">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <Button type="submit" disabled={submitting} className={cn('w-full')}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Activando...
              </>
            ) : (
              'Activar mi cuenta de creador'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
