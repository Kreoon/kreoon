import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Loader2, Search, Send, Star } from 'lucide-react';
import { useLiveHostingHosts } from '@/hooks/useLiveHosting';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { InviteHostPayload } from '@/types/live-hosting.types';

interface InviteHostDialogProps {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CreatorSearchResult {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  slug?: string;
  bio?: string;
  rating_avg?: number;
}

export function InviteHostDialog({
  requestId,
  open,
  onOpenChange,
  onSuccess,
}: InviteHostDialogProps) {
  const { inviteHost, isInviting } = useLiveHostingHosts(requestId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorSearchResult | null>(null);
  const [proposedRate, setProposedRate] = useState(200);
  const [commissionPct, setCommissionPct] = useState<number | undefined>();
  const [message, setMessage] = useState('');

  // Search creators
  const { data: creators = [], isLoading: isSearching } = useQuery({
    queryKey: ['search-creators', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('creator_profiles')
        .select(`
          user_id,
          slug,
          bio,
          rating_avg,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .or(`slug.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) return [];

      return (data || []).map((c: any) => ({
        user_id: c.user_id,
        full_name: c.profiles?.full_name || 'Sin nombre',
        avatar_url: c.profiles?.avatar_url,
        slug: c.slug,
        bio: c.bio,
        rating_avg: c.rating_avg,
      }));
    },
    enabled: searchTerm.length >= 2,
  });

  const handleInvite = async () => {
    if (!selectedCreator) return;

    const payload: InviteHostPayload = {
      request_id: requestId,
      user_id: selectedCreator.user_id,
      proposed_rate_usd: proposedRate,
      commission_on_sales_pct: commissionPct,
      message,
    };

    await inviteHost(payload);
    onOpenChange(false);
    onSuccess?.();

    // Reset form
    setSelectedCreator(null);
    setSearchTerm('');
    setProposedRate(200);
    setCommissionPct(undefined);
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invitar Host</DialogTitle>
          <DialogDescription>
            Busca y selecciona un creador para invitarlo como host
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search or Selected */}
          {!selectedCreator ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar creador por nombre o @usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {isSearching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {creators.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {creators.map((creator) => (
                    <div
                      key={creator.user_id}
                      className="flex items-center gap-3 p-3 rounded-sm border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedCreator(creator)}
                    >
                      <Avatar>
                        <AvatarImage src={creator.avatar_url} />
                        <AvatarFallback>
                          {creator.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{creator.full_name}</p>
                        {creator.slug && (
                          <p className="text-sm text-muted-foreground">@{creator.slug}</p>
                        )}
                      </div>
                      {creator.rating_avg && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {creator.rating_avg.toFixed(1)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && !isSearching && creators.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No se encontraron creadores
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected creator */}
              <div className="flex items-center gap-3 p-3 rounded-sm bg-muted/50">
                <Avatar>
                  <AvatarImage src={selectedCreator.avatar_url} />
                  <AvatarFallback>
                    {selectedCreator.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedCreator.full_name}</p>
                  {selectedCreator.slug && (
                    <p className="text-sm text-muted-foreground">
                      @{selectedCreator.slug}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCreator(null)}
                >
                  Cambiar
                </Button>
              </div>

              {/* Proposal */}
              <div className="space-y-2">
                <Label>Tarifa propuesta (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comisión sobre ventas (opcional)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={commissionPct || ''}
                    onChange={(e) =>
                      setCommissionPct(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="Ej: 5"
                  />
                  <span className="absolute right-3 top-3 text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensaje de invitación</Label>
                <Textarea
                  placeholder="Hola, me gustaría invitarte a ser el host de nuestra transmisión..."
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!selectedCreator || !proposedRate || isInviting}
          >
            {isInviting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Invitación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
