/**
 * Live Streaming Components - Cloudflare Stream Integration
 *
 * Sistema de transmisión en vivo directo desde el navegador
 * similar a Twitch/Instagram Live
 */

// Badge de "En Vivo"
export { LiveBadge, LiveBadgeOverlay } from './LiveBadge';

// Modal para iniciar transmisión
export { GoLiveModal } from './GoLiveModal';

// Reproductor de video HLS para viewers
export { LivePlayer } from './LivePlayer';

// Chat en tiempo real
export { LiveChat, LiveChatOverlay } from './LiveChat';

// Sistema de reacciones
export { LiveReactions, ReactionBar, LikeButton } from './LiveReactions';

// Cards para mostrar streams
export { LiveCard, LiveCardSkeleton, LiveCardCompact } from './LiveCard';

// Carruseles y grids
export {
  ActiveLivesCarousel,
  ActiveLivesSidebar,
  LivesGrid
} from './ActiveLivesCarousel';
