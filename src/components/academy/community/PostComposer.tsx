import { useState } from 'react';
import { Image as ImageIcon, ListChecks, MessageCircle, Send, Sparkles, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost } from '@/hooks/academy/useAcademyCommunity';
import { KiroAssistDialog } from './KiroAssistDialog';
import type { AcademyPostCategory, AcademyPost } from '@/types/academy-community';

interface PostComposerProps {
  spaceId: string;
  categories: AcademyPostCategory[];
  accentColor?: string;
  onSuccess?: (post: AcademyPost) => void;
}

type PostKind = 'post' | 'question' | 'poll';

export function PostComposer({ spaceId, categories, accentColor = '#8B5CF6', onSuccess }: PostComposerProps) {
  const { user, profile } = useAuth();
  const createPost = useCreatePost();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<PostKind>('post');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? '');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showKiro, setShowKiro] = useState(false);

  function reset() {
    setExpanded(false);
    setTitle('');
    setBody('');
    setKind('post');
    setPollOptions(['', '']);
    setMediaUrls([]);
  }

  async function uploadImage(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const extMatch = file.name.match(/\.([a-zA-Z0-9]{1,8})$/);
      const safeExt = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
      const path = `academy/posts/${spaceId}/${user.id}/${crypto.randomUUID()}${safeExt}`;
      const { data, error } = await (supabase.storage as any)
        .from('public-uploads')
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = (supabase.storage as any).from('public-uploads').getPublicUrl(data.path);
      setMediaUrls((arr) => [...arr, pub.publicUrl]);
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!body.trim() || !user) return;
    // RichTextEditor ya emite HTML; sanitizamos doble por defensa en profundidad
    const cleanBodyHtml = sanitizeHTML(body);
    const validPollOptions = pollOptions.map((t) => t.trim()).filter(Boolean);

    const post = await createPost.mutateAsync({
      space_id: spaceId,
      title: title.trim() || null,
      body: body.trim(),
      body_html: cleanBodyHtml,
      category_id: categoryId || null,
      type: kind === 'poll' ? 'poll' : kind === 'question' ? 'question' : 'post',
      media_urls: mediaUrls,
      poll_options:
        kind === 'poll'
          ? validPollOptions.map((text) => ({ id: crypto.randomUUID(), text, vote_count: 0 }))
          : [],
    });
    onSuccess?.(post);
    reset();
  }

  function applyKiroSuggestion(s: { title: string; body: string }) {
    setTitle(s.title);
    setBody(s.body);
    setShowKiro(false);
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 text-left"
        >
          <Avatar profile={profile} />
          <div className="flex-1 px-4 py-2.5 rounded-full bg-black/30 border border-white/5 text-sm text-zinc-500 hover:bg-black/50 transition-colors">
            ¿Qué quieres compartir, {profile?.full_name?.split(' ')[0] ?? 'creador'}?
          </div>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar profile={profile} />
            <div className="flex-1">
              <div className="font-semibold text-sm">{profile?.full_name ?? 'Tú'}</div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="text-xs bg-transparent border border-white/10 rounded px-2 py-1 mt-1"
              >
                {categories.length === 0 && <option value="">Sin categorías</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {(kind === 'post' || kind === 'question') && (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'question' ? 'Tu pregunta...' : 'Título (opcional)'}
              className="bg-transparent border-white/10 text-base font-semibold"
            />
          )}

          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Comparte algo con la comunidad..."
            features={{
              headings: true,
              bold: true,
              italic: true,
              lists: true,
              quotes: true,
              code: true,
              highlight: false,
              emojis: true,
              history: true,
              links: true,
              tables: false,
              checklist: true,
              images: true,
            }}
          />

          {kind === 'poll' && (
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) =>
                      setPollOptions((arr) => arr.map((o, j) => (j === i ? e.target.value : o)))
                    }
                    placeholder={`Opción ${i + 1}`}
                    className="bg-transparent border-white/10"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions((arr) => arr.filter((_, j) => j !== i))}
                      className="text-rose-400 hover:text-rose-300 px-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  onClick={() => setPollOptions((arr) => [...arr, ''])}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  + Agregar opción
                </button>
              )}
            </div>
          )}

          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaUrls.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="rounded-lg h-24 w-full object-cover" />
                  <button
                    onClick={() => setMediaUrls((arr) => arr.filter((u) => u !== url))}
                    className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 hover:bg-zinc-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-1">
              <KindButton active={kind === 'post'} onClick={() => setKind('post')} icon={MessageCircle} label="Post" />
              <KindButton active={kind === 'question'} onClick={() => setKind('question')} icon={HelpCircle} label="Pregunta" />
              <KindButton active={kind === 'poll'} onClick={() => setKind('poll')} icon={ListChecks} label="Poll" />
              <label className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                  }}
                />
                {uploading ? 'Subiendo...' : 'Imagen'}
              </label>
              <button
                onClick={() => setShowKiro(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-purple-400 hover:text-purple-300"
              >
                <Sparkles className="h-3.5 w-3.5" /> KIRO
              </button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!body.trim() || createPost.isPending}
              style={{ backgroundColor: accentColor }}
              className="text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {createPost.isPending ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </div>
      )}

      {showKiro && (
        <KiroAssistDialog
          spaceId={spaceId}
          context={body || title}
          onClose={() => setShowKiro(false)}
          onApply={applyKiroSuggestion}
        />
      )}
    </div>
  );
}

function Avatar({ profile }: { profile: any }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-semibold">
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

function KindButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
        active ? 'bg-purple-500/20 text-purple-200' : 'text-zinc-500 hover:text-zinc-300'
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
