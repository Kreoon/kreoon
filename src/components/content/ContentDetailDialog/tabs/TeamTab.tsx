import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollaboratorSelector } from '@/components/content/CollaboratorSelector';
import { FieldRow } from '../components/SectionCard';
import { EditableField } from '../components/PermissionsGate';
import { TabProps, SelectOption } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { User, Users, Medal, Info, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useInternalOrgContent } from '@/hooks/useInternalOrgContent';

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
  const [editors, setEditors] = useState<SelectOption[]>([]);
  const [strategists, setStrategists] = useState<SelectOption[]>([]);

  // Use centralized hook for internal org content detection
  const { 
    isInternalOrgContent, 
    ambassadors, 
    loading: ambassadorsLoading,
    isAmbassador 
  } = useInternalOrgContent(formData.client_id || content?.client_id);

  useEffect(() => {
    fetchTeamOptions();
  }, [currentOrgId]);

  const fetchTeamOptions = async () => {
    if (!currentOrgId) return;

    // Fetch creators from organization_member_roles
    const { data: creatorRoles } = await supabase
      .from('organization_member_roles')
      .select('user_id')
      .eq('organization_id', currentOrgId)
      .eq('role', 'creator');
    
    if (creatorRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorRoles.map(r => r.user_id));
      setCreators(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    } else {
      setCreators([]);
    }

    // Fetch editors from organization_member_roles
    const { data: editorRoles } = await supabase
      .from('organization_member_roles')
      .select('user_id')
      .eq('organization_id', currentOrgId)
      .eq('role', 'editor');
    
    if (editorRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', editorRoles.map(r => r.user_id));
      setEditors(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    } else {
      setEditors([]);
    }

    // Fetch strategists from organization_member_roles
    const { data: strategistRoles } = await supabase
      .from('organization_member_roles')
      .select('user_id')
      .eq('organization_id', currentOrgId)
      .eq('role', 'strategist');
    
    if (strategistRoles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', strategistRoles.map(r => r.user_id));
      setStrategists(profiles?.map(p => ({ id: p.id, name: p.full_name })) || []);
    } else {
      setStrategists([]);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  // CRITICAL: Use ambassadors list ONLY for internal org content, regular creators otherwise
  const availableCreators = isInternalOrgContent 
    ? ambassadors.map(a => ({ id: a.id, name: a.name }))
    : creators;
    
  const getCreatorName = () => availableCreators.find(c => c.id === formData.creator_id)?.name;
  const getEditorName = () => editors.find(e => e.id === formData.editor_id)?.name;
  const getStrategistName = () => strategists.find(s => s.id === formData.strategist_id)?.name;

  // Check if current creator is valid for internal content
  const currentCreatorValid = !isInternalOrgContent || !formData.creator_id || isAmbassador(formData.creator_id);

  return (
    <div className="space-y-4">
      {/* Internal Organization Content Banner - FIXED AND CLEAR */}
      {isInternalOrgContent && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                🏅 Contenido Interno de la Organización
              </span>
              <span className="text-sm text-muted-foreground">
                Este contenido es creado por embajadores. No tiene pago monetario. La recompensa se otorga en puntos UP.
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning if current creator is not an ambassador but content is internal */}
      {isInternalOrgContent && formData.creator_id && !currentCreatorValid && (
        <Alert variant="destructive">
          <AlertDescription>
            ⚠️ El creador asignado no tiene insignia de Embajador. Solo embajadores pueden crear contenido interno.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Creador / Embajador */}
        <FieldRow label={isInternalOrgContent ? "Embajador" : "Creador"} icon={isInternalOrgContent ? Medal : User}>
          <EditableField
            permissions={permissions}
            resource="content.team"
            editMode={effectiveEditMode}
            readOnly={readOnly}
            editComponent={
              <Select 
                value={formData.creator_id || ''} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, creator_id: v }))}
              >
                <SelectTrigger className={!currentCreatorValid ? 'border-destructive' : ''}>
                  <SelectValue placeholder={isInternalOrgContent ? "Asignar embajador" : "Asignar creador"} />
                </SelectTrigger>
                <SelectContent>
                  {ambassadorsLoading && isInternalOrgContent ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Cargando embajadores...
                    </div>
                  ) : availableCreators.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {isInternalOrgContent 
                        ? "No hay embajadores disponibles. Asigna la insignia de Embajador a usuarios primero." 
                        : "No hay creadores disponibles"}
                    </div>
                  ) : (
                    availableCreators.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {isInternalOrgContent && <Medal className="h-3 w-3 inline mr-2 text-amber-500" />}
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            }
            viewComponent={
              <div className="flex items-center gap-2">
                {isInternalOrgContent && <Medal className="h-4 w-4 text-amber-500" />}
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
