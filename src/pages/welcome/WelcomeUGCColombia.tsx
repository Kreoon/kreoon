/**
 * WelcomeUGCColombia - Página de bienvenida a KREOON para la comunidad UGC Colombia
 *
 * Diseño Nova con branding completo de KREOON
 * Datos de beneficios cargados dinámicamente desde partner_communities
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, CheckCircle2, Clock, User, Briefcase, Users,
  Gift, Zap, Award, Sparkles, Shield, Rocket, Star, Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { KreoonLogo } from '@/components/ui/kreoon-logo';
import { NovaPageWrapper } from '@/components/ui/nova/NovaAurora';
import { NovaCard, NovaCardContent } from '@/components/ui/nova/NovaCard';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface CommunityData {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  free_months: number;
  commission_discount_points: number;
  bonus_ai_tokens: number;
  custom_badge_text: string | null;
  custom_badge_color: string | null;
  partner_contact_email: string | null;
  is_active: boolean;
}

const COMMUNITY_SLUG = 'ugc-colombia';

const NEXT_STEPS = [
  {
    icon: User,
    title: 'Completa tu perfil',
    description: 'Agrega tu foto, bio y portafolio para destacar',
    link: '/settings/profile',
  },
  {
    icon: Briefcase,
    title: 'Explora oportunidades',
    description: 'Descubre proyectos y marcas buscando creadores',
    link: '/marketplace',
  },
  {
    icon: Users,
    title: 'Conecta con la comunidad',
    description: 'Únete a otros creadores UGC de Colombia',
    link: '/marketplace/explore',
  },
];

export default function WelcomeUGCColombia() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // Cargar datos de la comunidad desde la BD
  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ['partner-community', COMMUNITY_SLUG],
    queryFn: async (): Promise<CommunityData | null> => {
      const { data, error } = await supabase
        .from('partner_communities')
        .select('*')
        .eq('slug', COMMUNITY_SLUG)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error loading community:', error);
        return null;
      }

      return data as CommunityData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Generar beneficios dinámicamente basados en los datos de la comunidad
  const benefits = community ? [
    community.free_months > 0 && {
      icon: Gift,
      text: community.free_months === 1
        ? '1 mes gratis de suscripción Pro'
        : `${community.free_months} meses gratis de suscripción Pro`,
    },
    community.bonus_ai_tokens > 0 && {
      icon: Zap,
      text: `${community.bonus_ai_tokens.toLocaleString()} tokens AI de bienvenida`,
    },
    community.custom_badge_text && {
      icon: Award,
      text: `Badge exclusivo "${community.custom_badge_text}"`,
    },
    community.commission_discount_points > 0 && {
      icon: Star,
      text: `${community.commission_discount_points}% descuento en comisiones`,
    },
  ].filter(Boolean) : [];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Confetti effect
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b'],
      });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const userName = profile?.full_name?.split(' ')[0] || 'Creador';
  const contactEmail = community?.partner_contact_email || 'soporte@kreoon.com';
  const communityName = community?.name || 'UGC Colombia';

  const isLoading = authLoading || communityLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <NovaPageWrapper auroraIntensity="subtle">
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KreoonLogo heightClass="h-8" />
              <span className="text-lg font-bold text-foreground tracking-tight uppercase">
                KREOON
              </span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ir al Dashboard
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            {/* Welcome Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
              style={community?.custom_badge_color ? {
                backgroundColor: `${community.custom_badge_color}15`,
                borderColor: `${community.custom_badge_color}40`,
              } : undefined}
            >
              <Sparkles
                className="w-4 h-4"
                style={community?.custom_badge_color ? { color: community.custom_badge_color } : undefined}
              />
              <span
                className="text-sm font-medium"
                style={community?.custom_badge_color ? { color: community.custom_badge_color } : undefined}
              >
                Comunidad {communityName}
              </span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            >
              ¡Bienvenido a{' '}
              <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
                KREOON
              </span>
              , {userName}!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground max-w-lg mx-auto"
            >
              Tu cuenta está activa. Ahora eres parte de la plataforma líder para creadores de contenido en Latinoamérica.
            </motion.p>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <NovaCard variant="glass" className="overflow-hidden">
              <NovaCardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                      Solicitud en revisión
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
                        Pendiente
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tu solicitud para unirte a la comunidad {communityName} está siendo revisada.
                      Mientras tanto, puedes usar KREOON como freelance.
                    </p>
                  </div>
                </div>
              </NovaCardContent>
            </NovaCard>
          </motion.div>

          {/* Benefits Grid - Dinámico desde la BD */}
          {benefits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-10"
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                Beneficios que se activarán al aprobar tu solicitud
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                  >
                    <NovaCard variant="default" className="h-full">
                      <NovaCardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {benefit && <benefit.icon className="w-4 h-4 text-primary" />}
                        </div>
                        <span className="text-sm text-foreground font-medium">
                          {benefit && benefit.text}
                        </span>
                      </NovaCardContent>
                    </NovaCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-10"
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-green-500" />
              Próximos pasos
            </h3>
            <div className="space-y-3">
              {NEXT_STEPS.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                >
                  <NovaCard
                    variant="default"
                    hover
                    className="cursor-pointer group"
                    onClick={() => navigate(step.link)}
                  >
                    <NovaCardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 group-hover:border-primary/40 transition-colors">
                          <step.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {step.title}
                          </h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {step.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </NovaCardContent>
                  </NovaCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-center"
          >
            <button
              onClick={() => navigate('/dashboard')}
              className={cn(
                "inline-flex items-center justify-center gap-2",
                "px-8 py-3.5 rounded-sm font-semibold text-base",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-all duration-200",
                "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                "hover:-translate-y-0.5"
              )}
            >
              Comenzar a usar KREOON
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="mt-6 text-sm text-muted-foreground">
              ¿Tienes preguntas? Escríbenos a{' '}
              <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                {contactEmail}
              </a>
            </p>
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-16 pt-8 border-t border-border text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Plataforma segura y verificada
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 SICOMMER INT LLC. Todos los derechos reservados.
            </p>
          </motion.footer>
        </div>
      </div>
    </NovaPageWrapper>
  );
}
