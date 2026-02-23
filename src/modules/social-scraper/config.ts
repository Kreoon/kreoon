import type { SocialPlatform, TargetType } from "./types/social-scraper.types";

export const SOCIAL_PLATFORM_CONFIG: Record<SocialPlatform, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  instagram: {
    label: "Instagram",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    description: "Posts, Reels, Perfiles, Hashtags",
  },
  tiktok: {
    label: "TikTok",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    description: "Videos, Perfiles, Hashtags, Trends",
  },
  facebook: {
    label: "Facebook",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    description: "Páginas, Posts",
  },
  youtube: {
    label: "YouTube",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    description: "Videos, Shorts, Canales",
  },
  twitter: {
    label: "X / Twitter",
    color: "text-slate-300",
    bgColor: "bg-slate-500/10",
    description: "Tweets, Perfiles, Hashtags",
  },
};

export const TARGET_TYPE_OPTIONS: { value: TargetType; label: string; placeholder: string }[] = [
  { value: "profile", label: "Perfil / Cuenta", placeholder: "@username o URL del perfil" },
  { value: "hashtag", label: "Hashtag", placeholder: "#hashtag" },
  { value: "keyword", label: "Keyword", placeholder: "Término de búsqueda" },
];

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  carousel: "Carousel",
  video: "Video",
  short: "Short",
  tweet: "Tweet",
  retweet: "Retweet",
  quote: "Quote",
  story: "Story",
};

export const DEFAULT_SCRAPE_LIMIT = 30;

export function formatEngagement(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
