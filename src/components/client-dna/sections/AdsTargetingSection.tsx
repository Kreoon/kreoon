import React, { useState } from 'react';
import {
  Target, Users, Search, Video, ChevronDown, Copy, CheckCircle2,
  Facebook, Chrome, Music2, Hash
} from 'lucide-react';
import { AdsTargeting, AdCopyAngle } from '@/types/client-dna';
import { toast } from 'sonner';
import { EditableText, EditableTags } from '../EditableFields';

interface Props {
  data: AdsTargeting;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}

type TabType = 'meta' | 'google' | 'tiktok';

// Adapters for old→new data
function getMetaTargeting(data: any) {
  if (data.meta_targeting) return data.meta_targeting;
  // Fallback from old flat fields
  return {
    interests: data.interests || [],
    behaviors: data.behaviors || [],
    demographics: [],
    lookalike_suggestions: data.lookalike_sources || [],
  };
}

function getGoogleTargeting(data: any) {
  if (data.google_targeting) return data.google_targeting;
  return {
    keywords: data.keywords_google || [],
    audiences: [],
    placements: [],
  };
}

function getTiktokTargeting(data: any) {
  if (data.tiktok_targeting) return data.tiktok_targeting;
  return { interests: [], behaviors: [], creators_to_follow: [] };
}

function getHookSuggestions(data: any): string[] {
  if (Array.isArray(data.hook_suggestions) && data.hook_suggestions.length) return data.hook_suggestions;
  return [];
}

function getAdCopyAngles(data: any): AdCopyAngle[] {
  if (Array.isArray(data.ad_copy_angles) && data.ad_copy_angles.length) return data.ad_copy_angles;
  return [];
}

export function AdsTargetingSection({ data, isEditing, onFieldChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('meta');
  const [expandedAngle, setExpandedAngle] = useState<number | null>(0);
  const change = (path: string) => (value: unknown) => onFieldChange?.(path, value);

  const metaTargeting = getMetaTargeting(data);
  const googleTargeting = getGoogleTargeting(data);
  const tiktokTargeting = getTiktokTargeting(data);
  const hookSuggestions = getHookSuggestions(data);
  const adCopyAngles = getAdCopyAngles(data);

  const hasMetaData = isEditing || metaTargeting.interests?.length > 0 || metaTargeting.behaviors?.length > 0 ||
    metaTargeting.demographics?.length > 0 || metaTargeting.lookalike_suggestions?.length > 0;
  const hasGoogleData = isEditing || googleTargeting.keywords?.length > 0 || googleTargeting.audiences?.length > 0 ||
    googleTargeting.placements?.length > 0;
  const hasTiktokData = isEditing || tiktokTargeting.interests?.length > 0 || tiktokTargeting.behaviors?.length > 0 ||
    tiktokTargeting.creators_to_follow?.length > 0;
  const hasPlatformData = hasMetaData || hasGoogleData || hasTiktokData;

  const updateAdCopyAngle = (index: number, field: string, value: string) => {
    const updated = [...adCopyAngles];
    updated[index] = { ...updated[index], [field]: value };
    onFieldChange?.('ad_copy_angles', updated);
  };

  const tabs = [
    { id: 'meta' as const, label: 'Meta Ads', icon: Facebook, color: 'blue' },
    { id: 'google' as const, label: 'Google Ads', icon: Chrome, color: 'red' },
    { id: 'tiktok' as const, label: 'TikTok Ads', icon: Music2, color: 'pink' },
  ];

  return (
    <div className="space-y-6">
      {/* Platform Tabs */}
      {hasPlatformData && (
        <>
          <div className="flex gap-2 p-1 rounded-xl bg-white/5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                             text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'meta' && hasMetaData && (
              <PlatformTargeting
                sections={[
                  { label: 'Intereses', items: metaTargeting.interests || [], icon: Target, color: 'blue', path: 'meta_targeting.interests' },
                  { label: 'Comportamientos', items: metaTargeting.behaviors || [], icon: Users, color: 'purple', path: 'meta_targeting.behaviors' },
                  { label: 'Demografía', items: metaTargeting.demographics || [], icon: Users, color: 'pink', path: 'meta_targeting.demographics' },
                  { label: 'Lookalike Sugeridos', items: metaTargeting.lookalike_suggestions || [], icon: Target, color: 'cyan', path: 'meta_targeting.lookalike_suggestions' },
                ]}
                isEditing={isEditing}
                onFieldChange={onFieldChange}
              />
            )}

            {activeTab === 'google' && hasGoogleData && (
              <PlatformTargeting
                sections={[
                  { label: 'Keywords', items: googleTargeting.keywords || [], icon: Search, color: 'red', path: 'google_targeting.keywords' },
                  { label: 'Audiencias', items: googleTargeting.audiences || [], icon: Users, color: 'orange', path: 'google_targeting.audiences' },
                  { label: 'Placements', items: googleTargeting.placements || [], icon: Video, color: 'yellow', path: 'google_targeting.placements' },
                ]}
                isEditing={isEditing}
                onFieldChange={onFieldChange}
              />
            )}

            {activeTab === 'tiktok' && hasTiktokData && (
              <PlatformTargeting
                sections={[
                  { label: 'Intereses', items: tiktokTargeting.interests || [], icon: Target, color: 'pink', path: 'tiktok_targeting.interests' },
                  { label: 'Comportamientos', items: tiktokTargeting.behaviors || [], icon: Users, color: 'purple', path: 'tiktok_targeting.behaviors' },
                  { label: 'Creadores a Seguir', items: tiktokTargeting.creators_to_follow || [], icon: Users, color: 'cyan', path: 'tiktok_targeting.creators_to_follow' },
                ]}
                isEditing={isEditing}
                onFieldChange={onFieldChange}
              />
            )}
          </div>
        </>
      )}

      {/* Hook Suggestions */}
      {(hookSuggestions.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10
                        border border-amber-500/20">
          <p className="text-sm font-medium text-amber-400 mb-4">Hooks Sugeridos</p>
          {isEditing ? (
            <EditableTags items={data.hook_suggestions || []} onChange={change('hook_suggestions') as (v: string[]) => void} color="amber" placeholder="Agregar hook..." />
          ) : (
            <div className="space-y-2">
              {hookSuggestions.map((hook, i) => (
                <HookItem key={i} hook={hook} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ad Copy Angles */}
      {(adCopyAngles.length > 0 || isEditing) && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-purple-400">Ángulos de Copy</p>
          {adCopyAngles.map((angle, i) => (
            <AdCopyAngleCard
              key={i}
              angle={angle}
              index={i}
              isExpanded={expandedAngle === i || !!isEditing}
              onToggle={() => setExpandedAngle(expandedAngle === i ? null : i)}
              isEditing={isEditing}
              onAngleFieldChange={(field, value) => updateAdCopyAngle(i, field, value)}
            />
          ))}
          {isEditing && (
            <button
              onClick={() => {
                const updated = [...adCopyAngles, { angle_name: '', headline: '', body: '', cta: '' }];
                onFieldChange?.('ad_copy_angles', updated);
              }}
              className="w-full p-3 rounded-xl border border-dashed border-white/20 text-sm text-gray-400 hover:text-white hover:border-white/40 transition-colors"
            >
              + Agregar ángulo
            </button>
          )}
        </div>
      )}

      {/* Old fields fallback: hashtags & negative keywords */}
      {(data.hashtags?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-pink-400" />
            <p className="text-sm font-medium text-pink-400">Hashtags</p>
          </div>
          {isEditing ? (
            <EditableTags items={data.hashtags || []} onChange={change('hashtags') as (v: string[]) => void} color="pink" placeholder="Agregar hashtag..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {(data.negative_keywords?.length > 0 || isEditing) && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Keywords Negativas</p>
          {isEditing ? (
            <EditableTags items={data.negative_keywords || []} onChange={change('negative_keywords') as (v: string[]) => void} color="red" placeholder="Agregar keyword negativa..." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.negative_keywords.map((kw, i) => (
                <span key={i} className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlatformTargeting({
  sections,
  isEditing,
  onFieldChange,
}: {
  sections: Array<{
    label: string;
    items: string[];
    icon: React.ElementType;
    color: string;
    path: string;
  }>;
  isEditing?: boolean;
  onFieldChange?: (path: string, value: unknown) => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  };

  // In edit mode show all sections; in view mode only sections with items
  const visibleSections = isEditing ? sections : sections.filter(s => s.items?.length > 0);
  if (!visibleSections.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {visibleSections.map((section, i) => {
        const Icon = section.icon;
        const colors = colorClasses[section.color] || colorClasses.purple;

        return (
          <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${colors.split(' ')[0]}`} />
              <p className={`text-sm font-medium ${colors.split(' ')[0]}`}>{section.label}</p>
            </div>
            {isEditing && onFieldChange ? (
              <EditableTags
                items={section.items}
                onChange={(v) => onFieldChange(section.path, v)}
                color={section.color}
                placeholder={`Agregar ${section.label.toLowerCase()}...`}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {section.items.map((item, j) => (
                  <span
                    key={j}
                    className={`px-2 py-1 rounded-lg border text-xs ${colors}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HookItem({ hook, index }: { hook: string; index: number }) {
  const [copied, setCopied] = useState(false);

  const copyHook = async () => {
    await navigator.clipboard.writeText(hook);
    setCopied(true);
    toast.success('Hook copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5 group">
      <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center
                      text-xs font-bold text-amber-400 flex-shrink-0">
        {index + 1}
      </span>
      <p className="text-sm text-foreground/80 flex-1">"{hook}"</p>
      <button
        onClick={copyHook}
        className="p-1.5 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100
                   hover:bg-white/10 transition-all"
      >
        {copied ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  );
}

function AdCopyAngleCard({
  angle,
  index,
  isExpanded,
  onToggle,
  isEditing,
  onAngleFieldChange,
}: {
  angle: AdCopyAngle;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isEditing?: boolean;
  onAngleFieldChange?: (field: string, value: string) => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyText = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
  ];
  const gradient = colors[index % colors.length];

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {isEditing ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient}
                            flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
              {index + 1}
            </div>
            <EditableText value={angle.angle_name} onChange={(v) => onAngleFieldChange?.('angle_name', v)} placeholder="Nombre del ángulo..." />
          </div>
          <div className="p-3 rounded-lg bg-white/5 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Headline</p>
              <EditableText value={angle.headline} onChange={(v) => onAngleFieldChange?.('headline', v)} placeholder="Headline..." />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Body</p>
              <EditableText value={angle.body} onChange={(v) => onAngleFieldChange?.('body', v)} multiline placeholder="Body..." />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">CTA</p>
              <EditableText value={angle.cta} onChange={(v) => onAngleFieldChange?.('cta', v)} placeholder="CTA..." />
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={onToggle}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient}
                              flex items-center justify-center text-white text-sm font-bold`}>
                {index + 1}
              </div>
              <p className="text-sm font-medium text-white">{angle.angle_name}</p>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-white/5">
              <CopyableField
                label="Headline"
                value={angle.headline}
                copied={copiedField === 'headline'}
                onCopy={() => copyText(angle.headline, 'headline')}
              />
              <CopyableField
                label="Body"
                value={angle.body}
                copied={copiedField === 'body'}
                onCopy={() => copyText(angle.body, 'body')}
              />
              <CopyableField
                label="CTA"
                value={angle.cta}
                copied={copiedField === 'cta'}
                onCopy={() => copyText(angle.cta, 'cta')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CopyableField({
  label,
  value,
  copied,
  onCopy
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/5 group">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <button
          onClick={onCopy}
          className="p-1 rounded bg-white/5 opacity-0 group-hover:opacity-100
                     hover:bg-white/10 transition-all"
        >
          {copied ? (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-gray-400" />
          )}
        </button>
      </div>
      <p className="text-sm text-foreground/80">{value}</p>
    </div>
  );
}
