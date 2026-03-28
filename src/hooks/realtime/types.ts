/**
 * Tipos compartidos para sincronización realtime del Kanban
 */

import type { Content, ContentStatus } from '@/types/database';
import type { MarketplaceProject, ProjectStatus } from '@/components/marketplace/types/marketplace';

// Payload que envía Supabase Realtime
export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// Tracking de actualizaciones locales para prevenir loops
export interface LocalUpdate {
  timestamp: number;
  fields: Set<string>;
}

// Content row sin enriquecer (como viene de realtime)
export interface ContentRow {
  id: string;
  status: ContentStatus;
  client_id: string | null;
  creator_id: string | null;
  editor_id: string | null;
  organization_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// Marketplace project row (como viene de realtime)
export interface MarketplaceProjectRow {
  id: string;
  status: ProjectStatus;
  creator_id: string;
  brand_id: string | null;
  organization_id: string | null;
  title: string | null;
  total_price: number;
  currency: string;
  deadline: string | null;
  updated_at: string;
  [key: string]: unknown;
}

// Opciones para el hook de realtime
export interface RealtimeContentOptions {
  organizationId: string | null;
  enabled?: boolean;
  onInsert?: (content: ContentRow) => void;
  onUpdate?: (content: ContentRow, oldContent: ContentRow) => void;
  onDelete?: (oldContent: ContentRow) => void;
}

export interface RealtimeMarketplaceOptions {
  userId: string | null;
  role: 'brand' | 'creator' | 'editor';
  brandId?: string;
  enabled?: boolean;
  onInsert?: (project: MarketplaceProjectRow) => void;
  onUpdate?: (project: MarketplaceProjectRow, oldProject: MarketplaceProjectRow) => void;
  onDelete?: (oldProject: MarketplaceProjectRow) => void;
}

// Cache de perfiles para enriquecimiento
export interface ProfileCache {
  clients: Map<string, { id: string; name: string; logo_url: string | null }>;
  creators: Map<string, { id: string; full_name: string }>;
  editors: Map<string, { id: string; full_name: string }>;
}
