import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AlertTriangle, UserX, RefreshCw } from 'lucide-react';
import { useReassignmentCheck } from '@/hooks/useReassignmentCheck';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReassignmentAlertProps {
  organizationId: string;
}

interface ContentForReassignment {
  id: string;
  title: string;
  status: string;
  creator_id: string | null;
  editor_id: string | null;
  recording_at: string | null;
  editing_at: string | null;
  creator_name?: string;
  editor_name?: string;
  days_overdue: number;
  reassignment_type: 'creator' | 'editor';
}

interface AvailableUser {
  id: string;
  full_name: string;
}

export function ReassignmentAlert({ organizationId }: ReassignmentAlertProps) {
  const [contentNeedingReassignment, setContentNeedingReassignment] = useState<ContentForReassignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentForReassignment | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);

  const { checkContentForReassignment, reassignCreator, reassignEditor } = useReassignmentCheck();

  const fetchReassignmentNeeds = async () => {
    setLoading(true);
    const content = await checkContentForReassignment(organizationId);
    setContentNeedingReassignment(content);
    setLoading(false);
  };

  useEffect(() => {
    if (organizationId) {
      fetchReassignmentNeeds();
    }
  }, [organizationId]);

  const fetchAvailableUsers = async (type: 'creator' | 'editor') => {
    try {
      // Fetch all profiles and filter by organization membership
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
      }

      if (!membersData || membersData.length === 0) {
        setAvailableUsers([]);
        return;
      }

      const memberIds = membersData.map(m => m.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', memberIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const users: AvailableUser[] = (profilesData || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Sin nombre'
      }));

      setAvailableUsers(users);
    } catch (err) {
      console.error('Error fetching available users:', err);
    }
  };

  const handleOpenReassign = async (content: ContentForReassignment) => {
    setSelectedContent(content);
    setSelectedUserId('');
    await fetchAvailableUsers(content.reassignment_type);
  };

  const handleReassign = async () => {
    if (!selectedContent || !selectedUserId) return;

    setReassigning(true);
    let success = false;

    if (selectedContent.reassignment_type === 'creator') {
      success = await reassignCreator(selectedContent.id, selectedUserId);
    } else {
      success = await reassignEditor(selectedContent.id, selectedUserId);
    }

    if (success) {
      toast.success('Contenido reasignado correctamente');
      setSelectedContent(null);
      await fetchReassignmentNeeds();
    } else {
      toast.error('Error al reasignar el contenido');
    }

    setReassigning(false);
  };

  if (loading) return null;

  if (contentNeedingReassignment.length === 0) return null;

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Contenido requiere reasignación
          <Badge variant="destructive">{contentNeedingReassignment.length}</Badge>
        </AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            {contentNeedingReassignment.map((content) => (
              <div 
                key={content.id} 
                className="flex items-center justify-between p-2 bg-destructive/10 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-destructive" />
                  <span className="font-medium">{content.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {content.reassignment_type === 'creator' ? 'Creador' : 'Editor'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {content.reassignment_type === 'creator' 
                      ? content.creator_name 
                      : content.editor_name}
                  </span>
                  <span className="text-xs text-destructive">
                    +{content.days_overdue} días de retraso
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleOpenReassign(content)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reasignar
                </Button>
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar contenido</DialogTitle>
            <DialogDescription>
              Selecciona un nuevo {selectedContent?.reassignment_type === 'creator' ? 'creador' : 'editor'} para "{selectedContent?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={`Seleccionar ${selectedContent?.reassignment_type === 'creator' ? 'creador' : 'editor'}`} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers
                  .filter(u => u.id !== (selectedContent?.reassignment_type === 'creator' 
                    ? selectedContent?.creator_id 
                    : selectedContent?.editor_id))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedContent(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReassign} 
              disabled={!selectedUserId || reassigning}
            >
              {reassigning ? 'Reasignando...' : 'Confirmar reasignación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
