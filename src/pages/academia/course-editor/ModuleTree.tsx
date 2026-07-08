import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Settings2, Pencil, Lock, Trash2, Video, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateLesson,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useDeleteLesson,
} from '@/hooks/academy/useAcademyCourse';
import type { AcademyLesson, AcademyModule } from '@/types/academy';
import { type ActiveView, LESSON_TYPE_ICON } from './types';

// ─── Module tree ──────────────────────────────────────────────────────────────

export function ModuleTree({
  course,
  active,
  onSelect,
  onRefresh,
  accentColor,
}: {
  course: any;
  active: ActiveView;
  onSelect: (v: ActiveView) => void;
  onRefresh: () => void;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<string>('video');

  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const qc = useQueryClient();

  const modules: AcademyModule[] = (course.modules ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order);

  function toggleModule(id: string) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }

  async function handleAddModule() {
    const order = modules.length;
    const mod = await createModule.mutateAsync({
      course_id: course.id,
      title: `Módulo ${order + 1}`,
      sort_order: order,
    });
    setExpanded((p) => ({ ...p, [mod.id]: true }));
    setEditingModuleId(mod.id);
    setModuleTitle(`Módulo ${order + 1}`);
    onRefresh();
  }

  async function handleSaveModuleTitle(modId: string) {
    if (!moduleTitle.trim()) return;
    await updateModule.mutateAsync({ id: modId, updates: { title: moduleTitle } });
    setEditingModuleId(null);
    onRefresh();
  }

  // Fix 1d: incluir el nombre del módulo en el mensaje de confirmación de borrado
  async function handleDeleteModule(modId: string) {
    const mod = modules.find((m: any) => m.id === modId);
    const modName = mod?.title ? ` "${mod.title}"` : '';
    if (!confirm(`¿Eliminar el módulo${modName} y todas sus lecciones?`)) return;
    await deleteModule.mutateAsync(modId);
    onRefresh();
  }

  async function handleAddLesson(modId: string) {
    if (!newLessonTitle.trim()) return;
    const mod = modules.find((m: any) => m.id === modId);
    const order = (mod as any)?.lessons?.length ?? 0;
    const lesson = await createLesson.mutateAsync({
      module_id: modId,
      course_id: course.id,
      title: newLessonTitle,
      type: newLessonType as any,
      sort_order: order,
    });
    setAddingLessonToModule(null);
    setNewLessonTitle('');
    setNewLessonType('video');
    onRefresh();
    onSelect({ kind: 'lesson', lesson, moduleId: modId });
  }

  async function handleDeleteLesson(lesson: AcademyLesson) {
    if (!confirm(`¿Eliminar la lección "${lesson.title}"?`)) return;
    await deleteLesson.mutateAsync(lesson.id);
    onRefresh();
    onSelect({ kind: 'course' });
  }

  return (
    <aside className="w-72 shrink-0 border-r border-white/10 bg-[#0c0c16] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-white/5">
        {/* Course meta link */}
        <button
          onClick={() => onSelect({ kind: 'course' })}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            active.kind === 'course'
              ? 'bg-white/10 text-zinc-100'
              : 'text-zinc-400 hover:bg-white/5'
          )}
          style={active.kind === 'course' ? { color: accentColor } : undefined}
        >
          <Settings2 className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">Detalles del curso</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {modules.map((mod: any) => {
          const lessons = (mod.lessons ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
          const isExpanded = expanded[mod.id] !== false; // default open

          return (
            <div key={mod.id} className="space-y-0.5">
              {/* Module header */}
              <div className="flex items-center gap-1 group">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="flex items-center gap-1.5 flex-1 text-left px-2 py-1.5 rounded text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="h-3 w-3 shrink-0" />
                    : <ChevronRight className="h-3 w-3 shrink-0" />}
                  {editingModuleId === mod.id ? (
                    <input
                      autoFocus
                      value={moduleTitle}
                      onChange={(e) => setModuleTitle(e.target.value)}
                      onBlur={() => handleSaveModuleTitle(mod.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveModuleTitle(mod.id); if (e.key === 'Escape') setEditingModuleId(null); }}
                      className="bg-white/10 rounded px-1 py-0.5 text-zinc-100 text-xs w-full focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{mod.title}</span>
                  )}
                </button>
                <button
                  onClick={() => onSelect({ kind: 'module', module: mod })}
                  className={cn(
                    'p-1 transition-all',
                    active.kind === 'module' && active.module.id === mod.id
                      ? 'opacity-100 text-purple-300'
                      : 'opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-purple-300'
                  )}
                  title="Condiciones de desbloqueo del módulo"
                >
                  <Lock className="h-3 w-3" />
                </button>
                <button
                  onClick={() => { setEditingModuleId(mod.id); setModuleTitle(mod.title); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-zinc-300 transition-all"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDeleteModule(mod.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Lessons */}
              {isExpanded && (
                <div className="pl-3 space-y-0.5">
                  {lessons.map((lesson: AcademyLesson) => {
                    const Icon = LESSON_TYPE_ICON[lesson.type] ?? Video;
                    const isActive = active.kind === 'lesson' && active.lesson.id === lesson.id;
                    return (
                      <div key={lesson.id} className="flex items-center gap-1 group">
                        <button
                          onClick={() => onSelect({ kind: 'lesson', lesson, moduleId: mod.id })}
                          className={cn(
                            'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                            isActive
                              ? 'bg-white/10 text-zinc-100'
                              : 'text-zinc-400 hover:bg-white/5'
                          )}
                          style={isActive ? { color: accentColor } : undefined}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 transition-all shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add lesson inline */}
                  {addingLessonToModule === mod.id ? (
                    <div className="px-2 py-2 space-y-2">
                      <Input
                        autoFocus
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(mod.id); if (e.key === 'Escape') setAddingLessonToModule(null); }}
                        placeholder="Título de la lección"
                        className="h-7 text-xs bg-white/5 border-white/10"
                      />
                      <select
                        value={newLessonType}
                        onChange={(e) => setNewLessonType(e.target.value)}
                        className="w-full h-7 text-xs rounded bg-white/5 border border-white/10 px-2 focus:outline-none"
                      >
                        <option value="video">Video</option>
                        <option value="text">Texto</option>
                        <option value="quiz">Quiz</option>
                        <option value="live">En vivo</option>
                      </select>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs flex-1" style={{ backgroundColor: accentColor }} onClick={() => handleAddLesson(mod.id)}>
                          Agregar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-zinc-500" onClick={() => setAddingLessonToModule(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingLessonToModule(mod.id)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 hover:bg-white/5 rounded transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Agregar lección
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/5">
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs text-zinc-500 hover:text-zinc-200 gap-1.5 justify-start"
          onClick={handleAddModule}
          disabled={createModule.isPending}
        >
          <Plus className="h-3.5 w-3.5" /> Agregar módulo
        </Button>
      </div>
    </aside>
  );
}
