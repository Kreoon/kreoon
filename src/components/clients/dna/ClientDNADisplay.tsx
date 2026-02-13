import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dna,
  Building2,
  Users,
  Palette,
  Eye,
  Target,
  Pencil,
  Save,
  X,
  MapPin,
  Clock,
  Zap,
  Star,
  ShieldQuestion,
  Megaphone,
  Hash,
  Brain,
  Trash2,
  Plus,
  PlusCircle,
} from 'lucide-react';
import type { ClientDNA, DNAData } from '@/types/client-dna';

interface ClientDNADisplayProps {
  dna: ClientDNA;
  onUpdate: (data: Partial<DNAData>) => Promise<void>;
  onDelete: () => void;
}

// ── Deep get/set helpers ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedValue(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// ── Sub-components ───────────────────────────────────────────────────

function ColorChip({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-5 w-5 rounded-full border border-white/20 shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-mono text-muted-foreground">{color}</span>
    </div>
  );
}

function TagList({ items, color = 'purple' }: { items: string[]; color?: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={`text-xs ${colorClasses[color] || colorClasses.purple}`}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

function EditableTagList({
  items,
  color = 'purple',
  onChange,
}: {
  items: string[];
  color?: string;
  onChange: (items: string[]) => void;
}) {
  const [newTag, setNewTag] = useState('');
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewTag('');
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="outline" className={`text-xs ${colorClasses[color] || colorClasses.purple} pr-1`}>
            {item}
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="ml-1 hover:text-white"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder="Agregar..."
          className="h-7 text-xs flex-1"
        />
        <Button size="sm" variant="ghost" onClick={addTag} className="h-7 px-2">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="text-muted-foreground shrink-0 w-32">{label}:</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

function EditableFieldRow({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-4 text-sm items-start">
      <span className="text-muted-foreground shrink-0 w-32 pt-1.5">{label}:</span>
      {multiline ? (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs min-h-[60px] flex-1"
        />
      ) : (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs flex-1"
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground block mb-1">{children}</span>;
}

const SECTION_NAV = [
  { id: 'identity', label: 'Identidad', icon: Building2 },
  { id: 'value', label: 'Propuesta', icon: Zap },
  { id: 'customer', label: 'Avatar', icon: Users },
  { id: 'offer', label: 'Oferta', icon: Star },
  { id: 'brand', label: 'Marca', icon: Palette },
  { id: 'visual', label: 'Visual', icon: Eye },
  { id: 'strategy', label: 'Estrategia', icon: Target },
  { id: 'ads', label: 'ADS', icon: Megaphone },
];

// ── Main component ──────────────────────────────────────────────────

export function ClientDNADisplay({ dna, onUpdate, onDelete }: ClientDNADisplayProps) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<DNAData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const data = dna.dna_data;

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se pudo cargar el ADN del cliente.
      </div>
    );
  }

  const startEdit = () => {
    setEditData(JSON.parse(JSON.stringify(data)));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditData(null);
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!editData) return;
    await onUpdate(editData);
    setEditMode(false);
    setEditData(null);
  };

  // Helper to update a nested field in editData
  const updateField = (path: string, value: unknown) => {
    if (!editData) return;
    const clone = JSON.parse(JSON.stringify(editData));
    setNestedValue(clone, path, value);
    setEditData(clone);
  };

  const d = editMode && editData ? editData : data;
  const emotionalData = dna.emotional_analysis;
  const hasEmotionalData = emotionalData && Object.keys(emotionalData).length > 0;

  // Shorthand helpers for rendering
  const field = (label: string, path: string, multiline?: boolean) => {
    const val = getNestedValue(d, path) as string | null;
    if (editMode) {
      return (
        <EditableFieldRow
          label={label}
          value={val}
          onChange={(v) => updateField(path, v)}
          multiline={multiline}
        />
      );
    }
    return <FieldRow label={label} value={val} />;
  };

  const tags = (label: string, path: string, color: string) => {
    const items = (getNestedValue(d, path) as string[] | undefined) || [];
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        {editMode ? (
          <EditableTagList items={items} color={color} onChange={(v) => updateField(path, v)} />
        ) : (
          <TagList items={items} color={color} />
        )}
      </div>
    );
  };

  const textBlock = (label: string, path: string) => {
    const val = getNestedValue(d, path) as string | null;
    if (editMode) {
      return (
        <div>
          <SectionLabel>{label}</SectionLabel>
          <Textarea
            value={val || ''}
            onChange={(e) => updateField(path, e.target.value)}
            className="text-xs min-h-[60px]"
          />
        </div>
      );
    }
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        <p className="text-sm">{val || '—'}</p>
      </div>
    );
  };

  const listBlock = (label: string, path: string, prefix: string, prefixColor: string) => {
    const items = (getNestedValue(d, path) as string[] | undefined) || [];
    if (editMode) {
      return (
        <div>
          <SectionLabel>{label}</SectionLabel>
          <EditableTagList items={items} color={prefixColor === 'text-emerald-400' ? 'emerald' : prefixColor === 'text-red-400' ? 'red' : 'purple'} onChange={(v) => updateField(path, v)} />
        </div>
      );
    }
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        <ul className="space-y-1">
          {items.map((msg, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className={`${prefixColor} mt-0.5`}>{prefix}</span>
              {msg}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Dna className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              ADN del Cliente
              {dna.version > 1 && (
                <Badge variant="outline" className="ml-2 text-[10px]">v{dna.version}</Badge>
              )}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Generado {new Date(dna.updated_at).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1 text-xs">
                <X className="h-3 w-3" /> Cancelar
              </Button>
              <Button size="sm" onClick={saveEdit} className="gap-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <Save className="h-3 w-3" /> Guardar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={startEdit} className="gap-1 text-xs">
                <Pencil className="h-3 w-3" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} className="gap-1 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10">
                <Trash2 className="h-3 w-3" /> Borrar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                className="gap-1 text-xs"
              >
                <PlusCircle className="h-3 w-3" /> Nuevo ADN
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirm delete banner */}
      {confirmDelete && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm text-red-400">Esto eliminara el ADN y volveras a grabar audio. Continuar?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-xs">
                Cancelar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setConfirmDelete(false); onDelete(); }} className="text-xs">
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Analysis Summary */}
      {hasEmotionalData && (
        <Card className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              Analisis Emocional
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {emotionalData.overall_mood && (
                <div className="bg-background/50 rounded-md p-2 border border-border/30">
                  <span className="text-muted-foreground block">Estado</span>
                  <span className="font-medium capitalize">{emotionalData.overall_mood}</span>
                </div>
              )}
              {emotionalData.confidence_level != null && (
                <div className="bg-background/50 rounded-md p-2 border border-border/30">
                  <span className="text-muted-foreground block">Confianza</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${emotionalData.confidence_level}%` }}
                      />
                    </div>
                    <span className="font-medium">{emotionalData.confidence_level}%</span>
                  </div>
                </div>
              )}
              {emotionalData.communication_style && (
                <>
                  <div className="bg-background/50 rounded-md p-2 border border-border/30">
                    <span className="text-muted-foreground block">Ritmo</span>
                    <span className="font-medium capitalize">{emotionalData.communication_style.pace}</span>
                  </div>
                  <div className="bg-background/50 rounded-md p-2 border border-border/30">
                    <span className="text-muted-foreground block">Energia</span>
                    <span className="font-medium capitalize">{emotionalData.communication_style.energy}</span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {emotionalData.passion_topics && emotionalData.passion_topics.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Temas con pasion</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {emotionalData.passion_topics.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {emotionalData.concern_areas && emotionalData.concern_areas.length > 0 && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Areas de preocupacion</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {emotionalData.concern_areas.map((c: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/20">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {emotionalData.content_recommendations && (
              <div className="bg-background/50 rounded-md p-2 border border-border/30 space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Recomendaciones para contenido</span>
                {emotionalData.content_recommendations.suggested_tone && (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Tono sugerido:</span>
                    <span className="ml-1 font-medium">{emotionalData.content_recommendations.suggested_tone}</span>
                  </p>
                )}
                {emotionalData.content_recommendations.emphasize_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-emerald-400">Enfatizar:</span>
                    {emotionalData.content_recommendations.emphasize_topics.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                {emotionalData.content_recommendations.avoid_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-red-400">Evitar:</span>
                    {emotionalData.content_recommendations.avoid_topics.map((t: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-red-500/10 text-red-300 border-red-500/20">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section Navigation Chips */}
      <div className="flex flex-wrap gap-1.5">
        {SECTION_NAV.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => {
                document.getElementById(`dna-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-background/50 border border-border/50 hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors"
            >
              <Icon className="h-3 w-3" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* DNA Sections */}
      <Accordion type="multiple" defaultValue={['identity', 'value', 'customer', 'offer', 'brand', 'visual', 'strategy', 'ads']}>

        {/* ── Business Identity ───────────────────────────────────── */}
        <AccordionItem value="identity" id="dna-identity">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-400" />
              Identidad del Negocio
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {field('Nombre', 'business_identity.name')}
              {field('Industria', 'business_identity.industry')}
              {field('Nicho', 'business_identity.sub_industry')}
              {field('Modelo', 'business_identity.business_model')}
              {field('Tiempo en mercado', 'business_identity.years_in_market')}
              {textBlock('Descripcion', 'business_identity.description')}
              {textBlock('Panorama competitivo', 'business_identity.competitive_landscape')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Value Proposition ───────────────────────────────────── */}
        <AccordionItem value="value" id="dna-value">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Propuesta de Valor
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {textBlock('USP Principal', 'value_proposition.main_usp')}
              {tags('Diferenciadores', 'value_proposition.differentiators', 'amber')}
              {tags('Puntos de credibilidad', 'value_proposition.proof_points', 'emerald')}
              {textBlock('Promesa de marca', 'value_proposition.brand_promise')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Ideal Customer ─────────────────────────────────────── */}
        <AccordionItem value="customer" id="dna-customer">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              Cliente Ideal (Avatar)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pl-6">
              <div className="space-y-2">
                <SectionLabel>Demografia</SectionLabel>
                <div className="grid gap-1.5 text-sm">
                  {field('Edad', 'ideal_customer.demographics.age_range')}
                  {field('Genero', 'ideal_customer.demographics.gender')}
                  {field('Nivel economico', 'ideal_customer.demographics.income_level')}
                  {field('Educacion', 'ideal_customer.demographics.education')}
                  {field('Ocupacion', 'ideal_customer.demographics.occupation')}
                  {field('Contexto', 'ideal_customer.demographics.location_context')}
                </div>
              </div>

              <div className="space-y-2">
                <SectionLabel>Psicografia</SectionLabel>
                {field('Estilo de vida', 'ideal_customer.psychographics.lifestyle')}
                {tags('Valores', 'ideal_customer.psychographics.values', 'cyan')}
                {tags('Intereses', 'ideal_customer.psychographics.interests', 'blue')}
                {tags('Consumo de medios', 'ideal_customer.psychographics.media_consumption', 'purple')}
                {tags('Disparadores de compra', 'ideal_customer.psychographics.purchase_triggers', 'amber')}
              </div>

              <div className="space-y-2">
                <SectionLabel>Comportamiento de compra</SectionLabel>
                {field('Tiempo decision', 'ideal_customer.buying_behavior.decision_time')}
                {field('Sensibilidad precio', 'ideal_customer.buying_behavior.price_sensitivity')}
                {field('Ticket promedio', 'ideal_customer.buying_behavior.average_ticket')}
                {tags('Canales preferidos', 'ideal_customer.buying_behavior.preferred_channels', 'emerald')}
              </div>

              <div className="space-y-2">
                <SectionLabel>Dolores (Pain Points)</SectionLabel>
                {editMode ? (
                  <EditableFieldRow
                    label="Principal"
                    value={d.ideal_customer?.pain_points?.primary}
                    onChange={(v) => updateField('ideal_customer.pain_points.primary', v)}
                    multiline
                  />
                ) : (
                  <div className="text-sm">
                    <span className="text-pink-400 font-medium">Principal: </span>
                    {d.ideal_customer?.pain_points?.primary || '—'}
                  </div>
                )}
                {tags('Secundarios', 'ideal_customer.pain_points.secondary', 'pink')}
                {tags('Soluciones fallidas previas', 'ideal_customer.pain_points.failed_solutions', 'red')}
              </div>

              <div className="space-y-2">
                <SectionLabel>Deseos</SectionLabel>
                {field('Funcional', 'ideal_customer.desires.functional')}
                {field('Emocional', 'ideal_customer.desires.emotional')}
                {field('Social', 'ideal_customer.desires.social')}
              </div>

              {/* Objections */}
              {((d.ideal_customer?.common_objections?.length || 0) > 0 || editMode) && (
                <div className="space-y-2">
                  <SectionLabel>Objeciones comunes</SectionLabel>
                  {editMode ? (
                    <div className="space-y-2">
                      {(d.ideal_customer?.common_objections || []).map((obj, i) => (
                        <Card key={i} className="bg-background/50 border-border/50">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Objecion {i + 1}</span>
                              <button
                                onClick={() => {
                                  const objs = [...(d.ideal_customer?.common_objections || [])];
                                  objs.splice(i, 1);
                                  updateField('ideal_customer.common_objections', objs);
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <Input
                              value={obj.objection}
                              onChange={(e) => {
                                const objs = [...(d.ideal_customer?.common_objections || [])];
                                objs[i] = { ...objs[i], objection: e.target.value };
                                updateField('ideal_customer.common_objections', objs);
                              }}
                              placeholder="Objecion"
                              className="h-7 text-xs"
                            />
                            <Input
                              value={obj.response}
                              onChange={(e) => {
                                const objs = [...(d.ideal_customer?.common_objections || [])];
                                objs[i] = { ...objs[i], response: e.target.value };
                                updateField('ideal_customer.common_objections', objs);
                              }}
                              placeholder="Respuesta"
                              className="h-7 text-xs"
                            />
                          </CardContent>
                        </Card>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const objs = [...(d.ideal_customer?.common_objections || []), { objection: '', response: '' }];
                          updateField('ideal_customer.common_objections', objs);
                        }}
                        className="text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" /> Agregar objecion
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {d.ideal_customer?.common_objections?.map((obj, i) => (
                        <Card key={i} className="bg-background/50 border-border/50">
                          <CardContent className="p-3 space-y-1">
                            <p className="text-sm font-medium flex items-start gap-2">
                              <ShieldQuestion className="h-3.5 w-3.5 mt-0.5 text-red-400 shrink-0" />
                              {obj.objection}
                            </p>
                            <p className="text-xs text-emerald-400 pl-5.5">
                              Respuesta: {obj.response}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Flagship Offer ─────────────────────────────────────── */}
        <AccordionItem value="offer" id="dna-offer">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              Oferta Estrella
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {field('Nombre', 'flagship_offer.name')}
              {field('Rango de precio', 'flagship_offer.price_range')}
              {field('Beneficio principal', 'flagship_offer.main_benefit')}
              {field('Rol en embudo', 'flagship_offer.funnel_role')}
              {textBlock('Descripcion', 'flagship_offer.description')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Brand Identity ──────────────────────────────────────── */}
        <AccordionItem value="brand" id="dna-brand">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-pink-400" />
              Identidad de Marca
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {field('Arquetipo', 'brand_identity.brand_archetype')}
              {tags('Rasgos de personalidad', 'brand_identity.personality_traits', 'purple')}
              {tags('Tono de voz', 'brand_identity.voice.tone', 'pink')}
              {listBlock('Si dice', 'brand_identity.voice.do_say', '+', 'text-emerald-400')}
              {listBlock('No dice', 'brand_identity.voice.dont_say', '-', 'text-red-400')}
              {textBlock('Tagline', 'brand_identity.messaging.tagline')}
              {textBlock('Elevator Pitch', 'brand_identity.messaging.elevator_pitch')}
              {listBlock('Mensajes clave', 'brand_identity.messaging.key_messages', '', 'text-purple-400')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Visual Identity ─────────────────────────────────────── */}
        <AccordionItem value="visual" id="dna-visual">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" />
              Identidad Visual
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {editMode ? (
                tags('Colores de marca', 'visual_identity.brand_colors', 'purple')
              ) : (
                <div>
                  <SectionLabel>Colores de marca</SectionLabel>
                  <div className="flex flex-wrap gap-3">
                    {(d.visual_identity?.brand_colors || []).map((color, i) => (
                      <ColorChip key={i} color={color} />
                    ))}
                  </div>
                </div>
              )}
              {textBlock('Significado del color', 'visual_identity.color_meaning')}
              {tags('Estilo visual', 'visual_identity.visual_style', 'emerald')}
              {tags('Temas de contenido', 'visual_identity.content_themes', 'purple')}
              {field('Fotografia', 'visual_identity.photography_style')}
              {field('Mood', 'visual_identity.mood')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Marketing Strategy ───────────────────────────────────── */}
        <AccordionItem value="strategy" id="dna-strategy">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              Estrategia de Marketing
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {field('Objetivo principal', 'marketing_strategy.primary_objective')}
              {tags('Objetivos secundarios', 'marketing_strategy.secondary_objectives', 'amber')}
              {field('CTA principal', 'marketing_strategy.main_cta')}
              {tags('Pilares de contenido', 'marketing_strategy.content_pillars', 'purple')}
              {tags('Canales', 'marketing_strategy.channels', 'cyan')}
              {field('Presupuesto ADS', 'marketing_strategy.monthly_budget')}
              {textBlock('Estrategia de embudo', 'marketing_strategy.funnel_strategy')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── ADS Targeting ────────────────────────────────────────── */}
        <AccordionItem value="ads" id="dna-ads">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-400" />
              Segmentacion ADS
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {tags('Intereses (Meta/TikTok)', 'ads_targeting.interests', 'blue')}
              {tags('Comportamientos', 'ads_targeting.behaviors', 'cyan')}
              {tags('Fuentes de Lookalike', 'ads_targeting.lookalike_sources', 'purple')}
              {tags('Keywords Google Ads', 'ads_targeting.keywords_google', 'emerald')}
              {tags('Keywords negativas', 'ads_targeting.negative_keywords', 'red')}
              {editMode ? (
                tags('Hashtags', 'ads_targeting.hashtags', 'pink')
              ) : (
                <div>
                  <SectionLabel>Hashtags</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {(d.ads_targeting?.hashtags || []).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-pink-500/10 text-pink-300 border-pink-500/20 gap-0.5">
                        <Hash className="h-2.5 w-2.5" />
                        {tag.replace(/^#/, '')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Locations */}
      {dna.audience_locations && Array.isArray(dna.audience_locations) && (dna.audience_locations as unknown[]).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="text-xs text-muted-foreground">Audiencia:</span>
          {(dna.audience_locations as Array<{ name: string; code: string; flag?: string }>).map((loc) => (
            <Badge key={loc.code} variant="outline" className="text-[10px] bg-purple-500/5 border-purple-500/20">
              {loc.flag && <span className="mr-0.5">{loc.flag}</span>}{loc.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
