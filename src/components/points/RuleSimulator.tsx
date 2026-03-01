import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Zap, Target, CheckCircle2, XCircle, 
  AlertTriangle, TrendingUp, User
} from 'lucide-react';
import { UPRule } from '@/hooks/useUPEngine';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface RuleSimulatorProps {
  organizationId: string;
  rules: UPRule[];
}

interface SimulationResult {
  eventType: string;
  matchedRule: UPRule | null;
  pointsAwarded: number;
  blocked: boolean;
  blockReason: string | null;
  appliedConditions: string[];
}

interface ContentOption {
  id: string;
  title: string;
  status: string;
  creator_id: string | null;
  editor_id: string | null;
}

export function RuleSimulator({ organizationId, rules }: RuleSimulatorProps) {
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [contents, setContents] = useState<ContentOption[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const EVENT_TYPES = [
    { value: 'content_recorded', label: 'Video Grabado' },
    { value: 'content_edited', label: 'Video Editado' },
    { value: 'content_delivered', label: 'Contenido Entregado' },
    { value: 'content_approved', label: 'Contenido Aprobado' },
    { value: 'correction_requested', label: 'Corrección Solicitada' },
    { value: 'deadline_missed', label: 'Deadline Vencido' },
    { value: 'early_delivery', label: 'Entrega Anticipada' },
    { value: 'quality_bonus', label: 'Bonus por Calidad' },
    { value: 'quest_completed', label: 'Misión Completada' },
  ];

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      // Load recent content
      const { data: contentData } = await supabase
        .from('content')
        .select('id, title, status, creator_id, editor_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (contentData) {
        setContents(contentData as ContentOption[]);
      }

      // Load org members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId);

      if (membersData) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesData) {
          setUsers(profilesData.map(p => ({ 
            id: p.id, 
            name: p.full_name || 'Sin nombre' 
          })));
        }
      }
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const simulateRule = () => {
    if (!selectedEventType) return;

    setLoading(true);
    
    // Simulate which rule would match
    const matchingRules = rules.filter(r => 
      r.event_type_key === selectedEventType && r.is_active
    ).sort((a, b) => b.priority - a.priority);

    const matchedRule = matchingRules[0] || null;
    
    // Check limits (simulated)
    const blocked = false;
    const blockReason: string | null = null;
    const appliedConditions: string[] = [];

    if (matchedRule) {
      appliedConditions.push(`Prioridad: ${matchedRule.priority}`);
      
      if (matchedRule.applies_to_roles?.length) {
        appliedConditions.push(`Roles: ${matchedRule.applies_to_roles.join(', ')}`);
      }
      
      if (matchedRule.max_per_day && matchedRule.max_per_day > 0) {
        appliedConditions.push(`Límite diario: ${matchedRule.max_per_day}`);
        // In real simulation, we'd check actual counts
      }
      
      if (matchedRule.max_per_content && matchedRule.max_per_content > 0) {
        appliedConditions.push(`Máx por contenido: ${matchedRule.max_per_content}`);
      }

      if (matchedRule.conditions && Array.isArray(matchedRule.conditions) && matchedRule.conditions.length > 0) {
        appliedConditions.push(`Condiciones custom: ${matchedRule.conditions.length}`);
      }
    }

    const pointsAwarded = matchedRule 
      ? (matchedRule.is_penalty ? -matchedRule.points : matchedRule.points)
      : 0;

    setResult({
      eventType: selectedEventType,
      matchedRule,
      pointsAwarded,
      blocked,
      blockReason,
      appliedConditions,
    });

    setLoading(false);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="w-5 h-5 text-primary" />
          Simulador de Reglas
        </CardTitle>
        <CardDescription>
          Prueba cómo se aplicarían las reglas con eventos reales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select 
              value={selectedEventType} 
              onValueChange={setSelectedEventType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar evento" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(et => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              Contenido
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={loadOptions}
                disabled={loadingOptions}
              >
                {loadingOptions ? 'Cargando...' : 'Cargar opciones'}
              </Button>
            </Label>
            <Select 
              value={selectedContentId} 
              onValueChange={setSelectedContentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin contenido</SelectItem>
                {contents.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title.substring(0, 30)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User */}
          <div className="space-y-2">
            <Label>Usuario</Label>
            <Select 
              value={selectedUserId} 
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Usuario genérico</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {u.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={simulateRule}
          disabled={!selectedEventType || loading}
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          Simular Evento
        </Button>

        {/* Result */}
        {result && (
          <Card className={cn(
            "border-2 mt-4",
            result.matchedRule 
              ? result.matchedRule.is_penalty 
                ? "border-destructive/30 bg-destructive/5"
                : "border-success/30 bg-success/5"
              : "border-muted"
          )}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.matchedRule ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {result.matchedRule ? 'Regla Coincidente' : 'Sin Regla Aplicable'}
                  </span>
                </div>
                {result.matchedRule && (
                  <Badge className={cn(
                    result.matchedRule.is_penalty 
                      ? "bg-destructive" 
                      : "bg-success"
                  )}>
                    {result.pointsAwarded >= 0 ? '+' : ''}{result.pointsAwarded} UP
                  </Badge>
                )}
              </div>

              {result.matchedRule && (
                <>
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <h4 className="font-medium">{result.matchedRule.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {result.matchedRule.description || 'Sin descripción'}
                    </p>
                  </div>

                  {result.appliedConditions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        Condiciones aplicadas:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {result.appliedConditions.map((cond, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {cond}
                          </Badge>
                        ))
                      }
                      </div>
                    </div>
                  )}

                  {result.blocked && (
                    <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-warning text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{result.blockReason}</span>
                    </div>
                  )}
                </>
              )}

              {!result.matchedRule && (
                <div className="text-sm text-muted-foreground">
                  No hay reglas activas configuradas para el evento "{result.eventType}". 
                  Crea una regla para este tipo de evento.
                </div>
              )}

              {/* Other matching rules */}
              {result.matchedRule && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Otras reglas que coinciden (menor prioridad):
                  </p>
                  <div className="space-y-1">
                    {rules
                      .filter(r => 
                        r.event_type_key === result.eventType && 
                        r.is_active && 
                        r.id !== result.matchedRule?.id
                      )
                      .slice(0, 3)
                      .map(r => (
                        <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                          <span>{r.name}</span>
                          <span className="text-muted-foreground">
                            Prioridad: {r.priority}
                          </span>
                        </div>
                      ))
                    }
                    {rules.filter(r => 
                      r.event_type_key === result.eventType && 
                      r.is_active && 
                      r.id !== result.matchedRule?.id
                    ).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No hay otras reglas para este evento
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
