import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Percent, Star, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

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
}

export default function PartnerCommunityLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<CommunityInfo | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Enlace inválido");
      setLoading(false);
      return;
    }

    loadCommunityInfo(slug);
  }, [slug]);

  async function loadCommunityInfo(communitySlug: string) {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke(
        "partner-community-service/get-info",
        { body: { slug: communitySlug } }
      );

      if (fetchError || !data.success) {
        setError(data?.error || "No se pudo cargar la información de la comunidad");
        return;
      }

      setCommunity(data.community);
    } catch (err) {
      console.error("Error loading community:", err);
      setError("Error al cargar la comunidad");
    } finally {
      setLoading(false);
    }
  }

  function handleRegisterBrand() {
    if (!slug) return;
    // Guardar en localStorage para capturar durante el registro
    localStorage.setItem("kreoon_partner_community", slug);
    navigate(`/register?intent=brand&community=${slug}`);
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
          <p className="text-zinc-400 mb-6">{error || "Esta comunidad no existe o ya no está activa."}</p>
          <Button asChild variant="outline">
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isBrandTarget = community.target_types.includes("brand");

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white">
            KREOON
          </Link>
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-400"
            style={{ borderColor: `${community.benefits.custom_badge?.color}50`, color: community.benefits.custom_badge?.color }}
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
              className="h-16 md:h-20 mx-auto mb-6 object-contain"
            />
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            ¡Bienvenidos a
            <span className="text-primary"> KREOON</span>!
          </h1>
          <p
            className="text-xl md:text-2xl font-semibold mb-4"
            style={{ color: community.benefits.custom_badge?.color || "#f59e0b" }}
          >
            Comunidad {community.name}
          </p>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8">
            {community.description}
          </p>

          {community.spots_remaining !== null && community.spots_remaining <= 50 && (
            <Badge variant="destructive" className="mb-8">
              ¡Solo quedan {community.spots_remaining} cupos!
            </Badge>
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
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-amber-500/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6 text-amber-500" />
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
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-emerald-500/50 transition-colors">
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
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-purple-500/50 transition-colors">
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
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-blue-500/50 transition-colors md:col-span-3 md:max-w-md md:mx-auto">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      +{community.benefits.bonus_ai_tokens.toLocaleString()} tokens IA
                    </h3>
                    <p className="text-zinc-400 text-sm">
                      Tokens de bienvenida para usar con las funciones de inteligencia artificial.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              ¿Listo para comenzar?
            </h2>
            <p className="text-zinc-300 mb-8">
              Registra tu marca ahora y accede a todos los beneficios de la comunidad {community.name}.
            </p>

            {isBrandTarget && (
              <Button
                size="lg"
                onClick={handleRegisterBrand}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 py-6 text-lg"
              >
                Registrar mi Marca
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}

            <p className="text-zinc-500 text-sm mt-6">
              El registro es gratuito. Los beneficios se aplican automáticamente.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white transition-colors">KREOON</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white transition-colors">Términos</Link>
          </div>
          <div>
            © {new Date().getFullYear()} KREOON. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
