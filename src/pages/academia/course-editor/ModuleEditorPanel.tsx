import { useState, useEffect } from 'react';
import { BookOpen, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateModule } from '@/hooks/academy/useAcademyCourse';
import type { AcademyModule, UnlockLogic } from '@/types/academy';
import { UnlockRulesEditor } from '@/components/academy/unlock/UnlockRulesEditor';
import { SaveState } from './types';
import { SaveIndicator } from './SaveIndicator';

export function ModuleEditorPanel({
  module,
  spaceId,
  accentColor = '#7c3aed',
  onSaved,
}: {
  module: AcademyModule;
  spaceId: string;
  accentColor?: string;
  onSaved: (updated: AcademyModule) => void;
}) {
  const updateModule = useUpdateModule();
  const [title, setTitle] = useState(module.title ?? '');
  const [unlockLogic, setUnlockLogic] = useState<UnlockLogic>((module.unlock_logic ?? 'all') as UnlockLogic);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    setTitle(module.title ?? '');
    setUnlockLogic((module.unlock_logic ?? 'all') as UnlockLogic);
    setSaveState('idle');
  }, [module.id, module.title, module.unlock_logic]);

  async function handleSave() {
    setSaveState('saving');
    try {
      const updated = await updateModule.mutateAsync({
        id: module.id,
        updates: { title, unlock_logic: unlockLogic } as any,
      });
      setSaveState('saved');
      onSaved(updated as AcademyModule);
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-zinc-400" />
          <h2 className="text-lg font-bold truncate max-w-xs">{title || 'Módulo'}</h2>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          <Button size="sm" style={{ backgroundColor: accentColor }} className="text-white gap-1.5" onClick={handleSave} disabled={updateModule.isPending}>
            <Save className="h-3.5 w-3.5" /> Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Título del módulo</Label>
        <Input value={title} onChange={(e) => { setTitle(e.target.value); setSaveState('idle'); }} className="bg-white/5 border-white/10" />
      </div>

      {/* Condiciones de desbloqueo del módulo */}
      <UnlockRulesEditor
        spaceId={spaceId}
        targetType="module"
        targetId={module.id}
        courseId={module.course_id}
        unlockLogic={unlockLogic}
        onLogicChange={setUnlockLogic}
        accentColor={accentColor}
      />
      <p className="text-[11px] text-zinc-500 -mt-2">
        Las condiciones se guardan al instante. La lógica Y/O se aplica al pulsar «Guardar».
      </p>
    </div>
  );
}
