// ============================================================================
// Editor de landing pública para owners. Edita los campos de academy_spaces:
// headline, subheadline, video, testimonials, instructors, FAQs, SEO, categoría.
// Preview button → /a/:slug en nueva pestaña.
// ============================================================================

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, ExternalLink, Sparkles, MessageSquare, Users, HelpCircle, Globe, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  spaceId: string;
  spaceSlug: string;
}

interface Testimonial { quote: string; author: string; }
interface Instructor { name: string; title: string; avatar_url: string; }
interface Faq { question: string; answer: string; }

const CATEGORIES = [
  { v: 'business', l: 'Business' },
  { v: 'content_creation', l: 'Creación de contenido' },
  { v: 'design', l: 'Diseño' },
  { v: 'marketing', l: 'Marketing' },
  { v: 'tech', l: 'Tecnología' },
  { v: 'fitness', l: 'Fitness' },
  { v: 'wellness', l: 'Bienestar' },
  { v: 'finance', l: 'Finanzas' },
  { v: 'education', l: 'Educación' },
  { v: 'other', l: 'Otro' },
];

const LANGUAGES = [
  { v: 'es', l: 'Español' },
  { v: 'en', l: 'English' },
  { v: 'pt', l: 'Português' },
];

export function LandingEditorTab({ spaceId, spaceSlug }: Props) {
  const qc = useQueryClient();
  const { data: space, isLoading } = useQuery({
    queryKey: ['academy', 'space-landing', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_spaces')
        .select('landing_headline, landing_subheadline, landing_video_url, landing_testimonials, landing_instructors, landing_faqs, landing_seo_title, landing_seo_description, landing_og_image_url, category, language_code')
        .eq('id', spaceId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [languageCode, setLanguageCode] = useState('es');

  useEffect(() => {
    if (!space) return;
    setHeadline((space as any).landing_headline ?? '');
    setSubheadline((space as any).landing_subheadline ?? '');
    setVideoUrl((space as any).landing_video_url ?? '');
    setTestimonials((space as any).landing_testimonials ?? []);
    setInstructors((space as any).landing_instructors ?? []);
    setFaqs((space as any).landing_faqs ?? []);
    setSeoTitle((space as any).landing_seo_title ?? '');
    setSeoDescription((space as any).landing_seo_description ?? '');
    setOgImageUrl((space as any).landing_og_image_url ?? '');
    setCategory((space as any).category ?? '');
    setLanguageCode((space as any).language_code ?? 'es');
  }, [space]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('academy_spaces')
        .update({
          landing_headline: headline || null,
          landing_subheadline: subheadline || null,
          landing_video_url: videoUrl || null,
          landing_testimonials: testimonials,
          landing_instructors: instructors,
          landing_faqs: faqs,
          landing_seo_title: seoTitle || null,
          landing_seo_description: seoDescription || null,
          landing_og_image_url: ogImageUrl || null,
          category: category || null,
          language_code: languageCode,
        })
        .eq('id', spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'space-landing', spaceId] });
      toast.success('Landing actualizada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al guardar'),
  });

  if (isLoading) {
    return <div className="text-zinc-500 p-8 text-center">Cargando...</div>;
  }

  const previewUrl = `/a/${spaceSlug}`;

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-violet-500/5 border-violet-500/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <p className="font-medium text-violet-200">Landing pública de tu academia</p>
          <p className="text-xs text-zinc-400">URL: <code className="bg-black/30 px-1.5 rounded">kreoon.com{previewUrl}</code></p>
        </div>
        <a href={previewUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Ver landing
          </Button>
        </a>
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" /> Hero
        </h3>
        <div>
          <Label>Headline principal</Label>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
            maxLength={120}
            placeholder="Ej: Domina la creación de contenido y vive de tu pasión"
            className="bg-black/30 border-white/10"
          />
          <div className="text-[10px] text-zinc-500 text-right">{headline.length}/120</div>
        </div>
        <div>
          <Label>Subheadline</Label>
          <textarea
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value.slice(0, 280))}
            maxLength={280}
            placeholder="La promesa concreta. Qué van a lograr al unirse."
            className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm h-20"
          />
          <div className="text-[10px] text-zinc-500 text-right">{subheadline.length}/280</div>
        </div>
        <div>
          <Label>URL de video promocional (YouTube, Vimeo, etc.)</Label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="bg-black/30 border-white/10"
          />
        </div>
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-400" /> Testimonios
          </h3>
          <Button
            size="sm" variant="outline"
            onClick={() => setTestimonials([...testimonials, { quote: '', author: '' }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar
          </Button>
        </div>
        {testimonials.map((t, idx) => (
          <div key={idx} className="border border-white/5 rounded-md p-3 space-y-2 bg-black/20">
            <Input
              placeholder="Frase del testimonio"
              value={t.quote}
              onChange={(e) => setTestimonials(testimonials.map((x, i) => i === idx ? { ...x, quote: e.target.value } : x))}
              className="bg-black/30 border-white/10 text-sm"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Autor (nombre)"
                value={t.author}
                onChange={(e) => setTestimonials(testimonials.map((x, i) => i === idx ? { ...x, author: e.target.value } : x))}
                className="bg-black/30 border-white/10 text-sm flex-1"
              />
              <Button
                size="icon" variant="ghost"
                onClick={() => setTestimonials(testimonials.filter((_, i) => i !== idx))}
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && (
          <p className="text-xs text-zinc-500">Aún no agregaste testimonios.</p>
        )}
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-400" /> Instructores
          </h3>
          <Button
            size="sm" variant="outline"
            onClick={() => setInstructors([...instructors, { name: '', title: '', avatar_url: '' }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar
          </Button>
        </div>
        {instructors.map((ins, idx) => (
          <div key={idx} className="border border-white/5 rounded-md p-3 space-y-2 bg-black/20">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nombre"
                value={ins.name}
                onChange={(e) => setInstructors(instructors.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                className="bg-black/30 border-white/10 text-sm"
              />
              <Input
                placeholder="Cargo / título"
                value={ins.title}
                onChange={(e) => setInstructors(instructors.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))}
                className="bg-black/30 border-white/10 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="URL de foto (https://...)"
                value={ins.avatar_url}
                onChange={(e) => setInstructors(instructors.map((x, i) => i === idx ? { ...x, avatar_url: e.target.value } : x))}
                className="bg-black/30 border-white/10 text-sm flex-1"
              />
              <Button
                size="icon" variant="ghost"
                onClick={() => setInstructors(instructors.filter((_, i) => i !== idx))}
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-violet-400" /> Preguntas frecuentes
          </h3>
          <Button
            size="sm" variant="outline"
            onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar
          </Button>
        </div>
        {faqs.map((f, idx) => (
          <div key={idx} className="border border-white/5 rounded-md p-3 space-y-2 bg-black/20">
            <Input
              placeholder="Pregunta"
              value={f.question}
              onChange={(e) => setFaqs(faqs.map((x, i) => i === idx ? { ...x, question: e.target.value } : x))}
              className="bg-black/30 border-white/10 text-sm"
            />
            <div className="flex gap-2 items-start">
              <textarea
                placeholder="Respuesta"
                value={f.answer}
                onChange={(e) => setFaqs(faqs.map((x, i) => i === idx ? { ...x, answer: e.target.value } : x))}
                className="flex-1 bg-black/30 border border-white/10 rounded p-2 text-sm h-16"
              />
              <Button
                size="icon" variant="ghost"
                onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4 text-rose-400" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-violet-400" /> Categoría e idioma
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoría</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm mt-1"
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <Label>Idioma</Label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm mt-1"
            >
              {LANGUAGES.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-violet-400" /> SEO
        </h3>
        <div>
          <Label>Meta title (mostrado en Google)</Label>
          <Input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value.slice(0, 60))}
            maxLength={60}
            placeholder={`${(space as any)?.name ?? 'Tu academia'} — descripción corta`}
            className="bg-black/30 border-white/10"
          />
          <div className="text-[10px] text-zinc-500 text-right">{seoTitle.length}/60</div>
        </div>
        <div>
          <Label>Meta description</Label>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value.slice(0, 160))}
            maxLength={160}
            placeholder="Frase que aparece bajo el título en Google. 150-160 caracteres."
            className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm h-20"
          />
          <div className="text-[10px] text-zinc-500 text-right">{seoDescription.length}/160</div>
        </div>
        <div>
          <Label>Imagen Open Graph (cuando comparten el link)</Label>
          <Input
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            placeholder="https://... (1200x630px recomendado)"
            className="bg-black/30 border-white/10"
          />
        </div>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="bg-violet-500 hover:bg-violet-600 text-white"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? 'Guardando...' : 'Guardar landing'}
      </Button>
    </div>
  );
}
