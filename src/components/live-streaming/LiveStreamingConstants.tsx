import { Video, Youtube, Facebook, Instagram, Twitch, Link2 } from 'lucide-react';

// Platform icons mapping
export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  facebook: <Facebook className="h-4 w-4 text-blue-600" />,
  instagram: <Instagram className="h-4 w-4 text-pink-500" />,
  twitch: <Twitch className="h-4 w-4 text-purple-500" />,
  tiktok: <Video className="h-4 w-4" />,
  linkedin: <Link2 className="h-4 w-4 text-blue-700" />,
  custom_rtmp: <Video className="h-4 w-4 text-muted-foreground" />,
};

// Platform options for selects
export const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'custom_rtmp', label: 'RTMP Personalizado' },
];

// Provider options
export const PROVIDER_OPTIONS = [
  { value: 'restream', label: 'Restream', description: 'Multistreaming a 30+ plataformas' },
  { value: 'watchity', label: 'Watchity', description: 'Producción profesional de video' },
  { value: 'custom_rtmp', label: 'RTMP Personalizado', description: 'Configuración manual RTMP' },
];

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
  disconnected: 'bg-muted text-muted-foreground border-border',
  draft: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  live: 'bg-red-500/10 text-red-600 border-red-500/20 animate-pulse',
  ended: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  quoted: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  sold: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  executed: 'bg-green-500/10 text-green-600 border-green-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

// Severity colors for logs
export const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-600',
  warning: 'bg-yellow-500/10 text-yellow-600',
  error: 'bg-red-500/10 text-red-600',
  critical: 'bg-red-600/20 text-red-700',
};

// Event type options
export const EVENT_TYPE_OPTIONS = [
  { value: 'informative', label: 'Informativo' },
  { value: 'shopping', label: 'Live Shopping' },
  { value: 'entertainment', label: 'Entretenimiento' },
  { value: 'educational', label: 'Educativo' },
];

// Sale type options
export const SALE_TYPE_OPTIONS = [
  { value: 'single_event', label: 'Evento Único' },
  { value: 'package', label: 'Paquete de Eventos' },
  { value: 'subscription', label: 'Suscripción Mensual' },
];

// Sale status flow
export const SALE_STATUS_FLOW = ['quoted', 'sold', 'executed', 'paid'];

// Event status flow
export const EVENT_STATUS_FLOW = ['draft', 'scheduled', 'live', 'ended'];
