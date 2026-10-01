import { memo, useCallback } from "react";
import { Plus, Scissors, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignUserDropdown } from "@/components/board/AssignUserDropdown";
import type { AssignableUser } from "@/hooks/useOrgAssignableUsers";
import { getFirstName, getInitials } from "./kanbanUtils";
import type { AssigneeKind, AssignableUserLite } from "./kanbanTypes";

const KIND = {
  creator: { label: "creador", Icon: Video, cap: "Creador", short: "Creador" },
  editor: { label: "editor", Icon: Scissors, cap: "Editor", short: "Editor" },
} as const;

interface PersonLike {
  id?: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface AssigneeSlotProps {
  kind: AssigneeKind;
  contentId: string;
  contentTitle: string;
  person: PersonLike | null | undefined;
  personId: string | null | undefined;
  users: AssignableUserLite[];
  canAssign: boolean;
  /** Muestra el primer nombre junto al avatar (densidad cómoda). */
  showName: boolean;
  onAssign?: (kind: AssigneeKind, contentId: string, userId: string) => Promise<void>;
}

function PersonAvatar({ person, kind }: { person: PersonLike; kind: AssigneeKind }) {
  const { Icon } = KIND[kind];
  return (
    <Avatar className="kb-avatar">
      <AvatarImage src={person.avatar_url || undefined} alt="" loading="lazy" />
      <AvatarFallback className="bg-accent text-accent-foreground">{getInitials(person.full_name)}</AvatarFallback>
      <span className="kb-avatar__role" aria-hidden="true">
        <Icon />
      </span>
    </Avatar>
  );
}

/**
 * Responsable (creador o editor) como avatar compacto con etiqueta accesible.
 * - Con permiso de asignar: el avatar (o «+ Creador») abre un selector con búsqueda; incluye «Quitar asignación».
 * - Sin permiso: solo informativo (role="img"), sin falsas affordances.
 */
export const AssigneeSlot = memo(function AssigneeSlot({
  kind,
  contentId,
  contentTitle,
  person,
  personId,
  users,
  canAssign,
  showName,
  onAssign,
}: AssigneeSlotProps) {
  const meta = KIND[kind];
  const name = person?.full_name || (personId ? "Sin nombre" : "");
  const hasPerson = !!(person || personId);
  const assignable = canAssign && !!onAssign;

  const handleSelect = useCallback(
    (user: AssignableUser | null) => {
      void onAssign?.(kind, contentId, user ? user.id : "");
    },
    [onAssign, kind, contentId],
  );

  if (hasPerson) {
    const aria = `${meta.cap}: ${name}`;
    const body = (
      <>
        <PersonAvatar person={person || {}} kind={kind} />
        {showName && <span className="kb-assignee__name">{getFirstName(name) || name}</span>}
      </>
    );
    if (!assignable) {
      return (
        <span className="kb-assignee" role="img" aria-label={aria} title={aria} data-no-click>
          {body}
        </span>
      );
    }
    return (
      <AssignUserDropdown
        users={users as AssignableUser[]}
        currentUserId={personId}
        onSelect={handleSelect}
        allowUnassign
        label={`Cambiar ${meta.label} de «${contentTitle}»`}
        trigger={
          <button
            type="button"
            className="kb-assignee"
            data-no-click
            data-no-drag
            aria-label={`${aria}. Cambiar o quitar`}
            title={`${aria} · cambiar o quitar`}
          >
            {body}
          </button>
        }
      />
    );
  }

  if (assignable) {
    return (
      <AssignUserDropdown
        users={users as AssignableUser[]}
        currentUserId={null}
        onSelect={handleSelect}
        allowUnassign={false}
        label={`Asignar ${meta.label} a «${contentTitle}»`}
        trigger={
          <button
            type="button"
            className="kb-assign-pill"
            data-no-click
            data-no-drag
            aria-label={`Asignar ${meta.label} a «${contentTitle}»`}
          >
            <Plus aria-hidden="true" />
            {meta.short}
          </button>
        }
      />
    );
  }

  // Sin persona y sin permiso para asignar: no se dibuja nada (solo un texto para lectores de pantalla).
  return <span className="sr-only">{`Sin ${meta.label} asignado`}</span>;
});
