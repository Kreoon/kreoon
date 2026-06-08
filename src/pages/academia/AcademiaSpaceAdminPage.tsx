import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  Users,
  Trophy,
  Calendar,
  Globe,
  Plug,
  Bell,
  Settings,
  CreditCard,
  Handshake,
  Wallet,
  MessagesSquare,
  Lock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { cn } from '@/lib/utils';
import { useAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useAuth } from '@/hooks/useAuth';
import { SpaceDashboard } from '@/components/academy/community/SpaceDashboard';
import { SpaceLeaderboard } from '@/components/academy/community/SpaceLeaderboard';
import { SpaceCalendar } from '@/components/academy/community/SpaceCalendar';
import { SpaceDiscoveryPanel } from '@/components/academy/community/SpaceDiscoveryPanel';
import { SpacePluginsPanel } from '@/components/academy/community/SpacePluginsPanel';
import { SpaceNotificationsPanel } from '@/components/academy/community/SpaceNotificationsPanel';
import { SpaceSettingsPanel } from '@/components/academy/community/SpaceSettingsPanel';
import { MembersAdminTab } from '@/components/academy/community/admin/MembersAdminTab';

type AdminTab =
  | 'overview'
  | 'comunidad'
  | 'miembros'
  | 'leaderboard'
  | 'eventos'
  | 'discovery'
  | 'plugins'
  | 'notificaciones'
  | 'settings'
  | 'payouts'
  | 'afiliados'
  | 'facturacion';

const TABS: { id: AdminTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'comunidad', label: 'Comunidad', icon: MessagesSquare },
  { id: 'miembros', label: 'Miembros', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'eventos', label: 'Eventos', icon: Calendar },
  { id: 'discovery', label: 'Discovery', icon: Globe },
  { id: 'plugins', label: 'Plugins', icon: Plug },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
  { id: 'afiliados', label: 'Afiliados', icon: Handshake },
  { id: 'facturacion', label: 'Facturación', icon: CreditCard },
];

export default function AcademiaSpaceAdminPage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: space, isLoading } = useAcademySpace(spaceSlug);
  const [tab, setTab] = useState<AdminTab>('overview');

  useEffect(() => {
    if (!loading && !isLoading && space && user && space.owner_id !== user.id) {
      navigate(`/academia/${spaceSlug}`, { replace: true });
    }
  }, [loading, isLoading, space, user, navigate, spaceSlug]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
          <KreoonSkeleton variant="text" width="35%" height={28} />
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 pt-4">
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <KreoonSkeleton key={i} variant="rectangular" height={32} />
              ))}
            </div>
            <div className="space-y-3">
              <KreoonSkeleton variant="card" height={120} />
              <KreoonSkeleton variant="card" height={200} />
              <KreoonSkeleton variant="card" height={200} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex items-center justify-center text-zinc-400">
        Academia no encontrada
      </div>
    );
  }

  if (!user || space.owner_id !== user.id) {
    return (
      <div className="min-h-screen bg-kreoon-bg-primary flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Lock className="h-10 w-10" />
        <p>Solo el owner puede acceder al admin del space.</p>
      </div>
    );
  }

  const accent = space.accent_color || '#8B5CF6';
  const isPro = space.plan_slug === 'pro';

  return (
    <div className="min-h-screen bg-kreoon-bg-primary text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{space.name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Panel de administración</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="lg:border-r lg:border-white/5 lg:pr-4">
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto scrollbar-hide">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                    tab === t.id ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:bg-white/5'
                  )}
                  style={tab === t.id ? { color: accent } : undefined}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main>
            {tab === 'overview' && <SpaceDashboard spaceId={space.id} accentColor={accent} />}
            {tab === 'comunidad' && <ComunidadTab />}
            {tab === 'miembros' && <MiembrosTab spaceId={space.id} />}
            {tab === 'leaderboard' && (
              <SpaceLeaderboard spaceId={space.id} accentColor={accent} />
            )}
            {tab === 'eventos' && (
              <SpaceCalendar spaceId={space.id} isOwner accentColor={accent} />
            )}
            {tab === 'discovery' && (
              <SpaceDiscoveryPanel spaceId={space.id} spaceName={space.name} accentColor={accent} />
            )}
            {tab === 'plugins' && (
              <SpacePluginsPanel spaceId={space.id} isPro={isPro} />
            )}
            {tab === 'notificaciones' && (
              <SpaceNotificationsPanel spaceId={space.id} isOwner />
            )}
            {tab === 'settings' && <SpaceSettingsPanel space={space} />}
            {tab === 'payouts' && <PayoutsTab />}
            {tab === 'afiliados' && <AfiliadosTab />}
            {tab === 'facturacion' && <FacturacionTab isPro={isPro} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function ComunidadTab() {
  return (
    <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-400">
      <MessagesSquare className="h-10 w-10 mx-auto mb-3 text-purple-400" />
      <p>Configura categorías, reglas y pestañas visibles de tu comunidad.</p>
      <p className="text-xs text-zinc-500 mt-2">
        Por ahora puedes crear posts desde el feed. La configuración avanzada llegará pronto.
      </p>
    </Card>
  );
}

function MiembrosTab({ spaceId }: { spaceId: string }) {
  return <MembersAdminTab spaceId={spaceId} />;
}

function PayoutsTab() {
  return (
    <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-400">
      <Wallet className="h-10 w-10 mx-auto mb-3 text-purple-400" />
      <p>Resumen de earnings + próximo pago + historial.</p>
      <p className="text-xs text-zinc-500 mt-2">Integración con módulo de wallet en próxima iteración.</p>
    </Card>
  );
}

function AfiliadosTab() {
  return (
    <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-400">
      <Handshake className="h-10 w-10 mx-auto mb-3 text-purple-400" />
      <p>Configuración de comisión + lista de afiliados + earnings generados.</p>
      <p className="text-xs text-zinc-500 mt-2">Próximamente.</p>
    </Card>
  );
}

function FacturacionTab({ isPro }: { isPro: boolean }) {
  return (
    <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-400">
      <CreditCard className="h-10 w-10 mx-auto mb-3 text-purple-400" />
      <p>Plan actual: <strong className="text-zinc-200">{isPro ? 'Academia Pro' : 'Academia Hobby'}</strong></p>
      <p className="text-xs text-zinc-500 mt-2">
        {isPro
          ? 'Disfrutas de todas las features y comisión reducida del 2.9%'
          : 'Upgradeate a Pro para acceder a webhooks, integraciones y comisión 2.9%'}
      </p>
    </Card>
  );
}
