import { Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOARD_FIELDS } from "./boardFieldsConfig";

interface GroupBySelectorProps {
  currentGroupBy: string;
  onGroupByChange: (field: string) => void;
}

// Campos que permiten agrupación lógica
const GROUPABLE_FIELDS = [
  'status',
  'client',
  'creator',
  'editor',
  'sphere_phase',
  'campaign_week',
  'deadline', // Agrupará por fecha
];

/**
 * Selector de agrupación estilo Notion.
 * Permite cambiar el campo por el cual se agrupan los elementos en la lista.
 */
export function GroupBySelector({
  currentGroupBy,
  onGroupByChange,
}: GroupBySelectorProps) {
  const groupableFields = GROUPABLE_FIELDS.filter(f => f in BOARD_FIELDS);

  return (
    <Select value={currentGroupBy} onValueChange={onGroupByChange}>
      <SelectTrigger className="w-[160px] h-8 text-xs gap-1 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50">
        <Layers className="h-3.5 w-3.5 text-purple-500" />
        <SelectValue placeholder="Agrupar por..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-xs">
          Sin agrupar
        </SelectItem>
        {groupableFields.map(field => {
          const config = BOARD_FIELDS[field];
          return (
            <SelectItem key={field} value={field} className="text-xs">
              {config?.label || field}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
