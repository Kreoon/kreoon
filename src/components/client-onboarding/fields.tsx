import type { Control, FieldValues, Path } from 'react-hook-form';
import { Check } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Campos del wizard público de onboarding.
 *
 * Mobile-first a propósito:
 *  - `text-base` (16px) en todos los inputs: por debajo de 16px iOS Safari hace
 *    auto-zoom al enfocar y descuadra la página.
 *  - `min-h-[44px]` en inputs y opciones: target táctil mínimo WCAG/Apple,
 *    igual que el patrón de MobileBottomNav.
 */

const INPUT_CLASSES =
  'min-h-[44px] text-base bg-kreoon-bg-secondary border-kreoon-border ' +
  'placeholder:text-kreoon-text-muted/60 focus-visible:ring-kreoon-purple-500/50 ' +
  'focus-visible:border-kreoon-purple-400';

interface BaseFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Texto de ayuda en lenguaje simple, debajo del label. */
  ayuda?: string;
  placeholder?: string;
  opcional?: boolean;
}

function Etiqueta({
  label,
  ayuda,
  opcional,
}: {
  label: string;
  ayuda?: string;
  opcional?: boolean;
}) {
  return (
    <div className="mb-1.5">
      <FormLabel className="text-sm font-medium text-kreoon-text-primary">
        {label}
        {opcional && (
          <span className="ml-1.5 text-xs font-normal text-kreoon-text-muted">
            (opcional)
          </span>
        )}
      </FormLabel>
      {ayuda && (
        <p className="mt-0.5 text-xs leading-relaxed text-kreoon-text-muted">
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function CampoTexto<T extends FieldValues>({
  control,
  name,
  label,
  ayuda,
  placeholder,
  opcional,
  type = 'text',
  inputMode,
}: BaseFieldProps<T> & {
  type?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric';
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Etiqueta label={label} ayuda={ayuda} opcional={opcional} />
          <FormControl>
            <Input
              {...field}
              value={(field.value as string) ?? ''}
              type={type}
              inputMode={inputMode}
              placeholder={placeholder}
              className={INPUT_CLASSES}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

export function CampoLargo<T extends FieldValues>({
  control,
  name,
  label,
  ayuda,
  placeholder,
  opcional,
  rows = 3,
}: BaseFieldProps<T> & { rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Etiqueta label={label} ayuda={ayuda} opcional={opcional} />
          <FormControl>
            <Textarea
              {...field}
              value={(field.value as string) ?? ''}
              rows={rows}
              placeholder={placeholder}
              className={cn(INPUT_CLASSES, 'resize-none leading-relaxed')}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

/**
 * Tres casillas numeradas para listas cortas (competidores, referentes,
 * objeciones). El error del array se muestra una sola vez, abajo.
 */
export function CampoTriple<T extends FieldValues>({
  control,
  name,
  label,
  ayuda,
  placeholders,
  opcional,
}: Omit<BaseFieldProps<T>, 'placeholder'> & { placeholders?: string[] }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const valores = (field.value as (string | undefined)[]) ?? ['', '', ''];
        return (
          <FormItem>
            <Etiqueta label={label} ayuda={ayuda} opcional={opcional} />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kreoon-purple-500/15 text-xs font-medium text-kreoon-purple-400">
                    {i + 1}
                  </span>
                  <Input
                    value={valores[i] ?? ''}
                    onChange={(e) => {
                      const siguiente = [...valores];
                      siguiente[i] = e.target.value;
                      field.onChange(siguiente);
                    }}
                    onBlur={field.onBlur}
                    placeholder={placeholders?.[i]}
                    className={INPUT_CLASSES}
                  />
                </div>
              ))}
            </div>
            {fieldState.error && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {fieldState.error.message}
              </p>
            )}
          </FormItem>
        );
      }}
    />
  );
}

interface Opcion {
  readonly value: string;
  readonly label: string;
  readonly emoji: string;
  /** Aclaración corta bajo el label. Solo la usa CampoOpciones. */
  readonly ayuda?: string;
}

/**
 * Tarjetas grandes de selección única (emoji-first).
 *
 * `permitirDeseleccionar` controla si reclicar la opción activa la limpia. Debe
 * ir en false para campos obligatorios tipados como enum: dejarlos en cadena
 * vacía produce un valor que el schema no acepta y el paso queda trabado sin
 * que se vea por qué.
 */
export function CampoOpciones<T extends FieldValues>({
  control,
  name,
  label,
  ayuda,
  opciones,
  opcional,
  permitirDeseleccionar = true,
}: Omit<BaseFieldProps<T>, 'placeholder'> & {
  opciones: readonly Opcion[];
  permitirDeseleccionar?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Etiqueta label={label} ayuda={ayuda} opcional={opcional} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {opciones.map((opcion) => {
              const activa = field.value === opcion.value;
              return (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() =>
                    field.onChange(
                      activa && permitirDeseleccionar ? '' : opcion.value,
                    )
                  }
                  aria-pressed={activa}
                  className={cn(
                    'flex min-h-[44px] items-center gap-2.5 rounded-sm border p-3 text-left transition-all',
                    activa
                      ? 'border-kreoon-purple-500/60 bg-kreoon-purple-500/10 shadow-kreoon-glow-sm'
                      : 'border-kreoon-border bg-kreoon-bg-secondary hover:border-kreoon-purple-400/30',
                  )}
                >
                  <span className="text-xl">{opcion.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-kreoon-text-primary">
                      {opcion.label}
                    </span>
                    {opcion.ayuda && (
                      <span className="mt-0.5 block text-xs leading-snug text-kreoon-text-muted">
                        {opcion.ayuda}
                      </span>
                    )}
                  </span>
                  {activa && (
                    <Check className="h-4 w-4 shrink-0 text-kreoon-purple-400" />
                  )}
                </button>
              );
            })}
          </div>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

/** Selección múltiple con el mismo patrón de toggle del repo (product-dna). */
export function CampoMultiple<T extends FieldValues>({
  control,
  name,
  label,
  ayuda,
  opciones,
  opcional,
}: Omit<BaseFieldProps<T>, 'placeholder'> & {
  opciones: readonly Opcion[];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const seleccionadas = (field.value as string[]) ?? [];
        const alternar = (valor: string) =>
          field.onChange(
            seleccionadas.includes(valor)
              ? seleccionadas.filter((v) => v !== valor)
              : [...seleccionadas, valor],
          );

        return (
          <FormItem>
            <Etiqueta label={label} ayuda={ayuda} opcional={opcional} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {opciones.map((opcion) => {
                const activa = seleccionadas.includes(opcion.value);
                return (
                  <button
                    key={opcion.value}
                    type="button"
                    onClick={() => alternar(opcion.value)}
                    aria-pressed={activa}
                    className={cn(
                      'flex min-h-[44px] items-center gap-2 rounded-sm border p-3 text-left transition-all',
                      activa
                        ? 'border-kreoon-purple-500/60 bg-kreoon-purple-500/10'
                        : 'border-kreoon-border bg-kreoon-bg-secondary hover:border-kreoon-purple-400/30',
                    )}
                  >
                    <span className="text-lg">{opcion.emoji}</span>
                    <span className="flex-1 text-sm text-kreoon-text-primary">
                      {opcion.label}
                    </span>
                    {activa && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-kreoon-purple-400" />
                    )}
                  </button>
                );
              })}
            </div>
            <FormMessage className="text-xs" />
          </FormItem>
        );
      }}
    />
  );
}
