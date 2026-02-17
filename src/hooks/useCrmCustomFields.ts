import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as cfService from '@/services/crm/crmCustomFieldsService';
import type { CrmEntityType, CrmCustomFieldType } from '@/types/crm.types';

export function useCrmCustomFieldDefs(orgId: string | undefined, entityType: CrmEntityType) {
  return useQuery({
    queryKey: ['crm-custom-fields', orgId, entityType],
    queryFn: () => cfService.getCrmCustomFieldDefs(orgId!, entityType),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCrmCustomField(orgId: string, entityType: CrmEntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; field_type: CrmCustomFieldType; options?: string[]; is_required?: boolean }) =>
      cfService.createCrmCustomField({
        organization_id: orgId,
        entity_type: entityType,
        ...input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-custom-fields', orgId, entityType] });
      toast.success('Campo creado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateCrmCustomField(orgId: string, entityType: CrmEntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof cfService.updateCrmCustomField>[1] }) =>
      cfService.updateCrmCustomField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-custom-fields', orgId, entityType] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useDeleteCrmCustomField(orgId: string, entityType: CrmEntityType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cfService.deleteCrmCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-custom-fields', orgId, entityType] });
      toast.success('Campo eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// =====================================================
// CUSTOM FIELD VALUE MUTATIONS (save JSONB values)
// =====================================================

export function useUpdateUserCustomFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, fields }: { userId: string; fields: Record<string, unknown> }) =>
      cfService.updateUserCustomFieldValues(userId, fields),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['full-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['platform-users-health'] });
      toast.success('Campos guardados');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar campos: ${error.message}`);
    },
  });
}

export function useUpdateOrgCreatorCustomFields(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ relationshipId, fields }: { relationshipId: string; fields: Record<string, unknown> }) =>
      cfService.updateOrgCreatorCustomFieldValues(relationshipId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['full-org-creator-detail', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-creator-relationships', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      toast.success('Campos guardados');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar campos: ${error.message}`);
    },
  });
}

export function useUpdateLeadCustomFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, fields }: { leadId: string; fields: Record<string, unknown> }) =>
      cfService.updateLeadCustomFieldValues(leadId, fields),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      queryClient.invalidateQueries({ queryKey: ['platform-lead', variables.leadId] });
      toast.success('Campos guardados');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar campos: ${error.message}`);
    },
  });
}

export function useUpdateContactCustomFields(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, fields }: { contactId: string; fields: Record<string, unknown> }) =>
      cfService.updateContactCustomFieldValues(contactId, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-contacts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      toast.success('Campos guardados');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar campos: ${error.message}`);
    },
  });
}

export function useUpdateUserProfileFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Record<string, unknown> }) =>
      cfService.updateUserProfileFields(userId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['full-user-detail', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['full-creator-detail'] });
      queryClient.invalidateQueries({ queryKey: ['full-org-creator-detail'] });
      queryClient.invalidateQueries({ queryKey: ['platform-users-health'] });
      queryClient.invalidateQueries({ queryKey: ['platform-creators'] });
      queryClient.invalidateQueries({ queryKey: ['org-creator-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['unified-talent'] });
      toast.success('Datos actualizados');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });
}
