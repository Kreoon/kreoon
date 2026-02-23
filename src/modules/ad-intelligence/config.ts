import type { AdPlatform } from "./types/ad-intelligence.types";

export const PLATFORM_CONFIG: Record<AdPlatform, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  meta: {
    label: "Meta Ads",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    icon: "facebook",
    description: "Facebook & Instagram Ad Library",
  },
  tiktok: {
    label: "TikTok Ads",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    icon: "tiktok",
    description: "TikTok Creative Center Top Ads",
  },
  google: {
    label: "Google Ads",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    icon: "google",
    description: "Google Ads Transparency Center",
  },
};

export const PUBLISHER_PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
  AUDIENCE_NETWORK: "Audience Network",
  TIKTOK: "TikTok",
  GOOGLE: "Google",
  YOUTUBE: "YouTube",
  SEARCH: "Search",
  DISPLAY: "Display",
};

export const COUNTRY_OPTIONS = [
  { value: "ALL", label: "Todos los países" },
  { value: "CO", label: "Colombia" },
  { value: "US", label: "Estados Unidos" },
  { value: "MX", label: "México" },
  { value: "AR", label: "Argentina" },
  { value: "ES", label: "España" },
  { value: "BR", label: "Brasil" },
  { value: "CL", label: "Chile" },
  { value: "PE", label: "Perú" },
  { value: "EC", label: "Ecuador" },
  { value: "GB", label: "Reino Unido" },
  { value: "DE", label: "Alemania" },
  { value: "FR", label: "Francia" },
];

export const MEDIA_TYPE_OPTIONS = [
  { value: "ALL", label: "Todos los formatos" },
  { value: "image", label: "Imagen" },
  { value: "video", label: "Video" },
  { value: "meme", label: "Meme" },
];

export const AD_STATUS_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
];

export const TIKTOK_PERIOD_OPTIONS = [
  { value: 7, label: "Últimos 7 días" },
  { value: 30, label: "Últimos 30 días" },
  { value: 180, label: "Últimos 180 días" },
];

export const COLLECTION_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#a855f7",
];

export const DEFAULT_SEARCH_LIMIT = 50;
export const MAX_SEARCH_LIMIT = 500;
