import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { STATUS_LABELS, STATUS_ORDER } from '@/types/database';

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  script_pending: '#6b7280',
  script_approved: '#3b82f6',
  assigned: '#8b5cf6',
  recording: '#f59e0b',
  recorded: '#10b981',
  editing: '#ec4899',
  delivered: '#14b8a6',
  issue: '#ef4444',
  corrected: '#f97316',
  review: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  paid: '#059669',
  en_campaa: '#a855f7',
  novedad: '#dc2626',
  fidelizar: '#06b6d4',
  enganchar: '#d946ef',
  solucion: '#84cc16',
};

const DEFAULT_STATUS_ICONS: Record<string, string | null> = {
  draft: 'file-plus',
  script_pending: 'file-text',
  script_approved: 'check-circle',
  assigned: 'user-check',
  recording: 'video',
  recorded: 'video-off',
  editing: 'scissors',
  delivered: 'package',
  issue: 'alert-triangle',
  corrected: 'check',
  review: 'eye',
  approved: 'thumbs-up',
  rejected: 'x-circle',
  paid: 'dollar-sign',
  en_campaa: 'megaphone',
};

export interface OrganizationStatus {
  id: string;
  organization_id: string;
  status_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  icon?: string | null;
  description?: string | null;
  created_at: string;
}

export interface StatePermission {
  id: string;
  organization_id: string;
  status_id: string;
  role: string;
  can_view: boolean;
  can_view_assigned_only: boolean;
  can_move_to: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardSettings {
  id: string;
  organization_id: string;
  card_size: 'compact' | 'normal' | 'large';
  visible_fields: string[];
  visible_sections: string[];
  default_view: 'kanban' | 'list' | 'calendar' | 'table';
  created_at: string;
  updated_at: string;
}

export interface BoardStatusRule {
  id: string;
  organization_id: string;
  status_id: string;
  required_fields: string[];
  allowed_from_statuses: string[];
  allowed_roles: string[];
  allowed_to_statuses: string[];
  auto_actions: any[];
  can_advance_roles: string[];
  can_retreat_roles: string[];
  can_view_roles: string[]; // Roles that can see this status
  created_at: string;
  updated_at: string;
}

export interface BoardCustomField {
  id: string;
  organization_id: string;
  name: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox' | 'currency' | 'url' | 'email' | 'phone' | 'rating' | 'color' | 'tags';
  options: string[] | null;
  is_required: boolean;
  show_in_card: boolean;
  show_in_detail: boolean;
  sort_order: number;
  is_active: boolean;
  visible_in_states?: string[];
  created_at: string;
  updated_at: string;
}

export interface BoardPermission {
  id: string;
  organization_id: string;
  role: string;
  can_create_cards: boolean;
  can_move_cards: boolean;
  can_edit_fields: boolean;
  can_delete_cards: boolean;
  can_approve: boolean;
  can_configure_board: boolean;
  allowed_statuses: string[] | null;
}

/**
 * Hook para cargar y gestionar la configuración del board Kanban de una organización.
 * Incluye: settings (vista, tamaño de tarjeta), estados, reglas de movimiento,
 * campos custom, permisos y configuración JSON del Kanban.
 *
 * @param organizationId - ID de la organización; si es null no se hace fetch
 * @returns Estado de carga, settings, statuses, rules, customFields, permissions,
 *          statePermissions, kanbanConfigJson y funciones para actualizar cada parte
 */
export function useBoardSettings(organizationId: string | null) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BoardSettings | null>(null);
  const [statuses, setStatuses] = useState<OrganizationStatus[]>([]);
  const [rules, setRules] = useState<BoardStatusRule[]>([]);
  const [customFields, setCustomFields] = useState<BoardCustomField[]>([]);
  const [permissions, setPermissions] = useState<BoardPermission[]>([]);
  const [statePermissions, setStatePermissions] = useState<StatePermission[]>([]);
  const [kanbanConfigJson, setKanbanConfigJson] = useState<Record<string, unknown> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const statePermsPromise = supabase
        .from('state_permissions')
        .select('*')
        .eq('organization_id', organizationId);

      const [settingsRes, statusesRes, rulesRes, fieldsRes, permsRes, statePermsRes, kanbanConfigRes] = await Promise.all([
        supabase.from('board_settings').select('*').eq('organization_id', organizationId).maybeSingle(),
        supabase.from('organization_statuses').select('*').eq('organization_id', organizationId).order('sort_order'),
        supabase.from('board_status_rules').select('*').eq('organization_id', organizationId),
        supabase.from('board_custom_fields').select('*').eq('organization_id', organizationId).eq('is_active', true).order('sort_order'),
        supabase.from('board_permissions').select('*').eq('organization_id', organizationId),
        statePermsPromise.then((r) => r).catch(() => ({ data: [] })),
        supabase.from('kanban_config').select('config_json').eq('organization_id', organizationId).maybeSingle().then((r) => r).catch(() => ({ data: null })),
      ]);

      if (settingsRes.data) {
        setSettings({
          ...settingsRes.data,
          card_size: settingsRes.data.card_size as 'compact' | 'normal' | 'large',
          default_view: settingsRes.data.default_view as 'kanban' | 'list' | 'calendar' | 'table',
          visible_fields: settingsRes.data.visible_fields as string[],
          visible_sections: settingsRes.data.visible_sections as string[]
        });
      } else if (!settingsRes.error) {
        // Crear board_settings por defecto si no existe
        const { data: newSettings, error: insertErr } = await supabase
          .from('board_settings')
          .insert({
            organization_id: organizationId,
            card_size: 'normal',
            default_view: 'kanban',
            visible_fields: ['title', 'thumbnail', 'status', 'responsible', 'client', 'deadline'],
            visible_sections: ['brief', 'script', 'thumbnail', 'comments', 'history']
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        if (newSettings) {
          setSettings({
            ...newSettings,
            card_size: 'normal',
            default_view: 'kanban',
            visible_fields: newSettings.visible_fields as string[],
            visible_sections: newSettings.visible_sections as string[]
          });
          toast({ title: 'Configuración de tablero creada', description: 'Se creó la configuración inicial.' });
        }
      }
      
      let statusesData = statusesRes.data || [];

      // Obtener estados únicos del contenido para sincronizar
      const { data: contentStatuses } = await supabase
        .from('content')
        .select('status')
        .eq('organization_id', organizationId)
        .not('status', 'is', null);
      const uniqueFromContent = [...new Set((contentStatuses || []).map((r: { status: string }) => r.status).filter(Boolean))];

      // Bootstrap: si organization_statuses está vacío, crear desde content o defaults
      if (statusesData.length === 0) {
        const statusKeysToCreate = uniqueFromContent.length > 0
          ? uniqueFromContent
          : STATUS_ORDER;

        const toInsert = statusKeysToCreate.map((key, idx) => ({
          organization_id: organizationId,
          status_key: key,
          label: (STATUS_LABELS as Record<string, string>)[key] || key.replace(/_/g, ' '),
          color: DEFAULT_STATUS_COLORS[key] || '#a855f7',
          sort_order: idx,
          is_active: true,
          icon: DEFAULT_STATUS_ICONS[key] ?? null,
          description: null,
        }));

        if (toInsert.length > 0) {
          const { data: inserted, error: insertErr } = await supabase
            .from('organization_statuses')
            .upsert(toInsert, { onConflict: ['organization_id', 'status_key'] })
            .select();
          if (insertErr) {
            console.error('Error creando estados por defecto:', insertErr);
            toast({ title: 'No se pudieron crear estados', description: insertErr.message, variant: 'destructive' });
          } else {
            statusesData = inserted || [];
            if (statusesData.length > 0) {
              toast({ title: 'Estados inicializados', description: `Se crearon ${statusesData.length} estados por defecto.` });
            }
          }
        }
      } else {
        // Sincronizar: agregar estados que están en content pero no en organization_statuses
        const existingKeys = new Set(statusesData.map((s: { status_key: string }) => s.status_key));
        const missingKeys = uniqueFromContent.filter((k: string) => !existingKeys.has(k));
        if (missingKeys.length > 0) {
          const maxOrder = Math.max(0, ...statusesData.map((s: { sort_order: number }) => s.sort_order));
          const toInsert = missingKeys.map((key: string, idx: number) => ({
            organization_id: organizationId,
            status_key: key,
            label: (STATUS_LABELS as Record<string, string>)[key] || key.replace(/_/g, ' '),
            color: DEFAULT_STATUS_COLORS[key] || '#a855f7',
            sort_order: maxOrder + idx + 1,
            is_active: true,
            icon: DEFAULT_STATUS_ICONS[key] ?? null,
            description: null,
          }));
          const { data: inserted } = await supabase
            .from('organization_statuses')
            .upsert(toInsert, { onConflict: ['organization_id', 'status_key'] })
            .select();
          if (inserted?.length) {
            statusesData = [...statusesData, ...inserted].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
            toast({ title: 'Estados sincronizados', description: `Se agregaron ${inserted.length} estado(s) desde el contenido.` });
          }
        }
      }

      setStatuses(statusesData);
      setRules((rulesRes.data || []).map(r => ({
        ...r,
        required_fields: r.required_fields as string[],
        allowed_from_statuses: r.allowed_from_statuses || [],
        allowed_roles: r.allowed_roles || [],
        allowed_to_statuses: r.allowed_to_statuses || [],
        auto_actions: r.auto_actions as any[],
        can_advance_roles: (r as any).can_advance_roles || [],
        can_retreat_roles: (r as any).can_retreat_roles || [],
        can_view_roles: (r as any).can_view_roles || ['admin', 'strategist', 'creator', 'editor', 'trafficker', 'designer', 'client']
      })));
      setCustomFields((fieldsRes.data || []).map(f => ({
        ...f,
        field_type: f.field_type as BoardCustomField['field_type'],
        options: f.options as string[] | null,
        visible_in_states: (f.visible_in_states as string[]) || []
      })));
      setPermissions((permsRes.data || []).map(p => ({
        ...p,
        allowed_statuses: p.allowed_statuses || null
      })));
      setStatePermissions(statePermsRes.data || []);
      setKanbanConfigJson((kanbanConfigRes as { data?: { config_json?: Record<string, unknown> } })?.data?.config_json ?? null);
    } catch (error) {
      console.error('Error fetching board settings:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Update board settings
  const updateSettings = useCallback(async (updates: Partial<BoardSettings>) => {
    if (!organizationId || !settings) return;

    try {
      const { error } = await supabase
        .from('board_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      
      // Specific messages based on what was updated
      if (updates.card_size) {
        toast({ title: 'Diseño de tarjeta aplicado', description: `Tamaño: ${updates.card_size === 'compact' ? 'Compacta' : updates.card_size === 'large' ? 'Grande' : 'Normal'}` });
      } else if (updates.visible_fields) {
        toast({ title: 'Campos visibles actualizados' });
      } else if (updates.default_view) {
        toast({ title: 'Vista predeterminada actualizada' });
      } else {
        toast({ title: 'Configuración guardada' });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  }, [organizationId, settings, toast]);

  // Create status
  const createStatus = useCallback(async (data: { label: string; color: string; status_key: string; icon?: string | null; description?: string | null }) => {
    if (!organizationId) return null;

    try {
      const maxOrder = Math.max(0, ...statuses.map(s => s.sort_order));
      const { data: newStatus, error: createErr } = await supabase
        .from('organization_statuses')
        .insert({
          organization_id: organizationId,
          label: data.label,
          color: data.color,
          status_key: data.status_key,
          sort_order: maxOrder + 1,
          icon: data.icon ?? null,
          description: data.description ?? null,
        })
        .select()
        .single();

      if (createErr) throw createErr;

      setStatuses(prev => [...prev, newStatus]);
      toast({ title: 'Estado creado' });
      return newStatus;
    } catch (error: any) {
      console.error('Error creating status:', error);
      toast({ 
        title: 'Error al crear estado', 
        description: error.message?.includes('duplicate') ? 'Ya existe un estado con esa clave' : undefined,
        variant: 'destructive' 
      });
      return null;
    }
  }, [organizationId, statuses, toast]);

  // Update status
  const updateStatus = useCallback(async (statusId: string, updates: Partial<OrganizationStatus>) => {
    try {
      const { error } = await supabase
        .from('organization_statuses')
        .update(updates)
        .eq('id', statusId);

      if (error) throw error;

      setStatuses(prev => prev.map(s => s.id === statusId ? { ...s, ...updates } : s));
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  }, [toast]);

  // Delete status
  const deleteStatus = useCallback(async (statusId: string) => {
    try {
      const { error } = await supabase
        .from('organization_statuses')
        .delete()
        .eq('id', statusId);

      if (error) throw error;

      setStatuses(prev => prev.filter(s => s.id !== statusId));
      toast({ title: 'Estado eliminado' });
    } catch (error) {
      console.error('Error deleting status:', error);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  }, [toast]);

  // Reorder statuses
  const reorderStatuses = useCallback(async (orderedIds: string[]) => {
    try {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('organization_statuses')
          .update({ sort_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      setStatuses(prev => {
        const sorted = [...prev];
        sorted.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
        return sorted.map((s, i) => ({ ...s, sort_order: i }));
      });
    } catch (error) {
      console.error('Error reordering statuses:', error);
      toast({ title: 'Error al reordenar', variant: 'destructive' });
    }
  }, [toast]);

  // Update status rule
  const updateStatusRule = useCallback(async (statusId: string, updates: Partial<BoardStatusRule>) => {
    if (!organizationId) return;

    try {
      const existing = rules.find(r => r.status_id === statusId);
      
      if (existing) {
        const { error } = await supabase
          .from('board_status_rules')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
        setRules(prev => prev.map(r => r.id === existing.id ? { ...r, ...updates } : r));
      } else {
        const { data, error: insertRuleErr } = await supabase
          .from('board_status_rules')
          .insert({
            organization_id: organizationId,
            status_id: statusId,
            ...updates
          })
          .select()
          .single();

        if (insertRuleErr) throw insertRuleErr;
        setRules(prev => [...prev, {
          ...data,
          required_fields: data.required_fields as string[],
          allowed_from_statuses: data.allowed_from_statuses || [],
          allowed_roles: data.allowed_roles || [],
          allowed_to_statuses: data.allowed_to_statuses || [],
          auto_actions: data.auto_actions as any[],
          can_advance_roles: (data as any).can_advance_roles || [],
          can_retreat_roles: (data as any).can_retreat_roles || [],
          can_view_roles: (data as any).can_view_roles || ['admin', 'strategist', 'creator', 'editor', 'trafficker', 'designer', 'client']
        }]);
      }

      toast({ title: 'Regla guardada' });
    } catch (error) {
      console.error('Error updating status rule:', error);
      toast({ title: 'Error al guardar regla', variant: 'destructive' });
    }
  }, [organizationId, rules, toast]);

  // Create custom field
  const createCustomField = useCallback(async (data: Omit<BoardCustomField, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

    try {
      const { data: newField, error: fieldErr } = await supabase
        .from('board_custom_fields')
        .insert({
          organization_id: organizationId,
          ...data
        })
        .select()
        .single();

      if (fieldErr) throw fieldErr;

      setCustomFields(prev => [...prev, {
        ...newField,
        field_type: newField.field_type as BoardCustomField['field_type'],
        options: newField.options as string[] | null
      }]);
      toast({ title: 'Campo creado' });
      return newField;
    } catch (error) {
      console.error('Error creating custom field:', error);
      toast({ title: 'Error al crear campo', variant: 'destructive' });
      return null;
    }
  }, [organizationId, toast]);

  // Update custom field
  const updateCustomField = useCallback(async (fieldId: string, updates: Partial<BoardCustomField>) => {
    try {
      const { error } = await supabase
        .from('board_custom_fields')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', fieldId);

      if (error) throw error;

      setCustomFields(prev => prev.map(f => f.id === fieldId ? { ...f, ...updates } : f));
      toast({ title: 'Campo actualizado' });
    } catch (error) {
      console.error('Error updating custom field:', error);
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  }, [toast]);

  // Delete custom field
  const deleteCustomField = useCallback(async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from('board_custom_fields')
        .update({ is_active: false })
        .eq('id', fieldId);

      if (error) throw error;

      setCustomFields(prev => prev.filter(f => f.id !== fieldId));
      toast({ title: 'Campo eliminado' });
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  }, [toast]);

  // Update permission
  const updatePermission = useCallback(async (role: string, updates: Partial<BoardPermission>) => {
    if (!organizationId) return;

    try {
      const existing = permissions.find(p => p.role === role);
      
      if (existing) {
        const { error } = await supabase
          .from('board_permissions')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
        setPermissions(prev => prev.map(p => p.id === existing.id ? { ...p, ...updates } : p));
      } else {
        const { data, error: permErr } = await supabase
          .from('board_permissions')
          .insert({
            organization_id: organizationId,
            role,
            ...updates
          })
          .select()
          .single();

        if (permErr) throw permErr;
        setPermissions(prev => [...prev, {
          ...data,
          allowed_statuses: data.allowed_statuses || null
        }]);
      }

      toast({ title: 'Permisos actualizados' });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({ title: 'Error al actualizar permisos', variant: 'destructive' });
    }
  }, [organizationId, permissions, toast]);

  // Upsert state permission (matriz estado x rol)
  const upsertStatePermission = useCallback(async (data: {
    status_id: string;
    role: string;
    can_view?: boolean;
    can_view_assigned_only?: boolean;
    can_move_to?: boolean;
    can_edit?: boolean;
  }) => {
    if (!organizationId) return { data: null, error: null };

    try {
      const existing = statePermissions.find(
        p => p.status_id === data.status_id && p.role === data.role
      );

      const payload = {
        organization_id: organizationId,
        status_id: data.status_id,
        role: data.role,
        can_view: data.can_view ?? existing?.can_view ?? true,
        can_view_assigned_only: data.can_view_assigned_only ?? existing?.can_view_assigned_only ?? false,
        can_move_to: data.can_move_to ?? existing?.can_move_to ?? false,
        can_edit: data.can_edit ?? existing?.can_edit ?? false,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { data: updated, error } = await supabase
          .from('state_permissions')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        setStatePermissions(prev =>
          prev.map(p => (p.id === existing.id ? updated : p))
        );
        return { data: updated, error: null };
      } else {
        const { data: inserted, error } = await supabase
          .from('state_permissions')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setStatePermissions(prev => [...prev, inserted]);
        return { data: inserted, error: null };
      }
    } catch (error) {
      console.error('Error upserting state permission:', error);
      toast({ title: 'Error al guardar permiso', variant: 'destructive' });
      return { data: null, error };
    }
  }, [organizationId, statePermissions, toast]);

  // Update kanban config JSON
  const updateKanbanConfig = useCallback(async (config: Record<string, unknown>) => {
    if (!organizationId) return;

    try {
      const { error } = await supabase
        .from('kanban_config')
        .upsert(
          { organization_id: organizationId, config_json: config, updated_at: new Date().toISOString() },
          { onConflict: 'organization_id' }
        );

      if (error) throw error;
      setKanbanConfigJson(config);
      toast({ title: 'Configuración guardada' });
    } catch (error) {
      console.error('Error updating kanban config:', error);
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    }
  }, [organizationId, toast]);

  return {
    loading,
    settings,
    statuses,
    rules,
    customFields,
    permissions,
    statePermissions,
    kanbanConfigJson,
    refetch: fetchAll,
    updateSettings,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    updateStatusRule,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    updatePermission,
    upsertStatePermission,
    updateKanbanConfig,
  };
}
