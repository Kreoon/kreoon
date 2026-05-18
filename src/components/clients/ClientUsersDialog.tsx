import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Users, Search, Plus, Trash2, Crown, Shield, Eye, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  whatsapp_notify: boolean;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface AvailableUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Props {
  clientId: string;
  clientName: string;
  organizationId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  owner:  { label: 'Propietario', icon: Crown,  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  admin:  { label: 'Admin',       icon: Shield, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'  },
  viewer: { label: 'Visor',       icon: Eye,    color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20' },
};

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-amber-500',  'bg-rose-500', 'bg-cyan-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Ícono WhatsApp SVG inline
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export function ClientUsersDialog({ clientId, clientName, organizationId, open, onOpenChange, onUpdate }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('viewer');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      fetchClientUsers();
      fetchAvailableUsers();
    }
  }, [open, clientId]);

  const fetchClientUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_users')
        .select('id, user_id, role, created_at, whatsapp_notify')
        .eq('client_id', clientId);

      if (error) throw error;

      const userIds = data?.map(u => u.user_id) || [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        setUsers(data?.map(u => ({
          ...u,
          whatsapp_notify: (u as any).whatsapp_notify ?? false,
          profile: profiles?.find(p => p.id === u.user_id) || {
            id: u.user_id, full_name: 'Usuario', email: '', avatar_url: null,
          },
        })) || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching client users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!organizationId) { setAvailableUsers([]); return; }
    try {
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('role', 'client');

      if (!orgMembers?.length) { setAvailableUsers([]); return; }

      const currentIds = users.map(u => u.user_id);
      const available = orgMembers.map(m => m.user_id).filter(id => !currentIds.includes(id));
      if (!available.length) { setAvailableUsers([]); return; }

      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, email, avatar_url').in('id', available).order('full_name');
      setAvailableUsers(profiles || []);
    } catch { setAvailableUsers([]); }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .insert({ client_id: clientId, user_id: selectedUserId, role: selectedRole });
      if (error) throw error;
      toast({ title: 'Usuario agregado', description: 'Ya tiene acceso a esta empresa' });
      setSelectedUserId(''); setSelectedRole('viewer'); setShowAddForm(false);
      fetchClientUsers(); onUpdate?.();
    } catch (error: any) {
      toast({
        title: error.code === '23505' ? 'Ya está vinculado' : 'Error',
        description: error.code === '23505' ? 'Este usuario ya pertenece a esta empresa' : 'No se pudo agregar',
        variant: 'destructive',
      });
    } finally { setAdding(false); }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('client_users').update({ role: newRole }).eq('client_id', clientId).eq('user_id', userId);
      if (error) throw error;
      fetchClientUsers(); onUpdate?.();
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el rol', variant: 'destructive' });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('client_users').delete().eq('client_id', clientId).eq('user_id', userId);
      if (error) throw error;
      toast({ title: 'Usuario eliminado', description: 'Ya no tiene acceso a esta empresa' });
      fetchClientUsers(); onUpdate?.();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const handleToggleWhatsApp = async (userId: string, current: boolean) => {
    const name = users.find(u => u.user_id === userId)?.profile.full_name || 'el usuario';
    try {
      const { error } = await supabase
        .from('client_users').update({ whatsapp_notify: !current })
        .eq('client_id', clientId).eq('user_id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, whatsapp_notify: !current } : u));
      toast({
        title: !current ? 'WhatsApp activado' : 'WhatsApp desactivado',
        description: !current
          ? `${name} recibirá avisos por WhatsApp`
          : `${name} ya no recibirá avisos por WhatsApp`,
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(u =>
    u.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const unlinkedUsers = availableUsers.filter(u => !users.some(cu => cu.user_id === u.id));
  const waCount = users.filter(u => u.whatsapp_notify).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-bold">{clientName}</div>
                <div className="text-xs font-normal text-muted-foreground">Gestión de accesos y notificaciones</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Contadores */}
          {!loading && (
            <div className="flex gap-3 mt-4">
              <div className="flex items-center gap-2 rounded-full bg-background/60 border border-border px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{users.length}</span>
                <span className="text-xs text-muted-foreground">personas</span>
              </div>
              <div className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 border',
                waCount > 0
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-background/60 border-border',
              )}>
                <WhatsAppIcon className={cn('h-3.5 w-3.5', waCount > 0 ? 'text-green-400' : 'text-muted-foreground')} />
                <span className={cn('text-sm font-semibold', waCount > 0 ? 'text-green-400' : '')}>{waCount}</span>
                <span className="text-xs text-muted-foreground">reciben WhatsApp</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 space-y-4 flex-1 overflow-hidden flex flex-col">

          {/* Info box */}
          <div className="flex gap-2.5 rounded-lg bg-muted/40 border border-border p-3">
            <WhatsAppIcon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activa el WhatsApp de cada persona para que reciba un aviso automático cuando haya un guión listo para revisar, un video entregado o una corrección pendiente.
            </p>
          </div>

          {/* Buscar + agregar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o email..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5 h-9"
                onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            )}
          </div>

          {/* Formulario agregar */}
          {showAddForm && isAdmin && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium text-primary">Agregar persona a {clientName}</p>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar persona..." />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className={cn('text-[9px] text-white', avatarColor(u.full_name))}>
                            {u.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{u.full_name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {!unlinkedUsers.length && (
                    <div className="p-3 text-sm text-muted-foreground text-center">Sin personas disponibles</div>
                  )}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner"><div className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-amber-500" />Propietario</div></SelectItem>
                  <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-400" />Administrador</div></SelectItem>
                  <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-slate-400" />Visor (solo lectura)</div></SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                <Button size="sm" className="flex-1" onClick={handleAddUser} disabled={adding || !selectedUserId}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}

          {/* Lista */}
          <ScrollArea className="flex-1 min-h-0 pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">Cargando personas...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{searchTerm ? 'Sin resultados' : 'Sin personas vinculadas'}</p>
                <p className="text-xs text-muted-foreground text-center px-4">
                  {searchTerm ? 'Intenta con otro nombre o email' : 'Agrega personas para que puedan ver y recibir notificaciones de esta empresa'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => {
                  const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.viewer;
                  const RoleIcon = roleConf.icon;
                  const initials = user.profile.full_name
                    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

                  return (
                    <div key={user.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">

                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Avatar className="h-11 w-11 ring-2 ring-border">
                          <AvatarImage src={user.profile.avatar_url || undefined} />
                          <AvatarFallback className={cn('text-sm font-bold text-white', avatarColor(user.profile.full_name))}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{user.profile.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.profile.email}</p>
                        </div>
                        {/* Rol */}
                        {isAdmin ? (
                          <Select value={user.role} onValueChange={v => handleUpdateRole(user.user_id, v)}>
                            <SelectTrigger className={cn('h-7 px-2 text-xs border gap-1 w-auto', roleConf.bg, roleConf.color)}>
                              <RoleIcon className="h-3 w-3" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner"><div className="flex items-center gap-2"><Crown className="h-3.5 w-3.5 text-amber-500" />Propietario</div></SelectItem>
                              <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-400" />Admin</div></SelectItem>
                              <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-slate-400" />Visor</div></SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium', roleConf.bg, roleConf.color)}>
                            <RoleIcon className="h-3 w-3" />{roleConf.label}
                          </span>
                        )}
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Quitar acceso?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {user.profile.full_name} ya no podrá ver ni recibir notificaciones de {clientName}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveUser(user.user_id)}
                                  className="bg-destructive text-destructive-foreground">
                                  Quitar acceso
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>

                      {/* Sección WhatsApp */}
                      <div className={cn(
                        'flex items-center justify-between px-4 py-3 border-t transition-colors',
                        user.whatsapp_notify
                          ? 'bg-green-500/8 border-green-500/20'
                          : 'bg-muted/30 border-border',
                      )}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                            user.whatsapp_notify ? 'bg-green-500/15' : 'bg-muted',
                          )}>
                            <WhatsAppIcon className={cn('h-4 w-4', user.whatsapp_notify ? 'text-green-400' : 'text-muted-foreground')} />
                          </div>
                          <div>
                            <p className={cn('text-xs font-semibold', user.whatsapp_notify ? 'text-green-400' : 'text-foreground')}>
                              {user.whatsapp_notify ? 'Recibe avisos por WhatsApp' : 'Sin avisos por WhatsApp'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {user.whatsapp_notify
                                ? 'Guiones · Entregas · Correcciones'
                                : 'Toca el switch para activar'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={user.whatsapp_notify}
                          onCheckedChange={() => handleToggleWhatsApp(user.user_id, user.whatsapp_notify)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
