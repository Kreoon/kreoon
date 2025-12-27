import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollaboratorSelector } from '@/components/content/CollaboratorSelector';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps, SelectOption } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { User, Users, Medal, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export function TeamTab({
  content,
  formData,
  setFormData,
  editMode,
  permissions,
  onUpdate,
  readOnly = false,
}: TabProps) {
  const { currentOrgId } = useOrgOwner();
  const canEditTeam = permissions.can('content.team', 'edit') && !readOnly;
  const effectiveEditMode = editMode && !readOnly;
  const [creators, setCreators] = useState<SelectOption[]>([]);
  const [ambassadors, setAmbassadors] = useState<SelectOption[]>([]);
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  // Detect if content is ambassador type
  const isAmbassadorContent = content?.is_ambassador_content === true;

  useEffect(() => {
    fetchTeamOptions();
  }, [currentOrgId]);

  const fetchTeamOptions = async () => {
    // Fetch regular creators
    const { data: creatorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'creator');
    if (creatorRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorRoles.map(r => r.user_id));
      setCreators(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    }

    // Fetch ambassadors
    if (currentOrgId) {
      const { data: ambassadorRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('role', 'ambassador');
      
      if (ambassadorRoles?.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ambassadorRoles.map(r => r.user_id));
        setAmbassadors(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
      } else {
        setAmbassadors([]);
      }
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

  // Use ambassadors list for ambassador content, regular creators otherwise
  const availableCreators = isAmbassadorContent ? ambassadors : creators;
  const getCreatorName = () => availableCreators.find(c => c.id === formData.creator_id)?.name;
  const getEditorName = () => editors.find(e => e.id === formData.editor_id)?.name;
  const getStrategistName = () => strategists.find(s => s.id === formData.strategist_id)?.name;

  return (
    <div className="space-y-4">
      {/* Ambassador content badge */}
      {isAmbassadorContent && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Medal className="h-5 w-5 text-amber-500" />
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-500/10">
                  🏅 Proyecto de Marca Interna – Solo Embajadores
                </Badge>
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Este contenido se produce sin pago monetario. La recompensa se otorga en puntos UP según las reglas de la organización.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Creador / Embajador */}
        <FieldRow label={isAmbassadorContent ? "Embajador" : "Creador"} icon={isAmbassadorContent ? Medal : User}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Select value={formData.creator_id || ''} onValueChange={(v) => setFormData(prev => ({ ...prev, creator_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={isAmbassadorContent ? "Asignar embajador" : "Asignar creador"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCreators.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {isAmbassadorContent 
                        ? "No hay embajadores disponibles" 
                        : "No hay creadores disponibles"}
                    </div>
                  ) : (
                    availableCreators.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {isAmbassadorContent && <Medal className="h-3 w-3 inline mr-2 text-amber-500" />}
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            }
            viewComponent={
              <div className="flex items-center gap-2">
                {isAmbassadorContent && <Medal className="h-4 w-4 text-amber-500" />}
                <div>
                  <p className="font-medium">{getCreatorName() || '—'}</p>
                  {content?.creator_assigned_at && (
                    <p className="text-xs text-muted-foreground">Asignado: {formatDate(content.creator_assigned_at)}</p>
                  )}
                </div>
              </div>
            }
          />
        </FieldRow>

        {/* Editor */}
        <FieldRow label="Editor" icon={User}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={effectiveEditMode}
            readOnly={readOnly}
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
            editMode={effectiveEditMode}
            readOnly={readOnly}
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
          disabled={!effectiveEditMode || !canEditTeam}
        />
      </div>
    </div>
  );
}
