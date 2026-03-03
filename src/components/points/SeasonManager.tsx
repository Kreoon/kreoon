import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReputationSeasons } from '@/hooks/useUnifiedReputation';
import { useOrgRanking } from '@/hooks/useUnifiedReputation';
import { 
  Calendar, 
  Trophy, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Clock,
  Users,
  Crown,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SeasonManagerProps {
  showCreateButton?: boolean;
}

export function SeasonManager({ showCreateButton = true }: SeasonManagerProps) {
  const { seasons, activeSeason, loading, createSeason } = useReputationSeasons();
  const { ranking, loading: rankingLoading } = useOrgRanking();

  // Filtrar ranking por rol
  const creatorLeaderboard = useMemo(
    () => ranking.filter(r => r.role_key === 'creator'),
    [ranking]
  );
  const editorLeaderboard = useMemo(
    () => ranking.filter(r => r.role_key === 'editor'),
    [ranking]
  );
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);

  // Form state for new season
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonMode, setNewSeasonMode] = useState<'monthly' | 'quarterly' | 'custom'>('monthly');
  const [newSeasonStartDate, setNewSeasonStartDate] = useState('');
  const [newSeasonEndDate, setNewSeasonEndDate] = useState('');
  const [resetPoints, setResetPoints] = useState(true);
  const [closeCurrentSeason, setCloseCurrentSeason] = useState(true);

  // Quick create for next month
  const handleQuickCreateNextMonth = () => {
    const nextMonth = addMonths(new Date(), 1);
    const monthName = format(nextMonth, 'MMMM yyyy', { locale: es });
    setNewSeasonName(`Temporada ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`);
    setNewSeasonMode('monthly');
    setNewSeasonStartDate(format(startOfMonth(nextMonth), 'yyyy-MM-dd'));
    setNewSeasonEndDate(format(endOfMonth(nextMonth), 'yyyy-MM-dd'));
    setShowCreateDialog(true);
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName || !newSeasonStartDate || !newSeasonEndDate) return;

    setCreating(true);
    try {
      await createSeason({
        name: newSeasonName,
        start_date: newSeasonStartDate,
        end_date: newSeasonEndDate,
        is_active: true
      });
      setShowCreateDialog(false);
      setNewSeasonName('');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseSeason = async () => {
    if (!activeSeason) return;

    setClosing(true);
    try {
      // Cerrar temporada actualizando is_active a false
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('reputation_seasons')
        .update({ is_active: false })
        .eq('id', activeSeason.id);
      setShowCloseDialog(false);
      window.location.reload(); // Refrescar para ver cambios
    } finally {
      setClosing(false);
    }
  };

  // Get top performers for display
  const topCreator = creatorLeaderboard[0];
  const topEditor = editorLeaderboard[0];

  if (loading || rankingLoading) {
    return (
      <Card className="border-[hsl(270,100%,60%,0.15)]">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(270,100%,60%)]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-[hsl(270,100%,60%,0.15)] bg-gradient-to-br from-card to-background overflow-hidden relative">
        <motion.div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(270 100% 60% / 0.15), transparent 70%)' }}
        />
        
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[hsl(270,100%,60%)]" />
              <span className="text-primary">Temporadas UP</span>
            </div>
            {showCreateButton && (
              <Button 
                size="sm" 
                onClick={handleQuickCreateNextMonth}
                className="bg-[hsl(270,100%,60%,0.2)] hover:bg-[hsl(270,100%,60%,0.3)] text-primary border border-[hsl(270,100%,60%,0.3)]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Active Season */}
          {activeSeason ? (
            <motion.div 
              className="p-4 rounded-xl border bg-gradient-to-br"
              style={{
                borderColor: 'hsl(160 100% 45% / 0.3)',
                background: 'linear-gradient(135deg, hsl(160 100% 45% / 0.1), transparent)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      Activa
                    </Badge>
                    <span className="text-lg font-bold text-white">{activeSeason.name}</span>
                  </div>
                  <p className="text-xs text-emerald-400/70 mt-1">
                    {format(new Date(activeSeason.start_date), "d 'de' MMMM", { locale: es })} - {' '}
                    {activeSeason.end_date ? format(new Date(activeSeason.end_date), "d 'de' MMMM yyyy", { locale: es }) : 'Sin fecha de fin'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCloseDialog(true)}
                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cerrar
                </Button>
              </div>
              
              {/* Season Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted border border-[hsl(270,100%,60%,0.1)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-[hsl(270,100%,60%)]" />
                    <span className="text-xs text-muted-foreground">Participantes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white">{creatorLeaderboard.length} creadores</span>
                    <span className="text-white">{editorLeaderboard.length} editores</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted border border-[hsl(270,100%,60%,0.1)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-muted-foreground">Puntos Totales</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {(creatorLeaderboard.reduce((sum, c) => sum + (c.lifetime_points || 0), 0) + 
                      editorLeaderboard.reduce((sum, e) => sum + (e.lifetime_points || 0), 0)).toLocaleString()} UP
                  </span>
                </div>
              </div>
              
              {/* Top Performers */}
              {(topCreator || topEditor) && (
                <div className="mt-3 pt-3 border-t border-[hsl(270,100%,60%,0.1)]">
                  <p className="text-xs text-muted-foreground mb-2">Líderes Actuales</p>
                  <div className="grid grid-cols-2 gap-2">
                    {topCreator && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{topCreator.full_name}</p>
                          <p className="text-xs text-muted-foreground">{topCreator.lifetime_points} UP</p>
                        </div>
                      </div>
                    )}
                    {topEditor && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{topEditor.full_name}</p>
                          <p className="text-xs text-muted-foreground">{topEditor.lifetime_points} UP</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
              <h4 className="font-semibold text-white mb-1">Sin Temporada Activa</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Crea una nueva temporada para comenzar a trackear puntos UP
              </p>
              <Button onClick={handleQuickCreateNextMonth} className="bg-[hsl(270,100%,60%)] hover:bg-[hsl(270,100%,50%)]">
                <Plus className="w-4 h-4 mr-2" />
                Crear Temporada
              </Button>
            </div>
          )}
          
          {/* Past Seasons */}
          {seasons.filter(s => !s.is_active).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Temporadas Anteriores</p>
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {seasons.filter(s => !s.is_active).map(season => (
                    <div 
                      key={season.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted border border-[hsl(270,100%,60%,0.1)]"
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-white">{season.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Cerrada
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Season Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-[hsl(270,100%,60%,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-primary">Crear Nueva Temporada</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[hsl(270,30%,70%)]">Nombre de la Temporada</Label>
              <Input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="Ej: Temporada Febrero 2026"
                className="bg-muted border-[hsl(270,100%,60%,0.2)]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[hsl(270,30%,70%)]">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={newSeasonStartDate}
                  onChange={(e) => setNewSeasonStartDate(e.target.value)}
                  className="bg-muted border-[hsl(270,100%,60%,0.2)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(270,30%,70%)]">Fecha Fin</Label>
                <Input
                  type="date"
                  value={newSeasonEndDate}
                  onChange={(e) => setNewSeasonEndDate(e.target.value)}
                  className="bg-muted border-[hsl(270,100%,60%,0.2)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(270,30%,70%)]">Modo</Label>
              <Select value={newSeasonMode} onValueChange={(v) => setNewSeasonMode(v as any)}>
                <SelectTrigger className="bg-muted border-[hsl(270,100%,60%,0.2)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeSeason && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div>
                  <p className="text-sm font-medium text-amber-400">Cerrar temporada actual</p>
                  <p className="text-xs text-amber-400/70">Se guardará un snapshot de los rankings</p>
                </div>
                <Switch
                  checked={closeCurrentSeason}
                  onCheckedChange={setCloseCurrentSeason}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSeason}
              disabled={creating || !newSeasonName || !newSeasonStartDate || !newSeasonEndDate}
              className="bg-[hsl(270,100%,60%)] hover:bg-[hsl(270,100%,50%)]"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Crear Temporada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Season Confirmation Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="bg-card border-[hsl(270,100%,60%,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Cerrar Temporada</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-[hsl(270,30%,70%)]">
              ¿Estás seguro de que deseas cerrar la temporada <strong className="text-white">{activeSeason?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Se guardará un snapshot de los rankings actuales y la temporada quedará como finalizada.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCloseSeason}
              disabled={closing}
              variant="destructive"
            >
              {closing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Cerrar Temporada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
