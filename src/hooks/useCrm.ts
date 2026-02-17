import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

import * as platformCrm from '@/services/crm/platformCrmService';
import * as orgCrm from '@/services/crm/orgCrmService';

import type {
  PlatformLeadInsert,
  PlatformLeadUpdate,
  OrgContactUpdate,
  OrgContactInsert,
  OrgCreatorRelationshipUpdate,
  OrgPipelineInsert,
  OrgPipelineUpdate,
  OrgContactInteractionInsert,
  PlatformLeadInteractionInsert,
  TalentCategory,
  SpecificRole,
} from '@/types/crm.types';
import type { LeadFilters, LeadDistribution } from '@/services/crm/platformCrmService';
import type { ContactFilters, RelationshipFilters } from '@/services/crm/orgCrmService';

// =====================================================
// PLATFORM CRM HOOKS
// =====================================================

// --- Leads ---

export function usePlatformLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: [
      'platform-leads',
      filters?.stage,
      filters?.lead_type,
      filters?.lead_source,
      filters?.talent_category,
      filters?.specific_role,
      filters?.registration_intent,
      filters?.experience_level,
      filters?.country,
      filters?.search,
      filters?.min_score,
    ],
    queryFn: () => platformCrm.getLeads(filters),
  });
}

export function usePlatformLead(id: string | undefined) {
  return useQuery({
    queryKey: ['platform-lead', id],
    queryFn: () => platformCrm.getLeadById(id!),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlatformLeadInsert) => platformCrm.createLead(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-distribution'] });
      toast.success('Lead creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear lead: ${error.message}`);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlatformLeadUpdate }) =>
      platformCrm.updateLead(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      queryClient.invalidateQueries({ queryKey: ['platform-lead', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-distribution'] });
      toast.success('Lead actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar lead: ${error.message}`);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => platformCrm.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lead-distribution'] });
      toast.success('Lead eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar lead: ${error.message}`);
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, userId }: { leadId: string; userId: string }) =>
      platformCrm.convertLeadToUser(leadId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      toast.success('Lead convertido exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al convertir lead: ${error.message}`);
    },
  });
}

// --- Lead Interactions ---

export function useLeadInteractions(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-interactions', leadId],
    queryFn: () => platformCrm.getLeadInteractions(leadId!),
    enabled: !!leadId,
  });
}

export function useAddLeadInteraction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      leadId,
      data,
    }: {
      leadId: string;
      data: Omit<PlatformLeadInteractionInsert, 'lead_id'>;
    }) => platformCrm.addLeadInteraction(leadId, { ...data, performed_by: user?.id }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-interactions', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['platform-leads'] });
      toast.success('Interacción registrada');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar interacción: ${error.message}`);
    },
  });
}

// --- Stats & Health ---

export function useLeadStats(days: number = 30) {
  return useQuery({
    queryKey: ['lead-stats', days],
    queryFn: () => platformCrm.getLeadStats(days),
  });
}

export function useUsersNeedingAttention() {
  return useQuery({
    queryKey: ['users-needing-attention'],
    queryFn: () => platformCrm.getUsersNeedingAttention(),
  });
}

export function useUserHealth(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-health', userId],
    queryFn: () => platformCrm.getUserHealth(userId!),
    enabled: !!userId,
  });
}

export function useRecalculateHealthScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => platformCrm.recalculateHealthScore(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user-health', userId] });
      queryClient.invalidateQueries({ queryKey: ['users-needing-attention'] });
      toast.success('Health score recalculado');
    },
    onError: (error: Error) => {
      toast.error(`Error al recalcular: ${error.message}`);
    },
  });
}

// --- Dashboard RPCs ---

export function usePlatformOverviewStats() {
  return useQuery({
    queryKey: ['platform-overview-stats'],
    queryFn: () => platformCrm.getPlatformOverviewStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadsByMonth(months: number = 6) {
  return useQuery({
    queryKey: ['leads-by-month', months],
    queryFn: () => platformCrm.getLeadsByMonth(months),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentLeadInteractions(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-lead-interactions', limit],
    queryFn: () => platformCrm.getRecentLeadInteractions(limit),
    staleTime: 2 * 60 * 1000,
  });
}

// --- Category & Role Queries ---

export function useLeadsByCategory(category: TalentCategory | undefined) {
  return useQuery({
    queryKey: ['platform-leads', 'category', category],
    queryFn: () => platformCrm.getLeadsByCategory(category!),
    enabled: !!category,
  });
}

export function useLeadsByRole(role: SpecificRole | undefined) {
  return useQuery({
    queryKey: ['platform-leads', 'role', role],
    queryFn: () => platformCrm.getLeadsByRole(role!),
    enabled: !!role,
  });
}

export function useLeadDistribution() {
  return useQuery({
    queryKey: ['lead-distribution'],
    queryFn: () => platformCrm.getLeadDistribution(),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Organizations ---

export function useOrganizationsWithMetrics() {
  return useQuery({
    queryKey: ['platform-organizations'],
    queryFn: () => platformCrm.getOrganizationsWithMetrics(),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Creators ---

export function useCreatorsWithMetrics() {
  return useQuery({
    queryKey: ['platform-creators'],
    queryFn: () => platformCrm.getCreatorsWithMetrics(),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Users ---

export function useUsersWithHealth() {
  return useQuery({
    queryKey: ['platform-users-health'],
    queryFn: () => platformCrm.getUsersWithHealth(),
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// ORG CRM HOOKS
// =====================================================

// --- Contacts ---

export function useOrgContacts(orgId: string | undefined, filters?: ContactFilters) {
  return useQuery({
    queryKey: ['org-contacts', orgId, filters],
    queryFn: () => orgCrm.getOrgContacts(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useOrgContact(id: string | undefined) {
  return useQuery({
    queryKey: ['org-contact', id],
    queryFn: () => orgCrm.getOrgContactById(id!),
    enabled: !!id,
  });
}

export function useCreateOrgContact(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<OrgContactInsert, 'organization_id'>) =>
      orgCrm.createOrgContact(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-contacts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear contacto: ${error.message}`);
    },
  });
}

export function useUpdateOrgContact(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrgContactUpdate }) =>
      orgCrm.updateOrgContact(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org-contacts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-contact', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      toast.success('Contacto actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar contacto: ${error.message}`);
    },
  });
}

export function useDeleteOrgContact(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orgCrm.deleteOrgContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-contacts', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-clients', orgId] });
      toast.success('Contacto eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar contacto: ${error.message}`);
    },
  });
}

// --- Contact Interactions ---

export function useContactInteractions(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-interactions', contactId],
    queryFn: () => orgCrm.getContactInteractions(contactId!),
    enabled: !!contactId,
  });
}

export function useAddContactInteraction(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      data,
    }: {
      contactId: string;
      data: Omit<OrgContactInteractionInsert, 'contact_id' | 'organization_id'>;
    }) => orgCrm.addContactInteraction(contactId, orgId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-interactions', variables.contactId] });
      toast.success('Interacción registrada');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar interacción: ${error.message}`);
    },
  });
}

// --- Creator Relationships ---

export function useCreatorRelationships(orgId: string | undefined, filters?: RelationshipFilters) {
  return useQuery({
    queryKey: ['org-creator-relationships', orgId, filters],
    queryFn: () => orgCrm.getCreatorRelationships(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useToggleFavoriteCreator(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, isFavorite }: { creatorId: string; isFavorite: boolean }) =>
      isFavorite
        ? orgCrm.removeCreatorFromFavorites(orgId, creatorId)
        : orgCrm.addCreatorToFavorites(orgId, creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-creator-relationships', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-creator-stats', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useBlockCreator(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, reason }: { creatorId: string; reason?: string }) =>
      orgCrm.blockCreator(orgId, creatorId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-creator-relationships', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      toast.success('Creador bloqueado');
    },
    onError: (error: Error) => {
      toast.error(`Error al bloquear creador: ${error.message}`);
    },
  });
}

export function useAddCreatorToList(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, listName }: { creatorId: string; listName: string }) =>
      orgCrm.addCreatorToList(orgId, creatorId, listName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-creator-relationships', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      toast.success('Creador agregado a la lista');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

export function useUpdateCreatorRelationship(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrgCreatorRelationshipUpdate }) =>
      orgCrm.updateCreatorRelationship(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-creator-relationships', orgId] });
      queryClient.invalidateQueries({ queryKey: ['unified-talent', orgId] });
      toast.success('Relación actualizada');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}

// --- Creator Stats ---

export function useOrgCreatorStats(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-creator-stats', orgId],
    queryFn: () => orgCrm.getOrgCreatorStats(orgId!),
    enabled: !!orgId,
  });
}

// --- Pipelines ---

export function useOrgPipelines(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-pipelines', orgId],
    queryFn: () => orgCrm.getOrgPipelines(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateOrgPipeline(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<OrgPipelineInsert, 'organization_id'>) =>
      orgCrm.createOrgPipeline(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
      toast.success('Pipeline creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al crear pipeline: ${error.message}`);
    },
  });
}

export function useUpdateOrgPipeline(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrgPipelineUpdate }) =>
      orgCrm.updateOrgPipeline(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
      toast.success('Pipeline actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar pipeline: ${error.message}`);
    },
  });
}

export function useDeleteOrgPipeline(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orgCrm.deleteOrgPipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-pipelines', orgId] });
      toast.success('Pipeline eliminado');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar pipeline: ${error.message}`);
    },
  });
}

// --- Org Dashboard RPCs ---

export function useOrgCrmOverview(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-crm-overview', orgId],
    queryFn: () => orgCrm.getOrgCrmOverview(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgUpcomingActions(orgId: string | undefined, limit: number = 5) {
  return useQuery({
    queryKey: ['org-upcoming-actions', orgId, limit],
    queryFn: () => orgCrm.getOrgUpcomingActions(orgId!, limit),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrgRecentActivity(orgId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ['org-recent-activity', orgId, limit],
    queryFn: () => orgCrm.getOrgRecentActivity(orgId!, limit),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrgPipelineSummary(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org-pipeline-summary', orgId],
    queryFn: () => orgCrm.getOrgPipelineSummary(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// FULL DETAIL HOOKS (fetch on panel open)
// =====================================================

export function useFullUserDetail(userId: string | undefined) {
  return useQuery({
    queryKey: ['full-user-detail', userId],
    queryFn: () => platformCrm.getFullUserDetail(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFullCreatorDetail(creatorProfileId: string | undefined) {
  return useQuery({
    queryKey: ['full-creator-detail', creatorProfileId],
    queryFn: () => platformCrm.getFullCreatorDetail(creatorProfileId!),
    enabled: !!creatorProfileId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFullOrgCreatorDetail(orgId: string | undefined, creatorId: string | undefined) {
  return useQuery({
    queryKey: ['full-org-creator-detail', orgId, creatorId],
    queryFn: () => orgCrm.getFullOrgCreatorDetail(orgId!, creatorId!),
    enabled: !!orgId && !!creatorId,
    staleTime: 2 * 60 * 1000,
  });
}
