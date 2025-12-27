import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { BLOCK_METADATA, DEFAULT_BLOCKS, BlockKey, BlockStateRule, AVAILABLE_ROLES } from './types';
import { Lock, EyeOff, Users } from 'lucide-react';

interface StatesConfigProps {
  organizationId: string;
  stateRules: BlockStateRule[];
  onUpdate: (statusId: string, blockKey: BlockKey, rule: Partial<BlockStateRule>) => void;
}

interface OrganizationStatus {
  id: string;
  label: string;
  status_key: string;
  color: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  designer: 'Diseñador',
  trafficker: 'Trafficker',
  client: 'Cliente',
};

export function StatesConfig({ organizationId, stateRules, onUpdate }: StatesConfigProps) {
  const [statuses, setStatuses] = useState<OrganizationStatus[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatuses() {
      if (!organizationId) return;

      const { data } = await supabase
        .from('organization_statuses')
        .select('id, label, status_key, color')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('sort_order');

      if (data) {
        setStatuses(data);
        if (data.length > 0 && !selectedStatus) {
          setSelectedStatus(data[0].id);
        }
      }
      setLoading(false);
    }

    fetchStatuses();
  }, [organizationId]);

  const getRule = (statusId: string, blockKey: BlockKey) => {
    return stateRules.find(r => r.status_id === statusId && r.block_key === blockKey);
  };

  const handleToggleLocked = (statusId: string, blockKey: BlockKey, currentValue: boolean) => {
    onUpdate(statusId, blockKey, { is_locked: !currentValue });
  };

  const handleToggleHidden = (statusId: string, blockKey: BlockKey, currentValue: boolean) => {
    onUpdate(statusId, blockKey, { is_hidden: !currentValue });
  };

  const handleToggleRole = (statusId: string, blockKey: BlockKey, role: string, currentRoles: string[]) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    onUpdate(statusId, blockKey, { editable_roles: newRoles });
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando estados...</div>;
  }

  if (statuses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-2">No hay estados configurados</p>
        <p className="text-sm text-muted-foreground">
          Configura los estados del tablero primero en la sección de Configuración del Board.
        </p>
      </div>
    );
  }

  const selectedStatusData = statuses.find(s => s.id === selectedStatus);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Comportamiento por Estado</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define cómo se comportan los bloques según el estado del contenido en el tablero
        </p>
      </div>

      {/* Status Selector */}
      <div className="flex items-center gap-4">
        <Label>Estado:</Label>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(status => (
              <SelectItem key={status.id} value={status.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                  {status.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedStatusData && (
          <Badge style={{ backgroundColor: selectedStatusData.color + '20', color: selectedStatusData.color }}>
            {selectedStatusData.label}
          </Badge>
        )}
      </div>

      {/* Block Rules for Selected Status */}
      {selectedStatus && (
        <div className="space-y-3">
          {DEFAULT_BLOCKS.map(blockKey => {
            const meta = BLOCK_METADATA[blockKey];
            const rule = getRule(selectedStatus, blockKey);
            const isLocked = rule?.is_locked ?? false;
            const isHidden = rule?.is_hidden ?? false;
            const editableRoles = rule?.editable_roles ?? [];

            return (
              <Card key={blockKey} className={`p-4 ${isHidden ? 'opacity-50' : ''}`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{meta.icon}</span>
                      <span className="font-medium">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Lock className={`h-4 w-4 ${isLocked ? 'text-warning' : 'text-muted-foreground'}`} />
                        <Switch
                          checked={isLocked}
                          onCheckedChange={() => handleToggleLocked(selectedStatus, blockKey, isLocked)}
                        />
                        <Label className="text-sm">Bloqueado</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <EyeOff className={`h-4 w-4 ${isHidden ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <Switch
                          checked={isHidden}
                          onCheckedChange={() => handleToggleHidden(selectedStatus, blockKey, isHidden)}
                        />
                        <Label className="text-sm">Oculto</Label>
                      </div>
                    </div>
                  </div>

                  {isLocked && !isHidden && (
                    <div className="pl-8 pt-2 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm text-muted-foreground">
                          Roles que pueden editar cuando está bloqueado:
                        </Label>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {AVAILABLE_ROLES.map(role => (
                          <div key={role} className="flex items-center gap-1.5">
                            <Checkbox
                              id={`${blockKey}-${role}`}
                              checked={editableRoles.includes(role)}
                              onCheckedChange={() => handleToggleRole(selectedStatus, blockKey, role, editableRoles)}
                            />
                            <Label htmlFor={`${blockKey}-${role}`} className="text-sm cursor-pointer">
                              {ROLE_LABELS[role]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
        <span>💡</span>
        <p className="text-muted-foreground">
          <strong>Bloqueado:</strong> Solo los roles seleccionados pueden editar. 
          <strong> Oculto:</strong> El bloque no se muestra en ese estado.
        </p>
      </div>
    </div>
  );
}
