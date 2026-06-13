import { Crown, Globe, Instagram, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { cn } from '@/lib/utils';
import { safeUrl } from '@/lib/safeUrl';
import { useToggleFollow } from '@/hooks/academy/useAcademyCommunityV3';
import { useAuth } from '@/hooks/useAuth';

const KREOON_PURPLE = '#7c3aed';

interface MemberCardProps {
  spaceId: string;
  spaceOwnerId: string;
  membership: any;
  isFollowing: boolean;
  accentColor?: string;
}

/**
 * MemberCard estilo "perfil de jugador" Kreoon.
 * Avatar grande con halo de nivel, badges visibles, stats prominentes,
 * social links como iconos pills.
 */
export function MemberCard({
  spaceId,
  spaceOwnerId,
  membership,
  isFollowing,
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
  const weekPoints = points?.current_week_points ?? 0;

  return (
    <BigCard className="p-5 md:p-6 flex flex-col">
      {/* Header con avatar grande */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <Avatar profile={profile} />
          {/* Badge nivel flotante */}
          <div
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white border-2 border-kreoon-bg-card shadow-lg"
            style={{ backgroundColor: KREOON_PURPLE }}
            title={`Nivel ${level}`}
          >
            {level}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-extrabold text-base text-white truncate">
              {profile?.full_name ?? 'Miembro'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {isOwner && (
              <span
                className="text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40"
                title="Owner"
              >
                <Crown className="h-2.5 w-2.5" /> Owner
              </span>
            )}
            {isInstructor && !isOwner && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: `${KREOON_PURPLE}40`,
                  backgroundColor: `${KREOON_PURPLE}20`,
                  color: '#c084fc',
                }}
              >
                Instructor
              </span>
            )}
          </div>
          {spaceProfile?.title && (
            <p className="text-xs text-zinc-400 mt-1 truncate">{spaceProfile.title}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {spaceProfile?.bio && (
        <p className="text-sm text-zinc-300 line-clamp-2 mb-4 leading-relaxed">
          {spaceProfile.bio}
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
            ⭐ XP total
          </div>
          <div
            className="text-lg font-extrabold tabular-nums leading-tight"
            style={{ color: KREOON_PURPLE }}
          >
            {totalPoints.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
            🔥 Esta semana
          </div>
          <div
            className="text-lg font-extrabold tabular-nums leading-tight text-zinc-100"
          >
            {weekPoints.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Social links */}
      {(() => {
        const website = safeUrl(spaceProfile?.website_url);
        const instagram = safeUrl(spaceProfile?.instagram_url);
        const linkedin = safeUrl(spaceProfile?.linkedin_url);
        if (!website && !instagram && !linkedin) return null;
        return (
          <div className="flex items-center gap-2 mb-4">
            {website && <SocialLink href={website} icon={Globe} />}
            {instagram && <SocialLink href={instagram} icon={Instagram} />}
            {linkedin && <SocialLink href={linkedin} icon={Linkedin} />}
          </div>
        );
      })()}

      {/* Follow button */}
      {!isMe && (
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          size="sm"
          onClick={() =>
            toggleFollow.mutate({ spaceId, targetUserId: membership.user_id })
          }
          disabled={toggleFollow.isPending}
          className={cn(
            'w-full mt-auto rounded-2xl font-bold text-sm h-10',
            !isFollowing && 'text-white shadow-lg',
            isFollowing && 'border-2 border-white/15 hover:bg-white/5'
          )}
          style={
            !isFollowing
              ? {
                  background: `linear-gradient(135deg, ${KREOON_PURPLE}, #a855f7)`,
                  boxShadow: `0 4px 16px -4px ${KREOON_PURPLE}80`,
                }
              : undefined
          }
        >
          {isFollowing ? '✓ Siguiendo' : '+ Seguir'}
        </Button>
      )}
    </BigCard>
  );
}

function Avatar({ profile }: { profile: any }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="h-16 w-16 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
      />
    );
  }
  return (
    <div
      className="h-16 w-16 rounded-2xl flex items-center justify-center font-extrabold text-white text-xl border-2 border-white/10 shadow-xl"
      style={{
        background: `linear-gradient(135deg, ${KREOON_PURPLE}80, ${KREOON_PURPLE}30)`,
      }}
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
      className="h-8 w-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition-all"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}
