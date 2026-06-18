import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProfileBlock } from "@/components/profile-builder/types/profile-builder";
import type { BuilderSection } from "../types";

export interface SectionEditorProps {
  section: BuilderSection;
  onUpdateBlock: (blockId: string, updates: Partial<ProfileBlock>) => void;
}

/** Helpers para actualizar content/config preservando el resto del objeto. */
export function patchContent(
  section: BuilderSection,
  onUpdateBlock: SectionEditorProps["onUpdateBlock"],
  key: string,
  value: unknown,
) {
  onUpdateBlock(section.blockId, {
    content: { ...section.block.content, [key]: value },
  });
}

export function patchConfig(
  section: BuilderSection,
  onUpdateBlock: SectionEditorProps["onUpdateBlock"],
  key: string,
  value: unknown,
) {
  onUpdateBlock(section.blockId, {
    config: { ...section.block.config, [key]: value },
  });
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asBool(value: unknown): boolean {
  return value === true;
}

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
}: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  rows?: number;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function TextAreaField({
  label,
  value,
  rows = 4,
  placeholder,
  onChange,
}: TextAreaFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchField({ label, checked, onChange }: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              "rounded-md border px-2.5 py-1 text-xs transition-colors " +
              (value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40")
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
