import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Target, Heart, Sparkles, ShieldX, Check, FlaskConical, Briefcase, Dna, MessageSquare, Palette, Crown, Volume2, Megaphone, ShoppingBag } from 'lucide-react';
import type { ParsedResearchData } from '@/lib/productResearchParser';
import type { BrandDNA } from '../hooks/useProductResearchContext';
import type { ResearchVariables } from '../types/ad-generator.types';

interface ResearchFieldsPanelProps {
  parsedResearch?: ParsedResearchData;
  brandDNA?: BrandDNA;
  values: ResearchVariables;
  onChange: (field: keyof ResearchVariables, value: string) => void;
}

interface FieldConfig {
  key: keyof ResearchVariables;
  label: string;
  placeholder: string;
  icon: typeof Users;
  color: string;
  section: 'research' | 'dna';
}

const COLOR_MAP: Record<string, { trigger: string; check: string }> = {
  purple: { trigger: 'border-purple-500/30 bg-purple-500/5', check: 'text-purple-600 dark:text-purple-400' },
  amber: { trigger: 'border-amber-500/30 bg-amber-500/5', check: 'text-amber-600 dark:text-amber-400' },
  red: { trigger: 'border-red-500/30 bg-red-500/5', check: 'text-red-600 dark:text-red-400' },
  emerald: { trigger: 'border-emerald-500/30 bg-emerald-500/5', check: 'text-emerald-600 dark:text-emerald-400' },
  orange: { trigger: 'border-orange-500/30 bg-orange-500/5', check: 'text-orange-600 dark:text-orange-400' },
  blue: { trigger: 'border-blue-500/30 bg-blue-500/5', check: 'text-blue-600 dark:text-blue-400' },
  cyan: { trigger: 'border-cyan-500/30 bg-cyan-500/5', check: 'text-cyan-600 dark:text-cyan-400' },
  rose: { trigger: 'border-rose-500/30 bg-rose-500/5', check: 'text-rose-600 dark:text-rose-400' },
  indigo: { trigger: 'border-indigo-500/30 bg-indigo-500/5', check: 'text-indigo-600 dark:text-indigo-400' },
  teal: { trigger: 'border-teal-500/30 bg-teal-500/5', check: 'text-teal-600 dark:text-teal-400' },
  pink: { trigger: 'border-pink-500/30 bg-pink-500/5', check: 'text-pink-600 dark:text-pink-400' },
  yellow: { trigger: 'border-yellow-500/30 bg-yellow-500/5', check: 'text-yellow-600 dark:text-yellow-400' },
  lime: { trigger: 'border-lime-500/30 bg-lime-500/5', check: 'text-lime-600 dark:text-lime-400' },
  sky: { trigger: 'border-sky-500/30 bg-sky-500/5', check: 'text-sky-600 dark:text-sky-400' },
};

const ICON_COLOR_MAP: Record<string, string> = {
  purple: 'text-purple-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
  emerald: 'text-emerald-500',
  orange: 'text-orange-500',
  blue: 'text-blue-500',
  cyan: 'text-cyan-500',
  rose: 'text-rose-500',
  indigo: 'text-indigo-500',
  teal: 'text-teal-500',
  pink: 'text-pink-500',
  yellow: 'text-yellow-500',
  lime: 'text-lime-500',
  sky: 'text-sky-500',
};

const RESEARCH_FIELDS: FieldConfig[] = [
  { key: 'selectedAvatar', label: 'Avatar objetivo', placeholder: 'Seleccionar avatar...', icon: Users, color: 'purple', section: 'research' },
  { key: 'selectedAngleOrHook', label: 'Angulo / Hook', placeholder: 'Seleccionar angulo o hook...', icon: Target, color: 'amber', section: 'research' },
  { key: 'selectedPain', label: 'Dolor principal', placeholder: 'Seleccionar dolor...', icon: Heart, color: 'red', section: 'research' },
  { key: 'selectedDesire', label: 'Deseo principal', placeholder: 'Seleccionar deseo...', icon: Sparkles, color: 'emerald', section: 'research' },
  { key: 'selectedObjection', label: 'Objecion a romper', placeholder: 'Seleccionar objecion...', icon: ShieldX, color: 'orange', section: 'research' },
  { key: 'selectedJTBD', label: 'Job To Be Done', placeholder: 'Seleccionar JTBD...', icon: Briefcase, color: 'blue', section: 'research' },
];

const DNA_FIELDS: FieldConfig[] = [
  { key: 'selectedArchetype', label: 'Arquetipo de marca', placeholder: 'Seleccionar arquetipo...', icon: Crown, color: 'yellow', section: 'dna' },
  { key: 'selectedTone', label: 'Tono de voz', placeholder: 'Seleccionar tono...', icon: Volume2, color: 'sky', section: 'dna' },
  { key: 'selectedKeyMessage', label: 'Mensaje clave', placeholder: 'Seleccionar mensaje...', icon: Megaphone, color: 'indigo', section: 'dna' },
  { key: 'selectedTagline', label: 'Tagline / Slogan', placeholder: 'Seleccionar tagline...', icon: MessageSquare, color: 'teal', section: 'dna' },
  { key: 'selectedVisualStyle', label: 'Estilo visual', placeholder: 'Seleccionar estilo...', icon: Palette, color: 'pink', section: 'dna' },
  { key: 'selectedBuyingTrigger', label: 'Motivador de compra', placeholder: 'Seleccionar motivador...', icon: ShoppingBag, color: 'lime', section: 'dna' },
];

function getResearchItems(parsedResearch: ParsedResearchData | undefined, key: keyof ResearchVariables): string[] {
  if (!parsedResearch) return [];
  switch (key) {
    case 'selectedAvatar': return parsedResearch.avatars.map((a) => a.name);
    case 'selectedAngleOrHook': {
      // Merge sales angles + hooks into one list (deduplicated)
      const items: string[] = [];
      parsedResearch.salesAngles.forEach((a) => { if (a.name && !items.includes(a.name)) items.push(a.name); });
      (parsedResearch.hooks || []).forEach((h) => { if (h && !items.includes(h)) items.push(h); });
      return items;
    }
    case 'selectedPain': return parsedResearch.pains;
    case 'selectedDesire': return parsedResearch.desires;
    case 'selectedObjection': return parsedResearch.objections;
    case 'selectedJTBD': {
      const all: string[] = [];
      if (parsedResearch.jtbd.emotional?.length) all.push(...parsedResearch.jtbd.emotional);
      if (parsedResearch.jtbd.functional?.length) all.push(...parsedResearch.jtbd.functional);
      if (parsedResearch.jtbd.social?.length) all.push(...parsedResearch.jtbd.social);
      return all;
    }
    default: return [];
  }
}

function getDNAItems(brandDNA: BrandDNA | undefined, key: keyof ResearchVariables): string[] {
  if (!brandDNA) return [];
  switch (key) {
    case 'selectedArchetype': {
      const arch = brandDNA.brand_identity?.brand_archetype;
      return arch ? [arch] : [];
    }
    case 'selectedTone': {
      const tones = brandDNA.brand_identity?.voice?.tone;
      if (Array.isArray(tones)) return tones;
      const single = brandDNA.brand_identity?.tone_of_voice;
      return single ? [single] : [];
    }
    case 'selectedKeyMessage': {
      const items: string[] = [];
      const msgs = brandDNA.brand_identity?.messaging?.key_messages;
      if (msgs?.length) items.push(...msgs);
      const msgs2 = brandDNA.brand_identity?.key_messages;
      if (msgs2?.length) {
        msgs2.forEach((m) => { if (!items.includes(m)) items.push(m); });
      }
      const pitch = brandDNA.brand_identity?.messaging?.elevator_pitch;
      if (pitch && !items.includes(pitch)) items.push(pitch);
      return items;
    }
    case 'selectedTagline': {
      const items: string[] = [];
      const taglines = brandDNA.brand_identity?.tagline_suggestions;
      if (taglines?.length) items.push(...taglines);
      const msgTagline = brandDNA.brand_identity?.messaging?.tagline;
      if (msgTagline && !items.includes(msgTagline)) items.push(msgTagline);
      return items;
    }
    case 'selectedVisualStyle': {
      const items: string[] = [];
      const vs = brandDNA.visual_identity?.visual_style;
      if (Array.isArray(vs)) items.push(...vs);
      const mood = brandDNA.visual_identity?.mood;
      if (mood && !items.includes(mood)) items.push(mood);
      const imgStyle = brandDNA.visual_identity?.imagery_style;
      if (imgStyle && !items.includes(imgStyle)) items.push(imgStyle);
      const photoStyle = brandDNA.visual_identity?.photography_style;
      if (photoStyle && !items.includes(photoStyle)) items.push(photoStyle);
      return items;
    }
    case 'selectedBuyingTrigger': {
      const items: string[] = [];
      // From ideal_customer buying_triggers (if exists)
      const triggers = brandDNA.ideal_customer?.buying_triggers;
      if (triggers?.length) items.push(...triggers);
      // From ideal_customer desires (nested structure)
      const desires = brandDNA.ideal_customer?.desires;
      if (desires && typeof desires === 'object' && !Array.isArray(desires)) {
        const d = desires as Record<string, unknown>;
        for (const val of Object.values(d)) {
          if (Array.isArray(val)) items.push(...val.filter((v): v is string => typeof v === 'string'));
          else if (typeof val === 'string' && val.length > 5) items.push(val);
        }
      } else if (Array.isArray(desires)) {
        items.push(...desires.filter((v): v is string => typeof v === 'string'));
      }
      // From urgency elements in flagship offer
      const urgency = brandDNA.flagship_offer?.urgency_elements;
      if (urgency?.length) items.push(...urgency);
      return items;
    }
    default: return [];
  }
}

export function ResearchFieldsPanel({ parsedResearch, brandDNA, values, onChange }: ResearchFieldsPanelProps) {
  const { researchVisible, dnaVisible } = useMemo(() => {
    const rv = RESEARCH_FIELDS.filter((f) => getResearchItems(parsedResearch, f.key).length > 0);
    const dv = DNA_FIELDS.filter((f) => getDNAItems(brandDNA, f.key).length > 0);
    return { researchVisible: rv, dnaVisible: dv };
  }, [parsedResearch, brandDNA]);

  const allVisible = [...researchVisible, ...dnaVisible];
  if (allVisible.length === 0) return null;

  const renderField = (field: FieldConfig) => {
    const items = field.section === 'research'
      ? getResearchItems(parsedResearch, field.key)
      : getDNAItems(brandDNA, field.key);
    const selected = values[field.key];
    const colors = COLOR_MAP[field.color] || COLOR_MAP.purple;
    const Icon = field.icon;

    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Icon className={`h-3.5 w-3.5 ${ICON_COLOR_MAP[field.color] || ''}`} />
          {field.label}
        </Label>
        <Select value={selected || ''} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger className={`bg-background text-xs h-9 ${selected ? colors.trigger : ''}`}>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent className="z-[100] bg-popover max-h-[250px]" position="popper" sideOffset={4}>
            {items.map((item, idx) => (
              <SelectItem key={idx} value={item} className="py-2 text-xs">
                <span className="line-clamp-2">{item}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className={`text-[10px] flex items-center gap-1 ${colors.check}`}>
            <Check className="h-2.5 w-2.5" /> Seleccionado
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Research variables */}
      {researchVisible.length > 0 && (
        <div className="rounded-md border border-border/50 bg-muted/10 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-semibold text-foreground">Variables de investigacion</span>
            <span className="text-[10px] text-muted-foreground">(opcional — dirige el copy e imagen)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {researchVisible.map(renderField)}
          </div>
        </div>
      )}

      {/* DNA variables */}
      {dnaVisible.length > 0 && (
        <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Dna className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-semibold text-foreground">Variables de ADN de marca</span>
            <span className="text-[10px] text-muted-foreground">(opcional — personaliza con la identidad de marca)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dnaVisible.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}
