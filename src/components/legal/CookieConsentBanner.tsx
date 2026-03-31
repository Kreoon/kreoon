import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X, Check, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCachedClientIP } from '@/lib/get-client-ip';

const COOKIE_CONSENT_KEY = 'kreoon_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

interface CookiePreferences {
  version: string;
  timestamp: string;
  essential: boolean; // Siempre true
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  version: COOKIE_CONSENT_VERSION,
  timestamp: new Date().toISOString(),
  essential: true,
  analytics: true,      // Activas por defecto - el usuario puede desactivar en "Personalizar"
  marketing: true,      // Activas por defecto - el usuario puede desactivar en "Personalizar"
  personalization: true, // Activas por defecto - el usuario puede desactivar en "Personalizar"
};

const COOKIE_CATEGORIES = [
  {
    id: 'essential',
    name: 'Esenciales',
    description: 'Necesarias para el funcionamiento básico del sitio. No se pueden desactivar.',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Analíticas',
    description: 'Nos ayudan a entender cómo usas la plataforma para mejorar tu experiencia.',
    required: false,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Utilizadas para mostrarte contenido y anuncios relevantes.',
    required: false,
  },
  {
    id: 'personalization',
    name: 'Personalización',
    description: 'Permiten recordar tus preferencias y personalizar tu experiencia.',
    required: false,
  },
];

export function CookieConsentBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si ya existe consentimiento al cargar
  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        // Si la versión cambió, mostrar de nuevo
        if (parsed.version !== COOKIE_CONSENT_VERSION) {
          setIsVisible(true);
        } else {
          setPreferences(parsed);
        }
      } catch {
        setIsVisible(true);
      }
    } else {
      // Sin consentimiento previo, mostrar banner
      setIsVisible(true);
    }
  }, []);

  // Guardar preferencias
  const savePreferences = async (prefs: CookiePreferences) => {
    setIsLoading(true);

    const finalPrefs = {
      ...prefs,
      timestamp: new Date().toISOString(),
      essential: true, // Siempre true
    };

    try {
      // Guardar en localStorage
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(finalPrefs));

      // Si el usuario está autenticado, guardar también en la base de datos
      if (user?.id) {
        const ipAddress = await getCachedClientIP();

        await supabase.from('user_cookie_consents').upsert({
          user_id: user.id,
          consent_version: COOKIE_CONSENT_VERSION,
          essential: true,
          analytics: finalPrefs.analytics,
          marketing: finalPrefs.marketing,
          personalization: finalPrefs.personalization,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          consented_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      }

      setPreferences(finalPrefs);
      setIsVisible(false);
      setShowSettings(false);
    } catch (error) {
      console.error('[CookieConsent] Error saving:', error);
      // Aún así guardamos en localStorage
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(finalPrefs));
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Aceptar todas
  const acceptAll = () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      analytics: true,
      marketing: true,
      personalization: true,
    });
  };

  // Rechazar opcionales (solo esenciales)
  const rejectOptional = () => {
    savePreferences({
      ...DEFAULT_PREFERENCES,
      analytics: false,
      marketing: false,
      personalization: false,
    });
  };

  // Guardar preferencias personalizadas
  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0f0a1f]/95 border border-[#8b5cf6]/30 rounded-sm shadow-2xl shadow-purple-500/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-purple-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Usamos cookies
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Utilizamos cookies y tecnologías similares para mejorar tu experiencia,
                    analizar el tráfico y personalizar el contenido. Al continuar navegando,
                    aceptas nuestra{' '}
                    <a
                      href="/legal/cookies"
                      className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                      target="_blank"
                    >
                      Política de Cookies
                    </a>
                    .
                  </p>
                </div>
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      {COOKIE_CATEGORIES.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-start justify-between gap-4 p-3 rounded-sm bg-white/5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {category.name}
                              </span>
                              {category.required && (
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-300">
                                  Requerida
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50 mt-0.5">
                              {category.description}
                            </p>
                          </div>
                          <Switch
                            checked={preferences[category.id as keyof CookiePreferences] as boolean}
                            onCheckedChange={(checked) => {
                              if (!category.required) {
                                setPreferences((prev) => ({
                                  ...prev,
                                  [category.id]: checked,
                                }));
                              }
                            }}
                            disabled={category.required}
                            className="shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white/60 hover:text-white hover:bg-white/10 gap-2 order-3 sm:order-1"
                >
                  <Settings className="w-4 h-4" />
                  Personalizar
                  {showSettings ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex-1 hidden sm:block order-2" />

                {showSettings ? (
                  <Button
                    onClick={saveCustom}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2 order-1 sm:order-3"
                  >
                    <Check className="w-4 h-4" />
                    Guardar preferencias
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={rejectOptional}
                      disabled={isLoading}
                      className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 order-2 sm:order-3"
                    >
                      Solo esenciales
                    </Button>
                    <Button
                      onClick={acceptAll}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2 order-1 sm:order-4"
                    >
                      <Check className="w-4 h-4" />
                      Aceptar todas
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 md:px-6 py-3 bg-white/5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-white/40">
              <Shield className="w-3.5 h-3.5" />
              Tus datos están protegidos según nuestra Política de Privacidad
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook para acceder a las preferencias de cookies
 */
export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        setPreferences(null);
      }
    }
  }, []);

  return {
    hasConsent: preferences !== null,
    preferences,
    canUseAnalytics: preferences?.analytics ?? false,
    canUseMarketing: preferences?.marketing ?? false,
    canUsePersonalization: preferences?.personalization ?? false,
  };
}

export default CookieConsentBanner;
