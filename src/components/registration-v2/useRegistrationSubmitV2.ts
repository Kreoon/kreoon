import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RegistrationFormData, UserType, RegistrationV2State } from './types';
import { triggerUserSyncSilent, triggerOrgSyncSilent } from '@/services/pancakeCrmService';

/**
 * Registra los consentimientos legales del usuario después del registro
 */
async function recordLegalConsents(userId: string): Promise<void> {
  try {
    // 1. Registrar verificación de edad
    await supabase.rpc('record_age_verification', {
      p_user_id: userId,
      p_declared_age_18_plus: true,
      p_ip_address: null,
      p_user_agent: navigator.userAgent,
    });

    // 2. Obtener documentos legales vigentes
    const { data: documents } = await supabase
      .from('legal_documents')
      .select('id')
      .eq('is_current', true)
      .eq('is_required', true);

    if (documents && documents.length > 0) {
      // 3. Registrar consentimiento para cada documento
      for (const doc of documents) {
        await supabase.rpc('record_consent', {
          p_user_id: userId,
          p_document_id: doc.id,
          p_ip_address: null,
          p_user_agent: navigator.userAgent,
        });
      }
    }
  } catch (error) {
    console.warn('Error recording legal consents:', error);
    // No falla el registro si hay error en consentimientos
  }
}

interface UseRegistrationSubmitV2Options {
  state: RegistrationV2State;
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmitError: (error: string | undefined) => void;
  setUserId: (userId: string) => void;
  setRequiresEmailConfirmation: (requires: boolean) => void;
  goToNextStep: () => void;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}

export function useRegistrationSubmitV2(options: UseRegistrationSubmitV2Options) {
  const {
    state,
    setSubmitting,
    setSubmitError,
    setUserId,
    setRequiresEmailConfirmation,
    goToNextStep,
  } = options;

  // ============================================
  // HANDLERS POR TIPO DE USUARIO
  // ============================================

  const handleTalentSubmit = useCallback(async (
    userId: string,
    data: RegistrationFormData
  ) => {
    // 1. Actualizar perfil
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: `${data.phoneCountryCode} ${data.phone}`,
        active_role: 'creator',
      })
      .eq('id', userId);

    // 2. Crear creator_profile
    const { error: profileError } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: userId,
        display_name: data.fullName,
        is_active: true,
        profile_customization: {},
      });

    if (profileError) throw profileError;

    // 3. Aplicar partner community si existe
    if (state.partnerCommunity) {
      try {
        await supabase.functions.invoke('partner-community-service', {
          body: {
            action: 'apply',
            user_id: userId,
            community_slug: state.partnerCommunity,
            user_type: 'talent',
          },
        });
      } catch (e) {
        console.warn('Error applying partner community:', e);
      }
    }

    toast.success('¡Tu perfil de creador ha sido creado!');
  }, [state.partnerCommunity]);

  const handleBrandSubmit = useCallback(async (
    userId: string,
    data: RegistrationFormData
  ) => {
    const brandName = data.companyName || data.fullName;
    const slug = generateSlug(brandName);

    // 1. Crear brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .insert({
        name: brandName,
        slug,
        owner_id: userId,
      })
      .select('id')
      .single();

    if (brandError) throw brandError;

    // 2. Crear brand_member
    await supabase.from('brand_members').insert({
      brand_id: brand.id,
      user_id: userId,
      role: 'owner',
    });

    // 3. Actualizar perfil
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: `${data.phoneCountryCode} ${data.phone}`,
        active_brand_id: brand.id,
        active_role: 'client',
      })
      .eq('id', userId);

    // 4. Aplicar partner community si existe
    if (state.partnerCommunity) {
      try {
        await supabase.functions.invoke('partner-community-service', {
          body: {
            action: 'apply',
            user_id: userId,
            community_slug: state.partnerCommunity,
            user_type: 'brand',
          },
        });
      } catch (e) {
        console.warn('Error applying partner community:', e);
      }
    }

    toast.success('¡Tu marca ha sido registrada!');
  }, [state.partnerCommunity]);

  const handleOrganizationSubmit = useCallback(async (
    userId: string,
    data: RegistrationFormData
  ) => {
    const orgName = data.companyName || data.fullName;
    const slug = generateSlug(orgName);

    // 1. Crear organización
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug,
        organization_type: 'agency',
        admin_name: data.fullName,
        admin_email: data.email,
        subscription_status: 'trial',
        trial_active: true,
        trial_started_at: new Date().toISOString(),
        is_registration_open: false,
      })
      .select('id')
      .single();

    if (orgError) throw orgError;

    // 2. Crear organization_member
    await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: userId,
      role: 'admin',
      is_owner: true,
    });

    // 3. Crear organization_member_roles
    await supabase.from('organization_member_roles').insert({
      organization_id: org.id,
      user_id: userId,
      role: 'admin',
    });

    // 4. Actualizar perfil
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: `${data.phoneCountryCode} ${data.phone}`,
        current_organization_id: org.id,
        organization_status: 'active',
      })
      .eq('id', userId);

    // 5. Aplicar partner community si existe
    if (state.partnerCommunity) {
      try {
        await supabase.functions.invoke('partner-community-service', {
          body: {
            action: 'apply',
            user_id: userId,
            community_slug: state.partnerCommunity,
            user_type: 'organization',
          },
        });
      } catch (e) {
        console.warn('Error applying partner community:', e);
      }
    }

    toast.success('¡Tu organización ha sido creada! Tu prueba de 30 días ha comenzado.');

    // Sincronizar organización con Pancake CRM
    triggerOrgSyncSilent(org.id);
  }, [state.partnerCommunity]);

  const handleClientJoinOrg = useCallback(async (
    userId: string,
    data: RegistrationFormData
  ) => {
    if (!state.orgId) throw new Error('Organization ID not found');

    // Usar RPC si existe, o insert directo
    const { error } = await supabase.rpc('register_user_to_organization', {
      p_user_id: userId,
      p_org_id: state.orgId,
      p_role: 'client',
      p_invite_code: state.inviteCode || null,
    });

    if (error) throw error;

    // Actualizar perfil
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: `${data.phoneCountryCode} ${data.phone}`,
        current_organization_id: state.orgId,
        organization_status: 'active',
      })
      .eq('id', userId);

    toast.success(`¡Te has unido a ${state.orgName || 'la organización'}!`);
  }, [state.orgId, state.orgName, state.inviteCode]);

  const handleFreelancerJoinOrg = useCallback(async (
    userId: string,
    data: RegistrationFormData
  ) => {
    if (!state.orgId) throw new Error('Organization ID not found');

    // 1. Unirse a la org como creator
    const { error: joinError } = await supabase.rpc('register_user_to_organization', {
      p_user_id: userId,
      p_org_id: state.orgId,
      p_role: 'creator',
      p_invite_code: state.inviteCode || null,
    });

    if (joinError) throw joinError;

    // 2. Crear creator_profile
    await supabase.from('creator_profiles').insert({
      user_id: userId,
      display_name: data.fullName,
      is_active: true,
      profile_customization: {},
    });

    // 3. Actualizar perfil
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: `${data.phoneCountryCode} ${data.phone}`,
        current_organization_id: state.orgId,
        organization_status: 'active',
        active_role: 'creator',
      })
      .eq('id', userId);

    toast.success(`¡Te has unido a ${state.orgName || 'la organización'}!`);
  }, [state.orgId, state.orgName, state.inviteCode]);

  // ============================================
  // SUBMIT PRINCIPAL
  // ============================================

  const submit = useCallback(async (data: RegistrationFormData) => {
    setSubmitting(true);
    setSubmitError(undefined);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: `${data.phoneCountryCode} ${data.phone}`,
            user_type: state.userType,
            partner_community: state.partnerCommunity,
            referral_code: state.referralCode,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned from signup');

      const userId = authData.user.id;
      setUserId(userId);

      // 2. Verificar si tiene sesión (email no requiere confirmación)
      const hasSession = !!authData.session;
      setRequiresEmailConfirmation(!hasSession);

      // 3. Si tiene sesión, ejecutar handlers
      if (hasSession) {
        // Flujo ORG
        if (state.flow === 'org') {
          if (state.userType === 'client') {
            await handleClientJoinOrg(userId, data);
          } else if (state.userType === 'freelancer') {
            await handleFreelancerJoinOrg(userId, data);
          }
        }
        // Flujo GENERAL
        else {
          if (state.userType === 'freelancer') {
            await handleTalentSubmit(userId, data);
          } else if (state.userType === 'brand') {
            await handleBrandSubmit(userId, data);
          } else if (state.userType === 'organization') {
            await handleOrganizationSubmit(userId, data);
          }
        }

        // 4. Registrar consentimientos legales
        await recordLegalConsents(userId);

        // 5. Aplicar código de referido si existe
        if (state.referralCode) {
          try {
            await supabase.functions.invoke('referral-service', {
              body: {
                action: 'apply-code',
                user_id: userId,
                code: state.referralCode,
              },
            });
          } catch (e) {
            console.warn('Error applying referral code:', e);
          }
        }

        // 6. Sincronizar con Pancake CRM (fire-and-forget)
        triggerUserSyncSilent(userId);
      } else {
        // Si requiere confirmación de email, guardar datos pendientes
        localStorage.setItem('kreoon_pending_registration', JSON.stringify({
          flow: state.flow,
          userType: state.userType,
          orgId: state.orgId,
          inviteCode: state.inviteCode,
          referralCode: state.referralCode,
          partnerCommunity: state.partnerCommunity,
          formData: data,
        }));
      }

      // 7. Ir al paso success
      goToNextStep();

    } catch (error: any) {
      console.error('Registration error:', error);

      let errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';

      // Detectar tipo de error específico
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        errorMessage = 'Este email ya está registrado. Intenta iniciar sesión.';
      } else if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
        errorMessage = 'Datos inválidos. Verifica la información ingresada.';
      } else if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('too many')) {
        errorMessage = 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
      } else if (error.code === '23505') {
        errorMessage = 'Este usuario ya existe. Intenta iniciar sesión.';
      }

      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    state,
    setSubmitting,
    setSubmitError,
    setUserId,
    setRequiresEmailConfirmation,
    goToNextStep,
    handleTalentSubmit,
    handleBrandSubmit,
    handleOrganizationSubmit,
    handleClientJoinOrg,
    handleFreelancerJoinOrg,
  ]);

  return { submit };
}
