import { useMemo } from 'react';
import { Instagram, Music2, Facebook, Linkedin, Twitter, Youtube, Globe } from 'lucide-react';
import { DetailSection } from '@/components/crm/DetailSection';

interface SocialLinksSectionProps {
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  twitter: string | null;
  youtube: string | null;
  portfolioUrl: string | null;
  creatorSocialLinks: Record<string, string> | null;
}

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'tiktok', label: 'TikTok', icon: Music2 },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'twitter', label: 'Twitter / X', icon: Twitter },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'portfolioUrl', label: 'Portafolio', icon: Globe },
] as const;

export function SocialLinksSection({
  instagram,
  tiktok,
  facebook,
  linkedin,
  twitter,
  youtube,
  portfolioUrl,
  creatorSocialLinks,
}: SocialLinksSectionProps) {
  const directProps: Record<string, string | null> = {
    instagram,
    tiktok,
    facebook,
    linkedin,
    twitter,
    youtube,
    portfolioUrl,
  };

  const mergedLinks = useMemo(() => {
    const result: { key: string; label: string; icon: typeof Instagram; url: string }[] = [];

    for (const platform of PLATFORMS) {
      const creatorValue = creatorSocialLinks?.[platform.key];
      const directValue = directProps[platform.key];
      const url = creatorValue || directValue;
      if (url) {
        result.push({ key: platform.key, label: platform.label, icon: platform.icon, url });
      }
    }

    return result;
  }, [instagram, tiktok, facebook, linkedin, twitter, youtube, portfolioUrl, creatorSocialLinks]);

  if (mergedLinks.length === 0) return null;

  return (
    <DetailSection title="Redes sociales">
      <div className="space-y-1.5">
        {mergedLinks.map(({ key, label, icon: Icon, url }) => {
          const href = url.startsWith('http') ? url : `https://${url}`;
          return (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-[#a855f7] transition-colors truncate"
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{label}: {url}</span>
            </a>
          );
        })}
      </div>
    </DetailSection>
  );
}
