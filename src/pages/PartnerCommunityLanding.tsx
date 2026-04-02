import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Gift, Percent, Star, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Zap, Shield, Clock, User, Building2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommunityMetadata {
  hero_title?: string;
  hero_subtitle?: string;
  cta_title?: string;
  cta_subtitle?: string;
  cta_button_text?: string;
  theme_color?: string;
  background_gradient?: string;
  features?: Array<{
    icon?: string;
    title: string;
    description: string;
  }>;
  testimonials?: Array<{
    name: string;
    role: string;
    text: string;
    avatar_url?: string;
  }>;
  video_url?: string;
  partner_logo_url?: string;
}

interface CommunityInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  benefits: {
    free_months: number;
    commission_discount_points: number;
    bonus_ai_tokens: number;
    custom_badge: {
      text: string;
      color: string;
    } | null;
  };
  target_types: string[];
  spots_remaining: number | null;
  metadata?: CommunityMetadata;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Gift,
  percent: Percent,
  star: Star,
  check: CheckCircle2,
  sparkles: Sparkles,
  zap: Zap,
  shield: Shield,
  clock: Clock,
};

export default function PartnerCommunityLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);

  useEffect(() => {
    if (!slug) {
      setError("Enlace invalido");
      setLoading(false);
      return;
    }

    loadCommunityInfo(slug);
  }, [slug]);

  async function loadCommunityInfo(communitySlug: string) {
    try {
      // Fetch directly from DB to get metadata
      const { data: communityData, error: fetchError } = await supabase
        .from('partner_communities')
        .select('*')
        .eq('slug', communitySlug)
        .eq('is_active', true)
        .single();

      if (fetchError || !communityData) {
        setError("No se pudo cargar la informacion de la comunidad");
        return;
      }

      // Check dates
      const now = new Date();
      if (communityData.start_date && new Date(communityData.start_date) > now) {
        setError("Esta comunidad aun no esta disponible");
        return;
      }
      if (communityData.end_date && new Date(communityData.end_date) < now) {
        setError("Esta comunidad ha expirado");
        return;
      }

      const spotsRemaining = communityData.max_redemptions
        ? communityData.max_redemptions - communityData.current_redemptions
        : null;

      setCommunity({
        id: communityData.id,
        slug: communityData.slug,
        name: communityData.name,
        description: communityData.description || '',
        logo_url: communityData.logo_url,
        benefits: {
          free_months: communityData.free_months || 0,
          commission_discount_points: communityData.commission_discount_points || 0,
          bonus_ai_tokens: communityData.bonus_ai_tokens || 0,
          custom_badge: communityData.custom_badge_text ? {
            text: communityData.custom_badge_text,
            color: communityData.custom_badge_color || '#f59e0b',
          } : null,
        },
        target_types: communityData.target_types || ['brand'],
        spots_remaining: spotsRemaining,
        metadata: communityData.metadata as CommunityMetadata || {},
      });
    } catch (err) {
      console.error("Error loading community:", err);
      setError("Error al cargar la comunidad");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenRegistration() {
    setShowUserTypeModal(true);
  }

  function handleSelectUserType(userType: 'talent' | 'brand' | 'organization') {
    if (!slug) return;
    localStorage.setItem("kreoon_partner_community", slug);
    setShowUserTypeModal(false);

    if (userType === 'talent') {
      navigate(`/register?intent=talent&community=${slug}`);
    } else if (userType === 'brand') {
      navigate(`/register?intent=brand&community=${slug}`);
    } else if (userType === 'organization') {
      navigate(`/register?intent=organization&community=${slug}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Comunidad no disponible</h1>
          <p className="text-zinc-400 mb-6">{error || "Esta comunidad no existe o ya no esta activa."}</p>
          <Button asChild variant="outline">
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const themeColor = community.metadata?.theme_color || community.benefits.custom_badge?.color || '#f59e0b';
  const bgGradient = community.metadata?.background_gradient || 'from-black via-zinc-900 to-black';
  const isBrandTarget = community.target_types.includes("brand");

  // Personalizable texts
  const heroTitle = community.metadata?.hero_title || `¡Bienvenidos a KREOON!`;
  const heroSubtitle = community.metadata?.hero_subtitle || `Comunidad ${community.name}`;
  const ctaTitle = community.metadata?.cta_title || "¿Listo para comenzar?";
  const ctaSubtitle = community.metadata?.cta_subtitle || `Regístrate ahora y accede a todos los beneficios de la comunidad ${community.name}.`;
  const ctaButtonText = community.metadata?.cta_button_text || "Unirme a la Comunidad";

  return (
    <div className={cn("min-h-screen", `bg-gradient-to-br ${bgGradient}`)}>
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {community.metadata?.partner_logo_url ? (
              <img
                src={community.metadata.partner_logo_url}
                alt={community.name}
                className="h-8 object-contain"
              />
            ) : (
              <Link to="/" className="text-xl font-bold text-white">
                KREOON
              </Link>
            )}
            <span className="text-zinc-600">×</span>
            <span className="text-zinc-400 font-medium">{community.name}</span>
          </div>
          <Badge
            variant="outline"
            style={{
              borderColor: `${themeColor}50`,
              color: themeColor,
              backgroundColor: `${themeColor}10`
            }}
          >
            {community.benefits.custom_badge?.text || community.name}
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {community.logo_url && (
            <img
              src={community.logo_url}
              alt={community.name}
              className="h-20 md:h-28 mx-auto mb-8 object-contain"
            />
          )}

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {heroTitle.includes('KREOON') ? (
              <>
                {heroTitle.split('KREOON')[0]}
                <span className="text-primary">KREOON</span>
                {heroTitle.split('KREOON')[1]}
              </>
            ) : (
              heroTitle
            )}
          </h1>

          <p
            className="text-xl md:text-2xl font-semibold mb-4"
            style={{ color: themeColor }}
          >
            {heroSubtitle}
          </p>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8">
            {community.description}
          </p>

          {community.spots_remaining !== null && community.spots_remaining <= 50 && (
            <Badge variant="destructive" className="mb-8 animate-pulse">
              ¡Solo quedan {community.spots_remaining} cupos!
            </Badge>
          )}

          {/* Video embed if provided */}
          {community.metadata?.video_url && (
            <div className="max-w-2xl mx-auto mb-8 rounded-sm overflow-hidden border border-zinc-800">
              <iframe
                src={community.metadata.video_url}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            Tus beneficios exclusivos
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Beneficio 1: Meses gratis */}
            {community.benefits.free_months > 0 && (
              <Card
                className="bg-zinc-900/50 border-zinc-800 p-6 transition-all duration-300 hover:scale-105"
                style={{ '--hover-border': themeColor } as React.CSSProperties}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${themeColor}20` }}
                >
                  <Gift className="w-6 h-6" style={{ color: themeColor }} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {community.benefits.free_months} meses gratis
                </h3>
                <p className="text-zinc-400">
                  Obtén {community.benefits.free_months} meses gratis en tu primer plan de suscripción.
                  Sin compromiso, cancela cuando quieras.
                </p>
              </Card>
            )}

            {/* Beneficio 2: Descuento en comisiones */}
            {community.benefits.commission_discount_points > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Percent className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  -{community.benefits.commission_discount_points}% en comisiones
                </h3>
                <p className="text-zinc-400">
                  Descuento permanente en las comisiones del marketplace.
                  Pagas menos en cada proyecto que contrates.
                </p>
              </Card>
            )}

            {/* Beneficio 3: Badge especial */}
            {community.benefits.custom_badge && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Etiqueta exclusiva
                </h3>
                <p className="text-zinc-400 mb-3">
                  Tu marca lucirá la etiqueta "{community.benefits.custom_badge.text}" en el marketplace.
                </p>
                <Badge
                  style={{
                    backgroundColor: `${community.benefits.custom_badge.color}20`,
                    color: community.benefits.custom_badge.color,
                    borderColor: community.benefits.custom_badge.color,
                  }}
                  variant="outline"
                >
                  {community.benefits.custom_badge.text}
                </Badge>
              </Card>
            )}

            {/* Beneficio extra: Tokens AI */}
            {community.benefits.bonus_ai_tokens > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 md:col-span-3 md:max-w-md md:mx-auto">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      +{community.benefits.bonus_ai_tokens.toLocaleString()} Tokens IA
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      Tokens de bienvenida para usar con las funciones de inteligencia artificial.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Custom Features from metadata */}
          {community.metadata?.features && community.metadata.features.length > 0 && (
            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {community.metadata.features.map((feature, idx) => {
                const IconComponent = ICON_MAP[feature.icon || 'check'] || CheckCircle2;
                return (
                  <Card key={idx} className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${themeColor}20` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: themeColor }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                        <p className="text-sm text-zinc-400">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {community.metadata?.testimonials && community.metadata.testimonials.length > 0 && (
        <section className="py-12 px-4 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
              Lo que dicen nuestros miembros
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {community.metadata.testimonials.map((testimonial, idx) => (
                <Card key={idx} className="bg-zinc-900/50 border-zinc-800 p-6">
                  <p className="text-zinc-300 mb-4 italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    {testimonial.avatar_url ? (
                      <img
                        src={testimonial.avatar_url}
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: themeColor }}
                      >
                        {testimonial.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium">{testimonial.name}</p>
                      <p className="text-zinc-500 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card
            className="p-8 md:p-12 border-2"
            style={{
              background: `linear-gradient(135deg, ${themeColor}10, ${themeColor}05)`,
              borderColor: `${themeColor}30`
            }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {ctaTitle}
            </h2>
            <p className="text-zinc-300 mb-8">
              {ctaSubtitle}
            </p>

            <Button
              size="lg"
              onClick={handleOpenRegistration}
              className="font-semibold px-8 py-6 text-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: themeColor,
                color: 'black'
              }}
            >
              {ctaButtonText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-zinc-500 text-sm mt-6">
              El registro es gratuito. Los beneficios se aplican automaticamente.
            </p>
          </Card>
        </div>
      </section>

      {/* Modal de selección de tipo de usuario */}
      <Dialog open={showUserTypeModal} onOpenChange={setShowUserTypeModal}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white text-center">
              ¿Cómo quieres unirte?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              Selecciona el tipo de cuenta que mejor se adapte a ti
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            {/* Opción Talento */}
            <button
              onClick={() => handleSelectUserType('talent')}
              className="flex items-center gap-4 p-4 rounded-sm border border-zinc-700 hover:border-primary hover:bg-zinc-800/50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                  Soy Talento / Creador
                </h3>
                <p className="text-sm text-zinc-400">
                  Quiero ofrecer mis servicios como creador de contenido, editor, fotógrafo, etc.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors ml-auto" />
            </button>

            {/* Opción Marca */}
            <button
              onClick={() => handleSelectUserType('brand')}
              className="flex items-center gap-4 p-4 rounded-sm border border-zinc-700 hover:border-amber-500 hover:bg-zinc-800/50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/30 transition-colors">
                <Briefcase className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">
                  Soy una Marca / Empresa
                </h3>
                <p className="text-sm text-zinc-400">
                  Quiero contratar talento para crear contenido para mi marca o empresa.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors ml-auto" />
            </button>

            {/* Opción Organización */}
            <button
              onClick={() => handleSelectUserType('organization')}
              className="flex items-center gap-4 p-4 rounded-sm border border-zinc-700 hover:border-purple-500 hover:bg-zinc-800/50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/30 transition-colors">
                <Building2 className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-purple-500 transition-colors">
                  Soy una Agencia / Organización
                </h3>
                <p className="text-sm text-zinc-400">
                  Tengo un equipo de creadores y quiero gestionar proyectos para mis clientes.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-purple-500 transition-colors ml-auto" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white transition-colors">KREOON</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition-colors">Terminos</Link>
          </div>
          <div>
            © {new Date().getFullYear()} KREOON. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
