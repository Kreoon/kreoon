import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import { PlatformIcon } from '../common/PlatformIcon';
import { PostStatusBadge } from '../common/PostStatusBadge';
import { PLATFORM_COLORS } from '../../config';
import type { ScheduledPost, SocialPlatform } from '../../types/social.types';

interface CalendarViewProps {
  onCreatePost?: () => void;
  onViewPost?: (post: ScheduledPost) => void;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function CalendarView({ onCreatePost, onViewPost }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { posts } = useScheduledPosts();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: number; isCurrentMonth: boolean; dateObj: Date }> = [];

    // Previous month padding
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLast - i,
        isCurrentMonth: false,
        dateObj: new Date(year, month - 1, prevMonthLast - i),
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        isCurrentMonth: true,
        dateObj: new Date(year, month, d),
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: d,
        isCurrentMonth: false,
        dateObj: new Date(year, month + 1, d),
      });
    }

    return days;
  }, [year, month]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      const dateStr = post.scheduled_at
        ? new Date(post.scheduled_at).toISOString().slice(0, 10)
        : post.created_at.slice(0, 10);
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(post);
    }
    return map;
  }, [posts]);

  const today = new Date().toISOString().slice(0, 10);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button size="icon" variant="ghost" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base sm:text-lg font-bold min-w-[140px] sm:min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button size="icon" variant="ghost" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday}>
            Hoy
          </Button>
        </div>

        {onCreatePost && (
          <Button size="sm" onClick={onCreatePost}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Post
          </Button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-x-auto">
        <div className="min-w-[700px]">
        {/* Day names header */}
        <div className="grid grid-cols-7 bg-muted/30">
          {DAY_NAMES.map(name => (
            <div key={name} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center border-b">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dateStr = day.dateObj.toISOString().slice(0, 10);
            const dayPosts = postsByDate.get(dateStr) || [];
            const isToday = dateStr === today;

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[100px] border-b border-r p-1.5 transition-colors',
                  day.isCurrentMonth ? 'bg-card' : 'bg-muted/10',
                  isToday && 'bg-primary/5'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-primary-foreground',
                    !day.isCurrentMonth && 'text-muted-foreground/40'
                  )}>
                    {day.date}
                  </span>
                  {dayPosts.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      {dayPosts.length}
                    </Badge>
                  )}
                </div>

                {/* Post pills */}
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map(post => {
                    const platforms = (post.target_accounts || []).map(
                      (t: any) => t.platform || t.account_id
                    );
                    return (
                      <button
                        key={post.id}
                        onClick={() => onViewPost?.(post)}
                        className={cn(
                          'w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate transition-colors',
                          post.status === 'published'
                            ? 'bg-green-500/15 text-green-400'
                            : post.status === 'scheduled'
                              ? 'bg-blue-500/15 text-blue-400'
                              : post.status === 'failed'
                                ? 'bg-red-500/15 text-red-400'
                                : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {post.scheduled_at && (
                            <span className="opacity-60">
                              {new Date(post.scheduled_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          <span className="truncate">{post.caption?.slice(0, 30) || 'Sin caption'}</span>
                        </div>
                      </button>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <p className="text-[9px] text-muted-foreground px-1.5">
                      +{dayPosts.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
