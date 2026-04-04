import { memo, useState } from 'react';
import { Plus, Trash2, Check, Star, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '../types/profile-builder';
import { TextFormatPopup, useTextFormatPopup } from '../TextFormatPopup';

// Renderiza HTML sanitizado
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'span', 'p', 'br'],
    ALLOWED_ATTR: ['style', 'class'],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

interface PricingPackage {
  id: string;
  name: string;
  price: string;
  currency: string;
  features: string[];
  isPopular?: boolean;
}

interface PricingConfig {
  layout: 'cards' | 'carousel' | 'horizontal' | 'list';
  columns: '1' | '2' | '3' | '4';
  showCurrency: boolean;
}

interface PricingContent {
  title?: string;
  subtitle?: string;
  packages?: PricingPackage[];
}

const DEFAULT_PACKAGES: PricingPackage[] = [
  {
    id: '1',
    name: 'Basico',
    price: '200',
    currency: 'USD',
    features: ['1 video UGC', 'Entrega en 5 dias', '1 revision'],
    isPopular: false,
  },
  {
    id: '2',
    name: 'Estandar',
    price: '400',
    currency: 'USD',
    features: ['3 videos UGC', 'Entrega en 7 dias', '2 revisiones', 'Licencia comercial'],
    isPopular: true,
  },
  {
    id: '3',
    name: 'Premium',
    price: '700',
    currency: 'USD',
    features: [
      '5 videos UGC',
      'Entrega en 10 dias',
      '3 revisiones',
      'Licencia comercial',
      'Soporte prioritario',
    ],
    isPopular: false,
  },
];

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
};

// Clases de columnas segun configuracion
const COLUMNS_CLASSES: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 md:grid-cols-2',
  '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

function getColumnsClass(columns: string | number | undefined): string {
  if (!columns) return COLUMNS_CLASSES['3'];
  const key = String(columns);
  return COLUMNS_CLASSES[key] || COLUMNS_CLASSES['3'];
}

// ─── Pricing Card Component ─────────────────────────────────────────────────

interface PricingCardProps {
  pkg: PricingPackage;
  config: PricingConfig;
  isEditing: boolean;
  isSelected: boolean;
  onUpdatePackage: (id: string, updates: Partial<PricingPackage>) => void;
  onRemovePackage: (id: string) => void;
  onAddFeature: (pkgId: string) => void;
  onRemoveFeature: (pkgId: string, index: number) => void;
  newFeature: string;
  onNewFeatureChange: (value: string) => void;
  compact?: boolean;
}

function PricingCard({
  pkg,
  config,
  isEditing,
  isSelected,
  onUpdatePackage,
  onRemovePackage,
  onAddFeature,
  onRemoveFeature,
  newFeature,
  onNewFeatureChange,
  compact = false,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border flex flex-col gap-4 transition-shadow hover:shadow-lg flex-shrink-0',
        compact ? 'p-4 min-w-[260px]' : 'p-6',
        pkg.isPopular
          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/50 bg-card/50',
      )}
    >
      {/* Badge popular */}
      {pkg.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            <Star className="h-3 w-3 fill-current" />
            Popular
          </span>
        </div>
      )}

      {/* Nombre y toggle popular */}
      <div>
        {isEditing && isSelected ? (
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={pkg.name}
              onChange={(e) => onUpdatePackage(pkg.id, { name: e.target.value })}
              placeholder="Nombre del paquete"
              className="font-semibold bg-transparent border-border/50"
            />
            <button
              onClick={() => onUpdatePackage(pkg.id, { isPopular: !pkg.isPopular })}
              className={cn(
                'flex-shrink-0 p-1.5 rounded transition-colors',
                pkg.isPopular
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-primary',
              )}
              aria-label="Marcar como popular"
            >
              <Star className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <h3 className="font-semibold text-foreground text-lg mb-1">{pkg.name}</h3>
        )}

        {/* Precio */}
        <div className="flex items-baseline gap-1">
          {config.showCurrency && (
            <span className="text-muted-foreground text-sm">
              {isEditing && isSelected ? (
                <Input
                  value={pkg.currency}
                  onChange={(e) => onUpdatePackage(pkg.id, { currency: e.target.value })}
                  className="w-16 h-6 text-xs bg-transparent border-border/50 p-1"
                />
              ) : (
                pkg.currency
              )}
            </span>
          )}
          {isEditing && isSelected ? (
            <Input
              value={pkg.price}
              onChange={(e) => onUpdatePackage(pkg.id, { price: e.target.value })}
              placeholder="0"
              className="text-3xl font-bold w-28 bg-transparent border-border/50 p-1 h-auto"
            />
          ) : (
            <span className={cn('font-bold text-foreground', compact ? 'text-2xl' : 'text-3xl')}>
              {pkg.price}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className={cn('flex flex-col gap-2 flex-1', compact && 'text-sm')}>
        {pkg.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            {isEditing && isSelected ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => {
                    const newFeatures = [...pkg.features];
                    newFeatures[index] = e.target.value;
                    onUpdatePackage(pkg.id, { features: newFeatures });
                  }}
                  className="text-sm text-muted-foreground bg-transparent border-none flex-1 focus:outline-none focus:ring-1 focus:ring-primary rounded min-w-0"
                />
                <button
                  onClick={() => onRemoveFeature(pkg.id, index)}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">{feature}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Agregar feature */}
      {isEditing && isSelected && (
        <div className="flex gap-2">
          <Input
            value={newFeature}
            onChange={(e) => onNewFeatureChange(e.target.value)}
            placeholder="Nueva caracteristica"
            className="text-xs bg-transparent border-border/50 h-7"
            onKeyDown={(e) => e.key === 'Enter' && onAddFeature(pkg.id)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddFeature(pkg.id)}
            className="h-7 px-2 flex-shrink-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Button
        className={cn('w-full mt-2', compact && 'h-9')}
        variant={pkg.isPopular ? 'default' : 'outline'}
      >
        Contratar
      </Button>

      {isEditing && isSelected && (
        <button
          onClick={() => onRemovePackage(pkg.id)}
          className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Carousel Layout ────────────────────────────────────────────────────────

interface CarouselLayoutProps {
  packages: PricingPackage[];
  config: PricingConfig;
  isEditing: boolean;
  isSelected: boolean;
  cardProps: Omit<PricingCardProps, 'pkg' | 'compact' | 'newFeature' | 'onNewFeatureChange'>;
  newFeatures: Record<string, string>;
  setNewFeature: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

function CarouselLayout({ packages, config, isEditing, isSelected, cardProps, newFeatures, setNewFeature }: CarouselLayoutProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Usar config.columns para determinar cuantos elementos mostrar a la vez
  const columnsNum = parseInt(config.columns, 10) || 3;
  const visibleCount = Math.min(columnsNum, packages.length);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex + visibleCount < packages.length;

  return (
    <div className="relative group/carousel">
      {canGoPrev && (
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canGoNext && (
        <button
          onClick={() => setCurrentIndex((i) => Math.min(packages.length - visibleCount, i + 1))}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="flex gap-4 overflow-hidden">
        {packages.slice(currentIndex, currentIndex + visibleCount).map((pkg) => (
          <div key={pkg.id} className="flex-1 min-w-0">
            <PricingCard
              {...cardProps}
              pkg={pkg}
              compact
              newFeature={newFeatures[pkg.id] || ''}
              onNewFeatureChange={(v) => setNewFeature((prev) => ({ ...prev, [pkg.id]: v }))}
            />
          </div>
        ))}
      </div>

      {packages.length > visibleCount && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: packages.length - visibleCount + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                currentIndex === i ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function PricingBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = {
    layout: 'cards',
    columns: '3',
    showCurrency: true,
    ...block.config,
  } as PricingConfig;
  const content = block.content as PricingContent;
  const styles = block.styles;
  const packages = content.packages || DEFAULT_PACKAGES;
  const [newFeature, setNewFeature] = useState<Record<string, string>>({});

  const {
    isOpen,
    editingField,
    editingContent,
    openEditor,
    closeEditor,
  } = useTextFormatPopup();

  const handleContentUpdate = (updates: Partial<PricingContent>) => {
    onUpdate({ content: { ...content, ...updates } });
  };

  const handleSave = (newContent: string) => {
    if (editingField) {
      handleContentUpdate({ [editingField]: newContent });
    }
    closeEditor();
  };

  const handleUpdatePackage = (id: string, updates: Partial<PricingPackage>) => {
    const newPackages = packages.map((pkg) =>
      pkg.id === id ? { ...pkg, ...updates } : pkg
    );
    handleContentUpdate({ packages: newPackages });
  };

  const handleAddFeature = (pkgId: string) => {
    const feature = newFeature[pkgId];
    if (!feature?.trim()) return;
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    handleUpdatePackage(pkgId, { features: [...pkg.features, feature.trim()] });
    setNewFeature((prev) => ({ ...prev, [pkgId]: '' }));
  };

  const handleRemoveFeature = (pkgId: string, featureIndex: number) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    handleUpdatePackage(pkgId, {
      features: pkg.features.filter((_, i) => i !== featureIndex),
    });
  };

  const handleAddPackage = () => {
    const newPkg: PricingPackage = {
      id: crypto.randomUUID(),
      name: 'Nuevo paquete',
      price: '0',
      currency: 'USD',
      features: ['Caracteristica 1'],
      isPopular: false,
    };
    handleContentUpdate({ packages: [...packages, newPkg] });
  };

  const handleRemovePackage = (id: string) => {
    handleContentUpdate({ packages: packages.filter((pkg) => pkg.id !== id) });
  };

  return (
    <div
      className={cn('rounded-lg', paddingClasses[styles.padding || 'md'])}
      style={{ backgroundColor: styles.backgroundColor, color: styles.textColor }}
    >
      {/* Encabezado - Editable con TextFormatPopup */}
      <div className="text-center mb-8">
        {/* Titulo */}
        <div
          className={cn(
            'group relative mb-2',
            isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md py-1 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('title', content.title || 'Precios y Paquetes')}
        >
          {isHtml(content.title || '') ? (
            <SafeHtml
              html={content.title || 'Precios y Paquetes'}
              className="text-xl md:text-2xl font-bold text-foreground"
            />
          ) : (
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {content.title || 'Precios y Paquetes'}
            </h2>
          )}
          {isEditing && isSelected && (
            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Subtitulo */}
        <div
          className={cn(
            'group relative',
            isEditing && isSelected && 'cursor-pointer hover:bg-primary/5 rounded-md py-1 transition-colors'
          )}
          onClick={() => isEditing && isSelected && openEditor('subtitle', content.subtitle || '')}
        >
          {content.subtitle ? (
            isHtml(content.subtitle) ? (
              <SafeHtml html={content.subtitle} className="text-muted-foreground text-sm" />
            ) : (
              <p className="text-muted-foreground text-sm">{content.subtitle}</p>
            )
          ) : (
            <span className="text-muted-foreground/50 text-sm italic">
              {isEditing ? 'Haz clic para agregar descripcion...' : 'Elige el paquete que mejor se adapte a tus necesidades'}
            </span>
          )}
          {isEditing && isSelected && (
            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Renderizado segun layout */}
      {config.layout === 'carousel' ? (
        <CarouselLayout
          packages={packages}
          config={config}
          isEditing={isEditing}
          isSelected={isSelected}
          cardProps={{
            config,
            isEditing,
            isSelected,
            onUpdatePackage: handleUpdatePackage,
            onRemovePackage: handleRemovePackage,
            onAddFeature: handleAddFeature,
            onRemoveFeature: handleRemoveFeature,
          }}
          newFeatures={newFeature}
          setNewFeature={setNewFeature}
        />
      ) : config.layout === 'list' ? (
        // Layout lista vertical compacta
        <div className="flex flex-col gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                'relative rounded-lg border p-4 flex items-center gap-4 transition-shadow hover:shadow-md',
                pkg.isPopular
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 bg-card/50',
              )}
            >
              {pkg.isPopular && (
                <span className="absolute -top-2 right-4 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Popular
                </span>
              )}

              <div className="flex-1 min-w-0">
                {isEditing && isSelected ? (
                  <Input
                    value={pkg.name}
                    onChange={(e) => handleUpdatePackage(pkg.id, { name: e.target.value })}
                    className="font-semibold bg-transparent border-border/50 h-8 mb-1"
                  />
                ) : (
                  <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                )}
                <p className="text-sm text-muted-foreground truncate">
                  {pkg.features.slice(0, 2).join(' • ')}
                  {pkg.features.length > 2 && ` +${pkg.features.length - 2} mas`}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  {config.showCurrency && (
                    <span className="text-xs text-muted-foreground">{pkg.currency}</span>
                  )}
                  {isEditing && isSelected ? (
                    <Input
                      value={pkg.price}
                      onChange={(e) => handleUpdatePackage(pkg.id, { price: e.target.value })}
                      className="text-xl font-bold w-20 bg-transparent border-border/50 h-8 text-right"
                    />
                  ) : (
                    <span className="text-xl font-bold text-foreground block">{pkg.price}</span>
                  )}
                </div>
                <Button size="sm" variant={pkg.isPopular ? 'default' : 'outline'}>
                  Contratar
                </Button>
              </div>

              {isEditing && isSelected && (
                <button
                  onClick={() => handleRemovePackage(pkg.id)}
                  className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : config.layout === 'horizontal' ? (
        // Layout horizontal scroll - ancho de tarjetas basado en columnas
        (() => {
          const cols = parseInt(config.columns, 10) || 3;
          const widthClass = cols === 1 ? 'w-full' : cols === 2 ? 'w-[calc(50%-0.5rem)]' : cols === 3 ? 'w-[calc(33.333%-0.67rem)]' : 'w-[calc(25%-0.75rem)]';
          return (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
              {packages.map((pkg) => (
                <div key={pkg.id} className={cn('flex-shrink-0 snap-start', widthClass)}>
                  <PricingCard
                    pkg={pkg}
                    config={config}
                    isEditing={isEditing}
                    isSelected={isSelected}
                    onUpdatePackage={handleUpdatePackage}
                    onRemovePackage={handleRemovePackage}
                    onAddFeature={handleAddFeature}
                    onRemoveFeature={handleRemoveFeature}
                    newFeature={newFeature[pkg.id] || ''}
                    onNewFeatureChange={(v) => setNewFeature((prev) => ({ ...prev, [pkg.id]: v }))}
                    compact
                  />
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        // Layout cards (grid) - default
        <div className={cn('grid gap-6', getColumnsClass(config.columns))}>
          {packages.map((pkg) => (
            <PricingCard
              key={pkg.id}
              pkg={pkg}
              config={config}
              isEditing={isEditing}
              isSelected={isSelected}
              onUpdatePackage={handleUpdatePackage}
              onRemovePackage={handleRemovePackage}
              onAddFeature={handleAddFeature}
              onRemoveFeature={handleRemoveFeature}
              newFeature={newFeature[pkg.id] || ''}
              onNewFeatureChange={(v) => setNewFeature((prev) => ({ ...prev, [pkg.id]: v }))}
            />
          ))}
        </div>
      )}

      {isEditing && isSelected && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddPackage}
          className="mt-6 gap-1"
        >
          <Plus className="h-4 w-4" />
          Agregar paquete
        </Button>
      )}

      {/* Editor Popup */}
      <TextFormatPopup
        open={isOpen}
        onOpenChange={(open) => !open && closeEditor()}
        initialContent={editingContent}
        onSave={handleSave}
        title={editingField === 'title' ? 'Editar titulo' : 'Editar descripcion'}
        placeholder={editingField === 'title' ? 'Titulo de precios...' : 'Descripcion de tus paquetes...'}
        mode={editingField === 'subtitle' ? 'block' : 'inline'}
      />
    </div>
  );
}

export const PricingBlock = memo(PricingBlockComponent);
