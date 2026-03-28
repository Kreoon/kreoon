import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Loader2, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { StepComponentProps } from '../types';

export function JoinOrgStep({ data, onChange, onNext, onBack, mode }: StepComponentProps) {
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const isCompact = mode === 'compact';

  const searchOrg = async () => {
    const query = data.joinLink.trim();
    if (!query) return setError('Ingresa un enlace, slug o código');

    setSearching(true);
    setError('');
    onChange({ foundOrg: null });

    try {
      // Try by slug first
      const slug = query.replace(/^https?:\/\/[^/]+\/org\//, '').replace(/\/$/, '');

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url')
        .eq('slug', slug)
        .maybeSingle();

      if (org) {
        onChange({
          foundOrg: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo_url: org.logo_url,
          },
        });
        return;
      }

      // Try by invite code
      const { data: invitation } = await (supabase as any)
        .from('organization_invitations')
        .select('organization_id, organizations!inner(id, name, slug, logo_url)')
        .eq('token', query)
        .is('accepted_at', null)
        .maybeSingle();

      if (invitation?.organizations) {
        const invOrg = invitation.organizations;
        onChange({
          foundOrg: {
            id: invOrg.id,
            name: invOrg.name,
            slug: invOrg.slug,
            logo_url: invOrg.logo_url,
          },
          inviteCode: query,
        });
        return;
      }

      setError('No se encontró la organización. Verifica el enlace o código.');
    } catch {
      setError('Error al buscar. Intenta de nuevo.');
    } finally {
      setSearching(false);
    }
  };

  const handleNext = () => {
    if (!data.foundOrg) return setError('Busca y selecciona una organización');
    setError('');
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>

      <h2 className={cn('font-bold text-white mb-1', isCompact ? 'text-lg' : 'text-xl')}>
        Unirte a una organización
      </h2>
      <p className="text-sm text-muted-foreground mb-5">Ingresa el enlace, slug o código de invitación</p>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground/80 mb-1">Enlace o código</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={data.joinLink}
              onChange={e => { onChange({ joinLink: e.target.value, foundOrg: null }); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && searchOrg()}
              placeholder="kreoon.com/org/mi-org o código..."
              className="w-full rounded-sm border border-border bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
          <button
            onClick={searchOrg}
            disabled={searching}
            className="rounded-sm bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm text-white font-medium transition-colors disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Found org preview */}
      {data.foundOrg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-sm border border-blue-500/30 bg-blue-500/10 p-4 mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-white/10 overflow-hidden">
              {data.foundOrg.logo_url ? (
                <img src={data.foundOrg.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-6 w-6 text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{data.foundOrg.name}</p>
              <p className="text-xs text-muted-foreground">kreoon.com/org/{data.foundOrg.slug}</p>
            </div>
            <Check className="h-5 w-5 text-blue-400 shrink-0" />
          </div>
        </motion.div>
      )}

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <button
        onClick={handleNext}
        disabled={!data.foundOrg}
        className="w-full rounded-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continuar
      </button>
    </motion.div>
  );
}
