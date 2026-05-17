import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatInTimeZone } from 'date-fns-tz';
import { useTimezone } from '@/hooks/useTimezone';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import type { ScheduledPost } from '../../types/social.types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', youtube: '▶️',
  twitter: '🐦', linkedin: '💼', threads: '🧵', pinterest: '📌',
};

const STATUS_BG: Record<string, string> = {
  published: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  failed: 'bg-red-500/20 text-red-400',
  partially_published: 'bg-yellow-500/20 text-yellow-400',
  draft: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted/50 text-muted-foreground',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface CalendarViewProps {
  onCreatePost?: () => void;
  onViewPost?: (post: ScheduledPost) => void;
}

export function CalendarView({ onCreatePost, onViewPost }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { posts } = useScheduledPosts();
  const { timezone } = useTimezone();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const days: Array<{ date: number; isCurrentMonth: boolean; dateObj: Date }> = [];

    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: prevMonthLast - i, isCurrentMonth: false, dateObj: new Date(year, month - 1, prevMonthLast - i) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: d, isCurrentMonth: true, dateObj: new Date(year, month, d) });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, isCurrentMonth: false, dateObj: new Date(year, month + 1, d) });
    }
    return days;
  }, [year, month]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      const raw = post.scheduled_at || post.created_at;
      const dateStr = formatInTimeZone(new Date(raw), timezone, 'yyyy-MM-dd');
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(post);
    }
    return map;
  }, [posts, timezone]);

  const today = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <h2 className="text-xl font-bold">Tu Calendario</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon" variant="ghost" className="rounded-xl"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button
            size="icon" variant="ghost" className="rounded-xl"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            size="sm" variant="outline" className="rounded-xl text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </Button>
          {onCreatePost && (
            <Button size="sm" className="rounded-xl" onClick={onCreatePost}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo Post
            </Button>
          )}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map(name => (
          <div key={name} className="text-center text-xs font-medium text-muted-foreground py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const dateStr = formatInTimeZone(day.dateObj, timezone, 'yyyy-MM-dd');
          const dayPosts = postsByDate.get(dateStr) || [];
          const isToday = dateStr === today;
          const hasPosts = dayPosts.length > 0;

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[90px] rounded-xl border p-1.5 transition-all group/day',
                !day.isCurrentMonth && 'opacity-40',
                isToday
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                  : hasPosts
                    ? 'border-border/60 bg-card/60 hover:bg-card/80'
                    : 'border-dashed border-border/40 bg-card/20 hover:border-border/60'
              )}
            >
              {/* Day number + quick add */}
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  'text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                  isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}>
                  {day.date}
                </span>
                {day.isCurrentMonth && onCreatePost && (
                  <button
                    onClick={() => onCreatePost()}
                    className="opacity-0 group-hover/day:opacity-100 transition-opacity w-4 h-4 rounded-full bg-primary/20 hover:bg-primary/50 flex items-center justify-center"
                  >
                    <Plus className="w-2.5 h-2.5 text-primary" />
                  </button>
                )}
              </div>

              {/* Post pills */}
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map(post => {
                  const platforms = (post.target_accounts || []).map((t: any) => t.platform);
                  const emoji = PLATFORM_EMOJI[platforms[0]] || '📄';
                  return (
                    <button
                      key={post.id}
                      onClick={() => onViewPost?.(post)}
                      className={cn(
                        'w-full text-left px-1.5 py-0.5 rounded-full text-[9px] truncate flex items-center gap-0.5 transition-opacity hover:opacity-70',
                        STATUS_BG[post.status] || 'bg-muted text-muted-foreground'
                      )}
                    >
                      <span className="shrink-0">{emoji}</span>
                      <span className="truncate">{post.caption?.slice(0, 18) || 'Post'}</span>
                    </button>
                  );
                })}
                {dayPosts.length > 3 && (
                  <p className="text-[9px] text-muted-foreground pl-1.5">
                    +{dayPosts.length - 3} más
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
