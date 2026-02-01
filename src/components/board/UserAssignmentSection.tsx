import { Video, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserChip } from "./UserChip";
import { AssignUserDropdown } from "./AssignUserDropdown";
import { ProjectMetadata } from "./ProjectMetadata";
import type { AssignableUser } from "@/hooks/useOrgAssignableUsers";
import type { Content } from "@/types/database";

const CAN_ASSIGN_ROLES = ["admin", "strategist", "team_leader"];

interface UserAssignmentSectionProps {
  content: Content;
  creators: AssignableUser[];
  editors: AssignableUser[];
  userRole?: string | null;
  onAssignCreator?: (userId: string) => Promise<void>;
  onAssignEditor?: (userId: string) => Promise<void>;
  onUpdate?: () => void;
  compact?: boolean;
}

export function UserAssignmentSection({
  content,
  creators,
  editors,
  userRole,
  onAssignCreator,
  onAssignEditor,
  onUpdate,
  compact,
}: UserAssignmentSectionProps) {
  const canAssign =
    userRole && CAN_ASSIGN_ROLES.includes(userRole) && (!!onAssignCreator || !!onAssignEditor);

  const isOverdue = content.deadline
    ? new Date(content.deadline) < new Date() &&
      !["approved", "paid", "delivered"].includes(content.status)
    : false;

  const isDueSoon =
    content.deadline && !isOverdue
      ? (new Date(content.deadline).getTime() - Date.now()) / (1000 * 60 * 60) < 48
      : false;

  const handleAssignCreator = async (user: AssignableUser) => {
    await onAssignCreator?.(user.id);
    onUpdate?.();
  };

  const handleAssignEditor = async (user: AssignableUser) => {
    await onAssignEditor?.(user.id);
    onUpdate?.();
  };

  return (
    <div
      data-no-click
      className="mt-3 rounded-lg p-3 space-y-3"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Creador */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[#94a3b8] shrink-0">
          <Video className="h-4 w-4 text-[#06b6d4]" />
          <span className="text-xs font-medium">Creador</span>
        </div>
        {content.creator ? (
          canAssign ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <UserChip
                  name={content.creator.full_name || ""}
                  avatarUrl={content.creator.avatar_url}
                  borderColor="#06b6d4"
                />
              </TooltipTrigger>
              <TooltipContent>Creador asignado</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <UserChip
                    name={content.creator.full_name || ""}
                    avatarUrl={content.creator.avatar_url}
                    borderColor="#06b6d4"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>No tienes permisos para asignar</TooltipContent>
            </Tooltip>
          )
        ) : canAssign && onAssignCreator ? (
          <AssignUserDropdown
            users={creators}
            currentUserId={content.creator_id}
            onSelect={handleAssignCreator}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-[#8b5cf6]/40 text-[#a78bfa] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/60 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                onClick={(e) => e.stopPropagation()}
              >
                + Asignar
              </Button>
            }
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-[#64748b]">Sin asignar</span>
            </TooltipTrigger>
            <TooltipContent>No tienes permisos para asignar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Editor */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[#94a3b8] shrink-0">
          <Scissors className="h-4 w-4 text-[#a855f7]" />
          <span className="text-xs font-medium">Editor</span>
        </div>
        {content.editor ? (
          canAssign ? (
            <UserChip
              name={content.editor.full_name || ""}
              avatarUrl={content.editor.avatar_url}
              borderColor="#a855f7"
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <UserChip
                    name={content.editor.full_name || ""}
                    avatarUrl={content.editor.avatar_url}
                    borderColor="#a855f7"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>No tienes permisos para asignar</TooltipContent>
            </Tooltip>
          )
        ) : canAssign && onAssignEditor ? (
          <AssignUserDropdown
            users={editors}
            currentUserId={content.editor_id}
            onSelect={handleAssignEditor}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-[#8b5cf6]/40 text-[#a78bfa] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/60 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                onClick={(e) => e.stopPropagation()}
              >
                + Asignar
              </Button>
            }
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-[#64748b]">Sin asignar</span>
            </TooltipTrigger>
            <TooltipContent>No tienes permisos para asignar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Metadata: Cliente, fechas */}
      {!compact && (
        <div className="pt-2 border-t border-white/5">
          <ProjectMetadata
            clientName={content.client?.name}
            createdAt={content.created_at}
            deadline={content.deadline}
            isOverdue={isOverdue}
            isDueSoon={isDueSoon}
          />
        </div>
      )}
    </div>
  );
}
