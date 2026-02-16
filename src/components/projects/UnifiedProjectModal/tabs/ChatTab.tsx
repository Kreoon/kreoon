import { useAuth } from '@/hooks/useAuth';
import { ProjectChatPanel } from '@/components/marketplace/chat/ProjectChatPanel';
import { MessageCircle } from 'lucide-react';
import type { UnifiedTabProps } from '../types';

export default function ChatTab({ project }: UnifiedTabProps) {
  const { user, profile } = useAuth();

  if (!project.id || !user?.id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Chat no disponible</p>
      </div>
    );
  }

  // Determine user role in chat context
  let chatRole: 'brand' | 'creator' | 'editor' = 'brand';
  if (project.creatorId === user.id) chatRole = 'creator';
  else if (project.editorId === user.id) chatRole = 'editor';

  return (
    <ProjectChatPanel
      projectId={project.id}
      currentUserId={user.id}
      currentUserName={profile?.full_name || user.email || 'Usuario'}
      currentUserAvatar={profile?.avatar_url}
      currentUserRole={chatRole}
    />
  );
}
