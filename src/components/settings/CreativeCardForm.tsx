import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Loader2, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  useCreatorCreativeProfile,
  type CreatorCreativeProfileInput,
  type RangoEdad,
  type Genero,
  type EstiloEnergia,
  type Registro,
} from '@/hooks/useCreatorCreativeProfile';

// ──────────────────────────────────────────────────────────────────────────────
// Opciones — lenguaje simple, con ejemplos, cero jerga técnica
// ──────────────────────────────────────────────────────────────────────────────

type ArrayField =
  | 'muletillas'
  | 'frases_ejemplo'
  | 'escenarios'
  | 'formatos_fuertes'
  | 'nichos_afines'
  | 'restricciones';

const RANGO_EDAD_OPTIONS: { value: RangoEdad; label: string }[] = [
  { value: '18-24', label: '18 a 24 años' },
  { value: '25-34', label: '25 a 34 años' },
  { value: '35-44', label: '35 a 44 años' },
  { value: '45-54', label: '45 a 54 años' },
  { value: '55+', label: '55 años o más' },
];

const GENERO_OPTIONS: { value: Genero; label: string }[] = [
  { value: 'femenino', label: 'Mujer' },
  { value: 'masculino', label: 'Hombre' },
  { value: 'no_binario', label: 'No binario' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decirlo' },
];

const PAIS_ACENTO_OPTIONS: { value: string; flag: string }[] = [
  { value: 'Colombia', flag: '🇨🇴' },
  { value: 'México', flag: '🇲🇽' },
  { value: 'Argentina', flag: '🇦🇷' },
  { value: 'Chile', flag: '🇨🇱' },
  { value: 'Perú', flag: '🇵🇪' },
  { value: 'Ecuador', flag: '🇪🇨' },
  { value: 'Venezuela', flag: '🇻🇪' },
  { value: 'España', flag: '🇪🇸' },
  { value: 'Estados Unidos', flag: '🇺🇸' },
  { value: 'Panamá', flag: '🇵🇦' },
  { value: 'República Dominicana', flag: '🇩🇴' },
  { value: 'Costa Rica', flag: '🇨🇷' },
  { value: 'Guatemala', flag: '🇬🇹' },
  { value: 'Uruguay', flag: '🇺🇾' },
  { value: 'Bolivia', flag: '🇧🇴' },
  { value: 'Paraguay', flag: '🇵🇾' },
];

const ESTILO_ENERGIA_OPTIONS: { value: EstiloEnergia; label: string; hint: string }[] = [
  { value: 'calmado', label: 'Tranquila y calmada', hint: 'Hablas pausado, sin subir mucho la voz' },
  { value: 'neutro', label: 'Normal, ni fría ni exagerada', hint: 'Un punto medio, natural' },
  { value: 'alta-energia', label: 'Alta energía', hint: 'Hablas rápido, con mucho entusiasmo' },
];

const REGISTRO_OPTIONS: { value: Registro; label: string; hint: string }[] = [
  { value: 'coloquial', label: 'Como le hablas a tus amigos', hint: 'Ej: "parce", "o sea", "está super fácil"' },
  { value: 'neutro', label: 'Ni muy relax ni muy formal', hint: 'Ej: "puedes", "genial", "vamos a verlo"' },
  { value: 'formal', label: 'Como en una entrevista de trabajo', hint: 'Ej: "usted", "a continuación", "le comento"' },
];

const ESCENARIOS_SUGERIDOS = [
  'Mi cuarto', 'Sala de mi casa', 'Cocina', 'Al aire libre', 'Carro',
  'Oficina o estudio', 'Gimnasio', 'Tienda o local', 'Calle',
];

const FORMATOS_SUGERIDOS = [
  'Hablar a cámara', 'Voz en off', 'Skits o actuación', 'Unboxing',
  'Tutorial paso a paso', 'Antes y después', 'Testimonio', 'Reto o challenge', 'Bailar',
];

// Los temas que el creador ya domina. Es el criterio que MÁS pesa cuando el
// sistema propone quién graba para un cliente (25 de 100 puntos), así que si no
// se puede llenar desde aquí, ese punto no suma nunca.
const NICHOS_SUGERIDOS = [
  'Belleza y cuidado personal', 'Moda', 'Comida y recetas', 'Hogar y decoración',
  'Fitness y bienestar', 'Salud', 'Tecnología', 'Negocios y emprendimiento',
  'Viajes', 'Bebés y crianza', 'Mascotas', 'Automóviles',
];

const TOTAL_STEPS = 4;

const STEP_TITLES = [
  'Quién eres en cámara',
  'Cómo hablas',
  'Dónde grabas y qué se te da bien',
  'Qué NO grabas',
];

// ──────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────────────────────────

function StepHeader({ step }: { step: number }) {
  return (
    <div className="space-y-2 mb-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Paso {step + 1} de {TOTAL_STEPS}
        </span>
        <span className="text-xs text-muted-foreground">{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
      </div>
      <Progress value={((step + 1) / TOTAL_STEPS) * 100} className="h-1.5" />
      <h3 className="text-lg font-bold pt-1">{STEP_TITLES[step]}</h3>
    </div>
  );
}

interface PillPickerProps<T extends string> {
  options: { value: T; label: string; hint?: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}

function PillPicker<T extends string>({ options, value, onChange }: PillPickerProps<T>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            'text-left rounded-sm border px-3 py-2.5 transition-all',
            value === opt.value
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          <div className="flex items-center gap-2">
            {value === opt.value && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
            <span className="text-sm font-medium">{opt.label}</span>
          </div>
          {opt.hint && <p className="text-xs text-muted-foreground mt-0.5">{opt.hint}</p>}
        </button>
      ))}
    </div>
  );
}

interface ChipInputProps {
  values: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  maxItems?: number;
}

function ChipInput({ values, placeholder, onAdd, onRemove, maxItems }: ChipInputProps) {
  const [text, setText] = useState('');
  const atLimit = maxItems != null && values.length >= maxItems;

  const commit = () => {
    if (atLimit) return;
    const trimmed = text.trim();
    if (trimmed) {
      onAdd(trimmed);
      setText('');
    }
  };

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(v => (
            <Badge key={v} className="gap-1">
              {v}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onRemove(v)} />
            </Badge>
          ))}
        </div>
      )}
      {!atLimit && (
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={commit} disabled={!text.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      {atLimit && <p className="text-xs text-muted-foreground">Ya agregaste el máximo ({maxItems})</p>}
    </div>
  );
}

interface SuggestedChipsProps {
  suggestions: string[];
  values: string[];
  onToggle: (value: string) => void;
  onAddFree: (value: string) => void;
  freePlaceholder: string;
}

function SuggestedChips({ suggestions, values, onToggle, onAddFree, freePlaceholder }: SuggestedChipsProps) {
  const [freeText, setFreeText] = useState('');
  const extras = values.filter(v => !suggestions.includes(v));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {suggestions.map(s => (
          <Badge
            key={s}
            variant={values.includes(s) ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105 py-1.5 px-3"
            onClick={() => onToggle(s)}
          >
            {values.includes(s) && <Check className="h-3 w-3 mr-1" />}
            {s}
          </Badge>
        ))}
      </div>
      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extras.map(v => (
            <Badge key={v} className="gap-1">
              {v}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onToggle(v)} />
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const trimmed = freeText.trim();
              if (trimmed) {
                onAddFree(trimmed);
                setFreeText('');
              }
            }
          }}
          placeholder={freePlaceholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            const trimmed = freeText.trim();
            if (trimmed) {
              onAddFree(trimmed);
              setFreeText('');
            }
          }}
          disabled={!freeText.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Formulario principal
// ──────────────────────────────────────────────────────────────────────────────

interface CreativeCardFormProps {
  /** Si se pasa (el staff llenando la ficha de un creador), se edita esa ficha. Si no, la del usuario logueado. */
  userId?: string;
  onSaved?: () => void;
}

export function CreativeCardForm({ userId, onSaved }: CreativeCardFormProps) {
  const { profile, isLoading, isSaving, save } = useCreatorCreativeProfile(userId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreatorCreativeProfileInput>({});
  const [showOtroPais, setShowOtroPais] = useState(false);
  const [otroPaisText, setOtroPaisText] = useState('');

  useEffect(() => {
    if (!profile) return;
    setForm({
      rango_edad: profile.rango_edad,
      genero: profile.genero,
      ciudad: profile.ciudad,
      pais_acento: profile.pais_acento,
      estilo_energia: profile.estilo_energia,
      registro: profile.registro,
      muletillas: profile.muletillas,
      frases_ejemplo: profile.frases_ejemplo,
      escenarios: profile.escenarios,
      formatos_fuertes: profile.formatos_fuertes,
      nichos_afines: profile.nichos_afines,
      restricciones: profile.restricciones,
    });
    setShowOtroPais(!!profile.pais_acento && !PAIS_ACENTO_OPTIONS.some(o => o.value === profile.pais_acento));
  }, [profile]);

  const updateField = <K extends keyof CreatorCreativeProfileInput>(field: K, value: CreatorCreativeProfileInput[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: ArrayField, value: string) => {
    setForm(prev => {
      const current = prev[field] ?? [];
      if (current.includes(value)) return prev;
      return { ...prev, [field]: [...current, value] };
    });
  };

  const removeFromArray = (field: ArrayField, value: string) => {
    setForm(prev => ({ ...prev, [field]: (prev[field] ?? []).filter(v => v !== value) }));
  };

  const toggleInArray = (field: ArrayField, value: string) => {
    setForm(prev => {
      const current = prev[field] ?? [];
      return { ...prev, [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value] };
    });
  };

  const goNext = () => {
    save(form, {
      onSuccess: () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)),
    });
  };

  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const handleFinish = () => {
    save(form, {
      onSuccess: () => {
        toast.success('¡Ficha creativa guardada!');
        onSaved?.();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="space-y-6">
      {profile && profile.completitud > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-sm p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Tu ficha está completa al {profile.completitud}%
            </div>
          </div>
          <Progress value={profile.completitud} className="h-1.5" />
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-sm p-5">
        <StepHeader step={step} />

        {/* Paso 1: Quién eres en cámara */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">¿Cuántos años tienes?</p>
              <PillPicker options={RANGO_EDAD_OPTIONS} value={form.rango_edad} onChange={v => updateField('rango_edad', v)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿Cómo te identificas?</p>
              <PillPicker options={GENERO_OPTIONS} value={form.genero} onChange={v => updateField('genero', v)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿En qué ciudad vives?</p>
              <Input
                value={form.ciudad ?? ''}
                onChange={e => updateField('ciudad', e.target.value || null)}
                placeholder="Ej: Medellín"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿De qué país es tu acento cuando hablas español?</p>
              <div className="flex flex-wrap gap-2">
                {PAIS_ACENTO_OPTIONS.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={form.pais_acento === opt.value ? 'default' : 'outline'}
                    className="cursor-pointer transition-all hover:scale-105 py-1.5 px-3"
                    onClick={() => {
                      updateField('pais_acento', opt.value);
                      setShowOtroPais(false);
                    }}
                  >
                    {opt.flag} {opt.value}
                  </Badge>
                ))}
                <Badge
                  variant={showOtroPais ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105 py-1.5 px-3"
                  onClick={() => setShowOtroPais(true)}
                >
                  Otro
                </Badge>
              </div>
              {showOtroPais && (
                <Input
                  value={otroPaisText || form.pais_acento || ''}
                  onChange={e => {
                    setOtroPaisText(e.target.value);
                    updateField('pais_acento', e.target.value || null);
                  }}
                  placeholder="Escribe tu país"
                  className="mt-2"
                />
              )}
            </div>
          </div>
        )}

        {/* Paso 2: Cómo hablas */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Cuando grabas, ¿qué tanta energía tienes?</p>
              <PillPicker options={ESTILO_ENERGIA_OPTIONS} value={form.estilo_energia} onChange={v => updateField('estilo_energia', v)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿Cómo hablas cuando estás con amigos?</p>
              <PillPicker options={REGISTRO_OPTIONS} value={form.registro} onChange={v => updateField('registro', v)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿Qué palabras se te salen sin querer al hablar?</p>
              <p className="text-xs text-muted-foreground">Ej: "o sea", "literal", "parce", "así que bueno". Escribe una y presiona Enter.</p>
              <ChipInput
                values={form.muletillas ?? []}
                placeholder="Escribe una palabra o frase..."
                onAdd={v => addToArray('muletillas', v)}
                onRemove={v => removeFromArray('muletillas', v)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Escribe 2 o 3 frases tal como las dirías tú</p>
              <p className="text-xs text-muted-foreground">Ej: "Miren esto que está buenísimo", "No lo van a creer". Presiona Enter para agregar cada una.</p>
              <ChipInput
                values={form.frases_ejemplo ?? []}
                placeholder="Escribe una frase tuya..."
                onAdd={v => addToArray('frases_ejemplo', v)}
                onRemove={v => removeFromArray('frases_ejemplo', v)}
                maxItems={3}
              />
            </div>
          </div>
        )}

        {/* Paso 3: Dónde grabas y qué se te da bien */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">¿Dónde sueles grabar?</p>
              <p className="text-xs text-muted-foreground">Elige todos los que apliquen, o escribe uno propio.</p>
              <SuggestedChips
                suggestions={ESCENARIOS_SUGERIDOS}
                values={form.escenarios ?? []}
                onToggle={v => toggleInArray('escenarios', v)}
                onAddFree={v => addToArray('escenarios', v)}
                freePlaceholder="Otro lugar donde grabas..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿Qué se te da mejor a la hora de grabar?</p>
              <p className="text-xs text-muted-foreground">Elige todos los que apliquen, o escribe uno propio.</p>
              <SuggestedChips
                suggestions={FORMATOS_SUGERIDOS}
                values={form.formatos_fuertes ?? []}
                onToggle={v => toggleInArray('formatos_fuertes', v)}
                onAddFree={v => addToArray('formatos_fuertes', v)}
                freePlaceholder="Otro formato que se te da bien..."
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">¿De qué temas sabes o te gusta hablar?</p>
              <p className="text-xs text-muted-foreground">
                Esto es lo que más ayuda a que te propongan para las marcas correctas.
              </p>
              <SuggestedChips
                suggestions={NICHOS_SUGERIDOS}
                values={form.nichos_afines ?? []}
                onToggle={v => toggleInArray('nichos_afines', v)}
                onAddFree={v => addToArray('nichos_afines', v)}
                freePlaceholder="Otro tema que dominas..."
              />
            </div>
          </div>
        )}

        {/* Paso 4: Qué NO grabas */}
        {step === 3 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">¿Qué NO estás dispuesto a grabar?</p>
            <p className="text-xs text-muted-foreground">
              Ej: "no tomo alcohol en cámara", "no bailo", "no muestro mi casa". Así el equipo nunca te pide algo con lo que no te sientes cómodo.
            </p>
            <ChipInput
              values={form.restricciones ?? []}
              placeholder="Escribe algo que no grabas..."
              onAdd={v => addToArray('restricciones', v)}
              onRemove={v => removeFromArray('restricciones', v)}
            />
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || isSaving} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Atrás
        </Button>

        {isLastStep ? (
          <Button type="button" onClick={handleFinish} disabled={isSaving} className="gap-1.5 min-w-[140px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar ficha
          </Button>
        ) : (
          <Button type="button" onClick={goNext} disabled={isSaving} className="gap-1.5 min-w-[140px]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Siguiente<ChevronRight className="h-4 w-4" /></>}
          </Button>
        )}
      </div>
    </div>
  );
}
