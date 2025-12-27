import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Trophy, Calendar as CalendarIcon, Plus, Play, Pause, 
  RotateCcw, Clock, CheckCircle2
} from 'lucide-react';
import { UPSeason, useUPEngine } from '@/hooks/useUPEngine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UPSeasonsManagerProps {
  organizationId: string;
  seasons: UPSeason[];
}

export function UPSeasonsManager({ organizationId, seasons }: UPSeasonsManagerProps) {
  const { createSeason, updateSeason } = useUPEngine(organizationId);
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mode: 'monthly' as 'permanent' | 'monthly' | 'quarterly' | 'custom',
    starts_at: new Date(),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    reset_points: true,
    reset_streaks: true,
    reset_rankings: true
  });

  const handleCreate = async () => {
    try {
      await createSeason({
        organization_id: organizationId,
        name: formData.name,
        mode: formData.mode,
        starts_at: formData.starts_at.toISOString(),
        ends_at: formData.ends_at.toISOString(),
        reset_points: formData.reset_points,
        reset_streaks: formData.reset_streaks,
        reset_rankings: formData.reset_rankings,
        status: 'draft'
      });
      toast({ title: 'Temporada creada', description: 'La temporada se ha creado correctamente.' });
      setIsCreating(false);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo crear la temporada.', 
        variant: 'destructive' 
      });
    }
  };

  const handleActivate = async (seasonId: string) => {
    try {
      await updateSeason(seasonId, { status: 'active' });
      toast({ title: 'Temporada activada' });
    } catch (error) {
      toast({ title: 'Error al activar temporada', variant: 'destructive' });
    }
  };

  const handleEnd = async (seasonId: string) => {
    try {
      await updateSeason(seasonId, { status: 'ended' });
      toast({ title: 'Temporada finalizada' });
    } catch (error) {
      toast({ title: 'Error al finalizar temporada', variant: 'destructive' });
    }
  };

  const activeSeason = seasons.find(s => s.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Temporadas</h3>
          <p className="text-sm text-muted-foreground">
            Configura ciclos de puntos y rankings
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Temporada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Temporada</DialogTitle>
              <DialogDescription>
                Define el periodo y configuración de la temporada
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Temporada Enero 2025"
                />
              </div>

              <div className="space-y-2">
                <Label>Modo</Label>
                <Select 
                  value={formData.mode} 
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, mode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanente</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(formData.starts_at, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.starts_at}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, starts_at: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(formData.ends_at, 'PPP', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.ends_at}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, ends_at: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <Label className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Opciones de Reset
                </Label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resetear Puntos</span>
                  <Switch 
                    checked={formData.reset_points}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reset_points: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resetear Rachas</span>
                  <Switch 
                    checked={formData.reset_streaks}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reset_streaks: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resetear Rankings</span>
                  <Switch 
                    checked={formData.reset_rankings}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reset_rankings: checked }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>
                Crear Temporada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Season Card */}
      {activeSeason && (
        <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Temporada Activa
              </CardTitle>
              <Badge className="bg-success">En Curso</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{activeSeason.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(activeSeason.starts_at), 'PPP', { locale: es })} - 
                  {format(new Date(activeSeason.ends_at), 'PPP', { locale: es })}
                </p>
              </div>
              <Button variant="destructive" onClick={() => handleEnd(activeSeason.id)}>
                <Pause className="w-4 h-4 mr-2" />
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Seasons List */}
      <div className="space-y-3">
        {seasons.filter(s => s.id !== activeSeason?.id).map(season => (
          <Card 
            key={season.id}
            className={cn(
              "border",
              season.status === 'ended' && "opacity-60"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    season.status === 'draft' && "bg-muted",
                    season.status === 'ended' && "bg-slate-500/20"
                  )}>
                    <Trophy className={cn(
                      "w-5 h-5",
                      season.status === 'draft' && "text-muted-foreground",
                      season.status === 'ended' && "text-slate-500"
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{season.name}</h4>
                      <Badge variant={
                        season.status === 'draft' ? 'secondary' : 
                        season.status === 'ended' ? 'outline' : 'default'
                      }>
                        {season.status === 'draft' && 'Borrador'}
                        {season.status === 'ended' && 'Finalizada'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(season.starts_at), 'PPP', { locale: es })} - 
                      {format(new Date(season.ends_at), 'PPP', { locale: es })}
                    </p>
                  </div>
                </div>

                {season.status === 'draft' && (
                  <Button onClick={() => handleActivate(season.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Activar
                  </Button>
                )}

                {season.status === 'ended' && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completada
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {seasons.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-1">Sin temporadas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera temporada para comenzar
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Temporada
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
