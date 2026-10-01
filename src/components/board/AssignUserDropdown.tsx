import { useState } from "react";
import { Check, UserMinus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/content-board/kanban/kanbanUtils";
import type { AssignableUser } from "@/hooks/useOrgAssignableUsers";

interface AssignUserDropdownProps {
  users: AssignableUser[];
  currentUserId?: string | null;
  /** user = elegido; null = quitar la asignación */
  onSelect: (user: AssignableUser | null) => void;
  /** Elemento disparador (se renderiza con asChild: debe ser un único <button>). */
  trigger: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  /** Mostrar «Quitar asignación» cuando hay usuario actual */
  allowUnassign?: boolean;
  /** Título accesible del selector (p. ej. «Asignar creador») */
  label?: string;
}

/**
 * Selector de persona con búsqueda. Popover + cmdk: navegable con teclado (flechas, Enter, Esc),
 * con colores por tokens (sirve en claro y oscuro). El contenido va en portal, así que ningún
 * puntero/clic sobre la lista llega a la tarjeta que lo abre.
 */
export function AssignUserDropdown({
  users,
  currentUserId,
  onSelect,
  trigger,
  placeholder = "Buscar persona…",
  disabled,
  allowUnassign = true,
  label = "Asignar persona",
}: AssignUserDropdownProps) {
  const [open, setOpen] = useState(false);

  const choose = (user: AssignableUser | null) => {
    setOpen(false);
    onSelect(user);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0" data-no-drag aria-label={label}>
        <Command>
          <CommandInput placeholder={placeholder} aria-label={label} />
          <CommandList>
            <CommandEmpty>No hay personas con ese nombre.</CommandEmpty>
            {allowUnassign && currentUserId && (
              <CommandItem value="__quitar__ quitar asignación" onSelect={() => choose(null)} className="gap-2 text-destructive">
                <UserMinus className="h-4 w-4" />
                Quitar asignación
              </CommandItem>
            )}
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.full_name || "Sin nombre"} ${user.id}`}
                onSelect={() => choose(user)}
                className="gap-2"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.avatar_url || undefined} alt="" />
                  <AvatarFallback className="text-[11px] font-semibold bg-accent text-accent-foreground">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{user.full_name || "Sin nombre"}</span>
                {currentUserId === user.id && <Check className="h-4 w-4 text-primary shrink-0" aria-label="Asignado actualmente" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
