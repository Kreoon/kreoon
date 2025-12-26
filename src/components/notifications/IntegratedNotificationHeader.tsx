import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle, Briefcase, Eye, Building2, Shield, User, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RootOrgSwitcher } from "@/components/layout/RootOrgSwitcher";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation, useImpersonationData, ImpersonationTarget } from "@/contexts/ImpersonationContext";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useToast } from "@/hooks/use-toast";
import { AppRole } from "@/types/database";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
const ROLE_OPTIONS: { value: AppRole; label: string; defaultRoute: string }[] = [
  { value: 'admin', label: 'Administrador', defaultRoute: '/' },
  { value: 'strategist', label: 'Estratega', defaultRoute: '/strategist-dashboard' },
  { value: 'creator', label: 'Creador', defaultRoute: '/creator-dashboard' },
  { value: 'editor', label: 'Editor', defaultRoute: '/editor-dashboard' },
  { value: 'client', label: 'Cliente', defaultRoute: '/client-dashboard' },
  { value: 'ambassador', label: 'Embajador', defaultRoute: '/creator-dashboard' },
];

const QUICK_PRESETS = [
  { label: 'Cliente', role: 'client' as AppRole, route: '/client-dashboard' },
  { label: 'Creador', role: 'creator' as AppRole, route: '/creator-dashboard' },
  { label: 'Editor', role: 'editor' as AppRole, route: '/editor-dashboard' },
  { label: 'Estratega', role: 'strategist' as AppRole, route: '/strategist-dashboard' },
  { label: 'Admin', role: 'admin' as AppRole, route: '/' },
];

function RootModePopover() {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const { clients, users, loading } = useImpersonationData();
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);

  const handleQuickPreset = async (preset: typeof QUICK_PRESETS[0]) => {
    setIsStarting(true);
    try {
      const userWithRole = users.find(u => u.roles.includes(preset.role));
      let clientForPreset = null;
      if (preset.role === 'client' && clients.length > 0) {
        clientForPreset = clients[0];
      }

      const target: ImpersonationTarget = {
        clientId: clientForPreset?.id || null,
        clientName: clientForPreset?.name || null,
        role: preset.role,
        userId: userWithRole?.id || null,
        userName: userWithRole?.full_name || null,
      };
      await startImpersonation(target);
      setOpen(false);
      navigate(preset.route);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartCustom = async () => {
    if (!selectedRole) return;
    setIsStarting(true);
    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      const selectedUser = users.find(u => u.id === selectedUserId);
      
      const target: ImpersonationTarget = {
        clientId: selectedClientId || null,
        clientName: selectedClient?.name || null,
        role: selectedRole,
        userId: selectedUserId || null,
        userName: selectedUser?.full_name || null,
      };
      await startImpersonation(target);
      setOpen(false);
      
      const roleConfig = ROLE_OPTIONS.find(r => r.value === selectedRole);
      if (roleConfig) {
        navigate(roleConfig.defaultRoute);
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Modo Root</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-sm">Modo Simulación</h3>
              <p className="text-xs text-muted-foreground">Ver plataforma como otro usuario</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Acceso rápido
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset(preset)}
                  disabled={isStarting || loading}
                  className="text-xs h-7"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Selection */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Configuración personalizada</Label>
            
            {/* Client */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Negocio
              </Label>
              <Select 
                value={selectedClientId || '__none__'} 
                onValueChange={(v) => setSelectedClientId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin negocio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin negocio</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Rol
              </Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Usuario (opcional)
              </Label>
              <Select 
                value={selectedUserId || '__none__'} 
                onValueChange={(v) => setSelectedUserId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Genérico" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="__none__">Genérico</SelectItem>
                  {users.slice(0, 30).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStartCustom}
              disabled={!selectedRole || isStarting || loading}
              className="w-full h-8 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Iniciar simulación
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface IntegratedNotificationHeaderProps {
  onChatClick: () => void;
  isChatOpen: boolean;
  unreadChatCount?: number;
  sidebarCollapsed?: boolean;
}

export function IntegratedNotificationHeader({ 
  onChatClick, 
  isChatOpen, 
  unreadChatCount = 0,
  sidebarCollapsed = false 
}: IntegratedNotificationHeaderProps) {
  const { user, profile } = useAuth();
  const { isRootAdmin, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playNotificationSound, playChatSound, playUrgentSound } = useNotificationSound();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isChatAnimating, setIsChatAnimating] = useState(false);
  const prevChatRef = useRef(0);

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-header')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play sound and animate
          if (newNotification.type === 'payment' || newNotification.type === 'assignment') {
            playUrgentSound();
          } else {
            playNotificationSound();
          }
          
          // Trigger animation
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 1500);

          // Show toast for important notifications
          toast({
            title: `${getNotificationIcon(newNotification.type)} ${newNotification.title}`,
            description: newNotification.message,
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, playNotificationSound, playUrgentSound, toast]);

  // Helper function for notification icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'content': return '🎬';
      case 'assignment': return '📋';
      case 'payment': return '💰';
      case 'chat': return '💬';
      default: return '🔔';
    }
  };

  // Handle chat notification animation and sound
  useEffect(() => {
    if (unreadChatCount > prevChatRef.current && unreadChatCount > 0) {
      playChatSound();
      setIsChatAnimating(true);
      setTimeout(() => setIsChatAnimating(false), 1500);
    }
    prevChatRef.current = unreadChatCount;
  }, [unreadChatCount, playChatSound]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    const count = data?.filter(n => !n.is_read).length || 0;
    setUnreadCount(count);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setNotificationOpen(false);
    }
  };

  if (!user) return null;

  const totalUnread = unreadCount + unreadChatCount;

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 z-40 h-14 flex items-center gap-2 px-4 border-b border-border bg-background/95 backdrop-blur-sm transition-all duration-300",
        sidebarCollapsed ? "left-20" : "left-64"
      )}
    >
      {/* Spacer to push buttons to the right */}
      <div className="flex-1" />

      {/* Profile Button with Avatar - navigates to user's social profile */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(user?.id ? `/p/${user.id}` : '/portfolio')}
        className="gap-2 px-2"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline text-sm font-medium">
          @{profile?.username || profile?.full_name?.split(' ')[0]?.toLowerCase() || 'usuario'}
        </span>
      </Button>

      {/* Root Org Switcher - only for root admin */}
      {isRootAdmin && (
        <RootOrgSwitcher />
      )}

      {/* Root Mode Button - only for root admin when inside an org */}
      {isRootAdmin && !isImpersonating && (
        <RootModePopover />
      )}

      {/* Portfolio Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/portfolio')}
        className="gap-2"
      >
        <Briefcase className="h-4 w-4" />
        <span className="hidden sm:inline">Portafolio</span>
      </Button>
      
      {/* Chat Button */}
      <Button
        variant={isChatOpen ? "default" : "outline"}
        size="sm"
        onClick={onChatClick}
        className={cn(
          "relative gap-2 transition-all duration-300",
          isChatOpen && "bg-primary text-primary-foreground",
          isChatAnimating && "animate-pulse ring-2 ring-blue-500",
          !isChatOpen && unreadChatCount > 0 && "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
        )}
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Chat</span>
        {unreadChatCount > 0 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "ml-1 bg-blue-500 text-white text-xs px-1.5 py-0",
              isChatAnimating && "animate-bounce"
            )}
          >
            {unreadChatCount > 9 ? '9+' : unreadChatCount}
          </Badge>
        )}
      </Button>

      {/* Notification Button */}
      <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "relative gap-2 transition-all duration-300",
              isAnimating && "animate-pulse ring-2 ring-primary",
              unreadCount > 0 && "border-primary bg-primary/10 hover:bg-primary/20"
            )}
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificaciones</span>
            {unreadCount > 0 && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0",
                  isAnimating && "animate-bounce"
                )}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0 shadow-2xl border-border/50 bg-card/95 backdrop-blur-md" 
          align="end"
          sideOffset={8}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Notificaciones</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} nuevas
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 h-7"
              >
                Marcar todas
              </Button>
            )}
          </div>
          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm font-medium">Sin notificaciones</p>
                <p className="text-xs text-muted-foreground/70">Te avisaremos cuando haya novedades</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-all duration-200",
                      !notification.is_read && "bg-primary/5 border-l-4 border-primary"
                    )}
                  >
                    <div className="flex gap-3">
                      <span className="text-xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          !notification.is_read ? "font-semibold text-foreground" : "text-foreground/80"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: es
                          })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="h-3 w-3 rounded-full bg-primary flex-shrink-0 mt-1 animate-pulse" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
