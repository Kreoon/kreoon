import type { ContactType, RelationshipStrength } from './crm.types';

export type ClientEntityType = 'empresa' | 'contacto';

export interface UnifiedClientEntity {
  id: string;
  entity_type: ClientEntityType;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  // Empresa fields (null/default for contactos)
  is_vip: boolean;
  is_internal_brand: boolean;
  content_count: number;
  active_projects: number;
  users_count: number;
  username: string | null;
  client_notes: string | null;
  // Contacto fields (null for empresas)
  company: string | null;
  position: string | null;
  contact_type: ContactType | null;
  pipeline_stage: string | null;
  deal_value: number | null;
  expected_close_date: string | null;
  relationship_strength: RelationshipStrength | null;
  contact_notes: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown>;
}

/** A linked company entry for a client user */
export interface LinkedCompany {
  client_id: string;
  client_name: string;
  role: string; // 'owner' | 'admin' | 'viewer'
}

/** A platform user linked to one or more companies via client_users */
export interface ClientUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  bio: string | null;
  created_at: string;
  linked_companies: LinkedCompany[];
}

/** An org member with role=client who is not linked to any company */
export interface UnassignedClientUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}
