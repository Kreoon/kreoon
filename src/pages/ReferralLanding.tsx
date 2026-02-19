import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Building2, Briefcase, Loader2, AlertCircle } from "lucide-react";

const REFERRAL_STORAGE_KEY = "kreoon_referral_code";

interface ReferrerInfo {
  name: string | null;
  avatar: string | null;
}

export default function ReferralLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setErrorMsg("No se proporcionó un código de referido.");
      return;
    }

    let cancelled = false;

    async function init() {
      // Track click (fire-and-forget)
      supabase.functions.invoke("referral-service/track-click", {
        body: { code },
      }).catch(() => {});

      // Validate code
      try {
        const { data, error } = await supabase.functions.invoke(
          "referral-service/validate-code",
          { body: { code } },
        );

        if (cancelled) return;

        if (error || !data?.valid) {
          setValid(false);
          setErrorMsg(
            data?.error === "Code not found"
              ? "Este enlace de referido no es válido o ha expirado."
              : "No pudimos verificar el código. Intenta de nuevo.",
          );
        } else {
          setValid(true);
          setReferrer(data.referrer ?? null);
          // Persist code for registration flow
          localStorage.setItem(REFERRAL_STORAGE_KEY, code.toUpperCase());
        }
      } catch {
        if (!cancelled) {
          setValid(false);
          setErrorMsg("Error de conexión. Intenta de nuevo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [code]);

  const goRegister = (intent: "talent" | "brand" | "organization") => {
    const params = new URLSearchParams({ intent });
    if (code) params.set("ref", code);
    navigate(`/register?${params.toString()}`);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8 text-center">
        {/* Logo / brand */}
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            KREOON
          </span>
        </h1>

        {valid && referrer ? (
          <>
            {/* Referrer card */}
            <div className="flex flex-col items-center gap-3">
              {referrer.avatar ? (
                <img
                  src={referrer.avatar}
                  alt={referrer.name ?? "Referidor"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl font-bold text-purple-300">
                  {(referrer.name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <p className="text-white/70 text-sm">
                <span className="font-semibold text-white">{referrer.name ?? "Alguien"}</span>{" "}
                te invitó a unirte a KREOON
              </p>
            </div>

            {/* Value prop */}
            <p className="text-white/60 text-sm max-w-md leading-relaxed">
              La plataforma todo-en-uno para creadores, editores, marcas y agencias.
              Gestiona contenido, conecta con talento y escala tu operación creativa.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button
                onClick={() => goRegister("talent")}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-semibold text-sm transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Soy Talento
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => goRegister("brand")}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold text-sm transition-all"
                >
                  <Building2 className="h-4 w-4" />
                  Soy Marca
                </button>
                <button
                  onClick={() => goRegister("organization")}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-semibold text-sm transition-all"
                >
                  <Briefcase className="h-4 w-4" />
                  Soy Agencia
                </button>
              </div>
            </div>

            <p className="text-white/30 text-xs">
              Al registrarte con este enlace, ambos reciben beneficios en el programa de referidos.
            </p>
          </>
        ) : (
          <>
            {/* Invalid / expired code */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-white/70 text-sm">
                {errorMsg ?? "Este enlace de referido no es válido."}
              </p>
            </div>

            {/* Fallback CTA */}
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-semibold text-sm transition-all"
            >
              Registrarse en KREOON
            </button>
          </>
        )}
      </div>
    </div>
  );
}
