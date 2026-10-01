import { useState } from "react";
import { Briefcase, Eye, Building2, Shield, User, Sparkles, Zap, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isProductionOnlyTalent } from "@/lib/creatorScope";
import { MobileNotificationsBell } from "@/components/notifications/MobileNotificationsBell";
import { useImpersonation, useImpersonationData, ImpersonationTarget } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AppRole } from "@/types/database";

const ROLE_OPTIONS: { value: AppRole; label: string; defaultRoute: string }[] = [
  { value: 'admin', label: 'Administrador', defaultRoute: '/' },
  { value: 'team_leader', label: 'Líder de Equipo', defaultRoute: '/dashboard' },
  { value: 'strategist', label: 'Estratega', defaultRoute: '/strategist-dashboard' },
  { value: 'trafficker', label: 'Trafficker', defaultRoute: '/marketing' },
  { value: 'creator', label: 'Creador', defaultRoute: '/creator-dashboard' },
  { value: 'editor', label: 'Editor', defaultRoute: '/editor-dashboard' },
  { value: 'client', label: 'Cliente', defaultRoute: '/client-dashboard' },
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
          aria-label="Modo Root"
          className="h-10 gap-2 rounded-full border-warning/60 bg-warning/15 px-4 text-foreground hover:bg-warning/25"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Modo Root</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border bg-warning/10">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-foreground" />
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
  sidebarCollapsed?: boolean;
  topOffset?: number; // Offset in pixels when there's a banner above
}

export function IntegratedNotificationHeader({
  sidebarCollapsed = false,
  topOffset = 0
}: IntegratedNotificationHeaderProps) {
  const { user, profile, roles, isPlatformAdmin } = useAuth();
  const { isRootAdmin, isImpersonating } = useImpersonation();
  const productionOnly = !isPlatformAdmin && isProductionOnlyTalent(roles);

  // Lo que ven las marcas: su perfil del marketplace. Sin perfil aún → configurarlo.
  const openMyPublicProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('creator_profiles').select('id').eq('user_id', user.id).maybeSingle();
    navigate(data?.id ? `/marketplace/creator/${data.id}` : '/settings?section=marketplace');
  };
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <div
      className={cn(
        "fixed right-0 z-40 h-14 flex items-center gap-3 px-4",
        "bg-background border-b border-border",
        "transition-none", /* Removes transition delay that causes glitches on mobile */
        sidebarCollapsed ? "md:left-[104px] left-0" : "md:left-[288px] left-0"
      )}
      style={{ top: topOffset }}
    >

      {/* Spacer to push buttons to the right */}
      <div className="flex-1" />

      {/* User Profile Section - Avatar with name */}
      <button
        onClick={productionOnly ? openMyPublicProfile : () => navigate('/settings?section=marketplace')}
        className={cn(
          "group flex h-10 items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-4",
          "hover:bg-[hsl(var(--surface-hover))]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors duration-150"
        )}
        aria-label={productionOnly ? 'Ver mi perfil público' : 'Ver mi perfil'}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
          <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="max-w-[140px] truncate text-sm font-medium text-foreground">
            {profile?.full_name || 'Usuario'}
          </span>
          <span className="text-xs text-muted-foreground">
            {productionOnly ? 'Ver mi perfil público' : 'Mi Perfil'}
          </span>
        </div>
      </button>

      {/* Root Mode Button - only for root admin when inside an org */}
      {isRootAdmin && !isImpersonating && (
        <RootModePopover />
      )}

      {/* Notificaciones: para creador/editor reemplaza a Kiro (que ya no se muestra) */}
      {productionOnly && (
        <MobileNotificationsBell className="h-10 w-10 rounded-full border border-border bg-card hover:bg-[hsl(var(--surface-hover))]" />
      )}

      {/* Marketplace — creador/editor no lo exploran; su perfil público se abre desde su nombre */}
      {!productionOnly && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/marketplace')}
        className="h-10 gap-2 rounded-full border-border bg-card px-4 text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors duration-150"
        aria-label="Marketplace"
      >
        <Briefcase className="h-4 w-4 text-[hsl(var(--text-secondary))]" aria-hidden="true" />
        <span className="hidden sm:inline font-medium">Marketplace</span>
      </Button>
      )}

      {/* Theme Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
        className="h-10 w-10 rounded-full border-border bg-card text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface-hover))] hover:text-foreground transition-colors"
        title={theme === 'dark' ? 'Cambiar a Claro' : theme === 'light' ? 'Cambiar a Sistema' : 'Cambiar a Oscuro'}
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : theme === 'light' ? 'Cambiar a tema del sistema' : 'Cambiar a tema oscuro'}
      >
        {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
      </Button>
    </div>
  );
}
