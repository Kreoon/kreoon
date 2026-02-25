import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UnifiedRegistrationData } from './types';
import { useAuthAnalytics } from '@/analytics';

const PENDING_REG_KEY = 'kreoon_pending_registration';

export function useRegistrationSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { trackSignupStarted, trackSignupCompleted, trackSignupFailed } = useAuthAnalytics();

  const submit = useCallback(async (data: UnifiedRegistrationData): Promise<boolean> => {
    setSubmitting(true);
    trackSignupStarted({ signup_method: 'email', landing_page: window.location.href });

    try {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
            account_type: data.intent || 'talent',
            country: data.locationCountry,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // If no session (email confirmation required), save pending data including email for resend
      if (!authData.session) {
        localStorage.setItem(PENDING_REG_KEY, JSON.stringify({
          email: data.email, // Save email for resend functionality
          intent: data.intent,
          marketplaceRoles: data.marketplaceRoles,
          platforms: data.platforms,
          categories: data.categories,
          talentType: data.talentType,
          brandName: data.brandName,
          brandIndustry: data.brandIndustry,
          brandWebsite: data.brandWebsite,
          orgSubType: data.orgSubType,
          orgName: data.orgName,
          orgSlug: data.orgSlug,
          selectedPlan: data.selectedPlan,
          bio: data.bio,
          locationCountry: data.locationCountry,
          referralCode: data.referralCode,
        }));
        toast.success('Revisa tu correo', {
          description: 'Te enviamos un email de verificación. Revisa también la carpeta de spam.',
        });
        return true;
      }

      const userId = authData.user.id;

      // 2. Execute intent-specific logic
      switch (data.intent) {
        case 'talent':
          await handleTalentSubmit(userId, data);
          break;
        case 'brand':
          await handleBrandSubmit(userId, data);
          break;
        case 'organization':
          await handleOrgSubmit(userId, data);
          break;
        case 'join':
          await handleJoinSubmit(userId, data);
          break;
      }

      // Apply referral code if present (needs auth — user just signed up)
      if (data.referralCode && authData.session) {
        try {
          await supabase.functions.invoke('referral-service/apply-code', {
            body: { code: data.referralCode },
            headers: { Authorization: `Bearer ${authData.session.access_token}` },
          });
          localStorage.removeItem('kreoon_referral_code');
        } catch { /* non-critical */ }
      }

      trackSignupCompleted(userId, {
        signup_method: 'email',
        user_role: data.intent || 'talent',
      });

      return true;
    } catch (error: any) {
      console.error('Registration error:', error);
      const msg = error.message?.includes('already registered')
        ? 'Este correo ya está registrado'
        : error.message || 'Ocurrió un error al registrar';
      trackSignupFailed(msg, 'email');
      toast.error(msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [navigate, trackSignupStarted, trackSignupCompleted, trackSignupFailed]);

  return { submit, submitting };
}

// --- Intent handlers ---

async function handleTalentSubmit(userId: string, data: UnifiedRegistrationData) {
  // Determine the primary role from marketplace roles selection
  const primaryRole = data.marketplaceRoles?.[0] || 'creator';

  // Update profiles with active_role so useAuth can resolve permissions
  await supabase
    .from('profiles')
    .update({
      country: data.locationCountry,
      bio: data.bio || null,
      active_role: primaryRole,
    })
    .eq('id', userId);

  // Create creator_profile
  await (supabase as any)
    .from('creator_profiles')
    .insert({
      user_id: userId,
      display_name: data.fullName,
      bio: data.bio || null,
      location_country: data.locationCountry,
      marketplace_roles: data.marketplaceRoles,
      platforms: data.platforms,
      categories: data.categories,
      content_types: [],
      languages: ['es'],
      social_links: {},
      is_active: true,
      profile_customization: {},
    });

  toast.success('¡Bienvenido a KREOON!', {
    description: 'Tu perfil de talento ha sido creado. Complétalo para recibir propuestas.',
  });
}

async function handleBrandSubmit(userId: string, data: UnifiedRegistrationData) {
  const brandSlug = data.brandName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);

  // Create brand
  const { data: brandData, error: brandError } = await (supabase as any)
    .from('brands')
    .insert({
      name: data.brandName,
      slug: brandSlug,
      industry: data.brandIndustry,
      website: data.brandWebsite || null,
      owner_id: userId,
    })
    .select('id')
    .single();

  if (brandError) throw brandError;

  if (brandData) {
    // Add as brand owner
    await (supabase as any)
      .from('brand_members')
      .insert({
        brand_id: brandData.id,
        user_id: userId,
        role: 'owner',
      });

    // Update profile with active_role so useAuth can resolve permissions
    await supabase
      .from('profiles')
      .update({
        active_brand_id: brandData.id,
        country: data.locationCountry,
        bio: data.bio || null,
        active_role: 'client',
      })
      .eq('id', userId);
  }

  toast.success('¡Marca registrada!', {
    description: 'Ya puedes buscar y contratar talento en el marketplace.',
  });
}

async function handleOrgSubmit(userId: string, data: UnifiedRegistrationData) {
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.orgName,
      slug: data.orgSlug,
      organization_type: data.orgSubType || 'agency',
      admin_name: data.fullName,
      admin_email: data.email,
      is_registration_open: false,
      created_by: userId,
      selected_plan: data.selectedPlan,
      subscription_status: 'trial',
      trial_active: true,
      trial_started_at: new Date().toISOString(),
    } as any)
    .select('id')
    .single();

  if (orgError) throw orgError;

  if (orgData) {
    await supabase.from('organization_members').insert({
      organization_id: orgData.id,
      user_id: userId,
      role: 'admin',
      is_owner: true,
    });

    await supabase.from('organization_member_roles').insert({
      organization_id: orgData.id,
      user_id: userId,
      role: 'admin',
    });

    await supabase
      .from('profiles')
      .update({
        current_organization_id: orgData.id,
        organization_status: 'active',
        country: data.locationCountry,
        bio: data.bio || null,
      })
      .eq('id', userId);
  }

  toast.success('¡Organización creada!', {
    description: 'Tu prueba de 30 días ha comenzado.',
  });
}

async function handleJoinSubmit(userId: string, data: UnifiedRegistrationData) {
  if (!data.foundOrg) throw new Error('No se encontró la organización');

  const org = data.foundOrg;
  const defaultRole = 'creator';

  await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: defaultRole,
  });

  await supabase.from('organization_member_roles').insert({
    organization_id: org.id,
    user_id: userId,
    role: defaultRole,
  });

  await supabase
    .from('profiles')
    .update({
      current_organization_id: org.id,
      organization_status: 'active',
      country: data.locationCountry,
      bio: data.bio || null,
    })
    .eq('id', userId);

  // Mark invitation as accepted if invite code was used
  if (data.inviteCode) {
    await (supabase as any)
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', data.inviteCode);
  }

  toast.success('¡Te has unido!', {
    description: `Ya eres parte de ${org.name}.`,
  });
}
