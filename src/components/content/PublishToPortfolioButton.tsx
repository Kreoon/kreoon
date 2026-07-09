import { useEffect, useState } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { usePublishToPortfolio } from '@/hooks/usePublishToPortfolio';
import type { PortfolioVisibility } from '@/types/database';

interface PublishToPortfolioButtonProps {
  contentId: string;
  organizationId?: string | null;
  defaultTitle: string;
  mediaUrl: string | null;
  thumbnailUrl?: string | null;
  className?: string;
  onPublished?: () => void;
}

const VISIBILITY_OPTIONS: { value: PortfolioVisibility; label: string; hint: string }[] = [
  { value: 'public', label: 'Público', hint: 'Cualquiera puede verlo, incluso sin sesión' },
  { value: 'followers', label: 'Solo seguidores', hint: 'Solo quienes te siguen lo ven' },
  { value: 'org', label: 'Solo mi organización', hint: 'Visible únicamente dentro de KREOON' },
];

export function PublishToPortfolioButton({
  contentId,
  organizationId,
  defaultTitle,
  mediaUrl,
  thumbnailUrl,
  className,
  onPublished,
}: PublishToPortfolioButtonProps) {
  const isMobile = useIsMobile();
  const { profile: creatorProfile, loading: loadingCreatorProfile } = useCreatorProfile();
  const creatorProfileId = creatorProfile?.id ?? null;
  const { checking, publishing, existingItem, checkPublished, publish } = usePublishToPortfolio();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [visibility, setVisibility] = useState<PortfolioVisibility>('public');
  const [clientApproved, setClientApproved] = useState(false);

  useEffect(() => {
    if (contentId && creatorProfileId) {
      checkPublished(contentId, creatorProfileId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, creatorProfileId]);

  // Prefill con la fila auto-sincronizada (source_type='organization_content') si existe
  useEffect(() => {
    if (open) {
      setTitle(existingItem?.title || defaultTitle);
      if (existingItem?.visibility) setVisibility(existingItem.visibility as PortfolioVisibility);
      setClientApproved(existingItem?.client_approved_showcase ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTitle, existingItem]);

  const alreadyPublished = !!existingItem?.is_public;
  const isChecking = loadingCreatorProfile || checking;
  const disabled = !mediaUrl || !creatorProfileId || isChecking || alreadyPublished;

  const handlePublish = async () => {
    if (!creatorProfileId || !mediaUrl) return;
    const ok = await publish({
      contentId,
      creatorProfileId,
      organizationId,
      title: title.trim() || defaultTitle,
      mediaUrl,
      thumbnailUrl,
      visibility,
      clientApprovedShowcase: clientApproved,
    });
    if (ok) {
      setOpen(false);
      onPublished?.();
    }
  };

  const triggerButton = (
    <Button
      type="button"
      size="sm"
      variant={alreadyPublished ? 'outline' : 'default'}
      disabled={disabled && !alreadyPublished}
      onClick={() => !alreadyPublished && setOpen(true)}
      className={cnTouch(className)}
    >
      {isChecking ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : alreadyPublished ? (
        <Check className="h-4 w-4" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      <span className="truncate">
        {alreadyPublished ? 'Ya publicado' : 'Publicar a mi portafolio'}
      </span>
    </Button>
  );

  const formBody = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="publish-title" className="text-sm">Título</Label>
        <Input
          id="publish-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Visibilidad</Label>
        <RadioGroup
          value={visibility}
          onValueChange={(v) => setVisibility(v as PortfolioVisibility)}
          className="space-y-2"
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`visibility-${opt.value}`}
              className="flex items-start gap-3 rounded-sm border border-border p-3 min-h-[44px] cursor-pointer hover:bg-muted/50"
            >
              <RadioGroupItem value={opt.value} id={`visibility-${opt.value}`} className="mt-0.5" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <label
        htmlFor="client-approved"
        className="flex items-start gap-3 rounded-sm border border-border p-3 min-h-[44px] cursor-pointer hover:bg-muted/50"
      >
        <Checkbox
          id="client-approved"
          checked={clientApproved}
          onCheckedChange={(v) => setClientApproved(v === true)}
          className="mt-0.5"
        />
        <span className="flex-1 text-sm text-foreground">
          El cliente aprobó mostrar este contenido en mi portafolio
        </span>
      </label>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90dvh] pb-[env(safe-area-inset-bottom)]">
            <DrawerHeader>
              <DrawerTitle>Publicar a mi portafolio</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">{formBody}</div>
            <DrawerFooter>
              <Button
                onClick={handlePublish}
                disabled={publishing || !title.trim()}
                className="h-11"
              >
                {publishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Publicar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {triggerButton}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar a mi portafolio</DialogTitle>
          </DialogHeader>
          {formBody}
          <DialogFooter>
            <Button
              onClick={handlePublish}
              disabled={publishing || !title.trim()}
              className="h-11"
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Asegura touch target minimo 44px sin alterar el tamano visual del boton "sm" del design system
function cnTouch(className?: string): string {
  return ['min-h-[44px] gap-1.5', className].filter(Boolean).join(' ');
}
