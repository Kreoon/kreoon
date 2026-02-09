import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Key, Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { useBrandSearch } from '@/hooks/useBrandSearch';
import { INDUSTRY_DATA } from '@/types/ai-matching';
import type { Brand } from '@/types/brands';

interface JoinBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinBrandDialog({ open, onOpenChange }: JoinBrandDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [requestedBrands, setRequestedBrands] = useState<Set<string>>(new Set());

  const { results, isSearching, requestJoin, isRequesting, joinByCode, isJoining } = useBrandSearch(searchTerm);

  const handleRequestJoin = async (brandId: string) => {
    try {
      await requestJoin(brandId);
      setRequestedBrands(prev => new Set(prev).add(brandId));
    } catch {
      // Error handled by mutation
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    try {
      await joinByCode(inviteCode);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const getIndustryLabel = (industry: string | null) => {
    if (!industry) return null;
    const data = INDUSTRY_DATA[industry as keyof typeof INDUSTRY_DATA];
    return data ? `${data.icon} ${data.name_es}` : industry;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unirme a una marca</DialogTitle>
          <DialogDescription>
            Busca una marca por nombre o usa un codigo de invitacion
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-2">
              <Key className="h-4 w-4" />
              Codigo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="search-brand">Buscar marca por nombre</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-brand"
                  placeholder="Escribe el nombre de la marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div className="space-y-2">
                {results.map((brand: Brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{brand.name}</span>
                        {brand.is_verified && (
                          <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {brand.industry && (
                          <span>{getIndustryLabel(brand.industry)}</span>
                        )}
                        {brand.city && <span>· {brand.city}</span>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={requestedBrands.has(brand.id) ? 'secondary' : 'default'}
                      onClick={() => handleRequestJoin(brand.id)}
                      disabled={isRequesting || requestedBrands.has(brand.id)}
                    >
                      {requestedBrands.has(brand.id) ? 'Enviada' : 'Solicitar'}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && searchTerm.length >= 2 && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No se encontraron marcas con ese nombre
              </p>
            )}
          </TabsContent>

          <TabsContent value="code" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Codigo de invitacion</Label>
              <Input
                id="invite-code"
                placeholder="Ej: ABCD-1234"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="font-mono text-center tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el codigo que te compartio el administrador de la marca
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleJoinByCode}
              disabled={!inviteCode.trim() || isJoining}
            >
              {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unirme con codigo
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
