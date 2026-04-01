import { Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  BLOCK_DEFINITIONS,
  type ProfileBlock,
  type BlockStyles,
} from './types/profile-builder';

interface BlockSettingsPanelProps {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}

// ─── Subcomponentes de campos ────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ─── Tab Contenido: campos genéricos según config ───────────────────────────

function ContentFields({
  block,
  onUpdate,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}) {
  const definition = BLOCK_DEFINITIONS[block.type];

  const handleConfigChange = (key: string, value: unknown) => {
    onUpdate({ config: { ...block.config, [key]: value } });
  };

  const configEntries = Object.entries(definition.defaultConfig);

  if (configEntries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Este bloque no tiene opciones de contenido configurables.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {configEntries.map(([key, defaultValue]) => {
        const currentValue = block.config[key] ?? defaultValue;

        if (typeof defaultValue === 'boolean') {
          return (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`config-${key}`} className="text-xs capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Label>
              <Switch
                id={`config-${key}`}
                checked={Boolean(currentValue)}
                onCheckedChange={(checked) => handleConfigChange(key, checked)}
              />
            </div>
          );
        }

        if (typeof defaultValue === 'number') {
          return (
            <FieldRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()}>
              <Input
                type="number"
                value={String(currentValue)}
                onChange={(e) => handleConfigChange(key, Number(e.target.value))}
                className="h-8 text-xs"
              />
            </FieldRow>
          );
        }

        // string: texto libre o selector si es enum conocido
        return (
          <FieldRow key={key} label={key.replace(/([A-Z])/g, ' $1').trim()}>
            <Input
              value={String(currentValue)}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              className="h-8 text-xs"
            />
          </FieldRow>
        );
      })}
    </div>
  );
}

// ─── Tab Estilos: edición de BlockStyles ────────────────────────────────────

const PADDING_OPTIONS: BlockStyles['padding'][] = ['none', 'sm', 'md', 'lg', 'xl'];
const SHADOW_OPTIONS: BlockStyles['shadow'][] = ['none', 'sm', 'md', 'lg'];
const RADIUS_OPTIONS: BlockStyles['borderRadius'][] = ['none', 'sm', 'md', 'lg', 'full'];
const WIDTH_OPTIONS: BlockStyles['width'][] = ['full', 'wide', 'normal', 'narrow'];

function OptionPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: (T | undefined)[];
  value: T | undefined;
  onChange: (val: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.filter(Boolean).map((opt) => (
          <button
            key={opt as string}
            onClick={() => onChange(opt as T)}
            className={cn(
              'px-2 py-0.5 rounded-sm border text-[11px] transition-colors',
              value === opt
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function StyleFields({
  block,
  onUpdate,
}: {
  block: ProfileBlock;
  onUpdate: (updates: Partial<ProfileBlock>) => void;
}) {
  const handleStyleChange = (updates: Partial<BlockStyles>) => {
    onUpdate({ styles: { ...block.styles, ...updates } });
  };

  return (
    <div className="space-y-4">
      <OptionPills
        label="Padding"
        options={PADDING_OPTIONS}
        value={block.styles.padding}
        onChange={(v) => handleStyleChange({ padding: v })}
      />

      <OptionPills
        label="Margen"
        options={PADDING_OPTIONS}
        value={block.styles.margin}
        onChange={(v) => handleStyleChange({ margin: v })}
      />

      <OptionPills
        label="Sombra"
        options={SHADOW_OPTIONS}
        value={block.styles.shadow}
        onChange={(v) => handleStyleChange({ shadow: v })}
      />

      <OptionPills
        label="Esquinas"
        options={RADIUS_OPTIONS}
        value={block.styles.borderRadius}
        onChange={(v) => handleStyleChange({ borderRadius: v })}
      />

      <OptionPills
        label="Ancho"
        options={WIDTH_OPTIONS}
        value={block.styles.width}
        onChange={(v) => handleStyleChange({ width: v })}
      />

      <FieldRow label="Color de fondo">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={block.styles.backgroundColor ?? '#ffffff'}
            onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
            className="h-8 w-10 rounded-sm border border-border cursor-pointer bg-transparent"
            aria-label="Color de fondo del bloque"
          />
          <Input
            value={block.styles.backgroundColor ?? ''}
            placeholder="e.g. #ffffff o transparent"
            onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
            className="h-8 text-xs flex-1"
          />
        </div>
      </FieldRow>

      <FieldRow label="Color de texto">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={block.styles.textColor ?? '#000000'}
            onChange={(e) => handleStyleChange({ textColor: e.target.value })}
            className="h-8 w-10 rounded-sm border border-border cursor-pointer bg-transparent"
            aria-label="Color de texto del bloque"
          />
          <Input
            value={block.styles.textColor ?? ''}
            placeholder="e.g. #000000"
            onChange={(e) => handleStyleChange({ textColor: e.target.value })}
            className="h-8 text-xs flex-1"
          />
        </div>
      </FieldRow>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function BlockSettingsPanel({ block, onUpdate }: BlockSettingsPanelProps) {
  const definition = BLOCK_DEFINITIONS[block.type];

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{definition.label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{definition.description}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="rounded-none border-b border-border bg-transparent h-9 px-4 w-full justify-start gap-0">
          <TabsTrigger
            value="content"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
          >
            Contenido
          </TabsTrigger>
          <TabsTrigger
            value="styles"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3"
          >
            Estilos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 mt-0">
          <ContentFields block={block} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="styles" className="flex-1 overflow-y-auto p-4 mt-0">
          <StyleFields block={block} onUpdate={onUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
