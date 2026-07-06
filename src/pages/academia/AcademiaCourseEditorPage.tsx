import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  ActiveView,
  useAdminCourse,
  ModuleTree,
  CourseMetaPanel,
  LessonEditorPanel,
  ModuleEditorPanel,
} from './course-editor';

export default function AcademiaCourseEditorPage() {
  const { spaceSlug, courseSlug } = useParams<{ spaceSlug: string; courseSlug: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading } = useAdminCourse(spaceSlug, courseSlug);
  const [active, setActive] = useState<ActiveView>({ kind: 'course' });

  const accent = course?.space?.accent_color || '#8B5CF6';
  const isOwner = !!user && (course?.space?.owner_id === user.id || course?.instructor_id === user.id);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['academy', 'course', 'admin', spaceSlug, courseSlug] });
  }

  function handleSelectLesson(view: ActiveView) {
    setActive(view);
    // Sync latest lesson data after tree rebuild
    if (view.kind === 'lesson') {
      const mod = course?.modules?.find((m: any) => m.id === view.moduleId);
      const freshLesson = mod?.lessons?.find((l: any) => l.id === view.lesson.id);
      if (freshLesson) setActive({ kind: 'lesson', lesson: freshLesson, moduleId: view.moduleId });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando editor...
      </div>
    );
  }

  if (!course || !isOwner) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <BookOpen className="h-10 w-10" />
        <p>No tienes acceso a editar este curso.</p>
        <Link to={`/academia/${spaceSlug}`} className="text-purple-400 hover:text-purple-300">Volver</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 sticky top-0 z-20 backdrop-blur h-14 flex items-center px-4 md:px-6 gap-4 shrink-0">
        <Link to={`/academia/${spaceSlug}/gestionar`} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{ backgroundColor: `${accent}40` }}
        >
          {course.title.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{course.title}</h1>
          <p className="text-xs text-zinc-500">Editor de curso</p>
        </div>
        <Link to={`/academia/${spaceSlug}/${courseSlug}`} target="_blank">
          <Button variant="outline" size="sm" className="gap-1.5 border-white/10 text-xs shrink-0">
            <Eye className="h-3.5 w-3.5" /> Ver curso
          </Button>
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Module tree sidebar */}
        <ModuleTree
          course={course}
          active={active}
          onSelect={handleSelectLesson}
          onRefresh={refresh}
          accentColor={accent}
        />

        {/* Editor panel */}
        <main className="flex-1 overflow-y-auto">
          {active.kind === 'course' && (
            <CourseMetaPanel course={course} onSaved={refresh} />
          )}
          {active.kind === 'module' && (
            <ModuleEditorPanel
              key={active.module.id}
              module={active.module}
              spaceId={course.space_id}
              accentColor={accent}
              onSaved={(m) => {
                refresh();
                setActive({ kind: 'module', module: m });
              }}
            />
          )}
          {active.kind === 'lesson' && (
            <LessonEditorPanel
              key={active.lesson.id}
              lesson={active.lesson}
              spaceId={course.space_id}
              accentColor={accent}
              onSaved={(updated) => {
                refresh();
                setActive({ kind: 'lesson', lesson: updated, moduleId: active.moduleId });
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
