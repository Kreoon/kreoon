import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { Zap, Minus, Plus, Search, Video, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserWithPoints {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  total_points: number;
  current_level: string;
}

type RoleType = 'creator' | 'editor';

export function UPManualAdjustment() {
  const { toast } = useToast();
  const { currentOrgId } = useOrgOwner();
  const [users, setUsers] = useState<UserWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPoints | null>(null);
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [roleType, setRoleType] = useState<RoleType>('creator');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId, roleType]);

  const fetchUsers = async () => {
    try {
      if (!currentOrgId) {
        setUsers([]);
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', currentOrgId);

      if (membersError) throw membersError;

      const memberIds = (membersData || []).map(m => m.user_id);
      if (!memberIds.length) {
        setUsers([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      // Fetch UP points from the appropriate V2 table based on role
      const upTable = roleType === 'creator' ? 'up_creadores' : 'up_editores';
      const { data: upData } = await supabase
        .from(upTable)
        .select('user_id, points')
        .eq('organization_id', currentOrgId)
        .in('user_id', memberIds);

      // Calculate total points per user
      const pointsByUser: Record<string, number> = {};
      (upData || []).forEach((record: any) => {
        pointsByUser[record.user_id] = (pointsByUser[record.user_id] || 0) + (record.points || 0);
      });

      // Determine level based on points
      const getLevel = (points: number): string => {
        if (points >= 5000) return 'diamond';
        if (points >= 2000) return 'gold';
        if (points >= 500) return 'silver';
        return 'bronze';
      };

      const usersWithPoints: UserWithPoints[] = (profiles || []).map(profile => {
        const totalPoints = pointsByUser[profile.id] || 0;
        return {
          ...profile,
          total_points: totalPoints,
          current_level: getLevel(totalPoints)
        };
      });

      setUsers(usersWithPoints.sort((a, b) => b.total_points - a.total_points));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || points <= 0 || !reason.trim() || !currentOrgId) {
      toast({
        title: 'Campos incompletos',
        description: 'Selecciona un usuario, ingresa los puntos y una razón.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const finalPoints = adjustmentType === 'subtract' ? -points : points;
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert into the appropriate UP table based on role type
      // Note: content_id is now nullable for manual adjustments
      if (roleType === 'creator') {
        const { error } = await supabase
          .from('up_creadores')
          .insert({
            user_id: selectedUser.id,
            organization_id: currentOrgId,
            event_type: 'manual_adjustment',
            points: finalPoints,
            description: reason,
            created_by: user?.id,
            content_id: null
          } as any);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('up_editores')
          .insert({
            user_id: selectedUser.id,
            organization_id: currentOrgId,
            event_type: 'manual_adjustment',
            points: finalPoints,
            description: reason,
            created_by: user?.id,
            content_id: null
          } as any);
        
        if (error) throw error;
      }


      toast({
        title: 'Ajuste realizado',
        description: `Se ${adjustmentType === 'add' ? 'agregaron' : 'restaron'} ${points} UP a ${selectedUser.full_name} como ${roleType === 'creator' ? 'Creador' : 'Editor'}.`
      });

      // Reset form
      setSelectedUser(null);
      setPoints(0);
      setReason('');
      fetchUsers();
    } catch (error) {
      console.error('Error adjusting points:', error);
      toast({
        title: 'Error',
        description: 'No se pudo realizar el ajuste de puntos.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const LEVEL_ICONS: Record<string, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Ajuste Manual de Puntos
        </CardTitle>
        <CardDescription>
          Agrega o resta puntos manualmente a usuarios específicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Búsqueda de usuario */}
        <div className="space-y-2">
          <Label>Buscar Usuario</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Lista de usuarios */}
        {searchTerm && (
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
            {filteredUsers.slice(0, 10).map(user => (
              <div
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setSearchTerm('');
                }}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-muted"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span>{LEVEL_ICONS[user.current_level]}</span>
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="font-medium">{user.total_points}</span>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No se encontraron usuarios
              </p>
            )}
          </div>
        )}

        {/* Usuario seleccionado */}
        {selectedUser && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedUser.avatar_url || undefined} />
                <AvatarFallback>
                  {selectedUser.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{selectedUser.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{LEVEL_ICONS[selectedUser.current_level]}</span>
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-bold text-foreground">{selectedUser.total_points} UP</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Cambiar
              </Button>
            </div>
          </div>
        )}

        {/* Tipo de rol */}
        <div className="space-y-2">
          <Label>Rol del Usuario</Label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={roleType === 'creator' ? 'default' : 'outline'}
              onClick={() => setRoleType('creator')}
              className="flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              Creador
            </Button>
            <Button
              variant={roleType === 'editor' ? 'default' : 'outline'}
              onClick={() => setRoleType('editor')}
              className="flex items-center gap-2"
            >
              <Film className="w-4 h-4" />
              Editor
            </Button>
          </div>
        </div>

        {/* Tipo de ajuste */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={adjustmentType === 'add' ? 'default' : 'outline'}
            onClick={() => setAdjustmentType('add')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
          <Button
            variant={adjustmentType === 'subtract' ? 'destructive' : 'outline'}
            onClick={() => setAdjustmentType('subtract')}
            className="flex items-center gap-2"
          >
            <Minus className="w-4 h-4" />
            Restar
          </Button>
        </div>

        {/* Cantidad de puntos */}
        <div className="space-y-2">
          <Label>Cantidad de Puntos</Label>
          <Input
            type="number"
            min="1"
            value={points || ''}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            placeholder="Ingresa la cantidad..."
          />
        </div>

        {/* Razón */}
        <div className="space-y-2">
          <Label>Razón del Ajuste</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica el motivo del ajuste..."
            rows={3}
          />
        </div>

        {/* Preview */}
        {selectedUser && points > 0 && (
          <div className={cn(
            "p-4 rounded-lg border-2",
            adjustmentType === 'add' 
              ? "border-success/50 bg-success/10" 
              : "border-destructive/50 bg-destructive/10"
          )}>
            <p className="text-sm">
              {selectedUser.full_name} pasará de{' '}
              <span className="font-bold">{selectedUser.total_points} UP</span> a{' '}
              <span className="font-bold">
                {adjustmentType === 'add' 
                  ? selectedUser.total_points + points 
                  : Math.max(0, selectedUser.total_points - points)} UP
              </span>
            </p>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedUser || points <= 0 || !reason.trim() || submitting}
          className="w-full"
        >
          {submitting ? 'Procesando...' : 'Aplicar Ajuste'}
        </Button>
      </CardContent>
    </Card>
  );
}
