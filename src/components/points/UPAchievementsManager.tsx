import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Trophy, Edit2, Trash2, Star, 
  Shield, Zap, Crown, Award, Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UPAchievementsManagerProps {
  organizationId?: string;
}

const CONDITION_TYPES = [
  { value: 'completions', label: 'Contenidos Completados' },
  { value: 'early_deliveries', label: 'Entregas a Tiempo' },
  { value: 'consecutive', label: 'Racha Consecutiva' },
  { value: 'total_points', label: 'Puntos Totales' },
  { value: 'days_active', label: 'Días Activo' },
  { value: 'level_reached', label: 'Nivel Alcanzado' },
  { value: 'rank', label: 'Posición en Ranking' }
];

const RARITY_OPTIONS = [
  { value: 'common', label: 'Común', color: 'text-muted-foreground' },
  { value: 'uncommon', label: 'Poco Común', color: 'text-green-500' },
  { value: 'rare', label: 'Raro', color: 'text-cyan-500' },
  { value: 'legendary', label: 'Legendario', color: 'text-amber-500' }
];

const ICON_OPTIONS = ['🏆', '⭐', '🎯', '🔥', '💎', '👑', '⚔️', '🛡️', '🎖️', '🏅'];

export function UPAchievementsManager({ organizationId }: UPAchievementsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<any>(null);
  const [formData, setFormData] = useState({
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

  const { data: achievements = [], isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: async (achievement: typeof formData) => {
      const { error } = await supabase.from('achievements').insert(achievement);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast({ title: 'Logro creado' });
      setIsCreating(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error al crear logro', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('achievements').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      toast({ title: 'Logro actualizado' });
      setEditingAchievement(null);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
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

  const resetForm = () => {
    setFormData({
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
  };

  const openEdit = (achievement: any) => {
    setFormData({
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
    setEditingAchievement(achievement);
  };

  const handleSubmit = () => {
    if (editingAchievement) {
      updateMutation.mutate({ id: editingAchievement.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const AchievementForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Key (único)</Label>
          <Input 
            value={formData.key}
            onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
            placeholder="ej: first_delivery"
          />
        </div>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input 
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Primera Entrega"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea 
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Completa tu primera entrega de contenido"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Icono</Label>
          <Select value={formData.icon} onValueChange={(v) => setFormData(prev => ({ ...prev, icon: v }))}>
            <SelectTrigger>
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
        </div>

        <div className="space-y-2">
          <Label>Rareza</Label>
          <Select value={formData.rarity} onValueChange={(v) => setFormData(prev => ({ ...prev, rarity: v }))}>
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
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="general"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Condición</Label>
          <Select value={formData.condition_type} onValueChange={(v) => setFormData(prev => ({ ...prev, condition_type: v }))}>
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
            value={formData.condition_value}
            onChange={(e) => setFormData(prev => ({ ...prev, condition_value: parseInt(e.target.value) || 0 }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Puntos Bonus</Label>
          <Input 
            type="number"
            value={formData.points_required}
            onChange={(e) => setFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => { setIsCreating(false); setEditingAchievement(null); resetForm(); }}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          {editingAchievement ? 'Guardar' : 'Crear'}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestor de Logros</h3>
          <p className="text-sm text-muted-foreground">
            Configura los logros que los usuarios pueden desbloquear
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Logro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Logro</DialogTitle>
              <DialogDescription>
                Define las condiciones para desbloquear este logro
              </DialogDescription>
            </DialogHeader>
            <AchievementForm />
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
          {achievements.map(achievement => {
            const rarityInfo = RARITY_OPTIONS.find(r => r.value === achievement.rarity);
            const conditionInfo = CONDITION_TYPES.find(c => c.value === achievement.condition_type);

            return (
              <Card key={achievement.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center text-2xl",
                      "bg-gradient-to-br from-primary/20 to-primary/5 border-2",
                      achievement.rarity === 'legendary' && "border-amber-500",
                      achievement.rarity === 'rare' && "border-cyan-500",
                      achievement.rarity === 'uncommon' && "border-green-500"
                    )}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <Badge variant="outline" className={rarityInfo?.color}>
                          {rarityInfo?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{conditionInfo?.label}: {achievement.condition_value}</span>
                        {achievement.points_required > 0 && (
                          <span className="text-primary">+{achievement.points_required} UP</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(achievement)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(achievement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={!!editingAchievement} onOpenChange={(open) => !open && setEditingAchievement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Logro</DialogTitle>
          </DialogHeader>
          <AchievementForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
