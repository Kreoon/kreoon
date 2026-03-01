/**
 * LiveViewerPage - Página para ver una transmisión en vivo
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLiveViewer, useIsCreatorLive } from '@/hooks/useLiveViewer';
import { useAuth } from '@/hooks/useAuth';
import {
  LivePlayer,
  LiveChat,
  LiveChatOverlay,
  LiveReactions,
  ReactionBar,
  LikeButton,
} from '@/components/live-streaming';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  ArrowLeft,
  Share2,
  Flag,
  Heart,
  MessageCircle,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LiveViewerPage() {
  const { creatorSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const {
    stream,
    isLoading,
    playbackUrl,
    comments,
    sendComment,
    isSendingComment,
    sendReaction,
    recentReactions,
    viewerCount,
    likeCount,
    isJoined,
  } = useLiveViewer(undefined, creatorSlug);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: stream?.title || 'Live Stream',
          text: `${stream?.creator?.full_name || 'Un creador'} está en vivo en KREOON`,
          url,
        });
      } catch {
        // Usuario canceló el share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    }
  };

  const handleLike = () => {
    sendReaction('heart');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto p-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video rounded-lg" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <Skeleton className="h-[500px] rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stream || stream.status !== 'live') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Transmisión no disponible</h1>
          <p className="text-muted-foreground">
            Este creador no está transmitiendo en este momento.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button onClick={() => navigate('/live')}>
              Ver otros lives
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{stream.title} - En Vivo | KREOON</title>
        <meta
          name="description"
          content={`${stream.creator?.full_name || 'Creador'} está en vivo: ${stream.title}`}
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div
          className={cn(
            'mx-auto',
            isTheaterMode ? 'max-w-full' : 'container max-w-7xl p-4'
          )}
        >
          <div
            className={cn(
              'grid gap-4',
              isTheaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-3'
            )}
          >
            {/* Main content */}
            <div className={cn('space-y-4', isTheaterMode ? '' : 'lg:col-span-2')}>
              {/* Video player */}
              <div className="relative">
                <LivePlayer
                  playbackUrl={playbackUrl}
                  className="rounded-lg overflow-hidden"
                  onError={(err) => console.error('Player error:', err)}
                />

                {/* Floating reactions */}
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                  {recentReactions.map((reaction) => (
                    <div
                      key={reaction.id}
                      className="absolute bottom-16 text-2xl animate-float-up"
                      style={{ left: `${reaction.x}%` }}
                    >
                      {reaction.type === 'heart' && '❤️'}
                      {reaction.type === 'fire' && '🔥'}
                      {reaction.type === 'clap' && '👏'}
                      {reaction.type === 'wow' && '😮'}
                      {reaction.type === 'laugh' && '😂'}
                    </div>
                  ))}
                </div>

                {/* Mobile chat overlay */}
                <div className="lg:hidden">
                  <LiveChatOverlay comments={comments} maxMessages={4} />
                </div>
              </div>

              {/* Stream info */}
              <div className="flex items-start gap-4">
                <Link to={`/creators/${stream.creator?.slug || stream.creator_id}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={stream.creator?.avatar_url} />
                    <AvatarFallback>
                      {getInitials(stream.creator?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-semibold truncate">{stream.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link
                      to={`/creators/${stream.creator?.slug || stream.creator_id}`}
                      className="hover:text-primary"
                    >
                      {stream.creator?.full_name || 'Usuario'}
                    </Link>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {viewerCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <LikeButton count={likeCount} onLike={handleLike} />

                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Description */}
              {stream.description && (
                <p className="text-sm text-muted-foreground">{stream.description}</p>
              )}

              {/* Mobile reactions */}
              <div className="lg:hidden flex items-center justify-center gap-2 py-2">
                <ReactionBar onSendReaction={sendReaction} />
              </div>

              {/* Mobile chat */}
              {showChat && (
                <div className="lg:hidden">
                  <LiveChat
                    comments={comments}
                    onSendComment={sendComment}
                    isSending={isSendingComment}
                    isDisabled={!user}
                    maxHeight="300px"
                  />
                </div>
              )}
            </div>

            {/* Desktop sidebar - Chat */}
            {!isTheaterMode && (
              <div className="hidden lg:flex flex-col h-[calc(100vh-8rem)]">
                <div className="flex items-center justify-between pb-2 border-b">
                  <h2 className="font-semibold">Chat en vivo</h2>
                  <span className="text-xs text-muted-foreground">
                    {viewerCount} espectadores
                  </span>
                </div>

                <div className="flex-1 overflow-hidden">
                  <LiveChat
                    comments={comments}
                    onSendComment={sendComment}
                    isSending={isSendingComment}
                    isDisabled={!user}
                    maxHeight="calc(100vh - 16rem)"
                    className="h-full border-0"
                  />
                </div>

                {/* Reactions */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-center">
                    <ReactionBar onSendReaction={sendReaction} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
