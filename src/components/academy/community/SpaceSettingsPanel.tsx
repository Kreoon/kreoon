import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BunnyImageUploader } from '@/components/marketplace/BunnyImageUploader';
import { marketplaceStoragePath } from '@/hooks/useBunnyImageUpload';
import { useUpdateAcademySpace } from '@/hooks/academy/useAcademySpaces';
import type { AcademySpace } from '@/types/academy';

interface SpaceSettingsPanelProps {
  space: AcademySpace;
}

export function SpaceSettingsPanel({ space }: SpaceSettingsPanelProps) {
  const update = useUpdateAcademySpace();
  const [draft, setDraft] = useState<Partial<AcademySpace>>(space);

  useEffect(() => {
    setDraft(space);
  }, [space]);

  function set<K extends keyof AcademySpace>(key: K, value: AcademySpace[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    update.mutate({ id: space.id, updates: draft });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <h3 className="font-semibold">Identidad</h3>

        <div>
          <Label>Nombre del space</Label>
          <Input
            value={draft.name ?? ''}
            onChange={(e) => set('name', e.target.value.slice(0, 30))}
            maxLength={30}
            className="bg-black/30 border-white/10"
          />
          <div className="text-[10px] text-zinc-500 text-right">{(draft.name ?? '').length}/30</div>
        </div>

        <div>
          <Label>Descripción</Label>
          <textarea
            value={draft.description ?? ''}
            onChange={(e) => set('description', e.target.value.slice(0, 150))}
            maxLength={150}
            className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm h-20 focus:outline-none focus:border-purple-500/50"
          />
          <div className="text-[10px] text-zinc-500 text-right">{(draft.description ?? '').length}/150</div>
        </div>

        <div>
          <Label>URL del space</Label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-sm text-zinc-500">kreoon.com/academia/</span>
            <Input
              value={draft.slug ?? ''}
              onChange={(e) =>
                set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
              className="bg-black/30 border-white/10 flex-1"
            />
          </div>
        </div>

        <div>
          <Label>Imagen de portada</Label>
          <BunnyImageUploader
            mode="single"
            value={draft.cover_image_url ?? ''}
            onChange={(url) => set('cover_image_url', url)}
            getStoragePath={(file) =>
              marketplaceStoragePath('academy-space-cover', space.id, file)
            }
            aspectRatio="video"
            height="h-32"
            maxSizeMB={5}
          />
        </div>

        <div>
          <Label>Logo</Label>
          <BunnyImageUploader
            mode="single"
            value={draft.logo_url ?? ''}
            onChange={(url) => set('logo_url', url)}
            getStoragePath={(file) =>
              marketplaceStoragePath('academy-space-logo', space.id, file)
            }
            aspectRatio="square"
            height="h-28"
            maxSizeMB={3}
          />
        </div>

        <div>
          <Label>Color de acento</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={draft.accent_color ?? '#8B5CF6'}
              onChange={(e) => set('accent_color', e.target.value)}
              className="h-10 w-10 rounded cursor-pointer bg-transparent border border-white/10"
            />
            <span className="text-sm text-zinc-400">{draft.accent_color}</span>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 space-y-4">
        <h3 className="font-semibold">Modelo de precios</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Precio mensual (USD)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={draft.membership_price_usd ?? 0}
              onChange={(e) => set('membership_price_usd', Number(e.target.value))}
              className="bg-black/30 border-white/10"
            />
            <p className="text-xs text-zinc-500 mt-1">0 = sin plan mensual</p>
          </div>
          <div>
            <Label>Precio anual (USD)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={(draft as any).yearly_price_usd ?? 0}
              onChange={(e) => set('yearly_price_usd' as any, Number(e.target.value))}
              className="bg-black/30 border-white/10"
            />
            <p className="text-xs text-zinc-500 mt-1">0 = sin plan anual</p>
          </div>
          <div className="col-span-2">
            <Label>Visibilidad</Label>
            <select
              value={draft.is_public ? 'public' : 'private'}
              onChange={(e) => set('is_public', e.target.value === 'public')}
              className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm mt-1"
            >
              <option value="public">Pública (cualquiera puede unirse)</option>
              <option value="private">Privada (solo por invitación)</option>
            </select>
          </div>
        </div>
      </Card>

      <Button
        onClick={save}
        disabled={update.isPending}
        className="bg-purple-500 hover:bg-purple-600 text-white"
      >
        <Save className="h-4 w-4 mr-2" />
        {update.isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </div>
  );
}
