import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Check, X, Copy, Key, Loader2, UserMinus, Crown, Shield, User } from 'lucide-react';
import { useBrandMembers } from '@/hooks/useBrandMembers';
import { useBrand } from '@/hooks/useBrand';
import { toast } from 'sonner';
import type { BrandMemberWithProfile } from '@/types/brands';

interface BrandMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Miembro', icon: User, color: 'text-muted-foreground' },
};

function MemberRow({ member, isOwnerView, onRemove }: { member: BrandMemberWithProfile; isOwnerView: boolean; onRemove?: () => void }) {
  const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
  const Icon = config.icon;
  const initials = member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={member.profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.profile?.full_name || member.profile?.email || 'Usuario'}</p>
        <p className="text-xs text-muted-foreground truncate">{member.profile?.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 text-xs">
          <Icon className={`h-3 w-3 ${config.color}`} />
          {config.label}
        </Badge>
        {isOwnerView && member.role !== 'owner' && onRemove && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}>
            <UserMinus className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function BrandMembersDialog({ open, onOpenChange }: BrandMembersDialogProps) {
  const { activeBrand, isOwner } = useBrand();
  const { activeMembers, pendingRequests, isLoading, acceptMember, rejectMember, removeMember, generateInviteCode } = useBrandMembers(activeBrand?.id || null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(activeBrand?.invite_code || null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    const code = await generateInviteCode();
    if (code) setGeneratedCode(code);
    setIsGenerating(false);
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success('Codigo copiado');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-md max-h-[80dvh] sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Miembros de {activeBrand?.name}</DialogTitle>
          <DialogDescription>Gestiona el equipo de tu marca</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Solicitudes pendientes ({pendingRequests.length})</h4>
                <div className="space-y-2">
                  {pendingRequests.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-sm border bg-amber-500/5 border-amber-500/20">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.profile?.full_name || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.profile?.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-400" onClick={() => acceptMember(member.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => rejectMember(member.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="mt-4" />
              </div>
            )}

            {/* Active members */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Miembros activos ({activeMembers.length})</h4>
              <div className="space-y-1">
                {activeMembers.map(member => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOwnerView={isOwner}
                    onRemove={() => removeMember(member.id)}
                  />
                ))}
              </div>
            </div>

            {/* Invite code section (owner only) */}
            {isOwner && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Codigo de invitacion
                  </h4>
                  {generatedCode ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={generatedCode}
                        readOnly
                        className="font-mono text-center tracking-widest"
                      />
                      <Button size="icon" variant="outline" onClick={handleCopyCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={handleGenerateCode} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      Generar codigo de invitacion
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Comparte este codigo para que otros usuarios se unan directamente a tu marca
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
