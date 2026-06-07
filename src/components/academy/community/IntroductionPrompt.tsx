import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { sanitizeHTML } from '@/lib/sanitizeHTML';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost } from '@/hooks/academy/useAcademyCommunity';
import { useMySpaceProfile, useUpsertSpaceProfile } from '@/hooks/academy/useAcademyCommunityV3';

interface IntroductionPromptProps {
  spaceId: string;
  spaceName: string;
  accentColor?: string;
}

export function IntroductionPrompt({ spaceId, spaceName, accentColor = '#8B5CF6' }: IntroductionPromptProps) {
  const { profile } = useAuth();
  const { data: spaceProfile } = useMySpaceProfile(spaceId);
  const createPost = useCreatePost();
  const upsertProfile = useUpsertSpaceProfile();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const firstName = (profile?.full_name ?? 'creador').split(' ')[0];
  const template = `¡Hola ${spaceName}! Me llamo ${firstName}. Estoy aquí porque [tu razón]. Mi meta es [tu meta]. 👋`;
  const [text, setText] = useState(template);

  if (spaceProfile?.intro_completed || dismissed) return null;

  async function handlePublish() {
    const post = await createPost.mutateAsync({
      space_id: spaceId,
      body: text.trim(),
      body_html: sanitizeHTML(text.replace(/\n/g, '<br>')),
      type: 'introduction',
    });
    await upsertProfile.mutateAsync({
      spaceId,
      updates: { intro_completed: true, intro_post_id: post.id },
    });
    setOpen(false);
  }

  return (
    <Card
      className="p-5 mb-4 border-2 relative"
      style={{ borderColor: `${accentColor}40`, backgroundColor: `${accentColor}08` }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}30` }}
        >
          <Sparkles className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">¡Bienvenido a {spaceName}!</h3>
          <p className="text-sm text-zinc-400 mb-3">
            Preséntate para que la comunidad te conozca y dale un punto de partida a tu camino acá.
          </p>

          {!open ? (
            <Button
              onClick={() => setOpen(true)}
              size="sm"
              className="text-white"
              style={{ backgroundColor: accentColor }}
            >
              Crear mi presentación
            </Button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full min-h-24 rounded-lg bg-black/30 border border-white/10 p-2 text-sm focus:outline-none focus:border-purple-500/50"
                placeholder={template}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={createPost.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={!text.trim() || createPost.isPending}
                  className="text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  {createPost.isPending ? 'Publicando...' : 'Publicar presentación'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
