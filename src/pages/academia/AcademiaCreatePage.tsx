import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCreateAcademySpace } from '@/hooks/academy/useAcademySpaces';
import { useCreateCourse, useCreateModule, useCreateLesson } from '@/hooks/academy/useAcademyCourse';
import { useUpdateCertRequirements } from '@/hooks/academy/useAcademyCertificate';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  AcademySpace,
  AcademyCourse,
  CourseDifficulty,
} from '@/types/academy';

const STEPS = ['Academia', 'Curso', 'Lecciones', 'Certificado'] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);
}

export default function AcademiaCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // Space data
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [accentColor, setAccentColor] = useState('#8B5CF6');

  // Course data
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseDifficulty, setCourseDifficulty] = useState<CourseDifficulty>('beginner');
  const [coursePrice, setCoursePrice] = useState(0);

  // Lessons
  const [lessons, setLessons] = useState<Array<{ title: string; videoUrl: string; videoSource: string }>>([
    { title: '', videoUrl: '', videoSource: 'youtube' },
  ]);

  // Certificate
  const [certEnabled, setCertEnabled] = useState(true);
  const [certTitle, setCertTitle] = useState('Certificado de Finalización');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createSpace = useCreateAcademySpace();
  const createCourse = useCreateCourse();
  const createModule = useCreateModule();
  const createLesson = useCreateLesson();
  const updateCert = useUpdateCertRequirements();

  const canNext = (() => {
    if (step === 0) return spaceName.trim().length > 1;
    if (step === 1) return courseTitle.trim().length > 1;
    if (step === 2) return lessons.length > 0 && lessons.every((l) => l.title.trim().length > 0);
    return true;
  })();

  async function uniqueSlug(base: string, table: 'academy_spaces' | 'academy_courses', extraFilter?: Record<string, string>): Promise<string> {
    let slug = base;
    let attempt = 0;
    while (attempt < 10) {
      let query = (supabase as any).from(table).select('id').eq('slug', slug);
      if (extraFilter) {
        Object.entries(extraFilter).forEach(([k, v]) => { query = query.eq(k, v); });
      }
      const { data } = await query.maybeSingle();
      if (!data) return slug;
      attempt++;
      slug = `${base}-${attempt + 1}`;
    }
    return `${base}-${Date.now()}`;
  }

  async function handleFinish() {
    if (!user) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // 1) Crear space con slug único
      const spaceSlug = await uniqueSlug(slugify(spaceName), 'academy_spaces');
      const space = await createSpace.mutateAsync({
        name: spaceName,
        slug: spaceSlug,
        description: spaceDescription || null,
        accent_color: accentColor,
        is_public: true,
        status: 'active',
        plan_slug: 'hobby',
      } as Partial<AcademySpace>);

      // 2) Crear course con slug único dentro del space
      const courseSlug = await uniqueSlug(slugify(courseTitle), 'academy_courses', { space_id: space.id });
      const course = await createCourse.mutateAsync({
        space_id: space.id,
        title: courseTitle,
        slug: courseSlug,
        description: courseDescription || null,
        difficulty: courseDifficulty,
        price_usd: coursePrice,
        certificate_enabled: certEnabled,
        status: 'published',
        language: 'es',
      } as Partial<AcademyCourse>);

      // 3) Crear módulo + lecciones
      const moduleData = await createModule.mutateAsync({
        course_id: course.id,
        title: 'Introducción',
        sort_order: 0,
      });

      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        await createLesson.mutateAsync({
          module_id: moduleData.id,
          course_id: course.id,
          title: l.title,
          type: 'video',
          video_source: l.videoSource as any,
          video_url: l.videoUrl || null,
          sort_order: i,
        });
      }

      // 4) Certificado
      if (certEnabled) {
        await updateCert.mutateAsync({
          courseId: course.id,
          updates: {
            cert_title: certTitle,
            cert_accent_color: accentColor,
            min_lessons_completed_pct: 100,
            require_final_exam: false,
            require_all_module_exams: false,
          },
        });
      }

      navigate(`/academia/${space.slug}`);
    } catch (e: any) {
      console.error('Create wizard error', e);
      setErrorMsg(e?.message ?? 'Error al crear la academia. Intenta de nuevo.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
                  i < step
                    ? 'bg-purple-500 text-white'
                    : i === step
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500'
                    : 'bg-white/5 text-zinc-500 border border-white/10'
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('text-xs', i === step ? 'text-zinc-100' : 'text-zinc-500')}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8 bg-white/5 border-white/10">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Cuéntanos sobre tu academia</h2>
              <p className="text-sm text-zinc-400">Crea tu espacio educativo en Kreoon.</p>
              <div>
                <Label>Nombre de la academia</Label>
                <Input
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="Academia de Creadores Pro"
                  className="bg-white/5 border-white/10"
                />
                {spaceName && (
                  <p className="mt-1 text-xs text-zinc-500">URL: /academia/{slugify(spaceName)}</p>
                )}
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <textarea
                  value={spaceDescription}
                  onChange={(e) => setSpaceDescription(e.target.value)}
                  placeholder="Qué enseñas y a quién"
                  className="w-full mt-1 rounded-md bg-white/5 border border-white/10 p-2 text-sm h-24 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <Label>Color de acento</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                  <span className="text-sm text-zinc-400">{accentColor}</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Tu primer curso</h2>
              <div>
                <Label>Título del curso</Label>
                <Input
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="UGC desde cero hasta primer cliente"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className="w-full mt-1 rounded-md bg-white/5 border border-white/10 p-2 text-sm h-24 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dificultad</Label>
                  <select
                    value={courseDifficulty}
                    onChange={(e) => setCourseDifficulty(e.target.value as CourseDifficulty)}
                    className="w-full mt-1 rounded-md bg-white/5 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                  </select>
                </div>
                <div>
                  <Label>Precio USD (0 = gratis)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(Number(e.target.value))}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Lecciones</h2>
              <p className="text-sm text-zinc-400">Agrega al menos una lección. Podrás añadir más después.</p>
              {lessons.map((l, i) => (
                <Card key={i} className="p-4 bg-black/30 border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Lección {i + 1}</Label>
                    {lessons.length > 1 && (
                      <button
                        onClick={() => setLessons((arr) => arr.filter((_, j) => j !== i))}
                        className="text-rose-400 hover:text-rose-300 text-sm"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <Input
                    value={l.title}
                    onChange={(e) =>
                      setLessons((arr) => arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                    placeholder="Título"
                    className="bg-white/5 border-white/10"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={l.videoSource}
                      onChange={(e) =>
                        setLessons((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, videoSource: e.target.value } : x))
                        )
                      }
                      className="rounded-md bg-white/5 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="bunny">Bunny</option>
                      <option value="drive">Drive</option>
                      <option value="url">URL directa</option>
                    </select>
                    <Input
                      value={l.videoUrl}
                      onChange={(e) =>
                        setLessons((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, videoUrl: e.target.value } : x))
                        )
                      }
                      placeholder="URL del video"
                      className="col-span-2 bg-white/5 border-white/10"
                    />
                  </div>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={() => setLessons((arr) => [...arr, { title: '', videoUrl: '', videoSource: 'youtube' }])}
              >
                + Agregar lección
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Certificado</h2>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/10">
                <input
                  type="checkbox"
                  checked={certEnabled}
                  onChange={(e) => setCertEnabled(e.target.checked)}
                  className="h-4 w-4 accent-purple-500"
                />
                <span className="text-sm">Emitir certificado al completar el curso</span>
              </div>
              {certEnabled && (
                <div>
                  <Label>Título del certificado</Label>
                  <Input
                    value={certTitle}
                    onChange={(e) => setCertTitle(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <p className="mt-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={submitting}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                {submitting ? 'Creando...' : 'Crear academia'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
