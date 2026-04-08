import { useState } from "react";
import { Search, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AssignableUser } from "@/hooks/useOrgAssignableUsers";

interface AssignUserDropdownProps {
  users: AssignableUser[];
  currentUserId?: string | null;
  onSelect: (user: AssignableUser | null) => void;
  trigger: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Mostrar opcion de quitar asignacion cuando hay usuario actual */
  allowUnassign?: boolean;
}

export function AssignUserDropdown({
  users,
  currentUserId,
  onSelect,
  trigger,
  placeholder = "Buscar...",
  disabled,
  allowUnassign = true,
}: AssignUserDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (user: AssignableUser | null) => {
    onSelect(user);
    setOpen(false);
    setSearch("");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 bg-popover border-[#8b5cf6]/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
            <Input
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 bg-white/5 border-white/10 text-sm text-[#f8fafc]"
            />
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {/* Opcion de quitar asignacion */}
            {allowUnassign && currentUserId && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-sm text-left transition-colors hover:bg-red-500/20 text-red-400 mb-1 border-b border-white/10 pb-2"
              >
                <X className="h-4 w-4" />
                <span className="text-sm">Quitar asignacion</span>
              </button>
            )}
            {filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-2 rounded-sm text-left transition-colors",
                  "hover:bg-white/10 text-[#f8fafc]",
                  currentUserId === user.id && "bg-primary/20"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/30 text-primary">
                    {(user.full_name || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-sm">
                  {user.full_name || "Sin nombre"}
                </span>
                {currentUserId === user.id && (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-[#94a3b8]">
                No hay usuarios
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
