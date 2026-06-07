import { Crown, Award, Globe, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToggleFollow } from '@/hooks/academy/useAcademyCommunityV3';
import { useAuth } from '@/hooks/useAuth';

interface MemberCardProps {
  spaceId: string;
  spaceOwnerId: string;
  membership: any; // shape de useSpaceMembers
  isFollowing: boolean;
  accentColor?: string;
}

export function MemberCard({
  spaceId,
  spaceOwnerId,
  membership,
  isFollowing,
  accentColor = '#8B5CF6',
}: MemberCardProps) {
  const { user } = useAuth();
  const toggleFollow = useToggleFollow();
  const isOwner = membership.user_id === spaceOwnerId;
  const isInstructor = membership.role === 'instructor';
  const isMe = user?.id === membership.user_id;

  const profile = membership.user;
  const spaceProfile = Array.isArray(membership.space_profile)
    ? membership.space_profile[0]
    : membership.space_profile;
  const points = Array.isArray(membership.points) ? membership.points[0] : membership.points;
  const level = points?.level ?? 1;
  const totalPoints = points?.total_points ?? 0;

  return (
    <Card className="p-5 bg-white/5 border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <Avatar profile={profile} accentColor={accentColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{profile?.full_name ?? 'Miembro'}</h3>
            {isOwner && (
              <span
                className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                title="Owner"
              >
                <Crown className="h-2.5 w-2.5" /> Owner
              </span>
            )}
            {isInstructor && !isOwner && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                Instructor
              </span>
            )}
          </div>
          {spaceProfile?.title && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{spaceProfile.title}</p>
          )}
        </div>
      </div>

      {spaceProfile?.bio && (
        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{spaceProfile.bio}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
        <span className="flex items-center gap-1">
          <Award className="h-3 w-3" style={{ color: accentColor }} />
          Nivel {level}
        </span>
        <span>{totalPoints.toLocaleString()} pts</span>
      </div>

      {/* Social links */}
      {(spaceProfile?.instagram_url ||
        spaceProfile?.linkedin_url ||
        spaceProfile?.website_url) && (
        <div className="flex items-center gap-2 mb-3">
          {spaceProfile.website_url && (
            <SocialLink href={spaceProfile.website_url} icon={Globe} />
          )}
          {spaceProfile.instagram_url && (
            <SocialLink href={spaceProfile.instagram_url} icon={Instagram} />
          )}
          {spaceProfile.linkedin_url && (
            <SocialLink href={spaceProfile.linkedin_url} icon={Linkedin} />
          )}
        </div>
      )}

      {/* Follow button */}
      {!isMe && (
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          size="sm"
          onClick={() =>
            toggleFollow.mutate({ spaceId, targetUserId: membership.user_id })
          }
          disabled={toggleFollow.isPending}
          className={cn('w-full text-xs', !isFollowing && 'text-white')}
          style={!isFollowing ? { backgroundColor: accentColor } : undefined}
        >
          {isFollowing ? 'Siguiendo' : 'Seguir'}
        </Button>
      )}
    </Card>
  );
}

function Avatar({ profile, accentColor }: { profile: any; accentColor: string }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />;
  }
  return (
    <div
      className="h-12 w-12 rounded-full flex items-center justify-center font-semibold text-white"
      style={{ backgroundColor: `${accentColor}40` }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

function SocialLink({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
    </a>
  );
}
