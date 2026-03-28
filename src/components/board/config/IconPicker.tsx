import { useState } from "react";
import {
  FilePlus,
  CheckCircle,
  UserCheck,
  Video,
  VideoOff,
  Scissors,
  Package,
  Eye,
  ThumbsUp,
  Send,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Check,
  Megaphone,
  DollarSign,
  Heart,
  Zap,
  Lightbulb,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ICONS: { id: string; icon: LucideIcon; category: string }[] = [
  { id: "file-plus", icon: FilePlus, category: "Workflow" },
  { id: "check-circle", icon: CheckCircle, category: "Estados" },
  { id: "user-check", icon: UserCheck, category: "Workflow" },
  { id: "video", icon: Video, category: "Workflow" },
  { id: "video-off", icon: VideoOff, category: "Estados" },
  { id: "scissors", icon: Scissors, category: "Acciones" },
  { id: "package", icon: Package, category: "Estados" },
  { id: "eye", icon: Eye, category: "Estados" },
  { id: "thumbs-up", icon: ThumbsUp, category: "Estados" },
  { id: "send", icon: Send, category: "Acciones" },
  { id: "alert-circle", icon: AlertCircle, category: "Alertas" },
  { id: "x-circle", icon: XCircle, category: "Estados" },
  { id: "alert-triangle", icon: AlertTriangle, category: "Alertas" },
  { id: "check", icon: Check, category: "Estados" },
  { id: "megaphone", icon: Megaphone, category: "Acciones" },
  { id: "dollar-sign", icon: DollarSign, category: "Estados" },
  { id: "heart", icon: Heart, category: "Estados" },
  { id: "zap", icon: Zap, category: "Acciones" },
  { id: "lightbulb", icon: Lightbulb, category: "Acciones" },
  { id: "circle", icon: Circle, category: "Estados" },
];

interface IconPickerProps {
  value: string | null;
  onChange: (iconId: string | null) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = ICONS.filter(
    (i) =>
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = value ? ICONS.find((i) => i.id === value)?.icon : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-white/20 bg-white/5 hover:bg-white/10",
            "focus:ring-[#a855f7]/50 focus:border-primary/50",
            className
          )}
        >
          {SelectedIcon ? (
            <SelectedIcon className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-[#64748b]" />
          )}
          <span className="text-[#cbd5e1]">{value || "Sin ícono"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-popover border-[#8b5cf6]/30"
        align="start"
      >
        <Input
          placeholder="Buscar ícono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 h-8 bg-white/5 border-white/20 text-[#f8fafc] text-sm"
        />
        <div className="grid grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto">
          {filtered.map((item) => {
            const Icon = item.icon;
            const isSelected = value === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(isSelected ? null : item.id);
                  setOpen(false);
                }}
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-sm transition-all",
                  "hover:bg-white/10 hover:border-primary/50",
                  isSelected
                    ? "bg-primary/20 border border-primary text-primary"
                    : "border border-transparent text-[#94a3b8]"
                )}
                title={item.id}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
