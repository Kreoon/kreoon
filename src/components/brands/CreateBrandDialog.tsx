import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useBrand } from '@/hooks/useBrand';
import { slugify } from '@/lib/utils/formatters';
import { INDUSTRY_DATA } from '@/types/ai-matching';
import { BunnyImageUploader } from '@/components/marketplace/BunnyImageUploader';
import { marketplaceStoragePath } from '@/hooks/useBunnyImageUpload';

interface CreateBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBrandDialog({ open, onOpenChange }: CreateBrandDialogProps) {
  const navigate = useNavigate();
  const { createBrand, isCreating, canCreateBrand, hasBrand } = useBrand();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [country, setCountry] = useState('CO');
  const [city, setCity] = useState('');
  const [nit, setNit] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(slugify(value));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !industry) return;

    try {
      await createBrand({
        name: name.trim(),
        slug: slug || slugify(name),
        industry,
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        country: country || 'CO',
        city: city.trim() || undefined,
        nit: nit.trim() || undefined,
        logo_url: logoUrl || undefined,
      });
      onOpenChange(false);
      navigate('/client-dashboard');
    } catch {
      // Error handled by mutation
    }
  };

  // If user already has a brand, show message instead of form
  if (!canCreateBrand && hasBrand) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ya tienes una empresa</DialogTitle>
            <DialogDescription>
              Solo puedes crear 1 empresa por cuenta. Si necesitas crear otra marca,
              contacta a soporte para actualizar tu plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-lg max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear mi marca</DialogTitle>
          <DialogDescription>
            Configura tu empresa para comenzar a buscar talento en KREOON
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Nombre de la marca *</Label>
            <Input
              id="brand-name"
              placeholder="Ej: Mi Empresa SAS"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            {slug && (
              <p className="text-xs text-muted-foreground">
                URL: kreoon.com/brand/<span className="font-mono">{slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Logo de la marca</Label>
            <BunnyImageUploader
              mode="single"
              value={logoUrl}
              onChange={setLogoUrl}
              getStoragePath={(file) => marketplaceStoragePath('brand-logo', slug || `temp-${Date.now()}`, file)}
              aspectRatio="square"
              height="h-28"
              maxSizeMB={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-industry">Industria *</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="brand-industry">
                <SelectValue placeholder="Selecciona tu industria" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INDUSTRY_DATA).map(([key, data]) => (
                  <SelectItem key={key} value={key}>
                    {data.icon} {data.name_es}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-description">Descripcion</Label>
            <Textarea
              id="brand-description"
              placeholder="Describe brevemente tu marca..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-website">Sitio web</Label>
            <Input
              id="brand-website"
              placeholder="https://www.ejemplo.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-country">Pais</Label>
              <Input
                id="brand-country"
                placeholder="CO"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-city">Ciudad</Label>
              <Input
                id="brand-city"
                placeholder="Ej: Medellin"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-nit">NIT / Documento fiscal</Label>
            <Input
              id="brand-nit"
              placeholder="Opcional"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || !industry || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear marca
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
