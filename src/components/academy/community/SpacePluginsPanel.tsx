import { useState, useEffect } from 'react';
import { Crown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSpacePlugins, useUpdateSpacePlugins } from '@/hooks/academy/useSpacePlugins';
import type { SpacePlugins, MembershipQuestion, SidebarLink } from '@/types/academy-community';

interface SpacePluginsPanelProps {
  spaceId: string;
  isPro?: boolean; // si false, los plugins Pro están bloqueados
}

export function SpacePluginsPanel({ spaceId, isPro = true }: SpacePluginsPanelProps) {
  const { data, isLoading } = useSpacePlugins(spaceId);
  const update = useUpdateSpacePlugins();
  const [draft, setDraft] = useState<Partial<SpacePlugins>>({});

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  function set<K extends keyof SpacePlugins>(key: K, value: SpacePlugins[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    update.mutate({ spaceId, updates: draft });
  }

  if (isLoading) return <div className="text-zinc-500">Cargando plugins...</div>;

  return (
    <div className="space-y-4">
      <PluginSection
        title="Preguntas de membresía"
        description="Pide a los miembros que respondan al inscribirse"
        enabled={!!draft.membership_questions_enabled}
        onToggle={(v) => set('membership_questions_enabled', v)}
      >
        <MembershipQuestionsEditor
          items={draft.membership_questions ?? []}
          onChange={(items) => set('membership_questions', items)}
        />
      </PluginSection>

      <PluginSection
        title="Desbloquear chat por nivel"
        description="El chat se abre solo al alcanzar el nivel indicado"
        enabled={true}
        onToggle={() => {}}
        hideToggle
      >
        <div>
          <Label>Nivel mínimo para chatear (0 = sin restricción)</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={draft.unlock_chat_level ?? 0}
            onChange={(e) => set('unlock_chat_level', Number(e.target.value))}
            className="bg-black/30 border-white/10 max-w-xs mt-1"
          />
        </div>
      </PluginSection>

      <PluginSection
        title="Desbloquear posts por nivel"
        description="Solo miembros del nivel indicado pueden publicar"
        enabled={true}
        onToggle={() => {}}
        hideToggle
      >
        <Input
          type="number"
          min={0}
          max={10}
          value={draft.unlock_posting_level ?? 0}
          onChange={(e) => set('unlock_posting_level', Number(e.target.value))}
          className="bg-black/30 border-white/10 max-w-xs"
        />
      </PluginSection>

      <PluginSection
        title="Auto-DM a nuevos miembros"
        description="Envía un mensaje automático con variables {nombre} {space} {curso_destacado} {link_comunidad}"
        enabled={!!draft.auto_dm_enabled}
        onToggle={(v) => set('auto_dm_enabled', v)}
      >
        <textarea
          value={draft.auto_dm_message ?? ''}
          onChange={(e) => set('auto_dm_message', e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm h-24 focus:outline-none focus:border-purple-500/50"
          placeholder="¡Hola {nombre}! Bienvenido a {space}..."
        />
        <p className="mt-2 text-xs text-zinc-500">
          Variables: <code>{'{nombre}'}</code>, <code>{'{space}'}</code>,{' '}
          <code>{'{curso_destacado}'}</code>, <code>{'{link_comunidad}'}</code>
        </p>
      </PluginSection>

      <PluginSection
        title="Video de onboarding"
        description="Muestra un video cuando un miembro entra por primera vez"
        enabled={!!draft.onboarding_video_enabled}
        onToggle={(v) => set('onboarding_video_enabled', v)}
      >
        <Input
          value={draft.onboarding_video_url ?? ''}
          onChange={(e) => set('onboarding_video_url', e.target.value)}
          placeholder="URL del video (YouTube/Vimeo/Bunny)"
          className="bg-black/30 border-white/10"
        />
      </PluginSection>

      <PluginSection
        title="Video de cancelación"
        description="Se muestra cuando un miembro cancela"
        enabled={!!draft.cancellation_video_enabled}
        onToggle={(v) => set('cancellation_video_enabled', v)}
      >
        <Input
          value={draft.cancellation_video_url ?? ''}
          onChange={(e) => set('cancellation_video_url', e.target.value)}
          placeholder="URL del video"
          className="bg-black/30 border-white/10"
        />
      </PluginSection>

      <PluginSection
        title="Aprobación instantánea"
        description="Los nuevos miembros entran sin esperar aprobación manual"
        enabled={!!draft.instant_approval_enabled}
        onToggle={(v) => set('instant_approval_enabled', v)}
      />

      <PluginSection
        title="Integración Zapier"
        description="Webhook que se dispara al haber nuevos miembros o posts"
        enabled={!!draft.zapier_enabled}
        onToggle={(v) => set('zapier_enabled', v)}
        proRequired={!isPro}
      >
        <Input
          value={draft.zapier_webhook_url ?? ''}
          onChange={(e) => set('zapier_webhook_url', e.target.value)}
          placeholder="https://hooks.zapier.com/..."
          className="bg-black/30 border-white/10"
        />
      </PluginSection>

      <PluginSection
        title="Meta Pixel"
        description="Para campañas de Facebook/Instagram Ads"
        enabled={!!draft.meta_pixel_enabled}
        onToggle={(v) => set('meta_pixel_enabled', v)}
        proRequired={!isPro}
      >
        <Input
          value={draft.meta_pixel_id ?? ''}
          onChange={(e) => set('meta_pixel_id', e.target.value)}
          placeholder="Pixel ID"
          className="bg-black/30 border-white/10"
        />
      </PluginSection>

      <PluginSection
        title="Google Ads"
        description="Conversion tracking"
        enabled={!!draft.google_ads_enabled}
        onToggle={(v) => set('google_ads_enabled', v)}
        proRequired={!isPro}
      >
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={draft.google_ads_tag ?? ''}
            onChange={(e) => set('google_ads_tag', e.target.value)}
            placeholder="Tag ID (AW-...)"
            className="bg-black/30 border-white/10"
          />
          <Input
            value={draft.google_ads_conversion_label ?? ''}
            onChange={(e) => set('google_ads_conversion_label', e.target.value)}
            placeholder="Conversion Label"
            className="bg-black/30 border-white/10"
          />
        </div>
      </PluginSection>

      <PluginSection
        title="Hyros"
        description="Attribution tracking premium"
        enabled={!!draft.hyros_enabled}
        onToggle={(v) => set('hyros_enabled', v)}
        proRequired={!isPro}
      >
        <Input
          type="password"
          value={draft.hyros_api_key ?? ''}
          onChange={(e) => set('hyros_api_key', e.target.value)}
          placeholder="API Key"
          className="bg-black/30 border-white/10"
        />
      </PluginSection>

      <PluginSection
        title="Webhook propio Kreoon"
        description="Recibe eventos en tu propio endpoint"
        enabled={!!draft.kreoon_webhook_enabled}
        onToggle={(v) => set('kreoon_webhook_enabled', v)}
        proRequired={!isPro}
      >
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={draft.kreoon_webhook_url ?? ''}
            onChange={(e) => set('kreoon_webhook_url', e.target.value)}
            placeholder="https://tu-endpoint.com/hook"
            className="bg-black/30 border-white/10"
          />
          <Input
            type="password"
            value={draft.kreoon_webhook_secret ?? ''}
            onChange={(e) => set('kreoon_webhook_secret', e.target.value)}
            placeholder="Secret (HMAC)"
            className="bg-black/30 border-white/10"
          />
        </div>
      </PluginSection>

      <PluginSection
        title="Links en sidebar"
        description="Agrega links personalizados al menú lateral del space"
        enabled={true}
        onToggle={() => {}}
        hideToggle
      >
        <SidebarLinksEditor
          items={draft.sidebar_links ?? []}
          onChange={(items) => set('sidebar_links', items)}
        />
      </PluginSection>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-[#0a0a0f]/95 backdrop-blur border-t border-white/10">
        <Button
          onClick={save}
          disabled={update.isPending}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {update.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

function PluginSection({
  title,
  description,
  enabled,
  onToggle,
  hideToggle,
  proRequired,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  hideToggle?: boolean;
  proRequired?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        'p-5 bg-white/5 border-white/10',
        proRequired && 'opacity-60 pointer-events-none'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            {proRequired && (
              <span className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Crown className="h-2.5 w-2.5" /> Pro
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        {!hideToggle && (
          <button
            onClick={() => onToggle(!enabled)}
            className={cn(
              'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
              enabled ? 'bg-purple-500' : 'bg-zinc-700'
            )}
            disabled={proRequired}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        )}
      </div>
      {enabled && children && <div className="mt-4">{children}</div>}
    </Card>
  );
}

function MembershipQuestionsEditor({
  items,
  onChange,
}: {
  items: MembershipQuestion[];
  onChange: (items: MembershipQuestion[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((q, i) => (
        <div key={q.id} className="flex gap-2 items-start p-2 rounded bg-black/30 border border-white/5">
          <Input
            value={q.question}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
            }
            placeholder="Pregunta"
            className="bg-transparent border-white/10 flex-1"
          />
          <select
            value={q.type}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, type: e.target.value as any } : x)))
            }
            className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs"
          >
            <option value="text">Texto corto</option>
            <option value="textarea">Texto largo</option>
            <option value="select">Selección</option>
          </select>
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-rose-400 hover:text-rose-300 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...items,
            { id: crypto.randomUUID(), question: '', type: 'text', required: false },
          ])
        }
        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar pregunta
      </button>
    </div>
  );
}

function SidebarLinksEditor({
  items,
  onChange,
}: {
  items: SidebarLink[];
  onChange: (items: SidebarLink[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((l, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={l.label}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
            placeholder="Label"
            className="bg-black/30 border-white/10 max-w-xs"
          />
          <Input
            value={l.url}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
            }
            placeholder="URL"
            className="bg-black/30 border-white/10 flex-1"
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-rose-400 hover:text-rose-300 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { label: '', url: '', icon: 'link' }])}
        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
      >
        <Plus className="h-3.5 w-3.5" /> Agregar link
      </button>
    </div>
  );
}
