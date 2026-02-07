import { useState } from "react";
import { Eye, Building2, Shield, User, Sparkles, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RootOrgSwitcher } from "@/components/layout/RootOrgSwitcher";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
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
  sidebarCollapsed?: boolean;
}

export function IntegratedNotificationHeader({
  sidebarCollapsed = false
}: IntegratedNotificationHeaderProps) {
  const { user, profile } = useAuth();
  const { isRootAdmin, isImpersonating } = useImpersonation();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div
      className={cn(
        "fixed top-0 right-0 z-40 h-14 flex items-center gap-3 px-4",
        "border-b border-[hsl(270,100%,60%,0.1)]",
        "bg-gradient-to-r from-[hsl(250,20%,4%,0.95)] via-[hsl(250,20%,3%,0.98)] to-[hsl(250,20%,4%,0.95)]",
        "backdrop-blur-xl",
        "transition-all duration-300",
        sidebarCollapsed ? "left-20" : "left-64"
      )}
    >
      {/* Subtle gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(270,100%,60%,0.2)] to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-0 right-1/4 w-40 h-20 bg-[hsl(270,100%,60%,0.03)] rounded-full blur-3xl pointer-events-none" />

      {/* Spacer to push buttons to the right */}
      <div className="flex-1" />

      {/* User Profile Section - Avatar with name */}
      <button
        onClick={() => navigate('/social#profile')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl",
          "bg-[hsl(270,100%,60%,0.05)] hover:bg-[hsl(270,100%,60%,0.1)]",
          "border border-[hsl(270,100%,60%,0.1)] hover:border-[hsl(270,100%,60%,0.2)]",
          "transition-all duration-300 group"
        )}
        aria-label="Ver mi perfil"
      >
        <Avatar className="h-8 w-8 ring-2 ring-[hsl(270,100%,60%,0.2)] group-hover:ring-[hsl(270,100%,60%,0.4)] transition-all">
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'Usuario'} />
          <AvatarFallback className="text-xs bg-[hsl(270,100%,60%,0.2)] text-[hsl(270,100%,80%)]">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-white truncate max-w-[120px]">
            {profile?.full_name || 'Usuario'}
          </span>
          <span className="text-[10px] text-[hsl(270,100%,70%,0.6)]">
            Mi Perfil
          </span>
        </div>
      </button>

      {/* Root Org Switcher - only for root admin */}
      {isRootAdmin && (
        <RootOrgSwitcher />
      )}

      {/* Root Mode Button - only for root admin when inside an org */}
      {isRootAdmin && !isImpersonating && (
        <RootModePopover />
      )}

      {/* Kreoon Social Button - Prominent */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/social')}
        className={cn(
          "gap-2 rounded-xl relative overflow-hidden group",
          "bg-gradient-to-r from-[hsl(270,100%,60%,0.15)] to-[hsl(280,100%,55%,0.1)]",
          "hover:from-[hsl(270,100%,60%,0.25)] hover:to-[hsl(280,100%,55%,0.2)]",
          "border border-[hsl(270,100%,60%,0.3)] hover:border-[hsl(270,100%,60%,0.5)]",
          "text-white hover:text-white",
          "shadow-[0_0_20px_-5px_hsl(270,100%,60%,0.3)]",
          "hover:shadow-[0_0_30px_-5px_hsl(270,100%,60%,0.5)]",
          "transition-all duration-300"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(270,100%,60%,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Globe className="h-4 w-4 text-[hsl(270,100%,70%)] group-hover:text-white transition-colors" />
        <span className="hidden sm:inline font-medium">Kreoon Social</span>
      </Button>
    </div>
  );
}
