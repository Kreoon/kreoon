import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Target, TrendingUp, Users, DollarSign } from "lucide-react";

interface Goal {
  id?: string;
  period_type: 'month' | 'quarter';
  period_value: number;
  year: number;
  revenue_goal: number; // COP
  revenue_goal_usd: number; // USD
  content_goal: number;
  new_clients_goal: number;
  notes?: string;
}

interface GoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const QUARTERS = ['Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];

export function GoalsDialog({ open, onOpenChange, onSave }: GoalsDialogProps) {
    const { toast } = useToast();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const [loading, setLoading] = useState(false);
    const [goal, setGoal] = useState<Goal>({
      period_type: 'month',
      period_value: currentMonth,
      year: currentYear,
      revenue_goal: 0,
      revenue_goal_usd: 0,
      content_goal: 0,
      new_clients_goal: 0,
      notes: ''
    });
  const [existingGoalId, setExistingGoalId] = useState<string | null>(null);

  // Fetch existing goal when period changes
  // Fetch current organization id from profile
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_organization_id')
          .eq('id', user.id)
          .maybeSingle();
        setCurrentOrgId(profile?.current_organization_id || null);
      }
    };
    fetchOrg();
  }, []);
  
  useEffect(() => {
    const fetchExistingGoal = async () => {
      if (!currentOrgId) return;
      
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('period_type', goal.period_type)
        .eq('period_value', goal.period_value)
        .eq('year', goal.year)
        .maybeSingle();

      if (data) {
        setGoal({
          period_type: data.period_type as 'month' | 'quarter',
          period_value: data.period_value,
          year: data.year,
          revenue_goal: data.revenue_goal || 0,
          revenue_goal_usd: (data as any).revenue_goal_usd || 0,
          content_goal: data.content_goal || 0,
          new_clients_goal: data.new_clients_goal || 0,
          notes: data.notes || ''
        });
        setExistingGoalId(data.id);
      } else {
        setExistingGoalId(null);
        setGoal(prev => ({
          ...prev,
          revenue_goal: 0,
          revenue_goal_usd: 0,
          content_goal: 0,
          new_clients_goal: 0,
          notes: ''
        }));
      }
    };

    if (open && currentOrgId) {
      fetchExistingGoal();
    }
  }, [goal.period_type, goal.period_value, goal.year, open, currentOrgId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (existingGoalId) {
        const { error } = await supabase
          .from('goals')
          .update({
            revenue_goal: goal.revenue_goal,
            revenue_goal_usd: goal.revenue_goal_usd,
            content_goal: goal.content_goal,
            new_clients_goal: goal.new_clients_goal,
            notes: goal.notes
          } as any)
          .eq('id', existingGoalId);

        if (error) throw error;
      } else {
        if (!currentOrgId) {
          throw new Error('No organization selected');
        }
        const { error } = await supabase
          .from('goals')
          .insert({
            organization_id: currentOrgId,
            period_type: goal.period_type,
            period_value: goal.period_value,
            year: goal.year,
            revenue_goal: goal.revenue_goal,
            revenue_goal_usd: goal.revenue_goal_usd,
            content_goal: goal.content_goal,
            new_clients_goal: goal.new_clients_goal,
            notes: goal.notes
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Meta guardada",
        description: `Meta para ${goal.period_type === 'month' ? MONTHS[goal.period_value - 1] : QUARTERS[goal.period_value - 1]} ${goal.year} guardada correctamente`
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la meta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Configurar Metas
          </DialogTitle>
          <DialogDescription>
            Define las metas de ingresos, contenido y clientes para el periodo seleccionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={goal.period_type}
                onValueChange={(v) => setGoal({ ...goal, period_type: v as 'month' | 'quarter', period_value: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{goal.period_type === 'month' ? 'Mes' : 'Trimestre'}</Label>
              <Select
                value={goal.period_value.toString()}
                onValueChange={(v) => setGoal({ ...goal, period_value: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {goal.period_type === 'month' 
                    ? MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)
                    : QUARTERS.map((q, i) => <SelectItem key={i} value={(i + 1).toString()}>{q}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Año</Label>
              <Select
                value={goal.year.toString()}
                onValueChange={(v) => setGoal({ ...goal, year: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Revenue Goals by Currency */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              Metas de Ingresos
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>🇨🇴</span> COP
                </Label>
                <Input
                  type="number"
                  value={goal.revenue_goal || ''}
                  onChange={(e) => setGoal({ ...goal, revenue_goal: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>🇺🇸</span> USD
                </Label>
                <Input
                  type="number"
                  value={goal.revenue_goal_usd || ''}
                  onChange={(e) => setGoal({ ...goal, revenue_goal_usd: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Meta de Contenidos
            </Label>
            <Input
              type="number"
              value={goal.content_goal || ''}
              onChange={(e) => setGoal({ ...goal, content_goal: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-info" />
              Meta de Nuevos Clientes
            </Label>
            <Input
              type="number"
              value={goal.new_clients_goal || ''}
              onChange={(e) => setGoal({ ...goal, new_clients_goal: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={goal.notes || ''}
              onChange={(e) => setGoal({ ...goal, notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : existingGoalId ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
