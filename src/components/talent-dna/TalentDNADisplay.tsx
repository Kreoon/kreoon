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
  User,
  Target,
  Palette,
  Briefcase,
  Globe,
  Rocket,
  Pencil,
  Save,
  X,
  Clock,
  Sparkles,
  Brain,
  Trash2,
  Plus,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { TalentDNA, TalentDNAData } from '@/types/talent-dna';
import { EXPERIENCE_LEVELS } from '@/lib/talent-dna/constants';

interface TalentDNADisplayProps {
  dna: TalentDNA;
  onUpdate: (data: Partial<TalentDNAData>) => Promise<void>;
  onDelete: () => void;
  onRegenerate: () => void;
  onApplyToProfile: () => Promise<boolean>;
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

function TagList({ items, color = 'emerald' }: { items: string[]; color?: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={`text-xs ${colorClasses[color] || colorClasses.emerald}`}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

function EditableTagList({
  items,
  color = 'emerald',
  onChange,
}: {
  items: string[];
  color?: string;
  onChange: (items: string[]) => void;
}) {
  const [newTag, setNewTag] = useState('');
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
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
          <Badge key={i} variant="outline" className={`text-xs ${colorClasses[color] || colorClasses.emerald} pr-1`}>
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
  { id: 'identity', label: 'Identidad', icon: User },
  { id: 'specialization', label: 'Especialidad', icon: Target },
  { id: 'style', label: 'Estilo', icon: Palette },
  { id: 'process', label: 'Proceso', icon: Briefcase },
  { id: 'platforms', label: 'Plataformas', icon: Globe },
  { id: 'goals', label: 'Metas', icon: Rocket },
];

// ── Main component ──────────────────────────────────────────────────

export function TalentDNADisplay({ dna, onUpdate, onDelete, onRegenerate, onApplyToProfile }: TalentDNADisplayProps) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<TalentDNAData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [applying, setApplying] = useState(false);
  const data = dna.dna_data;

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se pudo cargar el ADN del talento.
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

  const handleApply = async () => {
    setApplying(true);
    await onApplyToProfile();
    setApplying(false);
  };

  const updateField = (path: string, value: unknown) => {
    if (!editData) return;
    const clone = JSON.parse(JSON.stringify(editData));
    setNestedValue(clone, path, value);
    setEditData(clone);
  };

  const d = editMode && editData ? editData : data;
  const emotionalData = dna.emotional_analysis as Record<string, unknown>;
  const hasEmotionalData = emotionalData && Object.keys(emotionalData).length > 0;
  const experienceLevel = EXPERIENCE_LEVELS[d.creator_identity?.experience_level as keyof typeof EXPERIENCE_LEVELS];

  // Shorthand helpers
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
            <Dna className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              ADN de Talento
              {dna.version > 1 && (
                <Badge variant="outline" className="text-[10px]">v{dna.version}</Badge>
              )}
              {dna.applied_to_profile && (
                <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Aplicado
                </Badge>
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
              <Button size="sm" onClick={saveEdit} className="gap-1 text-xs bg-gradient-to-r from-emerald-600 to-cyan-600 text-white">
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
              <Button size="sm" variant="outline" onClick={onRegenerate} className="gap-1 text-xs">
                <PlusCircle className="h-3 w-3" /> Nuevo ADN
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Apply to Profile CTA */}
      {!dna.applied_to_profile && !editMode && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium">Aplica tu ADN al perfil del marketplace</p>
                <p className="text-xs text-muted-foreground">Tu perfil se actualizara con esta informacion</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={applying}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white"
            >
              {applying ? 'Aplicando...' : 'Aplicar al Perfil'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

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
        <Card className="bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border-emerald-500/20">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Brain className="h-3.5 w-3.5 text-emerald-400" />
              Analisis Emocional
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {emotionalData.overall_mood && (
                <div className="bg-background/50 rounded-md p-2 border border-border/30">
                  <span className="text-muted-foreground block">Estado</span>
                  <span className="font-medium capitalize">{emotionalData.overall_mood as string}</span>
                </div>
              )}
              {emotionalData.confidence_level != null && (
                <div className="bg-background/50 rounded-md p-2 border border-border/30">
                  <span className="text-muted-foreground block">Confianza</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                        style={{ width: `${emotionalData.confidence_level}%` }}
                      />
                    </div>
                    <span className="font-medium">{emotionalData.confidence_level}%</span>
                  </div>
                </div>
              )}
            </div>
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
                document.getElementById(`talent-dna-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-background/50 border border-border/50 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors"
            >
              <Icon className="h-3 w-3" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* DNA Sections */}
      <Accordion type="multiple" defaultValue={['identity', 'specialization', 'style', 'process', 'platforms', 'goals']}>

        {/* ── Creator Identity ───────────────────────────────────── */}
        <AccordionItem value="identity" id="talent-dna-identity">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" />
              Identidad del Creador
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {textBlock('Tagline', 'creator_identity.tagline')}
              {textBlock('Biografia completa', 'creator_identity.bio_full')}

              {/* Experience Level */}
              <div>
                <SectionLabel>Nivel de experiencia</SectionLabel>
                {editMode ? (
                  <select
                    value={d.creator_identity?.experience_level || 'intermediate'}
                    onChange={(e) => updateField('creator_identity.experience_level', e.target.value)}
                    className="h-7 text-xs rounded border border-border bg-background px-2"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                    <option value="expert">Experto</option>
                  </select>
                ) : (
                  <Badge variant="outline" className={`text-xs ${experienceLevel?.bgColor} ${experienceLevel?.color} ${experienceLevel?.borderColor}`}>
                    {experienceLevel?.label || 'Intermedio'}
                  </Badge>
                )}
              </div>

              {field('Anos creando', 'creator_identity.years_creating')}
              {textBlock('Factor diferenciador', 'creator_identity.unique_factor')}
              {tags('Logros destacados', 'creator_identity.achievements', 'amber')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Specialization ───────────────────────────────────── */}
        <AccordionItem value="specialization" id="talent-dna-specialization">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              Especialidad
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {tags('Nichos', 'specialization.niches', 'cyan')}
              {tags('Formatos de contenido', 'specialization.content_formats', 'emerald')}
              {tags('Habilidades de produccion', 'specialization.production_skills', 'purple')}
              {tags('Servicios especializados', 'specialization.specialized_services', 'pink')}
              {tags('Roles de marketplace', 'marketplace_roles', 'amber')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Content Style ───────────────────────────────────── */}
        <AccordionItem value="style" id="talent-dna-style">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-pink-400" />
              Estilo de Contenido
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {field('Estilo principal', 'content_style.primary_style')}
              {tags('Descriptores de tono', 'content_style.tone_descriptors', 'pink')}
              {textBlock('Estetica visual', 'content_style.visual_aesthetic')}
              {textBlock('Estilo de edicion', 'content_style.editing_style')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Creative Process ───────────────────────────────────── */}
        <AccordionItem value="process" id="talent-dna-process">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-400" />
              Proceso Creativo
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {textBlock('Flujo de trabajo', 'creative_process.workflow_description')}
              {field('Tiempo de entrega', 'creative_process.turnaround_typical')}
              {textBlock('Estilo de colaboracion', 'creative_process.collaboration_style')}
              {tags('Herramientas', 'creative_process.tools_used', 'amber')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Platforms & Languages ───────────────────────────────────── */}
        <AccordionItem value="platforms" id="talent-dna-platforms">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              Plataformas e Idiomas
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {tags('Plataformas', 'platforms', 'blue')}
              {tags('Idiomas', 'languages', 'cyan')}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Professional Goals ───────────────────────────────────── */}
        <AccordionItem value="goals" id="talent-dna-goals">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            <span className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-purple-400" />
              Metas Profesionales
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pl-6">
              {tags('Metas corto plazo', 'professional_goals.short_term', 'emerald')}
              {tags('Metas largo plazo', 'professional_goals.long_term', 'purple')}
              {tags('Marcas ideales', 'professional_goals.dream_brands', 'pink')}

              <div className="mt-2">
                <SectionLabel>Colaboraciones ideales</SectionLabel>
                {tags('Tipos de marca', 'ideal_collaborations.brand_types', 'cyan')}
                {tags('Industrias', 'ideal_collaborations.industries', 'blue')}
                {tags('Tipos de proyecto', 'ideal_collaborations.project_types', 'amber')}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
