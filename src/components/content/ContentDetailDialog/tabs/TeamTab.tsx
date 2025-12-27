import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollaboratorSelector } from '@/components/content/CollaboratorSelector';
import { FieldRow } from '../components/SectionCard';
import { TabProps, SelectOption } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Package } from 'lucide-react';

interface TeamTabProps extends TabProps {
  clients: SelectOption[];
}

export function TeamTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  onUpdate,
  clients
}: TeamTabProps) {
  const canEditTeam = permissions.can('content.team', 'edit');

  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: es });
  };

  useEffect(() => {
    fetchTeamOptions();
  }, []);

  const fetchTeamOptions = async () => {
    // Fetch creators
    const { data: creatorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'creator');
    
    if (creatorRoles?.length) {
      const { data: creatorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorRoles.map(r => r.user_id));
      setCreators(creatorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    // Fetch editors
    const { data: editorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'editor');
    
    if (editorRoles?.length) {
      const { data: editorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', editorRoles.map(r => r.user_id));
      setEditors(editorProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    // Fetch strategists (admins)
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    
    if (adminRoles?.length) {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminRoles.map(r => r.user_id));
      setStrategists(adminProfiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cliente */}
        <FieldRow label="Cliente" icon={Package}>
          {editMode && canEditTeam ? (
            <Select 
              value={formData.client_id} 
              onValueChange={(v) => setFormData((prev) => ({ ...prev, client_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{content?.client?.name || "Sin asignar"}</p>
          )}
        </FieldRow>

        {/* Creador */}
        <FieldRow label="Creador" icon={User}>
          {editMode && canEditTeam ? (
            <Select 
              value={formData.creator_id} 
              onValueChange={(v) => setFormData((prev) => ({ ...prev, creator_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {creators.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{content?.creator?.full_name || "Sin asignar"}</p>
          )}
          {content?.creator_assigned_at && (
            <p className="text-xs text-muted-foreground">
              Asignado: {formatDate(content.creator_assigned_at)}
            </p>
          )}
        </FieldRow>

        {/* Editor */}
        <FieldRow label="Editor" icon={User}>
          {editMode && canEditTeam ? (
            <Select 
              value={formData.editor_id} 
              onValueChange={(v) => setFormData((prev) => ({ ...prev, editor_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {editors.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{content?.editor?.full_name || "Sin asignar"}</p>
          )}
          {content?.editor_assigned_at && (
            <p className="text-xs text-muted-foreground">
              Asignado: {formatDate(content.editor_assigned_at)}
            </p>
          )}
        </FieldRow>

        {/* Estratega */}
        <FieldRow label="Estratega" icon={User}>
          {editMode && canEditTeam ? (
            <Select 
              value={formData.strategist_id} 
              onValueChange={(v) => setFormData((prev) => ({ ...prev, strategist_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {strategists.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{content?.strategist?.full_name || "Sin asignar"}</p>
          )}
        </FieldRow>
      </div>

      {/* Collaborators Section */}
      {content && (
        <div className="pt-4 border-t border-border">
          <CollaboratorSelector 
            contentId={content.id} 
            creatorId={content.creator_id}
            disabled={!editMode || !canEditTeam}
            onChange={onUpdate}
          />
        </div>
      )}
    </div>
  );
}
