import { Lock, Check, Palette, RefreshCw } from "lucide-react";
import {
  FREE_TEMPLATES,
  PRO_TEMPLATES,
  PREMIUM_TEMPLATES,
} from "@/components/profile-builder/templates/profile-templates";
import type { ProfileTemplate } from "@/components/profile-builder/types/profile-builder";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ApplyMode = "style-only" | "replace";

interface TemplatesPanelProps {
  currentTemplate?: string;
  canUsePro: boolean;
  canUsePremium: boolean;
  onApplyTemplate: (template: ProfileTemplate, mode: ApplyMode) => void;
}

interface TemplateGroup {
  title: string;
  templates: ProfileTemplate[];
  locked: boolean;
  lockLabel?: string;
}

export function TemplatesPanel({
  currentTemplate,
  canUsePro,
  canUsePremium,
  onApplyTemplate,
}: TemplatesPanelProps) {
  const groups: TemplateGroup[] = [
    { title: "Gratis", templates: FREE_TEMPLATES, locked: false },
    {
      title: "Pro",
      templates: PRO_TEMPLATES,
      locked: !canUsePro,
      lockLabel: "Requiere plan Pro",
    },
    {
      title: "Premium",
      templates: PREMIUM_TEMPLATES,
      locked: !canUsePremium,
      lockLabel: "Requiere plan Premium",
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.title} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
            {group.locked && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-2.5 w-2.5" />
                {group.lockLabel}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {group.templates.map((template) => (
              <TemplateCard
                key={template.name}
                template={template}
                isCurrent={currentTemplate === template.name}
                locked={group.locked}
                onApply={(mode) => onApplyTemplate(template, mode)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface TemplateCardProps {
  template: ProfileTemplate;
  isCurrent: boolean;
  locked: boolean;
  onApply: (mode: ApplyMode) => void;
}

function TemplateCard({
  template,
  isCurrent,
  locked,
  onApply,
}: TemplateCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isCurrent
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
        locked && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {template.label}
            {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {template.description}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          disabled={locked}
          onClick={() => onApply("style-only")}
        >
          <Palette className="mr-1 h-3 w-3" />
          Solo estilo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          disabled={locked}
          onClick={() => onApply("replace")}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Reemplazar
        </Button>
      </div>
    </div>
  );
}
