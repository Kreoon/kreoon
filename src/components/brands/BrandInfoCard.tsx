import { Building2, CheckCircle2, Users, ArrowRightLeft, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { INDUSTRY_DATA } from '@/types/ai-matching';
import type { Brand } from '@/types/brands';

interface BrandInfoCardProps {
  brand: Brand;
  isOwner: boolean;
  onManageMembers: () => void;
  onSwitchBrand: () => void;
  brandCount: number;
}

export function BrandInfoCard({ brand, isOwner, onManageMembers, onSwitchBrand, brandCount }: BrandInfoCardProps) {
  const industryData = brand.industry ? INDUSTRY_DATA[brand.industry as keyof typeof INDUSTRY_DATA] : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.name} className="h-14 w-14 rounded-sm object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold truncate">{brand.name}</h3>
              {brand.is_verified && (
                <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
              )}
              <Badge variant="outline" className="text-xs">
                {brand.plan === 'free' ? 'Free' : brand.plan}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
              {industryData && (
                <span>{industryData.icon} {industryData.name_es}</span>
              )}
              {brand.city && <span>· {brand.city}, {brand.country}</span>}
            </div>

            {brand.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{brand.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {isOwner && (
            <Button size="sm" variant="outline" onClick={onManageMembers} className="gap-2">
              <Users className="h-4 w-4" />
              Miembros
            </Button>
          )}
          {brandCount > 1 && (
            <Button size="sm" variant="ghost" onClick={onSwitchBrand} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Cambiar marca
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
