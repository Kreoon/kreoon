import { useState } from 'react';
import {
  Dna, Building2, Target, Users, Package, Palette, Eye,
  Megaphone, Crosshair, Brain, Heart, TrendingUp, Calendar,
  Trash2, MapPin, Pencil, Save, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ClientDNA, DNAData } from '@/types/client-dna';
import { DNASectionCard } from './DNASectionCard';
import { BusinessIdentitySection } from './sections/BusinessIdentitySection';
import { ValuePropositionSection } from './sections/ValuePropositionSection';
import { IdealCustomerSection } from './sections/IdealCustomerSection';
import { FlagshipOfferSection } from './sections/FlagshipOfferSection';
import { BrandIdentitySection } from './sections/BrandIdentitySection';
import { VisualIdentitySection } from './sections/VisualIdentitySection';
import { MarketingStrategySection } from './sections/MarketingStrategySection';
import { AdsTargetingSection } from './sections/AdsTargetingSection';
import { EmotionalInsightsCard } from './EmotionalInsightsCard';

interface ClientDNADisplayProps {
  dna: ClientDNA;
  onDelete?: () => void;
  onRegenerate?: () => void;
  onUpdate?: (data: DNAData) => Promise<void>;
}

// ── Deep set helper ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedValue(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

const DNA_SECTIONS = [
  {
    id: 'business_identity',
    title: 'Identidad del Negocio',
    icon: Building2,
    gradient: 'from-purple-500 to-indigo-500',
    description: 'Quien eres y que te hace unico',
  },
  {
    id: 'value_proposition',
    title: 'Propuesta de Valor',
    icon: Target,
    gradient: 'from-pink-500 to-rose-500',
    description: 'El problema que resuelves y como',
  },
  {
    id: 'ideal_customer',
    title: 'Cliente Ideal',
    icon: Users,
    gradient: 'from-blue-500 to-cyan-500',
    description: 'A quien le vendes y que necesita',
  },
  {
    id: 'flagship_offer',
    title: 'Oferta Estrella',
    icon: Package,
    gradient: 'from-amber-500 to-orange-500',
    description: 'Tu producto principal y su precio',
  },
  {
    id: 'brand_identity',
    title: 'Identidad de Marca',
    icon: Palette,
    gradient: 'from-violet-500 to-purple-500',
    description: 'Personalidad y tono de comunicacion',
  },
  {
    id: 'visual_identity',
    title: 'Identidad Visual',
    icon: Eye,
    gradient: 'from-emerald-500 to-teal-500',
    description: 'Colores, estilo visual y mood',
  },
  {
    id: 'marketing_strategy',
    title: 'Estrategia de Marketing',
    icon: Megaphone,
    gradient: 'from-red-500 to-pink-500',
    description: 'Contenido, plataformas y tacticas',
  },
  {
    id: 'ads_targeting',
    title: 'Segmentacion de Ads',
    icon: Crosshair,
    gradient: 'from-indigo-500 to-blue-500',
    description: 'Audiencias y angulos publicitarios',
  },
];

export function ClientDNADisplay({ dna, onDelete, onRegenerate, onUpdate }: ClientDNADisplayProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<DNAData | null>(null);
  const [saving, setSaving] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ── Edit mode handlers ─────────────────────────────────────────────────
  const startEdit = () => {
    setEditData(JSON.parse(JSON.stringify(dna.dna_data)));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditData(null);
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!editData || !onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(editData);
      setEditMode(false);
      setEditData(null);
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  // Update a field within a section (e.g., sectionKey='business_identity', path='name', value='...')
  const updateSectionField = (sectionKey: string, path: string, value: unknown) => {
    if (!editData) return;
    const clone = JSON.parse(JSON.stringify(editData));
    setNestedValue(clone[sectionKey], path, value);
    setEditData(clone);
  };

  // Replace an entire section's data (for when section manages its own state)
  const updateSection = (sectionKey: string, sectionData: unknown) => {
    if (!editData) return;
    setEditData({ ...editData, [sectionKey]: sectionData });
  };

  // Get current data for a section (editData when editing, dna_data otherwise)
  const getSectionData = (sectionId: string) => {
    const source = editMode && editData ? editData : dna.dna_data;
    if (!source) return undefined;
    return source[sectionId as keyof DNAData];
  };

  const renderSectionContent = (sectionId: string) => {
    const data = getSectionData(sectionId);
    if (!data) return null;

    const fieldChange = (path: string, value: unknown) => updateSectionField(sectionId, path, value);

    switch (sectionId) {
      case 'business_identity':
        return <BusinessIdentitySection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'value_proposition':
        return <ValuePropositionSection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'ideal_customer':
        return <IdealCustomerSection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'flagship_offer':
        return <FlagshipOfferSection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'brand_identity':
        return <BrandIdentitySection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'visual_identity':
        return <VisualIdentitySection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'marketing_strategy':
        return <MarketingStrategySection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      case 'ads_targeting':
        return <AdsTargetingSection data={data as any} isEditing={editMode} onFieldChange={fieldChange} />;
      default:
        return null;
    }
  };

  const hasEmotional = dna.emotional_analysis && Object.keys(dna.emotional_analysis).length > 0;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white dark:bg-[#14141f] border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* KIRO DNA Icon */}
              <div className="shrink-0">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Dna className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">ADN del Negocio</h2>
                  {editMode && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Editando
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Generado el {formatDate(dna.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {editMode ? (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg
                               bg-zinc-100 dark:bg-zinc-800
                               text-xs sm:text-sm text-zinc-700 dark:text-zinc-300
                               hover:bg-zinc-200 dark:hover:bg-zinc-700
                               transition-colors duration-150 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg
                               bg-purple-600 hover:bg-purple-500
                               text-xs sm:text-sm text-white font-medium
                               transition-colors duration-150 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                    Guardar
                  </button>
                </>
              ) : (
                <>
                  {onUpdate && (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg
                                 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                                 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400
                                 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500/30
                                 transition-colors duration-150"
                    >
                      <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg
                               bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                               text-xs sm:text-sm text-zinc-600 dark:text-zinc-400
                               hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/30
                               transition-colors duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Borrar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Confirm delete banner */}
          {confirmDelete && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                Esto eliminara el ADN actual y volveras a grabar audio. Continuar?
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); onDelete?.(); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white bg-red-600 hover:bg-red-500 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {!editMode && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
              {hasEmotional && (
                <>
                  <QuickStat
                    icon={Brain}
                    label="Analisis Emocional"
                    value={dna.emotional_analysis.overall_mood || '—'}
                    gradient="from-purple-500 to-pink-500"
                  />
                  <QuickStat
                    icon={Heart}
                    label="Nivel de Confianza"
                    value={dna.emotional_analysis.confidence_level != null ? `${dna.emotional_analysis.confidence_level}%` : '—'}
                    gradient="from-pink-500 to-rose-500"
                  />
                </>
              )}
              <QuickStat
                icon={Target}
                label="Ubicaciones"
                value={`${(dna.audience_locations || []).length} regiones`}
                gradient="from-blue-500 to-cyan-500"
              />
              <QuickStat
                icon={TrendingUp}
                label="Pilares de Contenido"
                value={`${dna.dna_data?.marketing_strategy?.content_pillars?.length || 0} pilares`}
                gradient="from-emerald-500 to-teal-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Emotional Insights ─────────────────────────────────────── */}
      {hasEmotional && !editMode && <EmotionalInsightsCard analysis={dna.emotional_analysis} />}

      {/* ── Audience Locations ─────────────────────────────────────── */}
      {!editMode && dna.audience_locations && Array.isArray(dna.audience_locations) && dna.audience_locations.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="text-xs text-zinc-500">Audiencia:</span>
          {(dna.audience_locations as Array<{ name: string; code: string; flag?: string }>).map((loc) => (
            <span
              key={loc.code}
              className="px-2 py-0.5 rounded-full text-[11px] bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20"
            >
              {loc.flag && <span className="mr-0.5">{loc.flag}</span>}
              {loc.name}
            </span>
          ))}
        </div>
      )}

      {/* ── DNA Sections ───────────────────────────────────────────── */}
      <div className="space-y-4">
        {DNA_SECTIONS.map((section) => (
          <DNASectionCard
            key={section.id}
            title={section.title}
            description={section.description}
            icon={section.icon}
            gradient={section.gradient}
          >
            {renderSectionContent(section.id)}
          </DNASectionCard>
        ))}
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50 p-2.5 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white capitalize truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}
