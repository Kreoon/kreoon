import type { ReactNode } from 'react';
import { useState } from 'react';
import { Check, Star, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DetailSection } from '@/components/crm/DetailSection';

interface FieldDef {
  id: string;
  name: string;
  field_type: string;
  options: string[] | null;
}

interface CustomFieldsSectionProps {
  customFields: Record<string, unknown>;
  fieldDefs: FieldDef[] | undefined;
  onChange?: (key: string, value: unknown) => void;
  configAction?: ReactNode;
}

function formatCurrencyValue(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return String(value ?? '');
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateValue(value: unknown): string {
  if (!value) return '';
  try {
    return format(new Date(String(value)), 'd MMM yyyy', { locale: es });
  } catch {
    return String(value);
  }
}

function formatDatetimeValue(value: unknown): string {
  if (!value) return '';
  try {
    return format(new Date(String(value)), "d MMM yyyy HH:mm", { locale: es });
  } catch {
    return String(value);
  }
}

function FieldStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i < value ? 'text-amber-400 fill-amber-400' : 'text-white/10',
          )}
        />
      ))}
    </div>
  );
}

function PillList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/60 border border-white/10"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded border border-white/20"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-white/50">{color}</span>
    </div>
  );
}

function ReadOnlyField({ fieldDef, value }: { fieldDef: FieldDef; value: unknown }) {
  if (value == null || value === '') return <span className="text-xs text-white/30">--</span>;

  switch (fieldDef.field_type) {
    case 'checkbox':
      return value ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <X className="h-3.5 w-3.5 text-white/20" />
      );

    case 'rating':
      return <FieldStars value={Number(value) || 0} />;

    case 'color':
      return <ColorSwatch color={String(value)} />;

    case 'select':
      return (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {String(value)}
        </span>
      );

    case 'multiselect':
    case 'tags':
      return <PillList items={Array.isArray(value) ? value.map(String) : [String(value)]} />;

    case 'currency':
      return <span className="text-xs text-white/70">{formatCurrencyValue(value)}</span>;

    case 'date':
      return <span className="text-xs text-white/70">{formatDateValue(value)}</span>;

    case 'datetime':
      return <span className="text-xs text-white/70">{formatDatetimeValue(value)}</span>;

    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:underline truncate block"
        >
          {String(value)}
        </a>
      );

    case 'email':
      return (
        <a
          href={`mailto:${String(value)}`}
          className="text-xs text-blue-400 hover:underline truncate block"
        >
          {String(value)}
        </a>
      );

    default:
      return <span className="text-xs text-white/70">{String(value)}</span>;
  }
}

function EditableField({
  fieldDef,
  value,
  onChange,
}: {
  fieldDef: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const [localValue, setLocalValue] = useState(value ?? '');

  const handleBlur = () => {
    onChange(localValue);
  };

  switch (fieldDef.field_type) {
    case 'checkbox':
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center',
            value ? 'bg-purple-500 border-purple-400' : 'bg-white/5 border-white/20',
          )}
        >
          {value && <Check className="h-2.5 w-2.5 text-white" />}
        </button>
      );

    case 'select':
      return (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70 outline-none focus:border-purple-500/50"
        >
          <option value="">--</option>
          {fieldDef.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <Input
          value={String(localValue)}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className="h-7 text-xs bg-white/5 border-white/10"
          type={
            fieldDef.field_type === 'number' || fieldDef.field_type === 'currency'
              ? 'number'
              : fieldDef.field_type === 'date'
                ? 'date'
                : fieldDef.field_type === 'email'
                  ? 'email'
                  : fieldDef.field_type === 'url'
                    ? 'url'
                    : 'text'
          }
        />
      );
  }
}

export function CustomFieldsSection({
  customFields,
  fieldDefs,
  onChange,
  configAction,
}: CustomFieldsSectionProps) {
  if (!fieldDefs || fieldDefs.length === 0) {
    return (
      <DetailSection title="Campos personalizados" action={configAction}>
        <p className="text-xs text-white/30">Sin campos personalizados</p>
      </DetailSection>
    );
  }

  return (
    <DetailSection title="Campos personalizados" action={configAction}>
      <div className="space-y-2">
        {fieldDefs.map((fd) => {
          const value = customFields[fd.id] ?? customFields[fd.name];
          return (
            <div key={fd.id}>
              <p className="text-[10px] text-white/40 mb-0.5">{fd.name}</p>
              {onChange ? (
                <EditableField
                  fieldDef={fd}
                  value={value}
                  onChange={(v) => onChange(fd.id, v)}
                />
              ) : (
                <ReadOnlyField fieldDef={fd} value={value} />
              )}
            </div>
          );
        })}
      </div>
    </DetailSection>
  );
}
