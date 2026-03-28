// ============================================
// ProductDNAVersionCompare
// Compara versiones de Product DNA (4 JSONB cols)
// ============================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  GitCompare,
  ChevronRight,
  Calendar,
  ArrowRight,
  Plus,
  Minus,
  Edit3,
  RotateCcw,
  X,
  Check,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ProductDNARecord } from './ProductDNADisplay';

// ============================================
// TYPES
// ============================================

/** A snapshot of a product_dna row stored as a version */
export interface ProductDNAVersionRecord {
  id: string;
  product_dna_id: string;
  version_number: number;
  /** Snapshot of the 4 analysis columns at this version */
  market_research: Record<string, any> | null;
  competitor_analysis: Record<string, any> | null;
  strategy_recommendations: Record<string, any> | null;
  content_brief: Record<string, any> | null;
  /** Snapshot of wizard responses */
  wizard_responses: Record<string, any>;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

interface ProductDNAVersionCompareProps {
  currentDNA: ProductDNARecord;
  versions: ProductDNAVersionRecord[];
  onRestoreVersion?: (versionId: string) => void;
  onClose?: () => void;
  className?: string;
}

interface DiffResult {
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  key: string;
  oldValue?: any;
  newValue?: any;
  path: string[];
}

type ViewMode = 'side-by-side' | 'unified';

// ============================================
// HELPERS
// ============================================

const formatDate = (date: string) =>
  new Date(date).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Deep diff between two objects */
const deepDiff = (obj1: any, obj2: any, path: string[] = []): DiffResult[] => {
  const results: DiffResult[] = [];
  if (obj1 === obj2) return results;

  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    results.push({
      type: obj1 === undefined ? 'added' : obj2 === undefined ? 'removed' : 'changed',
      key: path[path.length - 1] || 'root',
      oldValue: obj1,
      newValue: obj2,
      path,
    });
    return results;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= obj1.length) {
        results.push({ type: 'added', key: `[${i}]`, newValue: obj2[i], path: [...path, `[${i}]`] });
      } else if (i >= obj2.length) {
        results.push({ type: 'removed', key: `[${i}]`, oldValue: obj1[i], path: [...path, `[${i}]`] });
      } else {
        results.push(...deepDiff(obj1[i], obj2[i], [...path, `[${i}]`]));
      }
    }
    return results;
  }

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  for (const key of allKeys) {
    if (!(key in obj1)) {
      results.push({ type: 'added', key, newValue: obj2[key], path: [...path, key] });
    } else if (!(key in obj2)) {
      results.push({ type: 'removed', key, oldValue: obj1[key], path: [...path, key] });
    } else {
      results.push(...deepDiff(obj1[key], obj2[key], [...path, key]));
    }
  }
  return results;
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '(vacío)';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (typeof value[0] === 'string') return value.join(', ');
      return `[${value.length} items]`;
    }
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

/** Readable labels for analysis keys */
const LABELS: Record<string, string> = {
  // Top-level analysis columns
  market_research: 'Investigación de Mercado',
  competitor_analysis: 'Análisis Competitivo',
  strategy_recommendations: 'Recomendaciones Estratégicas',
  content_brief: 'Brief de Contenido',
  // Market research
  market_overview: 'Panorama del Mercado',
  market_size: 'Tamaño del Mercado',
  growth_trends: 'Tendencias de Crecimiento',
  opportunities: 'Oportunidades',
  threats: 'Amenazas',
  target_segments: 'Segmentos Objetivo',
  ideal_customer_profile: 'Perfil del Cliente Ideal',
  demographics: 'Demografía',
  psychographics: 'Psicografía',
  pain_points: 'Puntos de Dolor',
  desires: 'Deseos',
  objections: 'Objeciones',
  buying_triggers: 'Triggers de Compra',
  // Competitor analysis
  direct_competitors: 'Competidores Directos',
  indirect_competitors: 'Competidores Indirectos',
  competitive_advantage: 'Ventaja Competitiva',
  positioning_strategy: 'Estrategia de Posicionamiento',
  differentiation_points: 'Puntos de Diferenciación',
  // Strategy recommendations
  value_proposition: 'Propuesta de Valor',
  brand_positioning: 'Posicionamiento de Marca',
  pricing_strategy: 'Estrategia de Precios',
  sales_angles: 'Ángulos de Venta',
  funnel_strategy: 'Estrategia de Funnel',
  content_pillars: 'Pilares de Contenido',
  platforms: 'Plataformas',
  hashtags: 'Hashtags',
  ads_targeting: 'Targeting de Anuncios',
  // Content brief
  brand_voice: 'Voz de Marca',
  key_messages: 'Mensajes Clave',
  tagline_suggestions: 'Taglines Sugeridos',
  content_ideas: 'Ideas de Contenido',
  visual_direction: 'Dirección Visual',
  tone: 'Tono',
  personality: 'Personalidad',
  do_say: 'Decir',
  dont_say: 'No Decir',
  color_palette: 'Paleta de Colores',
};

const getReadableLabel = (key: string): string =>
  LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Build the 4-column analysis snapshot for diffing */
const buildAnalysisObject = (v: ProductDNAVersionRecord) => ({
  market_research: v.market_research || {},
  competitor_analysis: v.competitor_analysis || {},
  strategy_recommendations: v.strategy_recommendations || {},
  content_brief: v.content_brief || {},
});

// ============================================
// SUB-COMPONENTS
// ============================================

const VersionSelector: React.FC<{
  versions: ProductDNAVersionRecord[];
  selectedId: string;
  onChange: (id: string) => void;
  label: string;
}> = ({ versions, selectedId, onChange, label }) => (
  <div className="flex-1">
    <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">
      {label}
    </label>
    <select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted/50 border border-border rounded-sm px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {versions.map((v) => (
        <option key={v.id} value={v.id}>
          Versión {v.version_number} - {formatDate(v.created_at)}
        </option>
      ))}
    </select>
  </div>
);

const DiffTypeBadge: React.FC<{ type: DiffResult['type'] }> = ({ type }) => {
  const map = {
    added: { icon: Plus, variant: 'default' as const, cls: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Añadido' },
    removed: { icon: Minus, variant: 'destructive' as const, cls: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30', label: 'Eliminado' },
    changed: { icon: Edit3, variant: 'secondary' as const, cls: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Modificado' },
    unchanged: { icon: Check, variant: 'outline' as const, cls: 'text-muted-foreground', label: 'Sin cambios' },
  };
  const cfg = map[type];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
};

const DiffRow: React.FC<{ diff: DiffResult; viewMode: ViewMode }> = ({ diff, viewMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong =
    (diff.oldValue && formatValue(diff.oldValue).length > 100) ||
    (diff.newValue && formatValue(diff.newValue).length > 100);

  const pathLabel =
    diff.path.length > 1
      ? diff.path.slice(0, -1).map(getReadableLabel).join(' → ')
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/30 rounded-sm overflow-hidden border border-border/50"
    >
      <div
        className={`flex items-center justify-between p-4 ${isLong ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={() => isLong && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          {pathLabel && <span className="text-xs text-muted-foreground block mb-1">{pathLabel}</span>}
          <span className="text-foreground font-medium">{getReadableLabel(diff.key)}</span>
        </div>
        <div className="flex items-center gap-3">
          <DiffTypeBadge type={diff.type} />
          {isLong && (
            <button className="p-1 text-muted-foreground hover:text-foreground">
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {diff.type !== 'unchanged' && (
        <AnimatePresence>
          {(!isLong || isExpanded) && (
            <motion.div
              initial={isLong ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50"
            >
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-2 divide-x divide-border/50">
                  <div className={`p-4 ${diff.type === 'removed' || diff.type === 'changed' ? 'bg-red-500/5' : ''}`}>
                    <span className="text-xs text-muted-foreground uppercase block mb-2">Anterior</span>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono break-words">
                      {diff.type === 'added' ? '(no existía)' : formatValue(diff.oldValue)}
                    </pre>
                  </div>
                  <div className={`p-4 ${diff.type === 'added' || diff.type === 'changed' ? 'bg-emerald-500/5' : ''}`}>
                    <span className="text-xs text-muted-foreground uppercase block mb-2">Nuevo</span>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono break-words">
                      {diff.type === 'removed' ? '(eliminado)' : formatValue(diff.newValue)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {(diff.type === 'removed' || diff.type === 'changed') && diff.oldValue !== undefined && (
                    <div className="bg-red-500/10 rounded-sm p-3 border-l-2 border-red-500">
                      <span className="text-xs text-red-600 dark:text-red-400 uppercase block mb-1">- Eliminado</span>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono break-words">
                        {formatValue(diff.oldValue)}
                      </pre>
                    </div>
                  )}
                  {(diff.type === 'added' || diff.type === 'changed') && diff.newValue !== undefined && (
                    <div className="bg-emerald-500/10 rounded-sm p-3 border-l-2 border-emerald-500">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase block mb-1">+ Añadido</span>
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono break-words">
                        {formatValue(diff.newValue)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

const DiffSummary: React.FC<{ diffs: DiffResult[] }> = ({ diffs }) => {
  const counts = useMemo(
    () => ({
      added: diffs.filter((d) => d.type === 'added').length,
      removed: diffs.filter((d) => d.type === 'removed').length,
      changed: diffs.filter((d) => d.type === 'changed').length,
    }),
    [diffs],
  );
  const total = counts.added + counts.removed + counts.changed;

  if (total === 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm p-4 flex items-center gap-3">
        <Check className="w-5 h-5 text-emerald-500" />
        <span className="text-emerald-600 dark:text-emerald-400">Las versiones son idénticas</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-muted-foreground text-sm">Resumen:</span>
      {counts.added > 0 && (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm">
          <Plus className="w-4 h-4" /> {counts.added} añadidos
        </span>
      )}
      {counts.removed > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
          <Minus className="w-4 h-4" /> {counts.removed} eliminados
        </span>
      )}
      {counts.changed > 0 && (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
          <Edit3 className="w-4 h-4" /> {counts.changed} modificados
        </span>
      )}
    </div>
  );
};

const VersionInfo: React.FC<{
  version: ProductDNAVersionRecord;
  isCurrent?: boolean;
  onRestore?: () => void;
}> = ({ version, isCurrent, onRestore }) => (
  <div
    className={`rounded-sm p-4 ${
      isCurrent ? 'border-2 border-primary/50 bg-primary/5' : 'border border-border bg-muted/30'
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Versión {version.version_number}</span>
        {isCurrent && (
          <Badge variant="default" className="text-xs">
            Actual
          </Badge>
        )}
      </div>
      {!isCurrent && onRestore && (
        <Button variant="ghost" size="sm" onClick={onRestore} className="gap-1 text-xs">
          <RotateCcw className="w-3 h-3" />
          Restaurar
        </Button>
      )}
    </div>
    <div className="space-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {formatDate(version.created_at)}
      </div>
      {version.change_reason && (
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5" />
          <span>{version.change_reason}</span>
        </div>
      )}
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProductDNAVersionCompare({
  currentDNA,
  versions,
  onRestoreVersion,
  onClose,
  className = '',
}: ProductDNAVersionCompareProps) {
  const [leftVersionId, setLeftVersionId] = useState<string>(
    versions.length > 1 ? versions[1].id : versions[0]?.id || '',
  );
  const [rightVersionId, setRightVersionId] = useState<string>(versions[0]?.id || '');
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const leftVersion = useMemo(() => versions.find((v) => v.id === leftVersionId), [versions, leftVersionId]);
  const rightVersion = useMemo(() => versions.find((v) => v.id === rightVersionId), [versions, rightVersionId]);

  // Diff the 4 analysis columns between versions
  const diffs = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    const left = buildAnalysisObject(leftVersion);
    const right = buildAnalysisObject(rightVersion);
    const all = deepDiff(left, right);
    return showOnlyChanges ? all.filter((d) => d.type !== 'unchanged') : all;
  }, [leftVersion, rightVersion, showOnlyChanges]);

  const groupedDiffs = useMemo(() => {
    const groups: Record<string, DiffResult[]> = {};
    diffs.forEach((diff) => {
      const section = diff.path[0] || 'root';
      if (!groups[section]) groups[section] = [];
      groups[section].push(diff);
    });
    return groups;
  }, [diffs]);

  if (versions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
        <History className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Sin historial de versiones</h3>
        <p className="text-muted-foreground">Este Product DNA no tiene versiones anteriores.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-sm bg-gradient-to-br from-purple-500 to-pink-500">
            <GitCompare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Comparar Versiones</h2>
            <p className="text-sm text-muted-foreground">{versions.length} versiones disponibles</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Version selectors */}
      <div className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-end gap-4">
          <VersionSelector
            versions={versions}
            selectedId={leftVersionId}
            onChange={setLeftVersionId}
            label="Versión A (Anterior)"
          />
          <div className="flex items-center justify-center p-3">
            <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <VersionSelector
            versions={versions}
            selectedId={rightVersionId}
            onChange={setRightVersionId}
            label="Versión B (Nueva)"
          />
        </div>

        {leftVersion && rightVersion && (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <VersionInfo
              version={leftVersion}
              isCurrent={leftVersion.version_number === currentDNA.version}
              onRestore={onRestoreVersion ? () => onRestoreVersion(leftVersion.id) : undefined}
            />
            <VersionInfo
              version={rightVersion}
              isCurrent={rightVersion.version_number === currentDNA.version}
              onRestore={onRestoreVersion ? () => onRestoreVersion(rightVersion.id) : undefined}
            />
          </div>
        )}
      </div>

      {/* View controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <DiffSummary diffs={diffs} />

        <div className="flex items-center gap-4">
          {/* Only changes toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                showOnlyChanges ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transform transition-transform mt-1 ${
                  showOnlyChanges ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="text-sm text-muted-foreground">Solo cambios</span>
          </label>

          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-sm p-1">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Lado a lado
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                viewMode === 'unified'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unificado
            </button>
          </div>
        </div>
      </div>

      {/* Grouped diffs */}
      <div className="space-y-4">
        {Object.entries(groupedDiffs).map(([section, sectionDiffs]) => (
          <div key={section} className="rounded-sm border border-border bg-card overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === section ? null : section)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">{getReadableLabel(section)}</span>
                <Badge variant="secondary" className="text-xs">
                  {sectionDiffs.length} cambios
                </Badge>
              </div>
              <motion.div
                animate={{ rotate: expandedSection === section ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence>
              {(expandedSection === section || expandedSection === null) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border"
                >
                  <div className="p-4 space-y-3">
                    {sectionDiffs.map((diff, i) => (
                      <DiffRow key={i} diff={diff} viewMode={viewMode} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {Object.keys(groupedDiffs).length === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm p-8 text-center">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin diferencias</h3>
            <p className="text-muted-foreground">Las versiones seleccionadas son idénticas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
