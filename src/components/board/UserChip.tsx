import { forwardRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserChipProps {
  name: string;
  avatarUrl?: string | null;
  borderColor: string;
  className?: string;
}

export const UserChip = forwardRef<HTMLDivElement, UserChipProps>(
  function UserChip({ name, avatarUrl, borderColor, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-2xl py-1 pr-3 pl-1 transition-all",
        "bg-white/5 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]",
        className
      )}
    >
      <Avatar
        className="h-6 w-6 shrink-0"
        style={{
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 8px ${borderColor}40`,
        }}
      >
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="text-[10px] font-semibold bg-primary/20 text-primary">
          {(name || "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-[#f8fafc] truncate max-w-[80px]">
        {name || "Sin nombre"}
      </span>
    </div>
  );
});
