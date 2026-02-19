import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccountGroups } from '../../hooks/useAccountGroups';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { PlatformIcon } from '../common/PlatformIcon';
import { GROUP_COLORS } from '../../config/constants';
import type { AccountGroup } from '../../types/social.types';
import { toast } from 'sonner';

export function GroupsManager() {
  const { groups, createGroup, updateGroup, deleteGroup, addAccountToGroup, removeAccountFromGroup } = useAccountGroups();
  const { accounts } = useSocialAccounts();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [managingId, setManagingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createGroup.mutateAsync({ name: newName, color: newColor });
      setIsCreating(false);
      setNewName('');
      toast.success('Grupo creado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateGroup.mutateAsync({ id, name: editName });
      setEditingId(null);
      toast.success('Grupo actualizado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      toast.success('Grupo eliminado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleAccount = async (group: AccountGroup, accountId: string) => {
    const existing = group.members?.find(m => m.account_id === accountId);
    try {
      if (existing) {
        await removeAccountFromGroup.mutateAsync(existing.id);
      } else {
        await addAccountToGroup.mutateAsync({ groupId: group.id, accountId });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Grupos de Cuentas
        </h3>
        <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Grupo
        </Button>
      </div>

      {/* Create form */}
      {isCreating && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del grupo..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <Button size="sm" onClick={handleCreate} disabled={createGroup.isPending}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-1.5">
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={cn(
                    'w-6 h-6 rounded-full transition-all',
                    newColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups list */}
      {groups.map(group => (
        <Card key={group.id} className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
              {editingId === group.id ? (
                <div className="flex gap-1 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(group.id)}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(group.id)}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <CardTitle className="text-sm flex-1">{group.name}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.account_count || 0} cuentas
                  </Badge>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditingId(group.id); setEditName(group.name); }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => setManagingId(managingId === group.id ? null : group.id)}
                  >
                    <FolderOpen className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-red-400"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          {/* Account management */}
          {managingId === group.id && (
            <CardContent className="pt-2 space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase">
                Selecciona cuentas para este grupo
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {accounts.map(account => {
                  const isMember = group.members?.some(m => m.account_id === account.id);
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleToggleAccount(group, account.id)}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm transition-all text-left',
                        isMember
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:border-primary/30'
                      )}
                    >
                      <PlatformIcon platform={account.platform} size="xs" />
                      <span className="truncate text-xs">
                        {account.platform_display_name || account.platform_username}
                      </span>
                      {isMember && <Check className="w-3 h-3 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {groups.length === 0 && !isCreating && (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <FolderOpen className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Organiza tus cuentas en grupos para publicar más rápido.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
