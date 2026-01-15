import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Edit2, Trash2, Sparkles, Loader2, Users, Award, Calendar, 
  Trophy, Star, Shield, Crown, Gem, Swords, Flame, Castle, ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UnifiedRewardsManagerProps {
  organizationId?: string;
}

// Types for achievements
const CONDITION_TYPES = [
  { value: 'completions', label: 'Contenidos Completados' },
  { value: 'early_deliveries', label: 'Entregas a Tiempo' },
  { value: 'consecutive', label: 'Racha Consecutiva' },
  { value: 'total_points', label: 'Puntos Totales' },
  { value: 'days_active', label: 'Días Activo' },
  { value: 'level_reached', label: 'Nivel Alcanzado' },
  { value: 'rank', label: 'Posición en Ranking' }
];

// Badge types for organization badges
const BADGE_TYPES = [
  { value: 'ambassador', label: 'Embajador', icon: Crown },
  { value: 'verified', label: 'Verificado', icon: Shield },
  { value: 'vip', label: 'VIP', icon: Star },
  { value: 'expert', label: 'Experto', icon: Trophy },
  { value: 'elite', label: 'Elite', icon: Gem }
];

const RARITY_OPTIONS = [
  { value: 'common', label: 'Común', color: 'text-muted-foreground', bg: 'border-muted-foreground/30 bg-muted/20' },
  { value: 'uncommon', label: 'Poco Común', color: 'text-green-500', bg: 'border-green-500/30 bg-green-500/10' },
  { value: 'rare', label: 'Raro', color: 'text-cyan-500', bg: 'border-cyan-500/30 bg-cyan-500/10' },
  { value: 'legendary', label: 'Legendario', color: 'text-amber-500', bg: 'border-amber-500/30 bg-amber-500/10' }
];

const LEVEL_OPTIONS = [
  { value: 'bronze', label: 'Bronce', color: 'text-orange-600' },
  { value: 'silver', label: 'Plata', color: 'text-slate-400' },
  { value: 'gold', label: 'Oro', color: 'text-yellow-500' },
  { value: 'diamond', label: 'Diamante', color: 'text-cyan-400' }
];

const ICON_OPTIONS = ['🏆', '⭐', '🎯', '🔥', '💎', '👑', '⚔️', '🛡️', '🎖️', '🏅', '🌟', '💫', '🚀', '🎪', '🎭'];

// Gaming category config for achievements
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; description: string }> = {
  completion: { label: 'Conquistas', icon: Swords, description: 'Por completar contenido' },
  punctuality: { label: 'Velocidad', icon: Flame, description: 'Por entregar a tiempo' },
  streak: { label: 'Rachas', icon: Crown, description: 'Por mantener consistencia' },
  points: { label: 'Tesoros', icon: Star, description: 'Por acumular puntos' },
  special: { label: 'Especiales', icon: Castle, description: 'Logros únicos' },
  level: { label: 'Ascensos', icon: Shield, description: 'Por subir de nivel' },
  general: { label: 'General', icon: Trophy, description: 'Logros generales' },
};

export function UnifiedRewardsManager({ organizationId }: UnifiedRewardsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('achievements');
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [generatedIconUrl, setGeneratedIconUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Form data for achievements
  const [achievementForm, setAchievementForm] = useState({
    key: '',
    name: '',
    description: '',
    icon: '🏆',
    rarity: 'common',
    category: 'general',
    condition_type: 'completions',
    condition_value: 1,
    points_required: 0
  });

  // Form data for organization badges
  const [badgeForm, setBadgeForm] = useState({
    user_id: '',
    badge: 'ambassador' as string,
    level: 'bronze' as string,
    reason: ''
  });

  // Fetch achievements
  const { data: achievements = [], isLoading: loadingAchievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch organization badges with holders
  const { data: orgBadges = [], isLoading: loadingBadges } = useQuery({
    queryKey: ['org-badges', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_member_badges')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('granted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId
  });

  // Fetch users for badge assignment
  const { data: users = [] } = useQuery({
    queryKey: ['org-users', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles:user_id (id, full_name, avatar_url, email)
        `)
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data?.map(d => d.profiles).filter(Boolean) || [];
    },
    enabled: !!organizationId
  });

  // Fetch ALL unlocks (full history)
  const { data: allUnlocks = [], isLoading: loadingUnlocks } = useQuery({
    queryKey: ['all-unlocks-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          id,
          user_id,
          achievement_id,
          unlocked_at,
          profiles:user_id (full_name, avatar_url),
          achievements:achievement_id (name, icon, rarity, category)
        `)
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch ALL badge grants history
  const { data: allBadgeGrants = [], isLoading: loadingBadgeGrants } = useQuery({
    queryKey: ['all-badge-grants-history', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_member_badges')
        .select(`
          id,
          user_id,
          badge,
          level,
          granted_at,
          granted_by,
          is_active,
          profiles:user_id (full_name, avatar_url),
          granted_by_profile:granted_by (full_name)
        `)
        .eq('organization_id', organizationId)
        .order('granted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId
  });

  // Fetch achievement holders count
  const { data: holdersCounts = {} } = useQuery({
    queryKey: ['achievement-holders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(ua => {
        counts[ua.achievement_id] = (counts[ua.achievement_id] || 0) + 1;
      });
      return counts;
    }
  });

  // Mutations for achievements
  const createAchievementMutation = useMutation({
    mutationFn: async (achievement: typeof achievementForm) => {
      const { error } = await supabase.from('achievements').insert(achievement);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast({ title: 'Logro creado exitosamente' });
      setIsCreating(false);
      resetAchievementForm();
    },
    onError: () => {
      toast({ title: 'Error al crear logro', variant: 'destructive' });
    }
  });

  const updateAchievementMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('achievements').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast({ title: 'Logro actualizado' });
      setEditingItem(null);
      resetAchievementForm();
    },
    onError: () => {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  });

  const deleteAchievementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('achievements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast({ title: 'Logro eliminado' });
    },
    onError: () => {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  });

  // Mutations for organization badges
  const grantBadgeMutation = useMutation({
    mutationFn: async (badge: typeof badgeForm) => {
      const { error } = await supabase.from('organization_member_badges').insert({
        user_id: badge.user_id,
        organization_id: organizationId,
        badge: badge.badge,
        level: badge.level,
        granted_by: (await supabase.auth.getUser()).data.user?.id,
        is_active: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-badges'] });
      toast({ title: 'Insignia otorgada exitosamente' });
      setIsCreating(false);
      resetBadgeForm();
    },
    onError: (e) => {
      console.error(e);
      toast({ title: 'Error al otorgar insignia', variant: 'destructive' });
    }
  });

  const revokeBadgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_member_badges')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-badges'] });
      toast({ title: 'Insignia revocada' });
    },
    onError: () => {
      toast({ title: 'Error al revocar', variant: 'destructive' });
    }
  });

  const resetAchievementForm = () => {
    setAchievementForm({
      key: '',
      name: '',
      description: '',
      icon: '🏆',
      rarity: 'common',
      category: 'general',
      condition_type: 'completions',
      condition_value: 1,
      points_required: 0
    });
    setGeneratedIconUrl(null);
  };

  const resetBadgeForm = () => {
    setBadgeForm({
      user_id: '',
      badge: 'ambassador',
      level: 'bronze',
      reason: ''
    });
  };

  const openEditAchievement = (achievement: any) => {
    setAchievementForm({
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      rarity: achievement.rarity,
      category: achievement.category,
      condition_type: achievement.condition_type,
      condition_value: achievement.condition_value,
      points_required: achievement.points_required || 0
    });
    setEditingItem(achievement);
    if (achievement.icon?.startsWith('data:') || achievement.icon?.startsWith('http')) {
      setGeneratedIconUrl(achievement.icon);
    } else {
      setGeneratedIconUrl(null);
    }
  };

  const handleSubmitAchievement = () => {
    const iconToSave = generatedIconUrl || achievementForm.icon;
    const dataToSave = { ...achievementForm, icon: iconToSave };
    
    if (editingItem) {
      updateAchievementMutation.mutate({ id: editingItem.id, ...dataToSave });
    } else {
      createAchievementMutation.mutate(dataToSave);
    }
  };

  const generateIconWithAI = async () => {
    if (!achievementForm.name) {
      toast({ title: 'Por favor ingresa un nombre para el logro', variant: 'destructive' });
      return;
    }

    setIsGeneratingIcon(true);
    try {
      const response = await supabase.functions.invoke('generate-achievement-icon', {
        body: {
          name: achievementForm.name,
          description: achievementForm.description,
          rarity: achievementForm.rarity
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.imageUrl) {
        setGeneratedIconUrl(response.data.imageUrl);
        toast({ title: 'Icono generado con IA' });
      } else {
        throw new Error('No se recibió imagen');
      }
    } catch (error) {
      console.error('Error generating icon:', error);
      toast({ 
        title: 'Error al generar icono', 
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
        variant: 'destructive' 
      });
    } finally {
      setIsGeneratingIcon(false);
    }
  };

  const renderIcon = (icon: string) => {
    if (icon?.startsWith('data:') || icon?.startsWith('http')) {
      return <img src={icon} alt="Icon" className="w-full h-full object-cover rounded-full" />;
    }
    return <span className="text-2xl">{icon}</span>;
  };

  const getBadgeIcon = (badgeType: string) => {
    const type = BADGE_TYPES.find(b => b.value === badgeType);
    const Icon = type?.icon || Shield;
    return <Icon className="w-4 h-4" />;
  };

  // Stats
  const totalAchievements = achievements.length;
  const totalBadges = orgBadges.length;
  const totalUnlocks = Object.values(holdersCounts).reduce((a, b) => a + b, 0);
  const legendaryCount = achievements.filter(a => a.rarity === 'legendary').length;

  if (loadingAchievements || loadingBadges) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAchievements}</p>
                <p className="text-sm text-muted-foreground">Logros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBadges}</p>
                <p className="text-sm text-muted-foreground">Insignias Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Award className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUnlocks}</p>
                <p className="text-sm text-muted-foreground">Desbloqueos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 bg-gradient-to-br from-amber-400/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-400/20">
                <Gem className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{legendaryCount}</p>
                <p className="text-sm text-muted-foreground">Legendarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Logros ({totalAchievements})
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Insignias ({totalBadges})
            </TabsTrigger>
            <TabsTrigger value="holders" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Poseedores
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Actividad
            </TabsTrigger>
          </TabsList>

          <Dialog open={isCreating} onOpenChange={(open) => { setIsCreating(open); if (!open) { resetAchievementForm(); resetBadgeForm(); } }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'badges' ? 'Otorgar Insignia' : 'Nuevo Logro'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {activeTab === 'badges' ? 'Otorgar Insignia' : 'Crear Nuevo Logro'}
                </DialogTitle>
                <DialogDescription>
                  {activeTab === 'badges' 
                    ? 'Otorga una insignia especial a un miembro de la organización'
                    : 'Define las condiciones para desbloquear este logro'}
                </DialogDescription>
              </DialogHeader>
              
              {activeTab === 'badges' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Usuario</Label>
                    <Select value={badgeForm.user_id} onValueChange={(v) => setBadgeForm(prev => ({ ...prev, user_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un usuario" />
                      </SelectTrigger>
                      <SelectContent>
                        {(users as any[]).map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="text-xs">{user.full_name?.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              {user.full_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Insignia</Label>
                      <Select value={badgeForm.badge} onValueChange={(v) => setBadgeForm(prev => ({ ...prev, badge: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BADGE_TYPES.map(badge => (
                            <SelectItem key={badge.value} value={badge.value}>
                              <div className="flex items-center gap-2">
                                <badge.icon className="w-4 h-4" />
                                {badge.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nivel</Label>
                      <Select value={badgeForm.level} onValueChange={(v) => setBadgeForm(prev => ({ ...prev, level: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              <span className={level.color}>{level.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                    <Button onClick={() => grantBadgeMutation.mutate(badgeForm)} disabled={!badgeForm.user_id}>
                      Otorgar Insignia
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Key (único)</Label>
                      <Input 
                        value={achievementForm.key}
                        onChange={(e) => setAchievementForm(prev => ({ ...prev, key: e.target.value }))}
                        placeholder="ej: first_delivery"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input 
                        value={achievementForm.name}
                        onChange={(e) => setAchievementForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Primera Entrega"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea 
                      value={achievementForm.description}
                      onChange={(e) => setAchievementForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Completa tu primera entrega de contenido"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Icono</Label>
                      <div className="flex gap-2">
                        {generatedIconUrl ? (
                          <div className="relative">
                            <div className="h-10 w-10 rounded-lg border overflow-hidden bg-muted">
                              <img src={generatedIconUrl} alt="Generated icon" className="w-full h-full object-cover" />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground"
                              onClick={() => setGeneratedIconUrl(null)}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <Select value={achievementForm.icon} onValueChange={(v) => setAchievementForm(prev => ({ ...prev, icon: v }))}>
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ICON_OPTIONS.map(icon => (
                                <SelectItem key={icon} value={icon}>
                                  <span className="text-xl">{icon}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateIconWithAI}
                          disabled={isGeneratingIcon || !achievementForm.name}
                          className="flex-1"
                        >
                          {isGeneratingIcon ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando...</>
                          ) : (
                            <><Sparkles className="w-4 h-4 mr-2" />Generar con IA</>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Rareza</Label>
                      <Select value={achievementForm.rarity} onValueChange={(v) => setAchievementForm(prev => ({ ...prev, rarity: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RARITY_OPTIONS.map(r => (
                            <SelectItem key={r.value} value={r.value}>
                              <span className={r.color}>{r.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Input 
                        value={achievementForm.category}
                        onChange={(e) => setAchievementForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="general"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Condición</Label>
                      <Select value={achievementForm.condition_type} onValueChange={(v) => setAchievementForm(prev => ({ ...prev, condition_type: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_TYPES.map(ct => (
                            <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Requerido</Label>
                      <Input 
                        type="number"
                        value={achievementForm.condition_value}
                        onChange={(e) => setAchievementForm(prev => ({ ...prev, condition_value: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Puntos Bonus</Label>
                      <Input 
                        type="number"
                        value={achievementForm.points_required}
                        onChange={(e) => setAchievementForm(prev => ({ ...prev, points_required: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  {generatedIconUrl && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <Label className="text-sm text-muted-foreground mb-2 block">Vista previa</Label>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-16 w-16 rounded-full flex items-center justify-center overflow-hidden",
                          "bg-gradient-to-br from-primary/20 to-primary/5 border-2",
                          achievementForm.rarity === 'legendary' && "border-amber-500",
                          achievementForm.rarity === 'rare' && "border-cyan-500",
                          achievementForm.rarity === 'uncommon' && "border-green-500"
                        )}>
                          <img src={generatedIconUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium">{achievementForm.name || 'Nombre del logro'}</p>
                          <p className="text-sm text-muted-foreground">{achievementForm.description || 'Descripción'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsCreating(false); setEditingItem(null); resetAchievementForm(); }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitAchievement}>
                      {editingItem ? 'Guardar' : 'Crear'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Achievements Tab - Gaming Style */}
        <TabsContent value="achievements" className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="rounded-full"
            >
              <Trophy className="w-4 h-4 mr-1" />
              Todos ({achievements.length})
            </Button>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = achievements.filter(a => a.category === key).length;
              if (count === 0) return null;
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className="rounded-full"
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {config.label} ({count})
                </Button>
              );
            })}
          </div>

          <ScrollArea className="h-[450px]">
            <div className="space-y-6 pr-4">
              {(selectedCategory === 'all' ? Object.keys(CATEGORY_CONFIG) : [selectedCategory])
                .filter(cat => achievements.some(a => a.category === cat))
                .map(categoryKey => {
                  const categoryConfig = CATEGORY_CONFIG[categoryKey];
                  const CategoryIcon = categoryConfig?.icon || Trophy;
                  const categoryAchievements = achievements.filter(a => a.category === categoryKey);
                  
                  if (categoryAchievements.length === 0) return null;

                  return (
                    <div key={categoryKey} className="space-y-3">
                      {/* Category Header */}
                      <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <CategoryIcon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm">{categoryConfig?.label || 'General'}</h3>
                        <span className="text-xs text-muted-foreground">({categoryAchievements.length})</span>
                        <span className="text-xs text-muted-foreground ml-2">{categoryConfig?.description}</span>
                      </div>

                      {/* Achievements Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryAchievements.map(achievement => {
                          const rarityInfo = RARITY_OPTIONS.find(r => r.value === achievement.rarity);
                          const conditionInfo = CONDITION_TYPES.find(c => c.value === achievement.condition_type);
                          const holdersCount = holdersCounts[achievement.id] || 0;

                          return (
                            <Card key={achievement.id} className={cn(
                              "border-2 transition-all hover:shadow-lg",
                              achievement.rarity === 'legendary' && "border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-transparent",
                              achievement.rarity === 'rare' && "border-cyan-500/50 bg-gradient-to-br from-cyan-500/5 to-transparent",
                              achievement.rarity === 'uncommon' && "border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent"
                            )}>
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "h-14 w-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0",
                                    "bg-gradient-to-br border-2 shadow-lg",
                                    achievement.rarity === 'legendary' && "from-amber-500/30 to-yellow-600/20 border-amber-500",
                                    achievement.rarity === 'rare' && "from-cyan-500/30 to-blue-600/20 border-cyan-500",
                                    achievement.rarity === 'uncommon' && "from-green-500/30 to-emerald-600/20 border-green-500",
                                    achievement.rarity === 'common' && "from-muted/50 to-muted/20 border-muted-foreground/30"
                                  )}>
                                    {renderIcon(achievement.icon)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-semibold text-sm truncate">{achievement.name}</h4>
                                      <Badge 
                                        variant="outline" 
                                        className={cn("text-xs", rarityInfo?.color, rarityInfo?.bg)}
                                      >
                                        {rarityInfo?.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {achievement.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                                      <Badge variant="secondary" className="text-xs">
                                        {conditionInfo?.label}: {achievement.condition_value}
                                      </Badge>
                                      {(achievement.points_required ?? 0) > 0 && (
                                        <Badge className="bg-primary/20 text-primary text-xs">
                                          +{achievement.points_required} UP
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        <Users className="w-3 h-3 mr-1" />
                                        {holdersCount}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAchievement(achievement)}>
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                          <DialogTitle>Editar Logro</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Key (único)</Label>
                                              <Input 
                                                value={achievementForm.key}
                                                onChange={(e) => setAchievementForm(prev => ({ ...prev, key: e.target.value }))}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Nombre</Label>
                                              <Input 
                                                value={achievementForm.name}
                                                onChange={(e) => setAchievementForm(prev => ({ ...prev, name: e.target.value }))}
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Descripción</Label>
                                            <Textarea 
                                              value={achievementForm.description}
                                              onChange={(e) => setAchievementForm(prev => ({ ...prev, description: e.target.value }))}
                                              rows={2}
                                            />
                                          </div>
                                          <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                              <Label>Rareza</Label>
                                              <Select value={achievementForm.rarity} onValueChange={(v) => setAchievementForm(prev => ({ ...prev, rarity: v }))}>
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {RARITY_OPTIONS.map(r => (
                                                    <SelectItem key={r.value} value={r.value}>
                                                      <span className={r.color}>{r.label}</span>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Categoría</Label>
                                              <Select value={achievementForm.category} onValueChange={(v) => setAchievementForm(prev => ({ ...prev, category: v }))}>
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Valor</Label>
                                              <Input 
                                                type="number"
                                                value={achievementForm.condition_value}
                                                onChange={(e) => setAchievementForm(prev => ({ ...prev, condition_value: parseInt(e.target.value) || 0 }))}
                                              />
                                            </div>
                                          </div>
                                          <DialogFooter>
                                            <Button variant="outline" onClick={() => { setEditingItem(null); resetAchievementForm(); }}>
                                              Cancelar
                                            </Button>
                                            <Button onClick={handleSubmitAchievement}>Guardar</Button>
                                          </DialogFooter>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => deleteAchievementMutation.mutate(achievement.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {/* Show uncategorized achievements */}
              {achievements.filter(a => !CATEGORY_CONFIG[a.category]).length > 0 && (selectedCategory === 'all') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-muted">
                    <div className="p-1.5 rounded-lg bg-muted">
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-sm">Sin Categoría</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {achievements.filter(a => !CATEGORY_CONFIG[a.category]).map(achievement => {
                      const rarityInfo = RARITY_OPTIONS.find(r => r.value === achievement.rarity);
                      const holdersCount = holdersCounts[achievement.id] || 0;

                      return (
                        <Card key={achievement.id} className="border-2">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                                {renderIcon(achievement.icon)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{achievement.name}</h4>
                                <Badge variant="outline" className={cn("text-xs", rarityInfo?.color)}>
                                  {rarityInfo?.label}
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {holdersCount}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
              {orgBadges.map((badge: any) => {
                const badgeType = BADGE_TYPES.find(b => b.value === badge.badge);
                const levelInfo = LEVEL_OPTIONS.find(l => l.value === badge.level);

                return (
                  <Card key={badge.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={badge.profiles?.avatar_url} />
                          <AvatarFallback>{badge.profiles?.full_name?.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{badge.profiles?.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getBadgeIcon(badge.badge)}
                              {badgeType?.label}
                            </Badge>
                            <Badge variant="secondary" className={levelInfo?.color}>
                              {levelInfo?.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Otorgado: {format(new Date(badge.granted_at), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => revokeBadgeMutation.mutate(badge.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {orgBadges.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay insignias otorgadas aún</p>
                  <p className="text-sm">Usa el botón "Otorgar Insignia" para comenzar</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Holders Tab */}
        <TabsContent value="holders" className="space-y-4">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Poseedores por Logro
                </CardTitle>
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por logro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los logros</SelectItem>
                    {achievements.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({holdersCounts[a.id] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {(selectedFilter === 'all' ? achievements : achievements.filter(a => a.id === selectedFilter)).map(achievement => {
                    const rarityInfo = RARITY_OPTIONS.find(r => r.value === achievement.rarity);
                    const holdersCount = holdersCounts[achievement.id] || 0;

                    return (
                      <div key={achievement.id} className={cn("p-4 rounded-lg border-2", rarityInfo?.bg)}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background/50 overflow-hidden">
                            {renderIcon(achievement.icon)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{achievement.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {rarityInfo?.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          </div>
                          <Badge className="bg-primary/20 text-primary">
                            {holdersCount} poseedores
                          </Badge>
                        </div>
                        
                        {holdersCount === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            Nadie ha desbloqueado este logro aún
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab - Full History */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Achievements History */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-primary" />
                  Historial de Logros
                  <Badge variant="secondary" className="ml-auto">{allUnlocks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {loadingUnlocks ? (
                      [...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))
                    ) : allUnlocks.length > 0 ? (
                      allUnlocks.map((unlock: any) => {
                        const rarityInfo = RARITY_OPTIONS.find(r => r.value === unlock.achievements?.rarity);
                        return (
                          <div key={unlock.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={unlock.profiles?.avatar_url} />
                              <AvatarFallback className="text-sm">
                                {unlock.profiles?.full_name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{unlock.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(unlock.unlocked_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                              </p>
                            </div>
                            <div className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded-full border text-xs",
                              rarityInfo?.bg
                            )}>
                              <div className="w-5 h-5 flex items-center justify-center overflow-hidden rounded-full">
                                {renderIcon(unlock.achievements?.icon || '🏆')}
                              </div>
                              <span className="font-medium truncate max-w-[100px]">{unlock.achievements?.name}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay logros desbloqueados aún</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Badges History */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Historial de Insignias
                  <Badge variant="secondary" className="ml-auto">{allBadgeGrants.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {loadingBadgeGrants ? (
                      [...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))
                    ) : allBadgeGrants.length > 0 ? (
                      allBadgeGrants.map((grant: any) => {
                        const badgeType = BADGE_TYPES.find(b => b.value === grant.badge);
                        const levelInfo = LEVEL_OPTIONS.find(l => l.value === grant.level);
                        const BadgeIcon = badgeType?.icon || Shield;
                        
                        return (
                          <div key={grant.id} className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                            grant.is_active ? "bg-muted/30 hover:bg-muted/50" : "bg-destructive/10 opacity-60"
                          )}>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={grant.profiles?.avatar_url} />
                              <AvatarFallback className="text-sm">
                                {grant.profiles?.full_name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{grant.profiles?.full_name}</p>
                                {!grant.is_active && (
                                  <Badge variant="destructive" className="text-xs">Revocado</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(grant.granted_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                                {grant.granted_by_profile?.full_name && (
                                  <span> · por {grant.granted_by_profile.full_name}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 rounded-full border bg-background/50">
                              <BadgeIcon className={cn("w-4 h-4", levelInfo?.color)} />
                              <span className="text-xs font-medium">{badgeType?.label}</span>
                              <Badge variant="outline" className={cn("text-xs", levelInfo?.color)}>
                                {levelInfo?.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay insignias otorgadas aún</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
