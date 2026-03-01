/**
 * Tipos para el sistema de Live Streaming Directo
 */

// ============================================================================
// ENUMS Y CONSTANTES
// ============================================================================

export type LiveStreamStatus = 'idle' | 'connecting' | 'live' | 'ending' | 'ended';

export type ReactionType = 'like' | 'love' | 'fire' | 'clap' | 'wow' | 'sad';

export const LIVE_STREAM_STATUS_LABELS: Record<LiveStreamStatus, string> = {
  idle: 'Inactivo',
  connecting: 'Conectando...',
  live: 'En Vivo',
  ending: 'Finalizando...',
  ended: 'Finalizado',
};

export const LIVE_STREAM_STATUS_COLORS: Record<LiveStreamStatus, string> = {
  idle: 'gray',
  connecting: 'yellow',
  live: 'red',
  ending: 'orange',
  ended: 'gray',
};

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  fire: '🔥',
  clap: '👏',
  wow: '😮',
  sad: '😢',
};

export const LIVE_CATEGORIES = [
  { value: 'talk', label: 'Charla' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Música' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'education', label: 'Educación' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'art', label: 'Arte' },
  { value: 'tech', label: 'Tecnología' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Otro' },
] as const;

// ============================================================================
// INTERFACES DE BASE DE DATOS
// ============================================================================

export interface CreatorLiveStream {
  id: string;
  creator_profile_id: string | null;
  user_id: string;
  organization_id: string | null;

  // Cloudflare
  cf_live_input_id: string | null;
  cf_stream_key: string | null;
  cf_whip_url: string | null;
  cf_playback_url: string | null;
  cf_playback_url_webrtc: string | null;
  cf_thumbnail_url: string | null;
  cf_recording_uid: string | null;

  // Estado
  status: LiveStreamStatus;
  started_at: string | null;
  ended_at: string | null;
  scheduled_at: string | null;

  // Info
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[];

  // Config
  is_shopping_enabled: boolean;
  max_duration_minutes: number;
  allow_comments: boolean;
  allow_reactions: boolean;
  is_unlisted: boolean;
  is_mature_content: boolean;

  // Métricas
  current_viewers: number;
  peak_viewers: number;
  total_views: number;
  total_unique_viewers: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  duration_seconds: number;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LiveStreamWithCreator extends CreatorLiveStream {
  creator_name?: string;
  creator_slug?: string;
  creator_avatar?: string;
  creator_bio?: string;
  creator_rating?: number;
}

export interface LiveStreamViewer {
  id: string;
  stream_id: string;
  user_id: string | null;
  session_id: string;
  joined_at: string;
  left_at: string | null;
  last_ping_at: string;
  watch_duration_seconds: number;
  ip_country: string | null;
  device_type: string | null;
}

export interface LiveStreamComment {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  is_pinned: boolean;
  is_highlighted: boolean;
  is_deleted: boolean;
  donation_amount_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  user_name?: string;
  user_avatar?: string;
}

export interface LiveStreamReaction {
  id: string;
  stream_id: string;
  user_id: string | null;
  session_id: string | null;
  reaction_type: ReactionType;
  created_at: string;
}

export interface LiveStreamProduct {
  id: string;
  stream_id: string;
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  product_price_usd: number | null;
  product_url: string | null;
  is_featured: boolean;
  featured_at: string | null;
  display_order: number;
  clicks: number;
  purchases: number;
  revenue_usd: number;
  created_at: string;
}

// ============================================================================
// TIPOS PARA API
// ============================================================================

export interface CreateLiveInputResponse {
  streamId: string;
  whipUrl: string;
  rtmpsUrl?: string;
  streamKey?: string;
  playbackUrl: string;
  playbackUrlWebrtc: string;
}

export interface StreamCredentials {
  streamId: string;
  whipUrl: string;
  playbackUrl: string;
  playbackUrlWebrtc: string;
  status: LiveStreamStatus;
}

export interface StartStreamParams {
  streamId: string;
  title?: string;
  description?: string;
  category?: string;
  isShoppingEnabled?: boolean;
}

export interface EndStreamResponse {
  success: boolean;
  duration_seconds: number;
  total_views: number;
  peak_viewers: number;
  total_likes: number;
  total_comments: number;
}

export interface ActiveLiveStream {
  id: string;
  user_id: string;
  creator_profile_id: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  cf_playback_url: string;
  cf_playback_url_webrtc: string | null;
  category: string | null;
  current_viewers: number;
  total_likes: number;
  started_at: string;
  is_shopping_enabled: boolean;
  creator_name: string | null;
  creator_slug: string | null;
  creator_avatar: string | null;
  creator_rating: number | null;
}

// ============================================================================
// TIPOS PARA UI
// ============================================================================

export interface GoLiveFormState {
  title: string;
  description: string;
  category: string;
  isShoppingEnabled: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  isUnlisted: boolean;
}

export interface WebcamState {
  isCapturing: boolean;
  hasPermission: boolean | null;
  videoEnabled: boolean;
  audioEnabled: boolean;
  selectedCamera: string | null;
  selectedMic: string | null;
  audioLevel: number;
}

export interface LiveStreamState {
  status: LiveStreamStatus;
  streamId: string | null;
  whipUrl: string | null;
  playbackUrl: string | null;
  startedAt: Date | null;
  duration: number;
  viewers: number;
  likes: number;
  comments: number;
}

// ============================================================================
// TIPOS PARA WHIP CLIENT
// ============================================================================

export interface WHIPClientConfig {
  url: string;
  videoTrack: MediaStreamTrack;
  audioTrack: MediaStreamTrack;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
}

export interface WHIPClientState {
  connectionState: RTCPeerConnectionState;
  isConnected: boolean;
  error: Error | null;
}
