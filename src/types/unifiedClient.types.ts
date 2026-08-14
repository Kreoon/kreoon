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
  // Datos completos de empresa
  bio: string | null;
  category: string | null;
  main_contact: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  is_public: boolean;
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
  brand_id: string | null;
  brand_slug: string | null;
  brand_website: string | null;
  brand_industry: string | null;
  brand_description: string | null;
  // Origen/Comunidad
  lead_source: string | null;
  community_name: string | null;
  referred_by: string | null;
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
  /** true si este usuario ya fue marcado como lead (existe un org_contacts vinculado) */
  es_lead: boolean;
  /** id del org_contacts creado al marcarlo como lead, null si no está marcado */
  lead_contact_id: string | null;
}

/** An org member with role=client who is not linked to any company */
export interface UnassignedClientUser {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}
