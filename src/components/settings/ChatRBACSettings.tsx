import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Shield, MessageSquare, Users } from 'lucide-react';
import { useChatRBAC, ChatRBACRule } from '@/hooks/useChatRBAC';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS_SHORT, ORG_ASSIGNABLE_ROLES } from '@/lib/roles';

const CHAT_ROLES = ['admin', 'strategist', 'creator', 'editor', 'client', 'trafficker', 'designer'];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  strategist: 'Estratega',
  creator: 'Creador',
  editor: 'Editor',
  client: 'Cliente',
  trafficker: 'Trafficker',
  designer: 'Diseñador',
};

export function ChatRBACSettings() {
  const { rbacRules, loading, updateRule, initializeDefaultRules, refetchRules } = useChatRBAC();
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);

  const getRuleValue = (sourceRole: string, targetRole: string, field: keyof Pick<ChatRBACRule, 'can_chat' | 'can_see_in_list' | 'can_add_to_group'>): boolean => {
    const rule = rbacRules.find(r => r.source_role === sourceRole && r.target_role === targetRole);
    return rule?.[field] ?? false;
  };

  const handleToggle = async (sourceRole: string, targetRole: string, field: keyof Pick<ChatRBACRule, 'can_chat' | 'can_see_in_list' | 'can_add_to_group'>, value: boolean) => {
    const key = `${sourceRole}-${targetRole}-${field}`;
    setUpdating(key);
    try {
      await updateRule(sourceRole, targetRole, { [field]: value });
      toast({
        title: 'Regla actualizada',
        description: `${ROLE_LABELS[sourceRole]} ${value ? 'puede' : 'no puede'} ${field === 'can_chat' ? 'chatear con' : field === 'can_see_in_list' ? 'ver a' : 'agregar a grupos a'} ${ROLE_LABELS[targetRole]}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la regla',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleInitialize = async () => {
    try {
      await initializeDefaultRules();
      toast({
        title: 'Reglas inicializadas',
        description: 'Se han creado las reglas predeterminadas de chat',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron crear las reglas',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Reglas de Chat RBAC
              </CardTitle>
              <CardDescription>
                Configura quién puede chatear con quién en tu organización
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchRules()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              {rbacRules.length === 0 && (
                <Button size="sm" onClick={handleInitialize}>
                  Inicializar reglas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rbacRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay reglas configuradas</p>
              <p className="text-sm">Haz clic en "Inicializar reglas" para crear las reglas predeterminadas</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Can Chat Matrix */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  ¿Quién puede chatear con quién?
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Rol origen</TableHead>
                        {CHAT_ROLES.map(role => (
                          <TableHead key={role} className="text-center min-w-[80px]">
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABELS[role]}
                            </Badge>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CHAT_ROLES.map(sourceRole => (
                        <TableRow key={sourceRole}>
                          <TableCell className="font-medium">
                            <Badge variant="secondary">{ROLE_LABELS[sourceRole]}</Badge>
                          </TableCell>
                          {CHAT_ROLES.map(targetRole => {
                            const key = `${sourceRole}-${targetRole}-can_chat`;
                            const isUpdating = updating === key;
                            return (
                              <TableCell key={targetRole} className="text-center">
                                {sourceRole === targetRole ? (
                                  <span className="text-muted-foreground text-xs">—</span>
                                ) : (
                                  <Switch
                                    checked={getRuleValue(sourceRole, targetRole, 'can_chat')}
                                    onCheckedChange={(v) => handleToggle(sourceRole, targetRole, 'can_chat', v)}
                                    disabled={isUpdating}
                                  />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Can See in List Matrix */}
              <div>
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  ¿Quién puede ver a quién en la lista?
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Rol origen</TableHead>
                        {CHAT_ROLES.map(role => (
                          <TableHead key={role} className="text-center min-w-[80px]">
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABELS[role]}
                            </Badge>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {CHAT_ROLES.map(sourceRole => (
                        <TableRow key={sourceRole}>
                          <TableCell className="font-medium">
                            <Badge variant="secondary">{ROLE_LABELS[sourceRole]}</Badge>
                          </TableCell>
                          {CHAT_ROLES.map(targetRole => {
                            const key = `${sourceRole}-${targetRole}-can_see_in_list`;
                            const isUpdating = updating === key;
                            return (
                              <TableCell key={targetRole} className="text-center">
                                {sourceRole === targetRole ? (
                                  <span className="text-muted-foreground text-xs">—</span>
                                ) : (
                                  <Switch
                                    checked={getRuleValue(sourceRole, targetRole, 'can_see_in_list')}
                                    onCheckedChange={(v) => handleToggle(sourceRole, targetRole, 'can_see_in_list', v)}
                                    disabled={isUpdating}
                                  />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reglas predeterminadas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Clientes:</strong> Solo pueden chatear con Admin y Estratega</p>
          <p><strong>Equipo interno:</strong> Pueden chatear libremente entre sí (Admin, Estratega, Creador, Editor, Trafficker, Diseñador)</p>
          <p><strong>Grupos:</strong> Los clientes no pueden ser agregados a grupos internos por defecto</p>
        </CardContent>
      </Card>
    </div>
  );
}
