import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Building2, CheckCircle2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { INDUSTRY_DATA } from '@/types/ai-matching';
import { useBrand } from '@/hooks/useBrand';
import { cn } from '@/lib/utils';

interface BrandSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandSwitcherDialog({ open, onOpenChange }: BrandSwitcherDialogProps) {
  const { brands, activeBrand, switchBrand } = useBrand();

  const handleSelect = async (brandId: string) => {
    await switchBrand(brandId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar marca</DialogTitle>
          <DialogDescription>Selecciona la marca con la que deseas operar</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {brands.map(brand => {
            const isActive = activeBrand?.id === brand.id;
            const industryData = brand.industry ? INDUSTRY_DATA[brand.industry as keyof typeof INDUSTRY_DATA] : null;

            return (
              <button
                key={brand.id}
                onClick={() => handleSelect(brand.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-sm border transition-colors text-left",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                )}
              >
                <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt="" className="h-10 w-10 rounded-sm object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{brand.name}</span>
                    {brand.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                  </div>
                  {industryData && (
                    <span className="text-xs text-muted-foreground">{industryData.icon} {industryData.name_es}</span>
                  )}
                </div>

                {isActive && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
