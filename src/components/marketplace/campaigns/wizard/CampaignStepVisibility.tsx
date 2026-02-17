import { useState, useEffect } from 'react';
import { Globe, Lock, Target, Users, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  MARKETPLACE_CATEGORIES,
  COUNTRIES,
  CONTENT_TYPES,
  VISIBILITY_CONFIG,
} from '../../types/marketplace';
import type {
  CampaignVisibility,
  CampaignVisibilityData,
  CampaignCreatorRequirements,
  MarketplaceRoleId,
} from '../../types/marketplace';
import { MarketplaceRoleSelector } from '../../roles/MarketplaceRoleSelector';

interface CampaignStepVisibilityProps {
  data: CampaignVisibilityData;
  creatorRequirements: CampaignCreatorRequirements;
  onChange: <K extends keyof CampaignVisibilityData>(field: K, value: CampaignVisibilityData[K]) => void;
  onCreatorReqChange: <K extends keyof CampaignCreatorRequirements>(field: K, value: CampaignCreatorRequirements[K]) => void;
}

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface MarketplaceProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  categories: string[];
}

const VISIBILITY_OPTIONS: { value: CampaignVisibility; icon: typeof Globe; color: string; border: string }[] = [
  { value: 'public', icon: Globe, color: 'text-green-400', border: 'border-green-500/40' },
  { value: 'internal', icon: Lock, color: 'text-amber-400', border: 'border-amber-500/40' },
  { value: 'selective', icon: Target, color: 'text-purple-400', border: 'border-purple-500/40' },
];

const LANGUAGES = ['Espanol', 'Ingles', 'Portugues', 'Frances'];
const RATING_OPTIONS = [3.0, 3.5, 4.0, 4.5, 5.0];

export function CampaignStepVisibility({
  data,
  creatorRequirements,
  onChange,
  onCreatorReqChange,
}: CampaignStepVisibilityProps) {
  const { user } = useAuth();
  const [showRequirements, setShowRequirements] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [marketplaceCreators, setMarketplaceCreators] = useState<MarketplaceProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteTab, setInviteTab] = useState<'team' | 'marketplace'>('team');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);

  // Fetch user's organization
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (member?.organization_id) {
        setOrgId(member.organization_id);
        onChange('organization_id', member.organization_id);

        // Get team count
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', member.organization_id);
        setTeamCount(count || 0);
      }
    })();
  }, [user?.id]);

  // Fetch team members when needed
  useEffect(() => {
    if (!orgId || (data.visibility !== 'selective' && data.visibility !== 'internal')) return;
    (async () => {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, role, profiles:user_id(id, full_name, avatar_url)')
        .eq('organization_id', orgId);

      if (members) {
        setTeamMembers(
          members.map((m: any) => ({
            id: m.profiles?.id || m.user_id,
            user_id: m.user_id,
            full_name: m.profiles?.full_name || 'Sin nombre',
            avatar_url: m.profiles?.avatar_url || null,
            role: m.role,
          }))
        );
      }
    })();
  }, [orgId, data.visibility]);

  // Fetch marketplace creators for selective mode
  useEffect(() => {
    if (data.visibility !== 'selective') return;
    (async () => {
      const { data: creators } = await (supabase as any)
        .from('creator_profiles')
        .select('id, user_id, display_name, avatar_url, categories')
        .eq('is_active', true)
        .limit(50);

      if (creators) {
        setMarketplaceCreators(
          creators.map((c: any) => ({
            id: c.user_id, // Use user_id as profile reference
            display_name: c.display_name || 'Creador',
            avatar_url: c.avatar_url,
            categories: c.categories || [],
          }))
        );
      }
    })();
  }, [data.visibility]);

  const toggleInvitedProfile = (profileId: string) => {
    const current = data.invited_profiles;
    if (current.includes(profileId)) {
      onChange('invited_profiles', current.filter(id => id !== profileId));
    } else {
      onChange('invited_profiles', [...current, profileId]);
    }
  };

  const toggleArrayItem = <K extends keyof CampaignCreatorRequirements>(
    field: K,
    item: string,
  ) => {
    const current = creatorRequirements[field] as string[];
    if (current.includes(item)) {
      onCreatorReqChange(field, current.filter(v => v !== item) as CampaignCreatorRequirements[K]);
    } else {
      onCreatorReqChange(field, [...current, item] as CampaignCreatorRequirements[K]);
    }
  };

  const filteredTeamMembers = teamMembers.filter(m =>
    !searchQuery || m.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMarketplace = marketplaceCreators.filter(c =>
    !searchQuery || c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Alcance y Visibilidad</h2>
        <p className="text-gray-500 text-sm">Define quien puede ver y aplicar a esta campana</p>
      </div>

      {/* Visibility cards */}
      <div className="space-y-3">
        {VISIBILITY_OPTIONS.map(opt => {
          const config = VISIBILITY_CONFIG[opt.value];
          const Icon = opt.icon;
          const isSelected = data.visibility === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange('visibility', opt.value)}
              className={cn(
                'w-full text-left p-4 rounded-xl border-2 transition-all',
                isSelected
                  ? `${opt.border} ${config.bgColor}`
                  : 'border-white/10 hover:border-white/20',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', config.bgColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold text-sm', isSelected ? 'text-white' : 'text-gray-300')}>
                      {config.label}
                    </span>
                    {opt.value === 'internal' && teamCount > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {teamCount} miembros
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5',
                  isSelected ? opt.border : 'border-white/20',
                )}>
                  {isSelected && <div className={cn('w-2.5 h-2.5 rounded-full', config.bgColor.replace('/15', ''))} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selective: Creator invitation selector */}
      {data.visibility === 'selective' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Invitar creadores</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setInviteTab('team')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                inviteTab === 'team'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-500 border border-white/10 hover:border-white/20',
              )}
            >
              <Users className="h-3.5 w-3.5" />
              De mi equipo ({teamMembers.length})
            </button>
            <button
              onClick={() => setInviteTab('marketplace')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                inviteTab === 'marketplace'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-500 border border-white/10 hover:border-white/20',
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              Del marketplace
            </button>
          </div>

          {/* Creator list */}
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/10 p-2">
            {inviteTab === 'team' && filteredTeamMembers.map(member => (
              <button
                key={member.id}
                onClick={() => toggleInvitedProfile(member.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all',
                  data.invited_profiles.includes(member.id)
                    ? 'bg-purple-500/10 border border-purple-500/30'
                    : 'hover:bg-white/5',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">{member.full_name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{member.full_name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
                <div className={cn(
                  'w-4 h-4 rounded border flex-shrink-0',
                  data.invited_profiles.includes(member.id)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-white/20',
                )} />
              </button>
            ))}
            {inviteTab === 'marketplace' && filteredMarketplace.map(creator => (
              <button
                key={creator.id}
                onClick={() => toggleInvitedProfile(creator.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all',
                  data.invited_profiles.includes(creator.id)
                    ? 'bg-purple-500/10 border border-purple-500/30'
                    : 'hover:bg-white/5',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">{creator.display_name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{creator.display_name}</p>
                  <p className="text-xs text-gray-500 truncate">{creator.categories.slice(0, 3).join(', ') || 'Sin categoria'}</p>
                </div>
                <div className={cn(
                  'w-4 h-4 rounded border flex-shrink-0',
                  data.invited_profiles.includes(creator.id)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-white/20',
                )} />
              </button>
            ))}
            {((inviteTab === 'team' && filteredTeamMembers.length === 0) ||
              (inviteTab === 'marketplace' && filteredMarketplace.length === 0)) && (
              <p className="text-center text-gray-600 text-xs py-4">No se encontraron resultados</p>
            )}
          </div>

          {/* Selected summary */}
          {data.invited_profiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400">{data.invited_profiles.length} seleccionados:</span>
              {data.invited_profiles.slice(0, 5).map(id => {
                const member = teamMembers.find(m => m.id === id);
                const creator = marketplaceCreators.find(c => c.id === id);
                const name = member?.full_name || creator?.display_name || id.slice(0, 8);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs"
                  >
                    {name}
                    <button onClick={() => toggleInvitedProfile(id)} className="hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {data.invited_profiles.length > 5 && (
                <span className="text-xs text-gray-500">+{data.invited_profiles.length - 5} mas</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Capacity settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-gray-300 text-sm font-medium block mb-1.5">Max. creadores</label>
          <input
            type="number"
            min="1"
            value={data.max_creators}
            onChange={e => onChange('max_creators', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm font-medium block mb-1.5">
            Max. aplicaciones <span className="text-gray-600">(vacio = sin limite)</span>
          </label>
          <input
            type="number"
            min="0"
            value={data.max_applications ?? ''}
            onChange={e => onChange('max_applications', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Sin limite"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Aprobar aplicaciones automaticamente</span>
          <button
            onClick={() => onChange('auto_approve_applications', !data.auto_approve_applications)}
            className={cn(
              'w-10 h-6 rounded-full transition-all relative',
              data.auto_approve_applications ? 'bg-purple-500' : 'bg-white/10',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-1 transition-all',
              data.auto_approve_applications ? 'left-5' : 'left-1',
            )} />
          </button>
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Requiere portafolio para aplicar</span>
          <button
            onClick={() => onChange('requires_portfolio', !data.requires_portfolio)}
            className={cn(
              'w-10 h-6 rounded-full transition-all relative',
              data.requires_portfolio ? 'bg-purple-500' : 'bg-white/10',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full bg-white absolute top-1 transition-all',
              data.requires_portfolio ? 'left-5' : 'left-1',
            )} />
          </button>
        </label>
      </div>

      {/* Creator requirements (collapsible) - only for public/selective */}
      {data.visibility !== 'internal' && (
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowRequirements(!showRequirements)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-semibold text-white">Requisitos del creador (opcionales)</span>
            {showRequirements ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {showRequirements && (
            <div className="p-4 pt-0 space-y-5 border-t border-white/5">
              {/* Desired roles */}
              <MarketplaceRoleSelector
                selectedRoles={creatorRequirements.desired_roles ?? []}
                onChange={(roles: MarketplaceRoleId[]) => onCreatorReqChange('desired_roles', roles)}
                maxRoles={5}
                showCategories
                excludeCategories={['client']}
                label="Roles Deseados"
              />

              {/* Min rating */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Rating Minimo</label>
                <div className="flex gap-2">
                  {RATING_OPTIONS.map(rating => (
                    <button
                      key={rating}
                      onClick={() => onCreatorReqChange('min_rating', rating)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        creatorRequirements.min_rating === rating
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 text-gray-400 hover:border-white/20',
                      )}
                    >
                      {rating}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Min projects */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-1.5">Proyectos Completados Min.</label>
                <input
                  type="number"
                  min="0"
                  value={creatorRequirements.min_completed_projects}
                  onChange={e => onCreatorReqChange('min_completed_projects', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 max-w-xs"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Categorias</label>
                <div className="flex flex-wrap gap-1.5">
                  {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleArrayItem('categories', cat.label)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        creatorRequirements.categories.includes(cat.label)
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 text-gray-500 hover:border-white/20',
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Paises</label>
                <div className="flex flex-wrap gap-1.5">
                  {COUNTRIES.map(country => (
                    <button
                      key={country.code}
                      onClick={() => toggleArrayItem('countries', country.code)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1',
                        creatorRequirements.countries.includes(country.code)
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 text-gray-500 hover:border-white/20',
                      )}
                    >
                      <span>{country.flag}</span>
                      {country.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Idiomas</label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => toggleArrayItem('languages', lang)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        creatorRequirements.languages.includes(lang)
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 text-gray-500 hover:border-white/20',
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content types */}
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Tipos de Contenido</label>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_TYPES.map(ct => (
                    <button
                      key={ct}
                      onClick={() => toggleArrayItem('content_types', ct)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                        creatorRequirements.content_types.includes(ct)
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 text-gray-500 hover:border-white/20',
                      )}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
