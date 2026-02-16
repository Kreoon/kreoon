// ============================================================
// KAE Ad Platforms Types
// ============================================================

export type AdPlatform = 'meta' | 'tiktok' | 'google' | 'linkedin';

export interface AdPlatformConfig {
  id: string;
  platform: AdPlatform;
  enabled: boolean;
  pixel_id: string | null;
  access_token: string | null;
  dataset_id: string | null;
  api_version: string | null;
  test_mode: boolean;
  test_event_code: string | null;
  event_mapping: EventMapping;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EventMapping {
  signup: string;
  trial_start: string;
  subscription: string;
  content_created: string;
  [key: string]: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export const DEFAULT_EVENT_MAPPINGS: Record<AdPlatform, EventMapping> = {
  meta: {
    signup: 'CompleteRegistration',
    trial_start: 'StartTrial',
    subscription: 'Purchase',
    content_created: 'Lead',
  },
  tiktok: {
    signup: 'CompleteRegistration',
    trial_start: 'Subscribe',
    subscription: 'CompletePayment',
    content_created: 'SubmitForm',
  },
  google: {
    signup: 'sign_up',
    trial_start: 'start_trial',
    subscription: 'purchase',
    content_created: 'generate_lead',
  },
  linkedin: {
    signup: 'signup',
    trial_start: 'start_trial',
    subscription: 'purchase',
    content_created: 'lead',
  },
};

export const PLATFORM_INFO: Record<AdPlatform, {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  docsUrl: string;
  description: string;
}> = {
  meta: {
    name: 'Meta (Facebook/Instagram)',
    color: '#1877F2',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api',
    description: 'Conversions API para Facebook e Instagram Ads',
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    docsUrl: 'https://ads.tiktok.com/marketing_api/docs?id=1739584855420929',
    description: 'Events API para TikTok Ads',
  },
  google: {
    name: 'Google Ads',
    color: '#4285F4',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/conversions/overview',
    description: 'Enhanced Conversions para Google Ads',
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0A66C2',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/conversions-api',
    description: 'Conversions API para LinkedIn Ads (Beta)',
  },
};

/** Ordered list of all supported platforms */
export const ALL_PLATFORMS: AdPlatform[] = ['meta', 'tiktok', 'google', 'linkedin'];
