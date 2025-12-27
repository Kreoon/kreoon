import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollaboratorSelector } from '@/components/content/CollaboratorSelector';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps, SelectOption } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function TeamTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  onUpdate,
}: TabProps) {
  const canEditTeam = permissions.can('content.team', 'edit');
  const [clients, setClients] = useState<SelectOption[]>([]);
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  useEffect(() => {
    fetchTeamOptions();
  }, []);

  const fetchTeamOptions = async () => {
    const { data: clientsData } = await supabase.from('clients').select('id, name').order('name');
    setClients(clientsData || []);

    const { data: creatorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'creator');
    if (creatorRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorRoles.map(r => r.user_id));
      setCreators(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    const { data: editorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'editor');
    if (editorRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', editorRoles.map(r => r.user_id));
      setEditors(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    if (adminRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', adminRoles.map(r => r.user_id));
      setStrategists(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const getClientName = () => clients.find(c => c.id === formData.client_id)?.name || content?.client?.name;
  const getCreatorName = () => creators.find(c => c.id === formData.creator_id)?.name;
  const getEditorName = () => editors.find(e => e.id === formData.editor_id)?.name;
  const getStrategistName = () => strategists.find(s => s.id === formData.strategist_id)?.name;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cliente */}
        <FieldRow label="Cliente" icon={Users}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={editMode}
            editComponent={
              <Select value={formData.client_id || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
            viewComponent={<p className="font-medium">{getClientName() || '—'}</p>}
          />
        </FieldRow>

        {/* Creador */}
        <FieldRow label="Creador" icon={User}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={editMode}
            editComponent={
              <Select value={formData.creator_id || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, creator_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Asignar creador" /></SelectTrigger>
                <SelectContent>
                  {creators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
            viewComponent={
              <div>
                <p className="font-medium">{getCreatorName() || '—'}</p>
                {content?.creator_assigned_at && (
                  <p className="text-xs text-muted-foreground">Asignado: {formatDate(content.creator_assigned_at)}</p>
                )}
              </div>
            }
          />
        </FieldRow>

        {/* Editor */}
        <FieldRow label="Editor" icon={User}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={editMode}
            editComponent={
              <Select value={formData.editor_id || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, editor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Asignar editor" /></SelectTrigger>
                <SelectContent>
                  {editors.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
            viewComponent={
              <div>
                <p className="font-medium">{getEditorName() || '—'}</p>
                {content?.editor_assigned_at && (
                  <p className="text-xs text-muted-foreground">Asignado: {formatDate(content.editor_assigned_at)}</p>
                )}
              </div>
            }
          />
        </FieldRow>

        {/* Estratega */}
        <FieldRow label="Estratega" icon={User}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={editMode}
            editComponent={
              <Select value={formData.strategist_id || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, strategist_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Asignar estratega" /></SelectTrigger>
                <SelectContent>
                  {strategists.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            }
            viewComponent={<p className="font-medium">{getStrategistName() || '—'}</p>}
          />
        </FieldRow>
      </div>

      {/* Collaborators */}
      <div className="mt-6">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Colaboradores
        </h4>
        <CollaboratorSelector
          contentId={content?.id || ''}
          disabled={!editMode || !canEditTeam}
        />
      </div>
    </div>
  );
}
