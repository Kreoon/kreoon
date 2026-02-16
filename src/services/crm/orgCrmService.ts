import { supabase } from '@/integrations/supabase/client';
import type {
  OrgContact,
  OrgContactInsert,
  OrgContactUpdate,
  OrgContactInteraction,
  OrgContactInteractionInsert,
  OrgCreatorRelationship,
  OrgCreatorRelationshipInsert,
  OrgCreatorRelationshipUpdate,
  OrgCreatorWithStats,
  OrgPipeline,
  OrgPipelineInsert,
  OrgPipelineUpdate,
  OrgCreatorStats,
  ContactType,
  RelationshipStrength,
  CreatorRelationshipType,
} from '@/types/crm.types';

// =====================================================
// FILTERS
// =====================================================

export interface ContactFilters {
  contact_type?: ContactType;
  pipeline_stage?: string;
  relationship_strength?: RelationshipStrength;
  assigned_to?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface RelationshipFilters {
  relationship_type?: CreatorRelationshipType;
  list_name?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// CONTACTS
// =====================================================

export async function getOrgContacts(orgId: string, filters?: ContactFilters): Promise<OrgContact[]> {
  let query = (supabase as any)
    .from('org_contacts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (filters?.contact_type) query = query.eq('contact_type', filters.contact_type);
  if (filters?.pipeline_stage) query = query.eq('pipeline_stage', filters.pipeline_stage);
  if (filters?.relationship_strength) query = query.eq('relationship_strength', filters.relationship_strength);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.tags?.length) query = query.overlaps('tags', filters.tags);
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as OrgContact[];
}

export async function getOrgContactById(id: string): Promise<OrgContact> {
  const { data, error } = await (supabase as any)
    .from('org_contacts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as OrgContact;
}

export async function createOrgContact(orgId: string, input: Omit<OrgContactInsert, 'organization_id'>): Promise<OrgContact> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from('org_contacts')
    .insert({ organization_id: orgId, created_by: user?.id, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as OrgContact;
}

export async function updateOrgContact(id: string, input: OrgContactUpdate): Promise<OrgContact> {
  const { data, error } = await (supabase as any)
    .from('org_contacts')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as OrgContact;
}

export async function deleteOrgContact(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_contacts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// =====================================================
// CONTACT INTERACTIONS
// =====================================================

export async function getContactInteractions(contactId: string): Promise<OrgContactInteraction[]> {
  const { data, error } = await (supabase as any)
    .from('org_contact_interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as OrgContactInteraction[];
}

export async function addContactInteraction(
  contactId: string,
  orgId: string,
  input: Omit<OrgContactInteractionInsert, 'contact_id' | 'organization_id'>
): Promise<OrgContactInteraction> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from('org_contact_interactions')
    .insert({
      contact_id: contactId,
      organization_id: orgId,
      performed_by: user?.id,
      ...input,
    })
    .select()
    .single();
  if (error) throw error;
  return data as OrgContactInteraction;
}

// =====================================================
// CREATOR RELATIONSHIPS
// =====================================================

export async function getCreatorRelationships(
  orgId: string,
  filters?: RelationshipFilters
): Promise<OrgCreatorWithStats[]> {
  let query = (supabase as any)
    .from('v_org_creators_with_stats')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (filters?.relationship_type) query = query.eq('relationship_type', filters.relationship_type);
  if (filters?.list_name) query = query.eq('list_name', filters.list_name);
  if (filters?.search) {
    query = query.or(`creator_name.ilike.%${filters.search}%,creator_email.ilike.%${filters.search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as OrgCreatorWithStats[];
}

export async function addCreatorRelationship(
  input: OrgCreatorRelationshipInsert
): Promise<OrgCreatorRelationship> {
  const { data, error } = await (supabase as any)
    .from('org_creator_relationships')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as OrgCreatorRelationship;
}

export async function updateCreatorRelationship(
  id: string,
  input: OrgCreatorRelationshipUpdate
): Promise<OrgCreatorRelationship> {
  const { data, error } = await (supabase as any)
    .from('org_creator_relationships')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as OrgCreatorRelationship;
}

export async function deleteCreatorRelationship(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_creator_relationships')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function addCreatorToFavorites(
  orgId: string,
  creatorId: string
): Promise<OrgCreatorRelationship> {
  return addCreatorRelationship({
    organization_id: orgId,
    creator_id: creatorId,
    relationship_type: 'favorite',
  });
}

export async function removeCreatorFromFavorites(orgId: string, creatorId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_creator_relationships')
    .delete()
    .eq('organization_id', orgId)
    .eq('creator_id', creatorId)
    .eq('relationship_type', 'favorite');
  if (error) throw error;
}

export async function blockCreator(
  orgId: string,
  creatorId: string,
  reason?: string
): Promise<OrgCreatorRelationship> {
  return addCreatorRelationship({
    organization_id: orgId,
    creator_id: creatorId,
    relationship_type: 'blocked',
    internal_notes: reason,
  });
}

export async function addCreatorToList(
  orgId: string,
  creatorId: string,
  listName: string
): Promise<OrgCreatorRelationship> {
  return addCreatorRelationship({
    organization_id: orgId,
    creator_id: creatorId,
    relationship_type: 'team_member',
    list_name: listName,
  });
}

// =====================================================
// CREATOR STATS
// =====================================================

export async function getOrgCreatorStats(orgId: string): Promise<OrgCreatorStats> {
  const { data, error } = await (supabase as any)
    .rpc('get_org_creator_stats', { p_org_id: orgId });
  if (error) throw error;
  return data as OrgCreatorStats;
}

// =====================================================
// PIPELINES
// =====================================================

export async function getOrgPipelines(orgId: string): Promise<OrgPipeline[]> {
  const { data, error } = await (supabase as any)
    .from('org_pipelines')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as OrgPipeline[];
}

export async function createOrgPipeline(
  orgId: string,
  input: Omit<OrgPipelineInsert, 'organization_id'>
): Promise<OrgPipeline> {
  const { data, error } = await (supabase as any)
    .from('org_pipelines')
    .insert({ organization_id: orgId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as OrgPipeline;
}

export async function updateOrgPipeline(id: string, input: OrgPipelineUpdate): Promise<OrgPipeline> {
  const { data, error } = await (supabase as any)
    .from('org_pipelines')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as OrgPipeline;
}

export async function deleteOrgPipeline(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_pipelines')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// =====================================================
// DASHBOARD RPCs
// =====================================================

export interface OrgCrmOverview {
  total_contacts: number;
  new_contacts_this_month: number;
  hot_leads: number;
  warm_leads: number;
  total_creators: number;
  favorite_creators: number;
  worked_with_creators: number;
  total_pipelines: number;
  contacts_in_pipeline: number;
  total_deal_value: number;
  total_paid_to_creators: number;
  total_collaborations: number;
}

export interface UpcomingAction {
  id: string;
  next_action: string;
  next_action_date: string;
  interaction_type: string;
  contact_id: string;
  contact_name: string;
  contact_company: string | null;
  assigned_to_name: string | null;
}

export interface OrgRecentActivity {
  id: string;
  interaction_type: string;
  subject: string | null;
  outcome: string | null;
  created_at: string;
  contact_name: string;
  contact_company: string | null;
  performed_by_name: string | null;
}

export interface PipelineStageSummary {
  stage_name: string;
  stage_order: number;
  stage_color: string | null;
  contact_count: number;
  deal_value: number;
}

export interface OrgPipelineSummary {
  pipeline_id: string | null;
  pipeline_name: string | null;
  stages: PipelineStageSummary[];
}

export async function getOrgCrmOverview(orgId: string): Promise<OrgCrmOverview> {
  const { data, error } = await (supabase as any).rpc('get_org_crm_overview', { p_org_id: orgId });
  if (error) throw error;
  return data as OrgCrmOverview;
}

export async function getOrgUpcomingActions(orgId: string, limit: number = 5): Promise<UpcomingAction[]> {
  const { data, error } = await (supabase as any).rpc('get_org_upcoming_actions', { p_org_id: orgId, p_limit: limit });
  if (error) throw error;
  return (data || []) as UpcomingAction[];
}

export async function getOrgRecentActivity(orgId: string, limit: number = 10): Promise<OrgRecentActivity[]> {
  const { data, error } = await (supabase as any).rpc('get_org_recent_activity', { p_org_id: orgId, p_limit: limit });
  if (error) throw error;
  return (data || []) as OrgRecentActivity[];
}

export async function getOrgPipelineSummary(orgId: string): Promise<OrgPipelineSummary> {
  const { data, error } = await (supabase as any).rpc('get_org_pipeline_summary', { p_org_id: orgId });
  if (error) throw error;
  return data as OrgPipelineSummary;
}
