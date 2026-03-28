import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, Shield, ChevronDown, RefreshCw, Instagram, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.3 6.3 0 001.83-4.47V8.76a8.26 8.26 0 004.75 1.5V6.8a4.83 4.83 0 01-1-.11z" />
    </svg>
  );
}

interface InfluencerVerificationBadgeProps {
  creatorProfileId: string;
  isOwner?: boolean;
  variant?: 'default' | 'compact' | 'inline';
  showDetails?: boolean;
}

type VerificationStatus = 'verified' | 'mismatch' | 'pending' | 'error' | 'expired';

interface PlatformVerification {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  is_verified: boolean;
  declared_followers: number;
  actual_followers: number;
  variance_pct: number;
  status: VerificationStatus;
  last_checked_at: string;
}

interface VerificationData {
  profile_id: string;
  is_verified: boolean;
  verified_at: string | null;
  verification_score: number;
  badges: string[];
  platforms: PlatformVerification[];
}

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  instagram: ({ className }) => <Instagram className={className} />,
  tiktok: TikTokIcon,
};

const STATUS_CONFIG: Record<VerificationStatus, { color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  verified: { color: 'text-green-500', bgColor: 'bg-green-500/10', icon: CheckCircle2 },
  mismatch: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: AlertTriangle },
  pending: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Clock },
  error: { color: 'text-red-500', bgColor: 'bg-red-500/10', icon: AlertTriangle },
  expired: { color: 'text-gray-500', bgColor: 'bg-gray-500/10', icon: Clock },
};

const BADGE_LABELS: Record<string, { label: string; icon: typeof Star; color: string }> = {
  fully_verified: { label: 'Completamente verificado', icon: Shield, color: 'text-green-500' },
  verified_creator: { label: 'Creador verificado', icon: CheckCircle2, color: 'text-blue-500' },
  multi_platform: { label: 'Multi-plataforma', icon: Users, color: 'text-purple-500' },
  mega_influencer: { label: 'Mega Influencer (1M+)', icon: Star, color: 'text-amber-400' },
  macro_influencer: { label: 'Macro Influencer (100K+)', icon: Star, color: 'text-amber-500' },
  micro_influencer: { label: 'Micro Influencer (10K+)', icon: Star, color: 'text-blue-400' },
  nano_influencer: { label: 'Nano Influencer (1K+)', icon: Star, color: 'text-gray-400' },
};

export function InfluencerVerificationBadge({
  creatorProfileId,
  isOwner = false,
  variant = 'default',
  showDetails = true,
}: InfluencerVerificationBadgeProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch verification status
  const { data: verificationData, isLoading, error } = useQuery({
    queryKey: ['influencer-verification', creatorProfileId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(`verify-influencer/status/${creatorProfileId}`);
      if (error) throw error;
      return data as VerificationData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Verify mutation (for owners)
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(`verify-influencer/verify/${creatorProfileId}`, {
        method: 'POST',
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['influencer-verification', creatorProfileId] });
      if (data.overall_verified) {
        toast.success('Verificacion completada exitosamente');
      } else {
        toast.warning('Verificacion completada con algunas discrepancias');
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <Clock className="h-3 w-3 mr-1" />
        Cargando...
      </Badge>
    );
  }

  // No verification data
  if (!verificationData || verificationData.platforms.length === 0) {
    if (variant === 'inline' || variant === 'compact') {
      return null;
    }

    return isOwner ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => verifyMutation.mutate()}
        disabled={verifyMutation.isPending}
        className="text-xs"
      >
        {verifyMutation.isPending ? (
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Shield className="h-3 w-3 mr-1" />
        )}
        Verificar cuenta
      </Button>
    ) : null;
  }

  const { is_verified, verification_score, badges, platforms } = verificationData;

  // Compact inline badge (for cards)
  if (variant === 'inline') {
    if (!is_verified) return null;

    return (
      <span className="inline-flex items-center gap-1 text-green-500" title="Creador verificado">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }

  // Compact badge (for headers)
  if (variant === 'compact') {
    return (
      <Badge
        variant="outline"
        className={cn(
          "cursor-pointer transition-colors",
          is_verified
            ? "text-green-500 border-green-500/50 hover:bg-green-500/10"
            : "text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
        )}
        onClick={() => showDetails && setIsOpen(true)}
      >
        {is_verified ? (
          <CheckCircle2 className="h-3 w-3 mr-1" />
        ) : (
          <AlertTriangle className="h-3 w-3 mr-1" />
        )}
        {is_verified ? 'Verificado' : `${verification_score}%`}
      </Badge>
    );
  }

  // Default: Full badge with popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto py-1.5 px-3 gap-2",
            is_verified
              ? "text-green-500 hover:bg-green-500/10"
              : "text-amber-500 hover:bg-amber-500/10"
          )}
        >
          {is_verified ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="font-medium">
            {is_verified ? 'Verificado' : `${verification_score}% verificado`}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Estado de verificacion
            </h4>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
              >
                <RefreshCw className={cn("h-4 w-4", verifyMutation.isPending && "animate-spin")} />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={verification_score} className="h-2" />
            </div>
            <span className="text-sm font-bold">{verification_score}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {is_verified
              ? 'Todas las metricas han sido verificadas'
              : 'Algunas metricas necesitan revision'}
          </p>
        </div>

        {/* Platform breakdown */}
        <div className="p-4 space-y-3">
          <h5 className="text-xs font-medium text-muted-foreground uppercase">
            Plataformas conectadas
          </h5>
          {platforms.map((platform) => {
            const PlatformIcon = PLATFORM_ICONS[platform.platform] || Users;
            const statusConfig = STATUS_CONFIG[platform.status];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={platform.platform}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg",
                  statusConfig.bgColor
                )}
              >
                <div className="flex items-center gap-2 flex-1">
                  <PlatformIcon className="h-4 w-4" />
                  <span className="font-medium capitalize">{platform.platform}</span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">
                    {platform.actual_followers.toLocaleString()}
                  </div>
                  {platform.status === 'mismatch' && (
                    <div className="text-xs text-muted-foreground">
                      Declarado: {platform.declared_followers.toLocaleString()}
                    </div>
                  )}
                </div>
                <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
              </div>
            );
          })}
        </div>

        {/* Earned badges */}
        {badges.length > 0 && (
          <div className="p-4 border-t border-border/50">
            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Insignias ganadas
            </h5>
            <div className="flex flex-wrap gap-1">
              {badges.map((badge) => {
                const badgeInfo = BADGE_LABELS[badge];
                if (!badgeInfo) return null;
                const BadgeIcon = badgeInfo.icon;

                return (
                  <Badge
                    key={badge}
                    variant="secondary"
                    className="text-xs"
                    title={badgeInfo.label}
                  >
                    <BadgeIcon className={cn("h-3 w-3 mr-1", badgeInfo.color)} />
                    {badgeInfo.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Verification note */}
        {verificationData.verified_at && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              Ultima verificacion:{' '}
              {new Date(verificationData.verified_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && !is_verified && (
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <Button
              className="w-full"
              size="sm"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Reverificar metricas
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Actualiza tus cuentas conectadas para verificar tus metricas
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Simple version for use in creator cards
export function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;

  return (
    <span
      className="inline-flex items-center justify-center text-green-500"
      title="Creador verificado"
    >
      <CheckCircle2 className="h-4 w-4" />
    </span>
  );
}
