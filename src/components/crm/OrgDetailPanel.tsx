import { Building2, Users, Palette, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DetailPanelShell } from './DetailPanelShell';
import { DetailSection } from './DetailSection';
import type { OrganizationWithMetrics } from '@/services/crm/platformCrmService';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

interface OrgDetailPanelProps {
  org: OrganizationWithMetrics;
  onClose: () => void;
}

export function OrgDetailPanel({ org, onClose }: OrgDetailPanelProps) {
  const avatar = org.logo_url ? (
    <img src={org.logo_url} alt={org.name} className="w-11 h-11 rounded-full object-cover" />
  ) : (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
    >
      {getInitials(org.name)}
    </div>
  );

  const isActive = org.settings?.subscription_status === 'active';

  return (
    <DetailPanelShell
      onClose={onClose}
      avatar={avatar}
      name={org.name}
      subtitle={org.slug ? `/${org.slug}` : undefined}
      badges={
        <>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold',
              isActive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/10 text-white/50',
            )}
          >
            {isActive ? 'Activa' : 'Inactiva'}
          </span>
        </>
      }
    >
      {/* Metrics */}
      <DetailSection title="Métricas">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Users} label="Miembros" value={org.member_count} />
          <MetricCard icon={Palette} label="Talento" value={org.creator_count} />
          <MetricCard icon={Building2} label="Contenidos" value={org.content_count} />
          <MetricCard icon={DollarSign} label="Gastado" value={formatCurrency(org.total_spent)} />
        </div>
      </DetailSection>

      {/* Activity */}
      <DetailSection title="Actividad">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-white/40">Última actividad</span>
          <span className="text-white/70">
            {org.last_activity_at
              ? formatDistanceToNow(new Date(org.last_activity_at), { addSuffix: true, locale: es })
              : 'Sin actividad'}
          </span>
          <span className="text-white/40">Creada</span>
          <span className="text-white/70">
            {formatDistanceToNow(new Date(org.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>
      </DetailSection>

      {/* Settings snapshot */}
      {org.settings && (
        <DetailSection title="Configuración">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {org.settings.subscription_plan && (
              <>
                <span className="text-white/40">Plan</span>
                <span className="text-white/70 capitalize">{org.settings.subscription_plan}</span>
              </>
            )}
            {org.settings.marketplace_enabled != null && (
              <>
                <span className="text-white/40">Marketplace</span>
                <span className="text-white/70">
                  {org.settings.marketplace_enabled ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </>
            )}
          </div>
        </DetailSection>
      )}

      {/* Quick actions */}
      <DetailSection title="Acciones">
        <div className="flex flex-wrap gap-2">
          <a
            href={`/org/${org.slug || org.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10 transition-all"
          >
            <ExternalLink className="h-3 w-3" />
            Ver organización
          </a>
        </div>
      </DetailSection>
    </DetailPanelShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-sm bg-white/[0.03] border border-white/5">
      <Icon className="h-4 w-4 text-[#a855f7] flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-white/40">{label}</p>
        <p className="text-sm text-white font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
