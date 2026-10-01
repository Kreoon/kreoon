/**
 * Aviso global para creadores y editores con el perfil incompleto.
 *
 * Se muestra arriba de cada página hasta que todo esté lleno. Cada día recuerda un pendiente
 * distinto, con un mensaje amable y un botón que lleva directo a la pestaña donde se completa.
 * «Más tarde» lo oculta solo por hoy. En Configuración › Perfil no aparece (ahí está la tarjeta).
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfileCompletion, profileCompletionHref } from '@/hooks/useProfileCompletion';

const TALENT_ROLES = ['content_creator', 'creator', 'editor'];
const SNOOZE_KEY = 'kreoon_profile_banner_snoozed';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readSnoozed(): boolean {
  try {
    return localStorage.getItem(SNOOZE_KEY) === today();
  } catch {
    return false;
  }
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-11 w-11 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-primary/15" />
        <circle
          cx="20" cy="20" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-primary">{pct}%</span>
    </div>
  );
}

export function ProfileCompletionBanner() {
  const { roles, isAdmin, isPlatformAdmin } = useAuth();
  const location = useLocation();
  const [snoozed, setSnoozed] = useState(readSnoozed);

  const isTalent = !isAdmin && !isPlatformAdmin && (roles || []).some((r) => TALENT_ROLES.includes(String(r)));
  const params = new URLSearchParams(location.search);
  const onProfileSettings = location.pathname.startsWith('/settings') && params.get('section') === 'profile';

  const { missing, pct, isComplete, isLoading } = useProfileCompletion({ enabled: isTalent });

  if (!isTalent || snoozed || onProfileSettings || isLoading || isComplete || missing.length === 0) return null;

  // Un pendiente distinto cada día, para que el recordatorio no canse
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const item = missing[dayIndex % missing.length];

  const snooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, today());
    } catch {
      /* sin almacenamiento: se oculta solo en esta visita */
    }
    setSnoozed(true);
  };

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-card p-3 shadow-sm sm:gap-4 sm:p-4"
    >
      <ProgressRing pct={pct} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Tu perfil va en {pct}% · {missing.length === 1 ? 'te falta 1 cosa' : `te faltan ${missing.length} cosas`}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {item.tip} Un perfil completo acelera tu verificación.
        </p>
      </div>
      <Link
        to={profileCompletionHref(item.tab)}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="hidden sm:inline">Completar</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:hidden">Completar {item.label}</span>
      </Link>
      <button
        type="button"
        onClick={snooze}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Recordármelo mañana"
        title="Recordármelo mañana"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default ProfileCompletionBanner;
