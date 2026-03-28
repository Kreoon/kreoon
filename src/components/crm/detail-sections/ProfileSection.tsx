import { Play } from 'lucide-react';
import { DetailSection } from '@/components/crm/DetailSection';

interface ProfileSectionProps {
  bio: string | null;
  bioFull: string | null;
  tagline: string | null;
  bannerUrl: string | null;
  coverUrl: string | null;
  featuredVideoUrl: string | null;
  showreelUrl: string | null;
  showreelThumbnail: string | null;
}

export function ProfileSection({
  bio,
  bioFull,
  tagline,
  bannerUrl,
  coverUrl,
  featuredVideoUrl,
  showreelUrl,
  showreelThumbnail,
}: ProfileSectionProps) {
  const hasData = bio || bioFull || tagline || bannerUrl || coverUrl || featuredVideoUrl || showreelUrl;
  if (!hasData) return null;

  const displayBio = bioFull || bio;
  const displayImage = bannerUrl || coverUrl;
  const videoUrl = showreelUrl || featuredVideoUrl;
  const videoThumb = showreelThumbnail || null;

  return (
    <DetailSection title="Perfil">
      <div className="space-y-3">
        {/* Tagline */}
        {tagline && (
          <p className="text-xs text-[#a855f7] italic leading-relaxed">{tagline}</p>
        )}

        {/* Bio */}
        {displayBio && (
          <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line">{displayBio}</p>
        )}

        {/* Banner / Cover image */}
        {displayImage && (
          <div className="rounded-sm overflow-hidden border border-white/10">
            <img
              src={displayImage}
              alt="Banner"
              className="w-full max-h-32 object-cover"
            />
          </div>
        )}

        {/* Showreel / Featured video */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener"
            className="block relative rounded-sm overflow-hidden border border-white/10 group"
          >
            {videoThumb ? (
              <img
                src={videoThumb}
                alt="Showreel"
                className="w-full max-h-32 object-cover"
              />
            ) : (
              <div className="w-full h-24 bg-white/5 flex items-center justify-center">
                <span className="text-[10px] text-white/30">Video</span>
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play className="h-5 w-5 text-white fill-white" />
              </div>
            </div>
          </a>
        )}
      </div>
    </DetailSection>
  );
}
