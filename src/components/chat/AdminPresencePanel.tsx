import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Circle,
  Clock,
  MapPin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getPrimaryRole, getRoleLabelShort, getRoleBadgeColor } from '@/lib/roles';
import type { AppRole } from '@/types/database';

interface UserPresence {
  user_id: string;
  is_online: boolean;
  current_page: string | null;
  last_activity: string;
  last_seen: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  roles?: string[];
}

export function AdminPresencePanel() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPresence = async () => {
    try {
      const { data: presence } = await supabase
        .from('user_presence')
        .select('*')
        .order('last_activity', { ascending: false });

      if (!presence) {
        setUsers([]);
        return;
      }

      // Fetch profiles
      const userIds = presence.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Fetch roles from organization_member_roles
      const { data: roles } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const usersWithDetails = presence.map(p => ({
        ...p,
        profile: profiles?.find(pr => pr.id === p.user_id),
        roles: roles?.filter(r => r.user_id === p.user_id).map(r => r.role) || []
      }));

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching presence:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    fetchPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          fetchPresence();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPresence, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAdmin]);

  const onlineUsers = users.filter(u => u.is_online);
  const offlineUsers = users.filter(u => !u.is_online);

  const getRoleBadgeColorFn = (roles: string[]) => {
    const primary = getPrimaryRole(roles as AppRole[]);
    return primary ? getRoleBadgeColor(primary) : '';
  };

  const getRoleLabelFn = (roles: string[]) => {
    const primary = getPrimaryRole(roles as AppRole[]);
    return primary ? getRoleLabelShort(primary) : 'Usuario';
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Usuarios en Línea
          <Badge variant="secondary" className="ml-auto">
            {onlineUsers.length} activos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-success text-success" />
                  En línea ({onlineUsers.length})
                </h4>
                {onlineUsers.map(u => (
                  <div 
                    key={u.user_id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.profile?.avatar_url || ''} />
                        <AvatarFallback>
                          {u.profile?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-success text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {u.profile?.full_name || 'Usuario'}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', getRoleBadgeColorFn(u.roles || []))}
                        >
                          {getRoleLabelFn(u.roles || [])}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{u.current_page || 'Desconocido'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Offline Users */}
            {offlineUsers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground" />
                  Desconectados ({offlineUsers.length})
                </h4>
                {offlineUsers.map(u => (
                  <div 
                    key={u.user_id} 
                    className="flex items-center gap-3 p-2 rounded-lg opacity-60"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={u.profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {u.profile?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {u.profile?.full_name || 'Usuario'}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', getRoleBadgeColorFn(u.roles || []))}
                        >
                          {getRoleLabelFn(u.roles || [])}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Visto {formatDistanceToNow(new Date(u.last_seen), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {users.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de presencia</p>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
