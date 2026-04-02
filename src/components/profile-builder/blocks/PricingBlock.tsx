import { memo, useState } from 'react';
import { Plus, Trash2, Check, Star, Pencil } from 'lucide-react';
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
  layout: 'cards' | 'table';
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

function PricingBlockComponent({ block, isEditing, isSelected, onUpdate }: BlockProps) {
  const config = block.config as PricingConfig;
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

      {/* Cards layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={cn(
              'relative rounded-xl border p-6 flex flex-col gap-4 transition-shadow hover:shadow-lg',
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

            {/* Nombre y toggle popular en edicion */}
            <div>
              {isEditing && isSelected ? (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={pkg.name}
                    onChange={(e) => handleUpdatePackage(pkg.id, { name: e.target.value })}
                    placeholder="Nombre del paquete"
                    className="font-semibold bg-transparent border-border/50"
                  />
                  <button
                    onClick={() => handleUpdatePackage(pkg.id, { isPopular: !pkg.isPopular })}
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
                        onChange={(e) =>
                          handleUpdatePackage(pkg.id, { currency: e.target.value })
                        }
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
                    onChange={(e) => handleUpdatePackage(pkg.id, { price: e.target.value })}
                    placeholder="0"
                    className="text-3xl font-bold w-28 bg-transparent border-border/50 p-1 h-auto"
                  />
                ) : (
                  <span className="text-3xl font-bold text-foreground">{pkg.price}</span>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-2 flex-1">
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
                          handleUpdatePackage(pkg.id, { features: newFeatures });
                        }}
                        className="text-sm text-muted-foreground bg-transparent border-none flex-1 focus:outline-none focus:ring-1 focus:ring-primary rounded min-w-0"
                      />
                      <button
                        onClick={() => handleRemoveFeature(pkg.id, index)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        aria-label="Eliminar caracteristica"
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

            {/* Agregar feature en edicion */}
            {isEditing && isSelected && (
              <div className="flex gap-2">
                <Input
                  value={newFeature[pkg.id] || ''}
                  onChange={(e) =>
                    setNewFeature((prev) => ({ ...prev, [pkg.id]: e.target.value }))
                  }
                  placeholder="Nueva caracteristica"
                  className="text-xs bg-transparent border-border/50 h-7"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFeature(pkg.id)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddFeature(pkg.id)}
                  className="h-7 px-2 flex-shrink-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}

            <Button
              className={cn(
                'w-full mt-2',
                pkg.isPopular ? 'bg-primary hover:bg-primary/90' : 'variant-outline',
              )}
              variant={pkg.isPopular ? 'default' : 'outline'}
            >
              Contratar
            </Button>

            {isEditing && isSelected && (
              <button
                onClick={() => handleRemovePackage(pkg.id)}
                className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Eliminar paquete ${pkg.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

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
