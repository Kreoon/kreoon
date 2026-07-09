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
  OrgPipeline,
  FullOrgCreatorDetail,
} from '@/types/crm.types';

// =====================================================
// CONTACTS
// =====================================================

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

// =====================================================
// FULL DETAIL RPCs
// =====================================================

export async function getFullOrgCreatorDetail(orgId: string, creatorId: string): Promise<FullOrgCreatorDetail> {
  const { data, error } = await (supabase as any)
    .rpc('get_org_creator_full_detail', { p_org_id: orgId, p_creator_id: creatorId });
  if (error) throw error;
  return data as FullOrgCreatorDetail;
}
