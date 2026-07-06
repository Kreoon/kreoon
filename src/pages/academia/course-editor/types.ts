import type { ComponentType, SVGProps } from 'react';
import { Video, FileText, HelpCircle, Radio } from 'lucide-react';
import type { AcademyLesson, AcademyModule } from '@/types/academy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonResource {
  name: string;
  url: string;
  type?: string;
}

// Fix 1a: lesson tipado con AcademyLesson en lugar de any
export type ActiveView =
  | { kind: 'course' }
  | { kind: 'module'; module: AcademyModule }
  | { kind: 'lesson'; lesson: AcademyLesson; moduleId: string };

// Fix 1e: LESSON_TYPE_ICON con tipos correctos para componentes React
export type LucideIconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export const LESSON_TYPE_ICON: Record<string, LucideIconComponent> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  live: Radio,
};

export const VIDEO_SOURCES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'bunny', label: 'Bunny CDN' },
  { value: 'drive', label: 'Google Drive' },
  { value: 'url', label: 'URL directa' },
];

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
