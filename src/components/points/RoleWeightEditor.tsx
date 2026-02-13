import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Scale, Save, RotateCcw, Calculator, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ARCHETYPE_META,
  type EffortArchetype,
} from '@/lib/reputation';

// Helper to calculate normalized score
function calculateNormalizedScore(
  tasksCompleted: number,
  qualityScore: number,
  baseWeight: number,
  complexityMultiplier: number
): number {
  return Math.round(
    ((tasksCompleted * baseWeight) + (qualityScore * complexityMultiplier)) * 100
  ) / 100;
}

// Map archetype to display metadata
const ARCHETYPE_LABELS: Record<EffortArchetype, string> = {
  high_volume: 'Alto Volumen',
  high_effort: 'Alto Esfuerzo',
  balanced: 'Equilibrado',
  trust_based: 'Basado en Confianza',
};

const ARCHETYPE_COLORS: Record<EffortArchetype, { text: string; bg: string }> = {
  high_volume: { text: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  high_effort: { text: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
  balanced: { text: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  trust_based: { text: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
};

const ARCHETYPE_ICONS: Record<EffortArchetype, string> = {
  high_volume: '⚡',
  high_effort: '🎯',
  balanced: '⚖️',
  trust_based: '🤝',
};

interface RoleWeightRow {
  id: string;
  organization_id: string | null;
  role_key: string;
  label: string;
  archetype: EffortArchetype;
  base_weight: number;
  complexity_multiplier: number;
  expected_monthly_tasks: number;
  is_marketplace_role: boolean;
  category: string | null;
  is_active: boolean;
}

interface RoleWeightEditorProps {
  organizationId: string;
}

export function RoleWeightEditor({ organizationId }: RoleWeightEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<RoleWeightRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editedRows, setEditedRows] = useState<Map<string, Partial<RoleWeightRow>>>(new Map());

  // Preview inputs
  const [previewTasks, setPreviewTasks] = useState(20);
  const [previewQuality, setPreviewQuality] = useState(80);

  useEffect(() => {
    fetchWeights();
  }, [organizationId]);

  const fetchWeights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_archetypes')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
        .eq('is_active', true)
        .order('category')
        .order('role_key');

      if (error) throw error;

      // Merge: org-specific overrides take precedence
      const merged = new Map<string, RoleWeightRow>();
      (data || []).forEach((row: any) => {
        const existing = merged.get(row.role_key);
        if (!existing || (row.organization_id && !existing.organization_id)) {
          merged.set(row.role_key, row as RoleWeightRow);
        }
      });

      setWeights(Array.from(merged.values()));
    } catch (err) {
      console.error('[RoleWeightEditor] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (roleKey: string, field: keyof RoleWeightRow, value: number) => {
    const current = editedRows.get(roleKey) || {};
    setEditedRows(new Map(editedRows.set(roleKey, { ...current, [field]: value })));
  };

  const saveChanges = async () => {
    if (editedRows.size === 0) return;
    setSaving(true);

    try {
      for (const [roleKey, changes] of editedRows) {
        const existingOrgRow = weights.find(w => w.role_key === roleKey && w.organization_id === organizationId);

        if (existingOrgRow) {
          // Update existing org override
          await supabase
            .from('role_archetypes')
            .update({ ...changes, updated_at: new Date().toISOString() })
            .eq('id', existingOrgRow.id);
        } else {
          // Create org-specific override from global default
          const globalRow = weights.find(w => w.role_key === roleKey);
          if (globalRow) {
            await supabase
              .from('role_archetypes')
              .insert({
                organization_id: organizationId,
                role_key: roleKey,
                label: globalRow.label,
                archetype: globalRow.archetype,
                base_weight: changes.base_weight ?? globalRow.base_weight,
                complexity_multiplier: changes.complexity_multiplier ?? globalRow.complexity_multiplier,
                expected_monthly_tasks: globalRow.expected_monthly_tasks,
                is_marketplace_role: globalRow.is_marketplace_role,
                category: globalRow.category,
              });
          }
        }
      }

      toast({ title: 'Pesos actualizados', description: `${editedRows.size} roles modificados` });
      setEditedRows(new Map());
      fetchWeights();
    } catch (err) {
      console.error('[RoleWeightEditor] Save error:', err);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const categories = Array.from(new Set(weights.map(w => w.category || 'system')));
  const filteredWeights = categoryFilter === 'all'
    ? weights
    : weights.filter(w => (w.category || 'system') === categoryFilter);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline">{filteredWeights.length} roles</Badge>
        </div>
        <div className="flex items-center gap-2">
          {editedRows.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditedRows(new Map())}>
                <RotateCcw className="w-4 h-4 mr-1" /> Descartar
              </Button>
              <Button size="sm" onClick={saveChanges} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Guardar ({editedRows.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview Calculator */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Calculadora de vista previa</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Tareas completadas</label>
              <Slider
                value={[previewTasks]}
                onValueChange={([v]) => setPreviewTasks(v)}
                min={1} max={500} step={1}
                className="mt-1"
              />
              <span className="text-sm font-mono">{previewTasks}</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Puntaje de calidad (0-100)</label>
              <Slider
                value={[previewQuality]}
                onValueChange={([v]) => setPreviewQuality(v)}
                min={0} max={100} step={1}
                className="mt-1"
              />
              <span className="text-sm font-mono">{previewQuality}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Table */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-1">
          {filteredWeights.map(row => {
            const edits = editedRows.get(row.role_key) || {};
            const currentWeight = (edits.base_weight ?? row.base_weight) as number;
            const currentMultiplier = (edits.complexity_multiplier ?? row.complexity_multiplier) as number;
            const isEdited = editedRows.has(row.role_key);
            const isOrgOverride = row.organization_id !== null;
            const previewScore = calculateNormalizedScore(previewTasks, previewQuality, currentWeight, currentMultiplier);
            const archetype = row.archetype as EffortArchetype;
            const archetypeColor = ARCHETYPE_COLORS[archetype];

            return (
              <div key={row.role_key} className={cn(
                "grid grid-cols-[1fr,100px,100px,80px] gap-3 items-center p-3 rounded-lg border",
                isEdited && "border-primary/50 bg-primary/5",
                isOrgOverride && "border-warning/30"
              )}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{row.label}</span>
                    {isOrgOverride && <Badge variant="outline" className="text-[10px]">Override</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className={cn("text-[10px] px-1 py-0", archetypeColor.bg, archetypeColor.text)}>
                      {ARCHETYPE_ICONS[archetype]} {ARCHETYPE_LABELS[archetype]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">~{row.expected_monthly_tasks}/mes</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Peso base</label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-7 text-sm"
                    value={currentWeight}
                    onChange={(e) => handleEdit(row.role_key, 'base_weight', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Mult. complejidad</label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-7 text-sm"
                    value={currentMultiplier}
                    onChange={(e) => handleEdit(row.role_key, 'complexity_multiplier', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="text-right">
                  <label className="text-[10px] text-muted-foreground">Preview</label>
                  <p className="text-sm font-bold text-primary">{previewScore.toFixed(1)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
