/**
 * STREAMING V2 - Tipos TypeScript
 * Hub profesional de Live Streaming + Live Shopping
 */

// ============================================
// ENUMS (match DB)
// ============================================

export type StreamingPlatformType =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'twitch'
  | 'linkedin'
  | 'twitter'
  | 'custom_rtmp'
  | 'kreoon_native';

export type StreamingSessionType =
  | 'standard'
  | 'live_shopping'
  | 'interview'
  | 'webinar'
  | 'launch'
  | 'multi_creator';

export type StreamingSessionStatus =
  | 'draft'
  | 'scheduled'
  | 'pre_live'
  | 'live'
  | 'paused'
  | 'ended'
  | 'cancelled';

export type StreamingChannelStatus =
  | 'pending'
  | 'connecting'
  | 'live'
  | 'error'
  | 'ended';

export type StreamingGuestStatus =
  | 'invited'
  | 'accepted'
  | 'connected'
  | 'on_screen'
  | 'off_screen'
  | 'disconnected';

export type StreamingOverlayType =
  | 'banner'
  | 'lower_third'
  | 'full_screen'
  | 'countdown'
  | 'poll'
  | 'product_card'
  | 'alert'
  | 'logo'
  | 'social_proof'
  | 'ticker'
  | 'custom_html';

export type StreamingChatMessageType =
  | 'text'
  | 'emoji'
  | 'gif'
  | 'product_mention'
  | 'purchase_notification'
  | 'poll_vote'
  | 'question'
  | 'pinned'
  | 'system'
  | 'donation';

// ============================================
// ENTITY INTERFACES
// ============================================

export interface StreamingChannel {
  id: string;
  organization_id: string;
  platform: StreamingPlatformType;
  platform_display_name: string;
  rtmp_url?: string;
  rtmp_key_encrypted?: string;
  backup_rtmp_url?: string;
  oauth_token_encrypted?: string;
  oauth_refresh_token_encrypted?: string;
  oauth_expires_at?: string;
  platform_user_id?: string;
  platform_username?: string;
  is_active: boolean;
  is_primary: boolean;
  max_resolution: string;
  max_bitrate: number;
  custom_overlay_url?: string;
  channel_logo_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface StreamSettings {
  resolution: '720p' | '1080p' | '1440p' | '4k';
  fps: 24 | 30 | 60;
  bitrate: number;
  encoder: 'x264' | 'nvenc' | 'browser';
  audio_bitrate: number;
  latency_mode: 'normal' | 'low' | 'ultra_low';
}

export interface StreamingSession {
  id: string;
  organization_id: string;
  session_type: StreamingSessionType;
  title: string;
  description?: string;
  thumbnail_url?: string;
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  status: StreamingSessionStatus;
  stream_settings: StreamSettings;
  obs_connected: boolean;
  obs_websocket_url?: string;
  obs_current_scene?: string;
  peak_viewers: number;
  total_viewers: number;
  avg_watch_time_seconds: number;
  total_messages: number;
  total_reactions: number;
  is_shopping_enabled: boolean;
  total_revenue_usd: number;
  total_orders: number;
  conversion_rate: number;
  ai_script_id?: string;
  ai_suggestions: AIStreamingSuggestion[];
  recording_url?: string;
  recording_bunny_id?: string;
  recording_duration_seconds?: number;
  host_user_id: string;
  client_id?: string;
  product_id?: string;
  campaign_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  host?: { full_name: string; avatar_url?: string };
  client?: { name: string };
  channels?: StreamingSessionChannel[];
  products?: StreamingProduct[];
}

export interface StreamingSessionChannel {
  id: string;
  session_id: string;
  channel_id: string;
  status: StreamingChannelStatus;
  error_message?: string;
  viewers_current: number;
  viewers_peak: number;
  messages_count: number;
  platform_stream_id?: string;
  platform_broadcast_url?: string;
  started_at?: string;
  ended_at?: string;
  // Joined
  channel?: StreamingChannel;
}

export interface StreamingGuest {
  id: string;
  session_id: string;
  user_id?: string;
  guest_name: string;
  guest_email?: string;
  guest_avatar_url?: string;
  status: StreamingGuestStatus;
  can_share_screen: boolean;
  can_share_audio: boolean;
  can_share_video: boolean;
  can_manage_products: boolean;
  join_token: string;
  joined_at?: string;
  left_at?: string;
  created_at: string;
  // Joined
  user?: { full_name: string; avatar_url?: string };
}

export interface StreamingProduct {
  id: string;
  session_id: string;
  product_id?: string;
  external_product_url?: string;
  title: string;
  description?: string;
  image_url?: string;
  original_price_usd: number;
  live_price_usd?: number;
  discount_percentage?: number;
  total_stock?: number;
  reserved_stock: number;
  sold_count: number;
  is_featured: boolean;
  featured_at?: string;
  display_order: number;
  flash_offer_active: boolean;
  flash_offer_price_usd?: number;
  flash_offer_ends_at?: string;
  flash_offer_stock?: number;
  cta_text: string;
  cta_url?: string;
  clicks: number;
  add_to_cart_count: number;
  purchase_count: number;
  revenue_usd: number;
  created_at: string;
}

export interface StreamingChatMessage {
  id: string;
  session_id: string;
  source_platform: string;
  source_message_id?: string;
  user_id?: string;
  author_name: string;
  author_avatar_url?: string;
  author_platform_id?: string;
  is_moderator: boolean;
  is_host: boolean;
  message_type: StreamingChatMessageType;
  content: string;
  metadata: Record<string, unknown>;
  is_hidden: boolean;
  is_pinned: boolean;
  pinned_at?: string;
  created_at: string;
}

export interface StreamingOverlay {
  id: string;
  organization_id: string;
  name: string;
  overlay_type: StreamingOverlayType;
  content: OverlayContent;
  width?: number;
  height?: number;
  position_x: number;
  position_y: number;
  z_index: number;
  is_template: boolean;
  is_active: boolean;
  enter_animation: string;
  exit_animation: string;
  auto_hide_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface StreamingAnalyticsPoint {
  id: string;
  session_id: string;
  timestamp: string;
  concurrent_viewers: number;
  new_viewers: number;
  messages_count: number;
  reactions_count: number;
  shares_count: number;
  product_clicks: number;
  add_to_cart: number;
  purchases: number;
  revenue_usd: number;
  platform_breakdown: Record<string, PlatformMetrics>;
  featured_product_id?: string;
}

// ============================================
// OVERLAY CONTENT TYPES
// ============================================

export interface BannerOverlayContent {
  text: string;
  bgColor: string;
  textColor: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  animation: string;
}

export interface LowerThirdOverlayContent {
  title: string;
  subtitle?: string;
  logoUrl?: string;
  bgColor: string;
  textColor: string;
}

export interface CountdownOverlayContent {
  targetTime: string;
  label: string;
  style: 'digital' | 'analog' | 'minimal';
  onComplete?: 'hide' | 'flash' | 'explode';
}

export interface PollOverlayContent {
  question: string;
  options: { id: string; text: string; votes: number }[];
  showResults: boolean;
  allowMultiple: boolean;
  endsAt?: string;
}

export interface ProductCardOverlayContent {
  productId: string;
  showPrice: boolean;
  showDiscount: boolean;
  showStock: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface SocialProofOverlayContent {
  type: 'recent_purchase' | 'viewer_count' | 'trending';
  animationSpeed: 'slow' | 'normal' | 'fast';
}

export interface CustomHtmlOverlayContent {
  html: string;
  css: string;
  js?: string;
}

export type OverlayContent =
  | BannerOverlayContent
  | LowerThirdOverlayContent
  | CountdownOverlayContent
  | PollOverlayContent
  | ProductCardOverlayContent
  | SocialProofOverlayContent
  | CustomHtmlOverlayContent
  | Record<string, unknown>;

// ============================================
// ANALYTICS TYPES
// ============================================

export interface PlatformMetrics {
  viewers: number;
  messages: number;
  reactions: number;
  shares: number;
}

export interface SessionAnalyticsSummary {
  total_minutes: number;
  peak_viewers: number;
  avg_viewers: number;
  total_messages: number;
  total_purchases: number;
  total_revenue: number;
  top_products: {
    id: string;
    title: string;
    revenue: number;
    purchases: number;
  }[];
}

export interface LiveShoppingMetrics {
  total_products: number;
  featured_count: number;
  total_clicks: number;
  total_add_to_cart: number;
  total_purchases: number;
  total_revenue_usd: number;
  conversion_rate: number;
  avg_order_value: number;
  flash_offers_active: number;
}

// ============================================
// OBS INTEGRATION TYPES
// ============================================

export interface OBSConnectionState {
  connected: boolean;
  websocket_url?: string;
  password_set: boolean;
  version?: string;
  platform?: string;
  available_scenes: OBSScene[];
  current_scene?: string;
  is_streaming: boolean;
  is_recording: boolean;
  stream_timecode?: string;
  record_timecode?: string;
  stats?: OBSStats;
}

export interface OBSScene {
  name: string;
  sources: OBSSource[];
}

export interface OBSSource {
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  render: boolean;
}

export interface OBSStats {
  fps: number;
  render_total_frames: number;
  render_missed_frames: number;
  output_total_frames: number;
  output_skipped_frames: number;
  average_frame_time: number;
  cpu_usage: number;
  memory_usage: number;
  free_disk_space: number;
}

export interface OBSCommand {
  type:
    | 'set_scene'
    | 'toggle_source'
    | 'start_streaming'
    | 'stop_streaming'
    | 'start_recording'
    | 'stop_recording'
    | 'set_source_visibility'
    | 'refresh_browser_source';
  payload: Record<string, unknown>;
}

// ============================================
// CHAT AGGREGATION TYPES
// ============================================

export interface ChatAggregationConfig {
  platforms: StreamingPlatformType[];
  filter_spam: boolean;
  highlight_questions: boolean;
  highlight_donations: boolean;
  auto_pin_purchases: boolean;
  moderation_level: 'none' | 'light' | 'strict';
  blocked_words: string[];
}

export interface ChatMessageBatch {
  session_id: string;
  messages: StreamingChatMessage[];
  platform_counts: Record<string, number>;
  timestamp: string;
}

// ============================================
// AI TYPES
// ============================================

export interface AIStreamingSuggestion {
  id: string;
  type: 'script' | 'dynamic' | 'product_order' | 'engagement' | 'timing';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  applied: boolean;
}

export interface LiveScriptSection {
  id: string;
  title: string;
  duration_minutes: number;
  content: string;
  talking_points: string[];
  products_to_feature?: string[];
  dynamics?: string[];
}

export interface GeneratedLiveScript {
  id: string;
  session_type: StreamingSessionType;
  total_duration_minutes: number;
  sections: LiveScriptSection[];
  intro: string;
  outro: string;
  emergency_fills: string[];
  created_at: string;
}

export interface StreamingDynamic {
  id: string;
  type: 'poll' | 'trivia' | 'giveaway' | 'countdown' | 'challenge' | 'qa';
  title: string;
  description: string;
  duration_seconds: number;
  config: Record<string, unknown>;
}

// ============================================
// WEBSOCKET MESSAGE TYPES
// ============================================

export type StreamingWSMessageType =
  | 'session_update'
  | 'viewer_count'
  | 'chat_message'
  | 'chat_batch'
  | 'product_featured'
  | 'flash_offer_started'
  | 'flash_offer_ended'
  | 'purchase'
  | 'guest_joined'
  | 'guest_left'
  | 'obs_scene_changed'
  | 'channel_status'
  | 'analytics_update'
  | 'ai_suggestion'
  | 'error';

export interface StreamingWSMessage<T = unknown> {
  type: StreamingWSMessageType;
  session_id: string;
  timestamp: string;
  data: T;
}

export interface ViewerCountUpdate {
  total: number;
  by_platform: Record<string, number>;
  delta: number;
}

export interface PurchaseNotification {
  product_id: string;
  product_title: string;
  buyer_name: string;
  amount_usd: number;
  quantity: number;
  is_flash_offer: boolean;
}

// ============================================
// FORM/INPUT TYPES
// ============================================

export interface CreateSessionInput {
  title: string;
  description?: string;
  session_type: StreamingSessionType;
  scheduled_at?: string;
  is_shopping_enabled: boolean;
  client_id?: string;
  product_id?: string;
  campaign_id?: string;
  channel_ids: string[];
  stream_settings?: Partial<StreamSettings>;
}

export interface CreateChannelInput {
  platform: StreamingPlatformType;
  platform_display_name: string;
  rtmp_url?: string;
  rtmp_key?: string;
  is_primary?: boolean;
  max_resolution?: string;
  max_bitrate?: number;
}

export interface CreateProductInput {
  session_id: string;
  product_id?: string;
  external_product_url?: string;
  title: string;
  description?: string;
  image_url?: string;
  original_price_usd: number;
  live_price_usd?: number;
  total_stock?: number;
  cta_text?: string;
  cta_url?: string;
}

export interface CreateOverlayInput {
  name: string;
  overlay_type: StreamingOverlayType;
  content: OverlayContent;
  width?: number;
  height?: number;
  position_x?: number;
  position_y?: number;
  is_template?: boolean;
  enter_animation?: string;
  exit_animation?: string;
  auto_hide_seconds?: number;
}

export interface InviteGuestInput {
  session_id: string;
  guest_name: string;
  guest_email?: string;
  can_share_screen?: boolean;
  can_share_audio?: boolean;
  can_share_video?: boolean;
  can_manage_products?: boolean;
}

export interface CreateFlashOfferInput {
  product_id: string;
  flash_price_usd: number;
  duration_minutes: number;
  stock?: number;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseStreamingSessionReturn {
  sessions: StreamingSession[];
  currentSession: StreamingSession | null;
  loading: boolean;
  error: Error | null;
  createSession: (input: CreateSessionInput) => Promise<StreamingSession>;
  updateSession: (id: string, updates: Partial<StreamingSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  startSession: (id: string) => Promise<void>;
  pauseSession: (id: string) => Promise<void>;
  endSession: (id: string) => Promise<void>;
  setCurrentSession: (id: string | null) => void;
}

export interface UseStreamingChannelsReturn {
  channels: StreamingChannel[];
  loading: boolean;
  error: Error | null;
  createChannel: (input: CreateChannelInput) => Promise<StreamingChannel>;
  updateChannel: (id: string, updates: Partial<StreamingChannel>) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  testChannel: (id: string) => Promise<{ success: boolean; latency_ms?: number; error?: string }>;
  setPrimaryChannel: (id: string) => Promise<void>;
  connectOAuth: (platform: StreamingPlatformType) => Promise<{ auth_url: string }>;
}

export interface UseStreamingChatReturn {
  messages: StreamingChatMessage[];
  pinnedMessages: StreamingChatMessage[];
  loading: boolean;
  sendMessage: (content: string, type?: StreamingChatMessageType) => Promise<void>;
  pinMessage: (id: string) => Promise<void>;
  unpinMessage: (id: string) => Promise<void>;
  hideMessage: (id: string) => Promise<void>;
  unhideMessage: (id: string) => Promise<void>;
  clearChat: () => Promise<void>;
  filterByPlatform: (platform: string | null) => void;
}

export interface UseStreamingProductsReturn {
  products: StreamingProduct[];
  featuredProduct: StreamingProduct | null;
  loading: boolean;
  addProduct: (input: CreateProductInput) => Promise<StreamingProduct>;
  updateProduct: (id: string, updates: Partial<StreamingProduct>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  featureProduct: (id: string) => Promise<void>;
  unfeatureProduct: () => Promise<void>;
  createFlashOffer: (input: CreateFlashOfferInput) => Promise<void>;
  endFlashOffer: (productId: string) => Promise<void>;
  reorderProducts: (productIds: string[]) => Promise<void>;
}

export interface UseStreamingOverlaysReturn {
  overlays: StreamingOverlay[];
  activeOverlays: StreamingOverlay[];
  templates: StreamingOverlay[];
  loading: boolean;
  createOverlay: (input: CreateOverlayInput) => Promise<StreamingOverlay>;
  updateOverlay: (id: string, updates: Partial<StreamingOverlay>) => Promise<void>;
  deleteOverlay: (id: string) => Promise<void>;
  activateOverlay: (id: string) => Promise<void>;
  deactivateOverlay: (id: string) => Promise<void>;
  saveAsTemplate: (id: string) => Promise<void>;
}

export interface UseStreamingAnalyticsReturn {
  analytics: StreamingAnalyticsPoint[];
  summary: SessionAnalyticsSummary | null;
  shoppingMetrics: LiveShoppingMetrics | null;
  loading: boolean;
  refreshAnalytics: () => Promise<void>;
  exportReport: (format: 'pdf' | 'csv') => Promise<string>;
}

export interface UseOBSConnectionReturn {
  state: OBSConnectionState;
  connecting: boolean;
  error: Error | null;
  connect: (websocket_url: string, password?: string) => Promise<void>;
  disconnect: () => void;
  setScene: (sceneName: string) => Promise<void>;
  toggleSource: (sourceName: string, visible: boolean) => Promise<void>;
  startStreaming: () => Promise<void>;
  stopStreaming: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  refreshBrowserSource: (sourceName: string) => Promise<void>;
}

export interface UseStreamingAIReturn {
  generating: boolean;
  error: Error | null;
  generateScript: (sessionType: StreamingSessionType, context: Record<string, unknown>) => Promise<GeneratedLiveScript>;
  generateDynamics: (count: number, audience: string) => Promise<StreamingDynamic[]>;
  getSuggestions: (sessionId: string) => Promise<AIStreamingSuggestion[]>;
  analyzePerformance: (sessionId: string) => Promise<{ summary: string; recommendations: string[] }>;
}

// ============================================
// CONSTANTS
// ============================================

export const PLATFORM_LABELS: Record<StreamingPlatformType, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitch: 'Twitch',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  custom_rtmp: 'RTMP Personalizado',
  kreoon_native: 'Kreoon Native',
};

export const SESSION_TYPE_LABELS: Record<StreamingSessionType, string> = {
  standard: 'Transmisión Estándar',
  live_shopping: 'Live Shopping',
  interview: 'Entrevista',
  webinar: 'Webinar',
  launch: 'Lanzamiento de Producto',
  multi_creator: 'Multi-Creador',
};

export const SESSION_STATUS_LABELS: Record<StreamingSessionStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programado',
  pre_live: 'Pre-Live',
  live: 'En Vivo',
  paused: 'Pausado',
  ended: 'Finalizado',
  cancelled: 'Cancelado',
};

export const OVERLAY_TYPE_LABELS: Record<StreamingOverlayType, string> = {
  banner: 'Banner',
  lower_third: 'Lower Third',
  full_screen: 'Pantalla Completa',
  countdown: 'Cuenta Regresiva',
  poll: 'Encuesta',
  product_card: 'Tarjeta de Producto',
  alert: 'Alerta',
  logo: 'Logo',
  social_proof: 'Social Proof',
  ticker: 'Ticker',
  custom_html: 'HTML Personalizado',
};
