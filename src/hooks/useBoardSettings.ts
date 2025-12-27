import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrganizationStatus {
  id: string;
  organization_id: string;
  status_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface BoardCustomField {
  id: string;
  organization_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'currency' | 'url';
  options: string[] | null;
  is_required: boolean;
  show_in_card: boolean;
  show_in_detail: boolean;
  sort_order: number;
  is_active: boolean;
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

export function useBoardSettings(organizationId: string | null) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BoardSettings | null>(null);
  const [statuses, setStatuses] = useState<OrganizationStatus[]>([]);
  const [rules, setRules] = useState<BoardStatusRule[]>([]);
  const [customFields, setCustomFields] = useState<BoardCustomField[]>([]);
  const [permissions, setPermissions] = useState<BoardPermission[]>([]);

  const fetchAll = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [settingsRes, statusesRes, rulesRes, fieldsRes, permsRes] = await Promise.all([
        supabase
          .from('board_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .single(),
        supabase
          .from('organization_statuses')
          .select('*')
          .eq('organization_id', organizationId)
          .order('sort_order'),
        supabase
          .from('board_status_rules')
          .select('*')
          .eq('organization_id', organizationId),
        supabase
          .from('board_custom_fields')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('board_permissions')
          .select('*')
          .eq('organization_id', organizationId)
      ]);

      if (settingsRes.data) {
        setSettings({
          ...settingsRes.data,
          card_size: settingsRes.data.card_size as 'compact' | 'normal' | 'large',
          default_view: settingsRes.data.default_view as 'kanban' | 'list' | 'calendar' | 'table',
          visible_fields: settingsRes.data.visible_fields as string[],
          visible_sections: settingsRes.data.visible_sections as string[]
        });
      }
      
      setStatuses(statusesRes.data || []);
      setRules((rulesRes.data || []).map(r => ({
        ...r,
        required_fields: r.required_fields as string[],
        allowed_from_statuses: r.allowed_from_statuses || [],
        allowed_roles: r.allowed_roles || [],
        allowed_to_statuses: r.allowed_to_statuses || [],
        auto_actions: r.auto_actions as any[]
      })));
      setCustomFields((fieldsRes.data || []).map(f => ({
        ...f,
        field_type: f.field_type as BoardCustomField['field_type'],
        options: f.options as string[] | null
      })));
      setPermissions((permsRes.data || []).map(p => ({
        ...p,
        allowed_statuses: p.allowed_statuses || null
      })));
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
      toast({ title: 'Configuración guardada' });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  }, [organizationId, settings, toast]);

  // Create status
  const createStatus = useCallback(async (data: { label: string; color: string; status_key: string }) => {
    if (!organizationId) return null;

    try {
      const maxOrder = Math.max(0, ...statuses.map(s => s.sort_order));
      const { data: newStatus, error } = await supabase
        .from('organization_statuses')
        .insert({
          organization_id: organizationId,
          label: data.label,
          color: data.color,
          status_key: data.status_key,
          sort_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

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
        const { data, error } = await supabase
          .from('board_status_rules')
          .insert({
            organization_id: organizationId,
            status_id: statusId,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        setRules(prev => [...prev, {
          ...data,
          required_fields: data.required_fields as string[],
          allowed_from_statuses: data.allowed_from_statuses || [],
          allowed_roles: data.allowed_roles || [],
          allowed_to_statuses: data.allowed_to_statuses || [],
          auto_actions: data.auto_actions as any[]
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
      const { data: newField, error } = await supabase
        .from('board_custom_fields')
        .insert({
          organization_id: organizationId,
          ...data
        })
        .select()
        .single();

      if (error) throw error;

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
        const { data, error } = await supabase
          .from('board_permissions')
          .insert({
            organization_id: organizationId,
            role,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
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

  return {
    loading,
    settings,
    statuses,
    rules,
    customFields,
    permissions,
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
    updatePermission
  };
}
