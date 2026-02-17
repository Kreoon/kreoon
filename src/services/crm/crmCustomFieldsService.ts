import { supabase } from '@/integrations/supabase/client';
import type { CrmCustomFieldDefinition, CrmEntityType, CrmCustomFieldType } from '@/types/crm.types';

export async function getCrmCustomFieldDefs(
  orgId: string,
  entityType: CrmEntityType,
): Promise<CrmCustomFieldDefinition[]> {
  const { data, error } = await (supabase as any)
    .from('crm_custom_field_definitions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as CrmCustomFieldDefinition[];
}

export async function createCrmCustomField(input: {
  organization_id: string;
  entity_type: CrmEntityType;
  name: string;
  field_type: CrmCustomFieldType;
  options?: string[];
  is_required?: boolean;
}): Promise<CrmCustomFieldDefinition> {
  const { data, error } = await (supabase as any)
    .from('crm_custom_field_definitions')
    .insert({
      ...input,
      sort_order: 0,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CrmCustomFieldDefinition;
}

export async function updateCrmCustomField(
  id: string,
  input: Partial<Pick<CrmCustomFieldDefinition, 'name' | 'field_type' | 'options' | 'is_required' | 'sort_order'>>,
): Promise<CrmCustomFieldDefinition> {
  const { data, error } = await (supabase as any)
    .from('crm_custom_field_definitions')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CrmCustomFieldDefinition;
}

export async function deleteCrmCustomField(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('crm_custom_field_definitions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// =====================================================
// CUSTOM FIELD VALUES (JSONB on profiles / org_creator_relationships / platform_leads / org_contacts)
// =====================================================

export async function updateUserCustomFieldValues(
  userId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ crm_custom_fields: fields })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateOrgCreatorCustomFieldValues(
  relationshipId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_creator_relationships')
    .update({ custom_fields: fields })
    .eq('id', relationshipId);
  if (error) throw error;
}

export async function updateLeadCustomFieldValues(
  leadId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('platform_leads')
    .update({ custom_fields: fields })
    .eq('id', leadId);
  if (error) throw error;
}

export async function updateContactCustomFieldValues(
  contactId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_contacts')
    .update({ custom_fields: fields })
    .eq('id', contactId);
  if (error) throw error;
}

// =====================================================
// PROFILE FIELD UPDATES (standard fields on profiles table)
// =====================================================

export async function updateUserProfileFields(
  userId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('profiles')
    .update(data)
    .eq('id', userId);
  if (error) throw error;
}
