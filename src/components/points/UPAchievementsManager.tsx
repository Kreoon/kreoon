import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, Edit2, Trash2, Sparkles, Loader2, ImageIcon
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
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [generatedIconUrl, setGeneratedIconUrl] = useState<string | null>(null);
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
    setGeneratedIconUrl(null);
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
    // Check if the icon is a URL (AI generated)
    if (achievement.icon?.startsWith('data:') || achievement.icon?.startsWith('http')) {
      setGeneratedIconUrl(achievement.icon);
    } else {
      setGeneratedIconUrl(null);
    }
  };

  const handleSubmit = () => {
    // If we have a generated icon, use it
    const iconToSave = generatedIconUrl || formData.icon;
    const dataToSave = { ...formData, icon: iconToSave };
    
    if (editingAchievement) {
      updateMutation.mutate({ id: editingAchievement.id, ...dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const generateIconWithAI = async () => {
    if (!formData.name) {
      toast({ title: 'Por favor ingresa un nombre para el logro', variant: 'destructive' });
      return;
    }

    setIsGeneratingIcon(true);
    try {
      const response = await supabase.functions.invoke('generate-achievement-icon', {
        body: {
          name: formData.name,
          description: formData.description,
          rarity: formData.rarity
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

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

  const clearGeneratedIcon = () => {
    setGeneratedIconUrl(null);
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
          <div className="flex gap-2">
            {generatedIconUrl ? (
              <div className="relative">
                <div className="h-10 w-10 rounded-lg border overflow-hidden bg-muted">
                  <img 
                    src={generatedIconUrl} 
                    alt="Generated icon" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground"
                  onClick={clearGeneratedIcon}
                >
                  ×
                </Button>
              </div>
            ) : (
              <Select value={formData.icon} onValueChange={(v) => setFormData(prev => ({ ...prev, icon: v }))}>
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
              disabled={isGeneratingIcon || !formData.name}
              className="flex-1"
            >
              {isGeneratingIcon ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar con IA
                </>
              )}
            </Button>
          </div>
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

      {/* Preview of AI generated icon */}
      {generatedIconUrl && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <Label className="text-sm text-muted-foreground mb-2 block">Vista previa del icono generado</Label>
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center overflow-hidden",
              "bg-gradient-to-br from-primary/20 to-primary/5 border-2",
              formData.rarity === 'legendary' && "border-amber-500",
              formData.rarity === 'rare' && "border-cyan-500",
              formData.rarity === 'uncommon' && "border-green-500"
            )}>
              <img src={generatedIconUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-medium">{formData.name || 'Nombre del logro'}</p>
              <p className="text-sm text-muted-foreground">{formData.description || 'Descripción'}</p>
            </div>
          </div>
        </div>
      )}

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

  // Helper to render icon (emoji or image)
  const renderIcon = (icon: string) => {
    if (icon?.startsWith('data:') || icon?.startsWith('http')) {
      return <img src={icon} alt="Achievement icon" className="w-full h-full object-cover" />;
    }
    return <span className="text-2xl">{icon}</span>;
  };

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
                Define las condiciones para desbloquear este logro. Puedes generar un icono personalizado con IA.
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
                      "h-12 w-12 rounded-full flex items-center justify-center overflow-hidden",
                      "bg-gradient-to-br from-primary/20 to-primary/5 border-2",
                      achievement.rarity === 'legendary' && "border-amber-500",
                      achievement.rarity === 'rare' && "border-cyan-500",
                      achievement.rarity === 'uncommon' && "border-green-500"
                    )}>
                      {renderIcon(achievement.icon)}
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
