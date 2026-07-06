import { useState, useEffect } from 'react';
import { Save, Download, X, Plus, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useUpdateLesson } from '@/hooks/academy/useAcademyCourse';
import type { AcademyLesson, UnlockLogic } from '@/types/academy';
import { UnlockRulesEditor } from '@/components/academy/unlock/UnlockRulesEditor';
import { LessonResource, SaveState, LESSON_TYPE_ICON, VIDEO_SOURCES } from './types';
import { normalizeYouTubeUrl, youTubeThumbnail } from './youtubeHelpers';
import { SaveIndicator } from './SaveIndicator';

export function LessonEditorPanel({ lesson: initialLesson, spaceId, accentColor = '#7c3aed', onSaved }: { lesson: AcademyLesson; spaceId: string; accentColor?: string; onSaved: (updated: AcademyLesson) => void }) {
  const updateLesson = useUpdateLesson();
  const [unlockLogic, setUnlockLogic] = useState<UnlockLogic>((initialLesson.unlock_logic ?? 'all') as UnlockLogic);
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
        unlock_logic: unlockLogic,
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

          {/* Condiciones de desbloqueo de la lección */}
          <UnlockRulesEditor
            spaceId={spaceId}
            targetType="lesson"
            targetId={initialLesson.id}
            courseId={initialLesson.course_id}
            unlockLogic={unlockLogic}
            onLogicChange={setUnlockLogic}
            accentColor={accentColor}
          />
          <p className="text-[11px] text-zinc-500">
            Las condiciones se guardan al instante. La lógica Y/O se aplica al pulsar «Guardar».
          </p>
        </div>
      </section>
    </div>
  );
}
