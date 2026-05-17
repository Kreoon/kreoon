import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👥</span>
          <h2 className="text-xl font-bold">Grupos de Cuentas</h2>
        </div>
        <Button size="sm" className="rounded-xl" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Grupo
        </Button>
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold">✨ Nuevo grupo</p>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="¿Cómo se llama este grupo?"
              className="flex-1 rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <Button size="sm" className="rounded-xl" onClick={handleCreate} disabled={createGroup.isPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setIsCreating(false); setNewName(''); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">Color:</span>
            {GROUP_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={cn(
                  'w-7 h-7 rounded-full transition-all',
                  newColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-white scale-110'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Groups list */}
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group.id} className="rounded-2xl border-2 border-border/50 bg-card/30 overflow-hidden">
            {/* Group header */}
            <div className="flex items-center gap-3 p-4">
              <div
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: group.color }}
              >
                {group.name.slice(0, 2).toUpperCase()}
              </div>

              {editingId === group.id ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm rounded-lg flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(group.id)}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => handleRename(group.id)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.account_count || 0} cuenta{(group.account_count || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 rounded-lg"
                      onClick={() => { setEditingId(group.id); setEditName(group.name); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 rounded-lg"
                      onClick={() => setManagingId(managingId === group.id ? null : group.id)}
                    >
                      <ChevronDown className={cn('w-4 h-4 transition-transform', managingId === group.id && 'rotate-180')} />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Account membership panel */}
            {managingId === group.id && (
              <div className="px-4 pb-4 border-t border-border/40 pt-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Toca una cuenta para agregarla o quitarla del grupo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {accounts.map(account => {
                    const isMember = group.members?.some(m => m.account_id === account.id);
                    return (
                      <button
                        key={account.id}
                        onClick={() => handleToggleAccount(group, account.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all text-left',
                          isMember
                            ? 'border-green-500/50 bg-green-500/10 text-green-400'
                            : 'border-border/50 bg-card/30 hover:border-border'
                        )}
                      >
                        <PlatformIcon platform={account.platform} size="xs" />
                        <span className="truncate flex-1 text-xs font-medium">
                          {account.platform_display_name || account.platform_username}
                        </span>
                        {isMember && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                  {accounts.length === 0 && (
                    <p className="text-xs text-muted-foreground col-span-2 py-2">
                      Conecta cuentas primero desde la pestaña 🔗 Cuentas
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {groups.length === 0 && !isCreating && (
        <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-12 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">👥</span>
          <p className="font-semibold">¡Sin grupos todavía!</p>
          <p className="text-sm text-muted-foreground">
            Agrupa tus cuentas para publicar en varias a la vez
          </p>
          <Button size="sm" className="rounded-xl mt-2" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> Crear mi primer grupo
          </Button>
        </div>
      )}
    </div>
  );
}
