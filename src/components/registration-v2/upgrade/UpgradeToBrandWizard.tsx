import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Building2, User, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhoneInput } from '@/components/registration-v2/shared/PhoneInput';
import { LegalCheckboxes } from '@/components/registration-v2/shared/LegalCheckboxes';
import { recordLegalConsents } from '@/components/registration-v2/shared/recordLegalConsents';

interface UpgradeToBrandWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schema = z.object({
  companyName: z.string()
    .min(2, 'El nombre de empresa debe tener al menos 2 caracteres')
    .max(120, 'El nombre no puede exceder 120 caracteres'),
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

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}

/**
 * Wizard de upgrade: estudiante → empresa (cliente / marca).
 *
 * Pide legales + datos de empresa, crea la brand y deja al usuario como owner.
 * El rol 'student' se conserva (el user puede tener ambos).
 */
export function UpgradeToBrandWizard({ open, onOpenChange }: UpgradeToBrandWizardProps) {
  const { user, profile, refetchUserData } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '',
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
      const brandName = data.companyName;
      const slug = generateSlug(brandName);

      // 1. Crear brand.
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .insert({
          name: brandName,
          slug,
          owner_id: user.id,
        } as any)
        .select('id')
        .single();
      if (brandError) throw brandError;

      // 2. Brand member (owner).
      await (supabase as any).from('brand_members').insert({
        brand_id: (brand as any).id,
        user_id: user.id,
        role: 'owner',
      });

      // 3. Update profile (active_brand_id + active_role + phone).
      await supabase
        .from('profiles')
        .update({
          phone: `${data.phoneCountryCode} ${data.phone}`,
          active_brand_id: (brand as any).id,
          active_role: 'client',
        } as any)
        .eq('id', user.id);

      // 4. Asignar el rol 'client' (manteniendo 'student' si existe).
      await (supabase as any).from('user_roles').upsert(
        { user_id: user.id, role: 'client' },
        { onConflict: 'user_id,role' }
      );

      // 5. Registrar consentimientos legales.
      await recordLegalConsents(user.id);

      toast.success('¡Listo! Tu cuenta de empresa está activa.');
      await refetchUserData();
      onOpenChange(false);
    } catch (e: any) {
      console.error('Upgrade to brand failed:', e);
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
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Activarme como empresa</DialogTitle>
              <DialogDescription>
                Completa estos datos para empezar a contratar talento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Identidad del estudiante (read-only) */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{profile?.full_name || user?.email}</span>
          </div>

          {/* Nombre de empresa */}
          <div className="space-y-1.5">
            <label htmlFor="upgrade-companyName" className="text-sm font-medium">
              Nombre de empresa <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="upgrade-companyName"
                type="text"
                {...register('companyName')}
                disabled={submitting}
                placeholder="Tu marca, agencia o empresa"
                className={cn(
                  'w-full h-11 pl-10 pr-4 rounded-md border bg-background',
                  errors.companyName ? 'border-red-500/50' : 'border-input',
                  submitting && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
            {errors.companyName && (
              <p className="text-xs text-red-500">{errors.companyName.message}</p>
            )}
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
              'Activar mi cuenta de empresa'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
