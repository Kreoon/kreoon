import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BunnyImageUploader } from '@/components/marketplace/BunnyImageUploader';
import { marketplaceStoragePath } from '@/hooks/useBunnyImageUpload';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useUpdateCourse } from '@/hooks/academy/useAcademyCourse';
import type { UnlockLogic } from '@/types/academy';
import { UnlockRulesEditor } from '@/components/academy/unlock/UnlockRulesEditor';
import { SaveIndicator } from './SaveIndicator';
import type { SaveState } from './types';

// ─── Course meta editor ───────────────────────────────────────────────────────

export function CourseMetaPanel({ course, onSaved }: { course: any; onSaved: () => void }) {
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
    unlock_logic: (course.unlock_logic ?? 'all') as UnlockLogic,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');

  async function handleSave() {
    setSaveState('saving');
    try {
      // is_free es columna GENERATED (calculada de price_usd), no se puede enviar al UPDATE
      const { is_free: _ignored, ...updates } = form;
      await updateCourse.mutateAsync({ id: course.id, updates: updates as any });
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
          <p className="text-[11px] text-zinc-500">
            📐 Tamaño recomendado: <span className="font-semibold text-zinc-400">1600 × 900 px</span> (formato 16:9).
            Así la imagen se ve completa, sin recortes, en todas las tarjetas.
          </p>
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

        {/* Condiciones de desbloqueo del curso */}
        <UnlockRulesEditor
          spaceId={course.space_id}
          targetType="course"
          targetId={course.id}
          courseId={course.id}
          unlockLogic={form.unlock_logic}
          onLogicChange={(l) => set('unlock_logic', l)}
          accentColor={course.space?.accent_color || '#7c3aed'}
        />
        <p className="text-[11px] text-zinc-500 -mt-2">
          Las condiciones se guardan al instante. La lógica Y/O se aplica al pulsar «Guardar».
        </p>
      </div>
    </div>
  );
}
