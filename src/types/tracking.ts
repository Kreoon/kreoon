// Tracking Types for KREOON Tracking Engine (KTE)

export type EventCategory = 
  | 'user' 
  | 'organization' 
  | 'content' 
  | 'project' 
  | 'board' 
  | 'portfolio' 
  | 'chat' 
  | 'ai' 
  | 'navigation' 
  | 'interaction' 
  | 'system';

export type EntityType = 
  | 'user' 
  | 'content' 
  | 'organization' 
  | 'project' 
  | 'chat' 
  | 'portfolio' 
  | 'profile' 
  | 'story' 
  | 'card' 
  | 'message';

export type InsightType = 'alert' | 'recommendation' | 'trend' | 'anomaly';
export type InsightSeverity = 'info' | 'warning' | 'critical';
export type AnalysisFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';

export type TrackingProvider = 
  | 'google_analytics' 
  | 'meta_pixel' 
  | 'tiktok_pixel' 
  | 'linkedin_insight' 
  | 'hotjar' 
  | 'clarity' 
  | 'custom_webhook';

export interface TrackingConfig {
  id: string;
  organizationId: string;
  trackingEnabled: boolean;
  externalTrackingEnabled: boolean;
  anonymizeSensitiveData: boolean;
  requireConsent: boolean;
  debugMode: boolean;
  retentionDays: number;
  allowedEventCategories: EventCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface TrackingIntegration {
  id: string;
  organizationId: string;
  provider: TrackingProvider;
  providerId: string | null;
  apiKey: string | null;
  enabled: boolean;
  eventsAllowed: string[];
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AIInsightsConfig {
  id: string;
  organizationId: string;
  enabled: boolean;
  provider: 'lovable' | 'openai' | 'google';
  model: string;
  analysisFrequency: AnalysisFrequency;
  autoAlertsEnabled: boolean;
  autoRecommendationsEnabled: boolean;
  lastAnalysisAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingAIInsight {
  id: string;
  organizationId: string;
  insightType: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  entityType: EntityType | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  actionTaken: boolean;
  actionTakenAt: string | null;
  actionTakenBy: string | null;
  dismissed: boolean;
  dismissedAt: string | null;
  dismissedBy: string | null;
  createdAt: string;
}

export interface TrackingEvent {
  id: string;
  eventName: string;
  eventCategory: EventCategory;
  organizationId: string | null;
  userId: string | null;
  viewerId: string | null;
  entityType: EntityType | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  context: {
    page?: string;
    module?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
    source?: string;
    referrer?: string;
    sessionId?: string;
  };
  isSensitive: boolean;
  processedAt: string | null;
  createdAt: string;
}

export interface TrackingEventDefinition {
  id: string;
  eventName: string;
  category: EventCategory;
  description: string | null;
  schema: Record<string, unknown>;
  isSensitive: boolean;
  isActive: boolean;
  createdAt: string;
}

// Analytics KPIs
export interface TrackingKPI {
  label: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
}

export interface TrackingAnalytics {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  topEvents: { eventName: string; count: number }[];
  eventsByCategory: { category: EventCategory; count: number }[];
  eventsByDay: { date: string; count: number }[];
  topEntities: { entityType: EntityType; entityId: string; count: number }[];
}

// Dashboard filters
export interface TrackingFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  eventCategories: EventCategory[];
  eventNames: string[];
  entityTypes: EntityType[];
  userId?: string;
}
