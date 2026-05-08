import { useState, useEffect } from 'react';
import { Search, Link2, Building2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailableBrands, useLinkBrand } from '@/hooks/useBrandOrgLinks';
import type { UnifiedClientEntity } from '@/types/unifiedClient.types';

interface LinkBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  /** Lista de empresas existentes en la org (para el modo fusión) */
  orgCompanies: Array<{ id: string; name: string }>;
  /** Si se abre desde un cliente específico, inicia en modo fusión con ese cliente preseleccionado */
  preselectedClientId?: string;
}

export function LinkBrandDialog({ open, onOpenChange, orgId, orgCompanies, preselectedClientId }: LinkBrandDialogProps) {
  const [tab, setTab] = useState<'vincular' | 'fusionar'>(preselectedClientId ? 'fusionar' : 'vincular');
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedOrgClientId, setSelectedOrgClientId] = useState<string | null>(preselectedClientId ?? null);

  // Sincronizar preselectedClientId cuando el dialog se abre con un cliente ya elegido
  useEffect(() => {
    if (open && preselectedClientId) {
      setTab('fusionar');
      setSelectedOrgClientId(preselectedClientId);
    }
  }, [open, preselectedClientId]);

  // En tab "fusionar" se incluyen brands ya vinculadas via junction,
  // porque el objetivo es asignar una brand existente a un cliente manual de la org.
  const { data: brands = [], isLoading: loadingBrands } = useAvailableBrands(orgId, search, tab === 'fusionar');
  const { mutate: linkBrand, isPending: linking } = useLinkBrand();

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  // Companies without brand_id already set (available for merge)
  const mergeCandidates = orgCompanies;

  const handleLink = () => {
    if (!selectedBrandId) return;
    linkBrand(
      {
        brandId: selectedBrandId,
        orgId,
        existingOrgClientId: tab === 'fusionar' && selectedOrgClientId ? selectedOrgClientId : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedBrandId(null);
          setSelectedOrgClientId(null);
          setSearch('');
        },
      },
    );
  };

  const canConfirm =
    !!selectedBrandId &&
    (tab === 'vincular' || (tab === 'fusionar' && !!selectedOrgClientId));

  // Cuando se abre desde una tarjeta concreta, solo mostrar el modo Fusionar
  const isFusionMode = !!preselectedClientId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {isFusionMode ? 'Fusionar cliente con Brand' : 'Vincular Brand'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => { setTab(v as 'vincular' | 'fusionar'); setSelectedBrandId(null); }}>
          {/* Tabs solo visibles cuando NO se abre desde una tarjeta */}
          {!isFusionMode && (
          <TabsList className="w-full">
            <TabsTrigger value="vincular" className="flex-1 text-xs">
              Vincular brand nueva
            </TabsTrigger>
            <TabsTrigger value="fusionar" className="flex-1 text-xs">
              Fusionar con cliente existente
            </TabsTrigger>
          </TabsList>
          )}

          {/* ===== TAB VINCULAR ===== */}
          <TabsContent value="vincular" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              La brand independiente aparecerá en tu lista de clientes, compartiendo su información y contenido.
            </p>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar brand por nombre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>

            <ScrollArea className="h-52 rounded-sm border border-border">
              {loadingBrands ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : brands.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
                  <Building2 className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    {search ? 'No se encontraron brands con ese nombre' : 'No hay brands disponibles para vincular'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {brands.map(brand => (
                    <button
                      key={brand.id}
                      onClick={() => setSelectedBrandId(prev => prev === brand.id ? null : brand.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                        selectedBrandId === brand.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                      }`}
                    >
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded-sm object-cover ring-1 ring-border" />
                      ) : (
                        <div className="h-8 w-8 rounded-sm bg-primary/10 flex items-center justify-center ring-1 ring-border flex-shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{brand.name}</p>
                        <p className="text-xs text-muted-foreground">@{brand.slug}</p>
                      </div>
                      {selectedBrandId === brand.id && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 flex-shrink-0">
                          Seleccionada
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ===== TAB FUSIONAR ===== */}
          <TabsContent value="fusionar" className="space-y-3 mt-3">
            <div className="flex gap-2 p-2.5 rounded-sm border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                El cliente existente quedará <strong>vinculado a la brand</strong>. Esto es irreversible sin desvincular.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">1. Selecciona el cliente existente en tu org</p>
              <Select value={selectedOrgClientId ?? ''} onValueChange={setSelectedOrgClientId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seleccionar empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {mergeCandidates.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">2. Busca la brand a vincular</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar brand..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>

              <ScrollArea className="h-40 rounded-sm border border-border">
                {loadingBrands ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : brands.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground">No hay brands disponibles</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {brands.map(brand => (
                      <button
                        key={brand.id}
                        onClick={() => setSelectedBrandId(prev => prev === brand.id ? null : brand.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                          selectedBrandId === brand.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt={brand.name} className="h-7 w-7 rounded-sm object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                        <span className="text-sm truncate">{brand.name}</span>
                        {selectedBrandId === brand.id && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 ml-auto flex-shrink-0">
                            ✓
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview de lo que se va a vincular */}
        {selectedBrand && (
          <div className="flex items-center gap-2 p-2.5 rounded-sm border border-border bg-muted/30 text-xs">
            <Link2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">
              {tab === 'vincular'
                ? <>Vincular <strong className="text-foreground">{selectedBrand.name}</strong> a esta organización</>
                : <>Fusionar con <strong className="text-foreground">{selectedBrand.name}</strong></>
              }
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!canConfirm || linking}
            onClick={handleLink}
            className="gap-1.5"
          >
            {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            {tab === 'vincular' ? 'Vincular' : 'Fusionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
