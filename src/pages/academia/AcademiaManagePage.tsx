import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Settings, BookOpen, Plus, Pencil, Eye, EyeOff,
  Save, Loader2, GraduationCap, MoreVertical, X, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAcademySpace, useUpdateAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useUpdateCourse, useCreateCourse, useCreateModule, useCreateLesson } from '@/hooks/academy/useAcademyCourse';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AcademyCourse, CourseDifficulty } from '@/types/academy';

type Tab = 'cursos' | 'configuracion';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
}

export default function AcademiaManagePage() {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('cursos');

  const { data: space, isLoading } = useAcademySpace(spaceSlug);
  const isOwner = !!user && !!space && (space as any).owner_id === user.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  if (!space || !isOwner) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <GraduationCap className="h-10 w-10" />
        <p>No tienes acceso a gestionar esta academia.</p>
        <Link to="/academia/dashboard" className="text-purple-400 hover:text-purple-300">
          Volver al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          <Link
            to={`/academia/${spaceSlug}`}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${space.accent_color || '#8B5CF6'}40` }}
          >
            {space.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">{space.name}</h1>
            <p className="text-xs text-zinc-500">Gestión de academia</p>
          </div>
          <Link to={`/academia/${spaceSlug}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-white/10">
              <Eye className="h-3.5 w-3.5" /> Ver pública
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-8">
          {([
            { id: 'cursos', label: 'Cursos', icon: BookOpen },
            { id: 'configuracion', label: 'Configuración', icon: Settings },
          ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors',
                tab === id
                  ? 'border-purple-500 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'cursos' && (
          <CoursesTab
            spaceId={(space as any).id}
            spaceSlug={spaceSlug!}
            accentColor={space.accent_color}
          />
        )}
        {tab === 'configuracion' && (
          <ConfigTab
            space={space as any}
            onSaved={() => navigate(`/academia/${spaceSlug}/gestionar`)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tab: Cursos ─────────────────────────────────────────────────────────────

function CoursesTab({
  spaceId,
  spaceSlug,
  accentColor,
}: {
  spaceId: string;
  spaceSlug: string;
  accentColor: string | null;
}) {
  const qc = useQueryClient();
  const updateCourse = useUpdateCourse();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);

  const { data: courses = [], isLoading } = useQuery<AcademyCourse[]>({
    queryKey: ['academy', 'space', 'courses', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_courses')
        .select('id, title, slug, status, difficulty, enrolled_count, cover_image_url, sort_order')
        .eq('space_id', spaceId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  async function toggleStatus(course: AcademyCourse) {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    await updateCourse.mutateAsync({ id: course.id, updates: { status: newStatus } });
    qc.invalidateQueries({ queryKey: ['academy', 'space', 'courses', spaceId] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando cursos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {courses.length} curso{courses.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          onClick={() => setShowNewCourse(true)}
          className="bg-purple-500 hover:bg-purple-600 text-white gap-1.5"
        >
          <Plus className="h-4 w-4" /> Nuevo curso
        </Button>
      </div>

      {/* Formulario inline de nuevo curso */}
      {showNewCourse && (
        <NewCourseForm
          spaceId={spaceId}
          onClose={() => setShowNewCourse(false)}
          onCreated={(slug) => {
            setShowNewCourse(false);
            qc.invalidateQueries({ queryKey: ['academy', 'space', 'courses', spaceId] });
            navigate(`/academia/${spaceSlug}/${slug}`);
          }}
        />
      )}

      {courses.length === 0 && !showNewCourse ? (
        <Card className="p-12 text-center bg-white/5 border-white/10 text-zinc-500">
          <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="mb-4">No hay cursos aún. Crea el primero.</p>
          <Button
            size="sm"
            onClick={() => setShowNewCourse(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white gap-1.5"
          >
            <Plus className="h-4 w-4" /> Crear primer curso
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="flex items-center gap-4 p-4 bg-white/5 border-white/10 hover:border-white/20 transition-colors"
            >
              {/* Portada */}
              <div
                className="h-14 w-20 rounded-lg shrink-0 overflow-hidden"
                style={{
                  background: course.cover_image_url
                    ? `url(${course.cover_image_url}) center/cover`
                    : `linear-gradient(135deg, ${accentColor || '#8B5CF6'}40, transparent)`,
                }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-zinc-100 truncate">{course.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span className="capitalize">{course.difficulty}</span>
                  <span>•</span>
                  <span>{course.enrolled_count ?? 0} inscritos</span>
                </div>
              </div>

              {/* Estado toggle */}
              <button
                onClick={() => toggleStatus(course)}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
                  course.status === 'published'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/20'
                )}
              >
                {course.status === 'published' ? (
                  <><Eye className="h-3 w-3" /> Publicado</>
                ) : (
                  <><EyeOff className="h-3 w-3" /> Borrador</>
                )}
              </button>

              {/* Menú */}
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(openMenu === course.id ? null : course.id)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenu === course.id && (
                  <div
                    className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-zinc-900 border border-white/10 shadow-xl py-1"
                    onMouseLeave={() => setOpenMenu(null)}
                  >
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        navigate(`/academia/${spaceSlug}/${course.slug}`);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver curso
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenu(null);
                        navigate(`/academia/${spaceSlug}/${course.slug}/edit`);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar curso
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Formulario: Nuevo Curso ──────────────────────────────────────────────────

function NewCourseForm({
  spaceId,
  onClose,
  onCreated,
}: {
  spaceId: string;
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const createCourse = useCreateCourse();
  const createModule = useCreateModule();
  const createLesson = useCreateLesson();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<CourseDifficulty>('beginner');
  const [price, setPrice] = useState(0);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonSource, setLessonSource] = useState('youtube');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uniqueCourseSlug(base: string): Promise<string> {
    let slug = base;
    let attempt = 0;
    while (attempt < 10) {
      const { data } = await (supabase as any)
        .from('academy_courses')
        .select('id')
        .eq('space_id', spaceId)
        .eq('slug', slug)
        .maybeSingle();
      if (!data) return slug;
      attempt++;
      slug = `${base}-${attempt + 1}`;
    }
    return `${base}-${Date.now()}`;
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const slug = await uniqueCourseSlug(slugify(title));
      const course = await createCourse.mutateAsync({
        space_id: spaceId,
        title,
        slug,
        description: description || null,
        difficulty,
        price_usd: price,
        status: 'draft',
        language: 'es',
      } as any);

      // Crear módulo inicial + lección si hay título de lección
      if (lessonTitle.trim()) {
        const mod = await createModule.mutateAsync({
          course_id: course.id,
          title: 'Introducción',
          sort_order: 0,
        });
        await createLesson.mutateAsync({
          module_id: mod.id,
          course_id: course.id,
          title: lessonTitle,
          type: 'video',
          video_source: lessonSource as any,
          video_url: lessonUrl || null,
          sort_order: 0,
        });
      }

      onCreated(slug);
    } catch (e: any) {
      setError(e?.message ?? 'Error al crear el curso.');
      setSaving(false);
    }
  }

  return (
    <Card className="p-6 bg-purple-500/5 border-purple-500/20 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-100">Nuevo curso</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1">
          <Label>Título del curso *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: UGC desde cero hasta primer cliente"
            className="bg-white/5 border-white/10"
            autoFocus
          />
          {title && (
            <p className="text-xs text-zinc-500">URL: /academia/.../{slugify(title)}</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-1">
          <Label>Descripción (opcional)</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div className="space-y-1">
          <Label>Dificultad</Label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as CourseDifficulty)}
            className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="beginner">Principiante</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzado</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label>Precio USD (0 = gratis)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(Math.min(10000, Math.max(0, Number(e.target.value))))}
            className="bg-white/5 border-white/10"
          />
        </div>
      </div>

      {/* Primera lección opcional */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <p className="text-xs text-zinc-500">Primera lección (opcional — puedes agregarla después)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-1">
            <Label>Título de la lección</Label>
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Ej: Introducción al UGC"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1">
            <Label>Fuente del video</Label>
            <select
              value={lessonSource}
              onChange={(e) => setLessonSource(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500"
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="bunny">Bunny</option>
              <option value="drive">Drive</option>
              <option value="url">URL directa</option>
            </select>
          </div>
          {lessonTitle && (
            <div className="md:col-span-3 space-y-1">
              <Label>URL del video</Label>
              <Input
                value={lessonUrl}
                onChange={(e) => setLessonUrl(e.target.value)}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} size="sm" className="text-zinc-400">
          Cancelar
        </Button>
        <Button
          onClick={handleCreate}
          disabled={saving || !title.trim()}
          className="bg-purple-500 hover:bg-purple-600 text-white gap-2"
          size="sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          Crear curso
        </Button>
      </div>
    </Card>
  );
}

// ─── Tab: Configuración ───────────────────────────────────────────────────────

function ConfigTab({ space, onSaved }: { space: any; onSaved: () => void }) {
  const updateSpace = useUpdateAcademySpace();
  const [name, setName] = useState(space.name ?? '');
  const [description, setDescription] = useState(space.description ?? '');
  const [accentColor, setAccentColor] = useState(space.accent_color ?? '#8B5CF6');
  const [coverUrl, setCoverUrl] = useState(space.cover_image_url ?? '');
  const [logoUrl, setLogoUrl] = useState(space.logo_url ?? '');
  const [isPublic, setIsPublic] = useState(space.is_public ?? true);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    await updateSpace.mutateAsync({
      id: space.id,
      updates: {
        name,
        description: description || null,
        accent_color: accentColor,
        cover_image_url: coverUrl || null,
        logo_url: logoUrl || null,
        is_public: isPublic,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6 bg-white/5 border-white/10 space-y-5">
        <h2 className="font-semibold text-zinc-100">Información general</h2>

        <div className="space-y-1">
          <Label>Nombre de la academia</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>

        <div className="space-y-1">
          <Label>Descripción</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md bg-white/5 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div className="space-y-1">
          <Label>Color de acento</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-9 rounded cursor-pointer bg-transparent border border-white/10"
            />
            <span className="text-sm text-zinc-400 font-mono">{accentColor}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white/5 border-white/10 space-y-5">
        <h2 className="font-semibold text-zinc-100">Imágenes</h2>

        <div className="space-y-1">
          <Label>URL de portada (cover)</Label>
          <Input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://..."
            className="bg-white/5 border-white/10"
          />
          {coverUrl && (
            <img src={coverUrl} alt="Cover" className="mt-2 h-24 w-full object-cover rounded-lg" />
          )}
        </div>

        <div className="space-y-1">
          <Label>URL del logo</Label>
          <Input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="bg-white/5 border-white/10"
          />
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="mt-2 h-16 w-16 object-cover rounded-xl" />
          )}
        </div>
      </Card>

      <Card className="p-6 bg-white/5 border-white/10">
        <h2 className="font-semibold text-zinc-100 mb-4">Visibilidad</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 accent-purple-500"
          />
          <div>
            <p className="text-sm text-zinc-200">Academia pública</p>
            <p className="text-xs text-zinc-500">Visible en el explorador de academias</p>
          </div>
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateSpace.isPending || !name.trim()}
          className="bg-purple-500 hover:bg-purple-600 text-white gap-2"
        >
          {updateSpace.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar cambios
        </Button>
        {saved && <span className="text-sm text-emerald-400">¡Guardado!</span>}
      </div>
    </div>
  );
}
