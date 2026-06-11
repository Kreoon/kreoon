import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Eye, Save, Plus, Trash2, GripVertical,
  Video, FileText, HelpCircle, Radio, ChevronDown,
  ChevronRight, Loader2, Check, AlertCircle, Download,
  X, BookOpen, Settings2, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BunnyImageUploader } from '@/components/marketplace/BunnyImageUploader';
import { marketplaceStoragePath } from '@/hooks/useBunnyImageUpload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  useUpdateCourse,
  useUpdateLesson,
  useCreateLesson,
  useDeleteLesson,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
} from '@/hooks/academy/useAcademyCourse';
import type { AcademyLesson, AcademyModule, LessonType, VideoSource } from '@/types/academy';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonResource {
  name: string;
  url: string;
  type?: string;
}

// Fix 1a: lesson tipado con AcademyLesson en lugar de any
type ActiveView =
  | { kind: 'course' }
  | { kind: 'lesson'; lesson: AcademyLesson; moduleId: string };

// Fix 1e: LESSON_TYPE_ICON con tipos correctos para componentes React
type LucideIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;

const LESSON_TYPE_ICON: Record<string, LucideIconComponent> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  live: Radio,
};

const VIDEO_SOURCES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'bunny', label: 'Bunny CDN' },
  { value: 'drive', label: 'Google Drive' },
  { value: 'url', label: 'URL directa' },
];

// ─── YouTube helpers ──────────────────────────────────────────────────────────

function extractYouTubeId(raw: string): string | null {
  const s = raw.trim();
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,          // watch?v=
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,      // youtu.be/
    /embed\/([a-zA-Z0-9_-]{11})/,          // /embed/
    /shorts\/([a-zA-Z0-9_-]{11})/,         // /shorts/
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  // Bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
}

function normalizeYouTubeUrl(raw: string): string {
  const id = extractYouTubeId(raw);
  return id ? `https://www.youtube.com/watch?v=${id}` : raw.trim();
}

function youTubeThumbnail(raw: string): string | null {
  const id = extractYouTubeId(raw);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// ─── Admin course query ────────────────────────────────────────────────────────

const COURSE_ADMIN_SELECT = `
  id, title, slug, description, cover_image_url, price_usd, is_free,
  difficulty, language, status, instructor_id, space_id, sort_order,
  certificate_enabled, total_duration_minutes,
  space:academy_spaces(id, name, slug, accent_color, owner_id),
  modules:academy_modules(
    id, title, sort_order,
    lessons:academy_lessons(
      id, title, type, video_source, video_url, video_bunny_id,
      video_duration_seconds, video_thumbnail_url, is_free_preview,
      is_required, sort_order, content, description, resources,
      has_midlesson_quiz, drip_days_after_enroll, module_id, course_id
    )
  )
`;

function useAdminCourse(spaceSlug?: string, courseSlug?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'course', 'admin', spaceSlug, courseSlug],
    queryFn: async () => {
      // Fix 1b: capturar error de la query a academy_spaces
      const { data: space, error: spaceError } = await (supabase as any)
        .from('academy_spaces')
        .select('id')
        .eq('slug', spaceSlug!)
        .single();
      if (spaceError || !space) throw spaceError ?? new Error('Space not found');
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .select(COURSE_ADMIN_SELECT)
        .eq('slug', courseSlug!)
        .eq('space_id', space.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!spaceSlug && !!courseSlug && !!user,
    staleTime: 30_000,
  });
}

// ─── Save indicator ───────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <span className={cn('flex items-center gap-1 text-xs transition-all',
      state === 'saving' && 'text-zinc-400',
      state === 'saved' && 'text-emerald-400',
      state === 'error' && 'text-rose-400',
    )}>
      {state === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === 'saved' && <Check className="h-3 w-3" />}
      {state === 'error' && <AlertCircle className="h-3 w-3" />}
      {state === 'saving' ? 'Guardando...' : state === 'saved' ? 'Guardado' : 'Error'}
    </span>
  );
}

// ─── Module tree ──────────────────────────────────────────────────────────────

function ModuleTree({
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

// ─── Course meta editor ───────────────────────────────────────────────────────

function CourseMetaPanel({ course, onSaved }: { course: any; onSaved: () => void }) {
  const updateCourse = useUpdateCourse();
  const [form, setForm] = useState({
    title: course.title ?? '',
    description: course.description ?? '',
    cover_image_url: course.cover_image_url ?? '',
    price_usd: course.price_usd ?? 0,
    is_free: course.is_free ?? true,
    difficulty: course.difficulty ?? 'beginner',
    language: course.language ?? 'es',
    status: course.status ?? 'draft',
    certificate_enabled: course.certificate_enabled ?? false,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');

  async function handleSave() {
    setSaveState('saving');
    try {
      await updateCourse.mutateAsync({ id: course.id, updates: form as any });
      setSaveState('saved');
      onSaved();
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
    }
  }

  function set(k: string, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
    setSaveState('idle');
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Detalles del curso</h2>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <Button size="sm" style={{ backgroundColor: course.space?.accent_color || '#8B5CF6' }} className="text-white gap-1.5" onClick={handleSave} disabled={updateCourse.isPending}>
            <Save className="h-3.5 w-3.5" /> Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Título *</Label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="bg-white/5 border-white/10" />
        </div>

        <div className="space-y-1">
          <Label>Descripción</Label>
          <RichTextEditor
            content={form.description}
            onChange={(html) => set('description', html)}
            placeholder="Describe el curso en detalle: a quién va dirigido, qué van a aprender, requisitos previos..."
          />
          <p className="text-[11px] text-zinc-500">
            Soporta formato, listas, enlaces, imágenes, tablas y modo HTML.
          </p>
        </div>

        <div className="space-y-1">
          <Label>Imagen de portada</Label>
          <BunnyImageUploader
            mode="single"
            value={form.cover_image_url}
            onChange={(url) => set('cover_image_url', url)}
            getStoragePath={(file) => marketplaceStoragePath('academy-space-cover', course.id, file)}
            aspectRatio="video"
            height="h-36"
            maxSizeMB={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Dificultad</Label>
            <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm text-zinc-100 focus:outline-none">
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm text-zinc-100 focus:outline-none">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Precio USD (0 = gratis)</Label>
            <Input type="number" min={0} step={1} value={form.price_usd} onChange={(e) => { set('price_usd', Number(e.target.value)); set('is_free', Number(e.target.value) === 0); }} className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1">
            <Label>Idioma</Label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm text-zinc-100 focus:outline-none">
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="pt">Portugués</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.certificate_enabled} onChange={(e) => set('certificate_enabled', e.target.checked)} className="h-4 w-4 accent-purple-500" />
          <div>
            <p className="text-sm text-zinc-200">Certificado habilitado</p>
            <p className="text-xs text-zinc-500">Los alumnos pueden obtener un certificado al completar el curso</p>
          </div>
        </label>
      </div>
    </div>
  );
}

// ─── Lesson editor ────────────────────────────────────────────────────────────

function LessonEditorPanel({ lesson: initialLesson, onSaved }: { lesson: AcademyLesson; onSaved: (updated: AcademyLesson) => void }) {
  const updateLesson = useUpdateLesson();
  const [form, setForm] = useState({
    title: initialLesson.title ?? '',
    type: initialLesson.type ?? 'video',
    video_source: initialLesson.video_source ?? 'youtube',
    video_url: initialLesson.video_url ?? '',
    video_bunny_id: initialLesson.video_bunny_id ?? '',
    video_thumbnail_url: initialLesson.video_thumbnail_url ?? '',
    video_duration_seconds: initialLesson.video_duration_seconds ?? '',
    description: (initialLesson as any).description ?? '',
    content: initialLesson.content ?? '',
    is_free_preview: initialLesson.is_free_preview ?? false,
    is_required: initialLesson.is_required ?? true,
    drip_days_after_enroll: initialLesson.drip_days_after_enroll ?? 0,
    resources: (initialLesson.resources ?? []) as LessonResource[],
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [newResource, setNewResource] = useState({ name: '', url: '' });

  // Fix 1c: resetear con el objeto completo cuando cambia la lección
  useEffect(() => {
    setForm({
      title: initialLesson.title ?? '',
      type: initialLesson.type ?? 'video',
      video_source: initialLesson.video_source ?? 'youtube',
      video_url: initialLesson.video_url ?? '',
      video_bunny_id: initialLesson.video_bunny_id ?? '',
      video_thumbnail_url: initialLesson.video_thumbnail_url ?? '',
      video_duration_seconds: initialLesson.video_duration_seconds ?? '',
      description: (initialLesson as any).description ?? '',
      content: initialLesson.content ?? '',
      is_free_preview: initialLesson.is_free_preview ?? false,
      is_required: initialLesson.is_required ?? true,
      drip_days_after_enroll: initialLesson.drip_days_after_enroll ?? 0,
      resources: (initialLesson.resources ?? []) as LessonResource[],
    });
    setSaveState('idle');
  }, [
    initialLesson.id,
    initialLesson.title,
    initialLesson.type,
    initialLesson.video_source,
    initialLesson.video_url,
    initialLesson.video_bunny_id,
    initialLesson.video_thumbnail_url,
    initialLesson.video_duration_seconds,
    initialLesson.content,
    initialLesson.is_free_preview,
    initialLesson.is_required,
    initialLesson.drip_days_after_enroll,
  ]);

  function set(k: string, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
    setSaveState('idle');
  }

  async function handleSave() {
    setSaveState('saving');
    try {
      const updates: any = {
        title: form.title,
        type: form.type,
        description: form.description || null,
        content: form.content || null,
        is_free_preview: form.is_free_preview,
        is_required: form.is_required,
        drip_days_after_enroll: Number(form.drip_days_after_enroll) || 0,
        resources: form.resources,
      };
      if (form.type === 'video' || form.type === 'live') {
        updates.video_source = form.video_source;
        updates.video_url = form.video_url || null;
        updates.video_bunny_id = form.video_bunny_id || null;
        updates.video_thumbnail_url = form.video_thumbnail_url || null;
        updates.video_duration_seconds = form.video_duration_seconds
          ? Number(form.video_duration_seconds)
          : null;
      }
      const updated = await updateLesson.mutateAsync({ lessonId: initialLesson.id, updates });
      setSaveState('saved');
      onSaved(updated);
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
    }
  }

  function addResource() {
    if (!newResource.name.trim() || !newResource.url.trim()) return;
    set('resources', [...form.resources, { name: newResource.name, url: newResource.url }]);
    setNewResource({ name: '', url: '' });
  }

  function removeResource(idx: number) {
    set('resources', form.resources.filter((_, i) => i !== idx));
  }

  const Icon = LESSON_TYPE_ICON[form.type] ?? Video;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-bold truncate max-w-xs">{form.title || 'Lección sin título'}</h2>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <Button
            size="sm"
            style={{ backgroundColor: '#8B5CF6' }}
            className="text-white gap-1.5"
            onClick={handleSave}
            disabled={updateLesson.isPending}
          >
            <Save className="h-3.5 w-3.5" /> Guardar
          </Button>
        </div>
      </div>

      {/* ── Básico ── */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Básico</h3>
        <div className="space-y-1">
          <Label>Título de la lección *</Label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} className="bg-white/5 border-white/10" placeholder="Ej: Introducción al UGC" />
        </div>

        <div className="space-y-1">
          <Label>Tipo de lección</Label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm text-zinc-100 focus:outline-none">
            <option value="video">Video</option>
            <option value="text">Texto / Artículo</option>
            <option value="quiz">Quiz</option>
            <option value="live">En vivo</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label>Descripción corta (opcional)</Label>
          <RichTextEditor
            content={form.description}
            onChange={(html) => set('description', html)}
            placeholder="Una frase introductoria que el alumno ve antes de entrar a la lección"
            features={{
              headings: false,
              bold: true,
              italic: true,
              lists: true,
              quotes: false,
              code: false,
              highlight: false,
              emojis: true,
              history: true,
              links: true,
              tables: false,
              checklist: false,
              images: false,
            }}
          />
        </div>
      </section>

      {/* ── Video ── */}
      {(form.type === 'video' || form.type === 'live') && (
        <section className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Video</h3>

          <div className="space-y-1">
            <Label>Fuente del video</Label>
            <select value={form.video_source} onChange={(e) => set('video_source', e.target.value)} className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm text-zinc-100 focus:outline-none">
              {VIDEO_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {form.video_source === 'bunny' ? (
            <div className="space-y-1">
              <Label>Bunny Video ID</Label>
              <Input value={form.video_bunny_id} onChange={(e) => set('video_bunny_id', e.target.value)} placeholder="Ej: a1b2c3d4-e5f6-..." className="bg-white/5 border-white/10 font-mono text-sm" />
              <p className="text-xs text-zinc-500">El ID del video en tu librería Bunny Stream.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>URL del video</Label>
              <Input
                value={form.video_url}
                onChange={(e) => set('video_url', e.target.value)}
                onBlur={(e) => {
                  if (form.video_source === 'youtube' && e.target.value.trim()) {
                    const normalized = normalizeYouTubeUrl(e.target.value);
                    set('video_url', normalized);
                    if (!form.video_thumbnail_url) {
                      const thumb = youTubeThumbnail(e.target.value);
                      if (thumb) set('video_thumbnail_url', thumb);
                    }
                  }
                }}
                placeholder={
                  form.video_source === 'youtube' ? 'URL, youtu.be/... o ID del video'
                  : form.video_source === 'vimeo' ? 'https://vimeo.com/...'
                  : form.video_source === 'drive' ? 'https://drive.google.com/file/d/...'
                  : 'https://...'
                }
                className="bg-white/5 border-white/10"
              />
              {form.video_source === 'youtube' && (
                <p className="text-xs text-zinc-500">
                  Acepta: URL completa, youtu.be/..., shorts/... o el ID del video (11 caracteres). El timestamp &amp;t= se ignora.
                </p>
              )}
              {/* YouTube thumbnail preview */}
              {form.video_source === 'youtube' && (() => {
                const thumb = youTubeThumbnail(form.video_url);
                return thumb ? (
                  <div className="relative rounded-lg overflow-hidden w-40 aspect-video bg-black/40">
                    <img src={thumb} alt="Thumbnail" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1 rounded">YouTube</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Duración (segundos)</Label>
              <Input type="number" min={0} value={form.video_duration_seconds} onChange={(e) => set('video_duration_seconds', e.target.value)} placeholder="Ej: 720" className="bg-white/5 border-white/10" />
              {form.video_duration_seconds && (
                <p className="text-xs text-zinc-500">{Math.floor(Number(form.video_duration_seconds) / 60)} min {Number(form.video_duration_seconds) % 60} seg</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Thumbnail URL (opcional)</Label>
              <Input value={form.video_thumbnail_url} onChange={(e) => set('video_thumbnail_url', e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10" />
              {form.video_source === 'youtube' && form.video_url && !form.video_thumbnail_url && (
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                  onClick={() => {
                    const thumb = youTubeThumbnail(form.video_url);
                    if (thumb) set('video_thumbnail_url', thumb);
                  }}
                >
                  Auto-generar desde YouTube
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Contenido ── */}
      {form.type === 'text' && (
        <section className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Contenido de la lección
          </h3>
          <div className="space-y-1">
            <Label>Editor con formato completo</Label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => set('content', html)}
              placeholder="Escribe aquí el contenido completo de la lección..."
            />
            <p className="text-[11px] text-zinc-500">
              Encabezados, negrita, listas, enlaces, imágenes, tablas, código y modo HTML. Toggle el ícono del ojo para editar HTML directo.
            </p>
          </div>
        </section>
      )}

      {/* ── Descargables ── */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5" /> Recursos descargables
        </h3>

        {form.resources.length > 0 && (
          <div className="space-y-2">
            {form.resources.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <Download className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{r.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{r.url}</p>
                </div>
                <button onClick={() => removeResource(idx)} className="text-zinc-600 hover:text-rose-400 transition-colors p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newResource.name}
            onChange={(e) => setNewResource((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nombre (ej: Guía PDF)"
            className="bg-white/5 border-white/10 flex-1"
          />
          <Input
            value={newResource.url}
            onChange={(e) => setNewResource((p) => ({ ...p, url: e.target.value }))}
            placeholder="URL del archivo"
            className="bg-white/5 border-white/10 flex-1"
          />
          <Button size="sm" variant="outline" className="border-white/10 shrink-0" onClick={addResource}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-zinc-600">Pega la URL de un PDF, hoja de cálculo, presentación o cualquier archivo para que los alumnos lo descarguen.</p>
      </section>

      {/* ── Configuración ── */}
      <section className="space-y-4 pt-4 border-t border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Configuración</h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-zinc-200">Vista previa gratuita</p>
              <p className="text-xs text-zinc-500">No-inscritos pueden ver esta lección gratis</p>
            </div>
            <input type="checkbox" checked={form.is_free_preview} onChange={(e) => set('is_free_preview', e.target.checked)} className="h-4 w-4 accent-purple-500" />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm text-zinc-200">Lección requerida</p>
              <p className="text-xs text-zinc-500">Debe completarse para el certificado</p>
            </div>
            <input type="checkbox" checked={form.is_required} onChange={(e) => set('is_required', e.target.checked)} className="h-4 w-4 accent-purple-500" />
          </label>

          <div className="space-y-1">
            <Label>Días de espera para desbloquear (drip)</Label>
            <Input
              type="number"
              min={0}
              value={form.drip_days_after_enroll}
              onChange={(e) => set('drip_days_after_enroll', e.target.value)}
              className="bg-white/5 border-white/10 w-32"
            />
            <p className="text-xs text-zinc-600">0 = disponible inmediatamente al inscribirse</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
          {active.kind === 'lesson' && (
            <LessonEditorPanel
              key={active.lesson.id}
              lesson={active.lesson}
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
