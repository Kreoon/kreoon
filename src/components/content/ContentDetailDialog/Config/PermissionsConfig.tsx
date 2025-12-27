import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  BLOCK_METADATA, 
  AVAILABLE_ROLES, 
  DEFAULT_BLOCKS,
  BlockKey,
  BlockPermission,
  BlockAction 
} from './types';
import { Eye, Edit, Plus, Check, Lock } from 'lucide-react';

interface PermissionsConfigProps {
  permissions: BlockPermission[];
  visibleBlocks: BlockKey[];
  onUpdate: (blockKey: BlockKey, role: string, permission: Partial<BlockPermission>) => void;
}

const ACTION_CONFIG: { key: keyof Omit<BlockPermission, 'id' | 'organization_id' | 'block_key' | 'role'>; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'can_view', label: 'Ver', icon: <Eye className="h-4 w-4" />, description: 'Puede ver el contenido del bloque' },
  { key: 'can_create', label: 'Crear', icon: <Plus className="h-4 w-4" />, description: 'Puede crear contenido en el bloque' },
  { key: 'can_edit', label: 'Editar', icon: <Edit className="h-4 w-4" />, description: 'Puede modificar el contenido' },
  { key: 'can_approve', label: 'Aprobar', icon: <Check className="h-4 w-4" />, description: 'Puede aprobar el contenido' },
  { key: 'can_lock', label: 'Bloquear', icon: <Lock className="h-4 w-4" />, description: 'Puede bloquear el bloque' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  designer: 'Diseñador',
  trafficker: 'Trafficker',
  client: 'Cliente',
};

export function PermissionsConfig({ permissions, visibleBlocks, onUpdate }: PermissionsConfigProps) {
  const [selectedRole, setSelectedRole] = useState<string>('admin');

  const getPermission = (blockKey: BlockKey, role: string) => {
    return permissions.find(p => p.block_key === blockKey && p.role === role);
  };

  const handleToggle = (
    blockKey: BlockKey, 
    role: string, 
    actionKey: keyof Omit<BlockPermission, 'id' | 'organization_id' | 'block_key' | 'role'>,
    currentValue: boolean
  ) => {
    onUpdate(blockKey, role, { [actionKey]: !currentValue });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Permisos por Rol</h3>
        <p className="text-sm text-muted-foreground">
          Define qué puede hacer cada rol en cada bloque del contenido
        </p>
      </div>

      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 mb-4">
          {AVAILABLE_ROLES.map(role => (
            <TabsTrigger key={role} value={role} className="text-xs sm:text-sm">
              {ROLE_LABELS[role]}
            </TabsTrigger>
          ))}
        </TabsList>

        {AVAILABLE_ROLES.map(role => (
          <TabsContent key={role} value={role}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Bloque</TableHead>
                      {ACTION_CONFIG.map(action => (
                        <TableHead key={action.key} className="text-center w-[100px]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 mx-auto">
                                {action.icon}
                                <span className="hidden sm:inline">{action.label}</span>
                              </TooltipTrigger>
                              <TooltipContent>{action.description}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEFAULT_BLOCKS.filter(bk => visibleBlocks.includes(bk)).map(blockKey => {
                      const meta = BLOCK_METADATA[blockKey];
                      const perm = getPermission(blockKey, role);

                      return (
                        <TableRow key={blockKey}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{meta.icon}</span>
                              <span>{meta.label}</span>
                            </div>
                          </TableCell>
                          {ACTION_CONFIG.map(action => {
                            const isChecked = perm?.[action.key] ?? false;
                            return (
                              <TableCell key={action.key} className="text-center">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => 
                                    handleToggle(blockKey, role, action.key, isChecked)
                                  }
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
        <span>⚠️</span>
        <p className="text-muted-foreground">
          Los cambios en permisos afectan a todos los usuarios con ese rol en la organización. 
          Solo los administradores pueden modificar esta configuración.
        </p>
      </div>
    </div>
  );
}
