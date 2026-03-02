// Social Hub v2 constants

// Limits
export const MAX_ACCOUNTS_PER_ORG = 50;
export const MAX_GROUPS_PER_ORG = 20;
export const MAX_ACCOUNTS_PER_GROUP = 25;
export const MAX_QUEUE_SLOTS_PER_DAY = 10;
export const MAX_MEDIA_UPLOAD_SIZE_MB = 200;
export const MAX_MEDIA_FILES_PER_POST = 10;

// Queue defaults
export const DEFAULT_TIMEZONE = 'America/Bogota';
export const DEFAULT_QUEUE_SLOTS = [
  { day: 'monday' as const, times: ['09:00', '12:00', '18:00'] },
  { day: 'tuesday' as const, times: ['09:00', '12:00', '18:00'] },
  { day: 'wednesday' as const, times: ['09:00', '12:00', '18:00'] },
  { day: 'thursday' as const, times: ['09:00', '12:00', '18:00'] },
  { day: 'friday' as const, times: ['09:00', '12:00', '18:00'] },
  { day: 'saturday' as const, times: ['10:00', '14:00'] },
  { day: 'sunday' as const, times: ['10:00', '14:00'] },
];

// Supported media types
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const SUPPORTED_MEDIA_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];

// Day names (Spanish)
export const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// Group color presets
export const GROUP_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#a855f7', '#14b8a6', '#64748b',
];
