import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMetadataProps {
  clientName?: string | null;
  createdAt?: string | null;
  deadline?: string | null;
  isOverdue?: boolean;
  isDueSoon?: boolean;
  className?: string;
}

export function ProjectMetadata({
  clientName,
  createdAt,
  deadline,
  isOverdue,
  isDueSoon,
  className,
}: ProjectMetadataProps) {
  return (
    <div className={cn("space-y-2 text-xs", className)}>
      {clientName && (
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
          <span className="truncate">{clientName}</span>
        </div>
      )}
      {createdAt && (
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Creado {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })}</span>
        </div>
      )}
      {deadline && (
        <div
          className={cn(
            "flex items-center gap-2",
            isOverdue && "text-[#f87171] font-medium",
            isDueSoon && !isOverdue && "text-[#fbbf24] font-medium",
            !isOverdue && !isDueSoon && "text-[#94a3b8]"
          )}
        >
          <Target className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isOverdue ? "Vencido " : "Entrega "}
            {format(new Date(deadline), "dd MMM", { locale: es })}
          </span>
        </div>
      )}
    </div>
  );
}
