import { useState } from 'react';
import { Shield, Check, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAccountPermissions } from '../../hooks/useAccountPermissions';
import { PlatformIcon } from '../common/PlatformIcon';
import type { SocialAccount, AccountPermission } from '../../types/social.types';
import { toast } from 'sonner';

interface PermissionsManagerProps {
  account: SocialAccount;
  orgMembers: Array<{ user_id: string; full_name: string; avatar_url?: string | null; role: string }>;
}

export function PermissionsManager({ account, orgMembers }: PermissionsManagerProps) {
  const { permissions, grantPermission, revokePermission, isLoading } = useAccountPermissions(account.id);

  const handleTogglePermission = async (
    userId: string,
    field: 'can_view' | 'can_post' | 'can_schedule' | 'can_analytics' | 'can_manage',
    currentValue: boolean
  ) => {
    const existing = permissions.find(p => p.user_id === userId);
    try {
      await grantPermission.mutateAsync({
        account_id: account.id,
        user_id: userId,
        can_view: existing?.can_view ?? true,
        can_post: existing?.can_post ?? false,
        can_schedule: existing?.can_schedule ?? false,
        can_analytics: existing?.can_analytics ?? false,
        can_manage: existing?.can_manage ?? false,
        [field]: !currentValue,
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const permissionFields = [
    { key: 'can_view' as const, label: 'Ver' },
    { key: 'can_post' as const, label: 'Publicar' },
    { key: 'can_schedule' as const, label: 'Programar' },
    { key: 'can_analytics' as const, label: 'Métricas' },
    { key: 'can_manage' as const, label: 'Administrar' },
  ];

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={account.platform} size="sm" showBg />
          <CardTitle className="text-sm">
            {account.platform_display_name || account.platform_username}
          </CardTitle>
          <Shield className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[1fr_repeat(5,48px)] gap-1 mb-2 items-center">
          <span className="text-[10px] text-muted-foreground uppercase">Miembro</span>
          {permissionFields.map(f => (
            <span key={f.key} className="text-[10px] text-muted-foreground text-center">{f.label}</span>
          ))}
        </div>

        {/* Member rows */}
        <div className="space-y-1.5">
          {orgMembers.map(member => {
            const perm = permissions.find(p => p.user_id === member.user_id);
            // Account owner always has full access
            const isOwner = account.user_id === member.user_id;

            return (
              <div key={member.user_id} className="grid grid-cols-[1fr_repeat(5,48px)] gap-1 items-center py-1.5 border-b border-border/50">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate">{member.full_name}</span>
                  {isOwner && (
                    <Badge variant="outline" className="text-[8px] px-1">Owner</Badge>
                  )}
                </div>
                {permissionFields.map(f => (
                  <div key={f.key} className="flex justify-center">
                    {isOwner ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Switch
                        checked={perm?.[f.key] ?? false}
                        onCheckedChange={() =>
                          handleTogglePermission(member.user_id, f.key, perm?.[f.key] ?? false)
                        }
                        className="scale-75"
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
