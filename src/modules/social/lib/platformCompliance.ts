export interface PlatformLimits {
  caption: number;
  hashtags: number;
  requiresDisclosure: boolean;
  requiresBoard?: boolean;
  requiresCategory?: boolean;
  requiresPrivacy?: boolean;
}

export const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  instagram: { caption: 2200, hashtags: 30, requiresDisclosure: true },
  facebook:  { caption: 63206, hashtags: 30, requiresDisclosure: true },
  tiktok:    { caption: 2200, hashtags: 30, requiresDisclosure: false }, // TikTok has its own wizard
  youtube:   { caption: 5000, hashtags: 15, requiresDisclosure: false, requiresCategory: true, requiresPrivacy: true },
  twitter:   { caption: 280, hashtags: 10, requiresDisclosure: false },
  linkedin:  { caption: 3000, hashtags: 30, requiresDisclosure: true },
  pinterest: { caption: 500, hashtags: 20, requiresDisclosure: false, requiresBoard: true },
  threads:   { caption: 500, hashtags: 10, requiresDisclosure: false },
};

/** Returns the most restrictive caption limit among the selected platforms */
export function getMinCaptionLimit(platforms: string[]): number {
  if (platforms.length === 0) return 2200;
  const limits = platforms.map(p => PLATFORM_LIMITS[p]?.caption ?? 2200);
  return Math.min(...limits);
}

/** Returns the most restrictive hashtag limit among the selected platforms */
export function getMinHashtagLimit(platforms: string[]): number {
  if (platforms.length === 0) return 30;
  const limits = platforms.map(p => PLATFORM_LIMITS[p]?.hashtags ?? 30);
  return Math.min(...limits);
}

export interface ComplianceCheck {
  platform: string;
  captionOk: boolean;
  hashtagsOk: boolean;
  captionLength: number;
  captionLimit: number;
  hashtagCount: number;
  hashtagLimit: number;
  requiresDisclosure: boolean;
}

export function checkCompliance(
  platforms: string[],
  caption: string,
  hashtags: string[]
): ComplianceCheck[] {
  return platforms.map(platform => {
    const limits = PLATFORM_LIMITS[platform] ?? { caption: 2200, hashtags: 30, requiresDisclosure: false };
    const captionLength = caption.length;
    const hashtagCount = hashtags.length;
    return {
      platform,
      captionOk: captionLength <= limits.caption,
      hashtagsOk: hashtagCount <= limits.hashtags,
      captionLength,
      captionLimit: limits.caption,
      hashtagCount,
      hashtagLimit: limits.hashtags,
      requiresDisclosure: limits.requiresDisclosure,
    };
  });
}

export const DISCLOSURE_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'youtube'];
