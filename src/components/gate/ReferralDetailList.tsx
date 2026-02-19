import { UserCheck, Image, Briefcase, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GateReferral } from '@/hooks/useReferralGate';

interface ReferralDetailListProps {
  referrals: GateReferral[];
}

function QualCheckIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
    : <Clock className="w-3.5 h-3.5 text-white/20" />;
}

export function ReferralDetailList({ referrals }: ReferralDetailListProps) {
  if (referrals.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-white/40 text-sm">Aun no tienes referidos. Comparte tu link para empezar.</p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-white/5">
      <div className="px-4 py-3">
        <h3 className="text-white font-semibold text-sm">Tus Referidos</h3>
      </div>
      {referrals.map((ref) => (
        <div key={ref.referred_id} className="px-4 py-3 flex items-center gap-3">
          {/* Avatar */}
          {ref.referred_avatar ? (
            <img src={ref.referred_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-medium">
              {(ref.full_name || '?').charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name + badge */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{ref.full_name || 'Usuario'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                ref.is_qualified
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              )}>
                {ref.is_qualified ? 'Calificado' : 'Pendiente'}
              </span>
            </div>
          </div>

          {/* Qualification checks */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1" title="Perfil activo en marketplace">
              <QualCheckIcon ok={ref.has_active_profile} />
              <UserCheck className="w-3.5 h-3.5 text-white/30" />
            </div>
            <div className="flex items-center gap-1" title="Foto de perfil">
              <QualCheckIcon ok={ref.has_avatar} />
              <Image className="w-3.5 h-3.5 text-white/30" />
            </div>
            <div className="flex items-center gap-1" title="Portafolio">
              <QualCheckIcon ok={ref.has_portfolio} />
              <Briefcase className="w-3.5 h-3.5 text-white/30" />
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
