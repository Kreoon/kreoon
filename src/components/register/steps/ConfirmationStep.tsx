import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Building2, User, Crown, Sparkles, Rocket, Users } from 'lucide-react';
import { StepProps } from '../types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function ConfirmationStep({ data, onBack }: StepProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isOrgFlow = data.registrationMode === 'create_org';
  const isJoinFlow = data.registrationMode === 'join_org';

  const getOrgTypeLabel = () => {
    switch (data.organizationType) {
      case 'agency': return 'Agencia';
      case 'brand': return 'Empresa / Marca';
      case 'community': return 'Comunidad';
      default: return '';
    }
  };

  const getUserRoleLabel = () => {
    switch (data.userRolePrimary) {
      case 'creator': return 'Creador';
      case 'editor': return 'Editor';
      case 'both': return 'Creador & Editor';
      default: return '';
    }
  };

  const getPlanLabel = () => {
    switch (data.selectedPlan) {
      case 'starter': return 'Starter';
      case 'growth': return 'Growth';
      case 'scale': return 'Scale';
      default: return '';
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
            account_type: isOrgFlow ? 'organization' : isJoinFlow ? 'join_org' : 'individual',
            country: data.country,
            user_role_primary: data.userRolePrimary,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // If email confirmation is required, there will be no session.
      // Avoid doing any post-signup DB writes (they will fail under RLS) and guide the user.
      if (!authData.session) {
        toast({
          title: 'Confirma tu correo',
          description: 'Te enviamos un email de verificación. Confírmalo y luego inicia sesión para continuar.',
        });
        navigate('/auth');
        return;
      }

      if (isOrgFlow) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: data.organizationName,
            slug: data.organizationUsername,
            organization_type: data.organizationType,
            admin_name: data.fullName,
            admin_email: data.email,
            is_registration_open: false,
            created_by: authData.user.id,
            selected_plan: data.selectedPlan,
            subscription_status: 'trial',
            trial_active: true,
            trial_started_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (orgError) throw orgError;

        if (orgData) {
          await supabase.from('organization_members').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
            is_owner: true,
          });

          await supabase.from('organization_member_roles').insert({
            organization_id: orgData.id,
            user_id: authData.user.id,
            role: 'admin',
          });

          await supabase
            .from('profiles')
            .update({ 
              current_organization_id: orgData.id,
              organization_status: 'active',
              country: data.country,
            })
            .eq('id', authData.user.id);
        }

        toast({
          title: '¡Organización creada!',
          description: 'Tu prueba de 30 días ha comenzado',
        });
        
        // Redirect org creators to dashboard
        navigate('/dashboard');
      } else if (isJoinFlow) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id, default_role')
          .eq('slug', data.joinLink)
          .single();

        if (org) {
          const role = org.default_role || 'creator';
          
          await supabase.from('organization_members').insert({
            organization_id: org.id,
            user_id: authData.user.id,
            role: role,
          });

          await supabase.from('organization_member_roles').insert({
            organization_id: org.id,
            user_id: authData.user.id,
            role: role,
          });

          await supabase
            .from('profiles')
            .update({ 
              current_organization_id: org.id,
              organization_status: 'active',
              country: data.country,
            })
            .eq('id', authData.user.id);

          if (data.inviteCode) {
            await supabase
              .from('organization_invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('token', data.inviteCode);
          }
        }

        toast({
          title: '¡Te has unido!',
          description: 'Ya eres parte de la organización',
        });
        
        // Redirect based on role
        const roleToRoute: Record<string, string> = {
          'admin': '/dashboard',
          'creator': '/creator-dashboard',
          'editor': '/editor-dashboard',
          'client': '/client-dashboard',
          'strategist': '/strategist-dashboard',
        };
        navigate(roleToRoute[org?.default_role || 'creator'] || '/creator-dashboard');
      } else {
        // Individual user
        await supabase
          .from('profiles')
          .update({ 
            organization_status: 'pending_assignment',
            country: data.country,
          })
          .eq('id', authData.user.id);

        toast({
          title: '¡Cuenta creada!',
          description: 'Ya puedes acceder a tu portafolio y la red social',
        });
        
        // Individual users go to portfolio/explore
        navigate('/portfolio/explore');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Error al registrar',
        description: error.message?.includes('already registered') 
          ? 'Este correo ya está registrado' 
          : error.message || 'Ocurrió un error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSummaryItems = () => {
    if (isOrgFlow) {
      return [
        { label: 'Tipo de acceso', value: 'Nueva organización', icon: Building2 },
        { label: 'Tipo de organización', value: getOrgTypeLabel(), icon: Building2 },
        { label: 'Nombre', value: data.organizationName, icon: Sparkles },
        { label: 'Plan seleccionado', value: getPlanLabel(), icon: Crown },
        { label: 'Prueba gratis', value: '30 días activos', icon: Rocket },
      ];
    }
    
    if (isJoinFlow) {
      return [
        { label: 'Tipo de acceso', value: 'Unirse a organización', icon: Users },
        { label: 'Organización', value: data.joinLink, icon: Building2 },
        { label: 'Acceso inmediato', value: 'Panel de la organización', icon: Rocket },
      ];
    }
    
    return [
      { label: 'Tipo de acceso', value: 'Perfil individual', icon: User },
      { label: 'Rol principal', value: getUserRoleLabel(), icon: Sparkles },
      { label: 'Acceso inmediato', value: 'Portafolio + Red social', icon: Rocket },
    ];
  };

  const summaryItems = getSummaryItems();

  return (
    <div className="w-full max-w-lg mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-8 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Atrás
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
        >
          <Check className="w-10 h-10 text-primary" />
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Todo listo para{' '}
          <span className="text-gradient-violet">comenzar</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Revisa tu información antes de crear tu cuenta
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-card/50 p-6 mb-8 space-y-4"
      >
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-medium text-foreground">{item.value}</span>
            </motion.div>
          );
        })}

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{data.email}</span>
          </div>
        </div>
      </motion.div>

      <Button
        onClick={handleCreateAccount}
        disabled={loading}
        className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold glow-violet"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Crear cuenta y entrar a KREOON
            <Rocket className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Al crear tu cuenta, aceptas los{' '}
        <a href="#" className="text-primary hover:underline">Términos de Servicio</a>
        {' '}y{' '}
        <a href="#" className="text-primary hover:underline">Política de Privacidad</a>
      </p>
    </div>
  );
}
