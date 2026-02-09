import { useMemo } from 'react';
import { MessageSquare, Gift, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceProjects } from '@/hooks/useMarketplaceProjects';
import type { MarketplaceProject } from '../types/marketplace';

interface ProjectChatListProps {
  onSelectProject: (projectId: string) => void;
  selectedProjectId?: string;
  viewRole: 'brand' | 'creator' | 'editor';
}

export function ProjectChatList({ onSelectProject, selectedProjectId, viewRole }: ProjectChatListProps) {
  const { projects: allProjects } = useMarketplaceProjects();

  const projects = useMemo(() => {
    return allProjects
      .filter(p => p.last_message_at)
      .sort((a, b) => new Date(b.last_message_at!).getTime() - new Date(a.last_message_at!).getTime());
  }, [allProjects]);

  if (projects.length === 0) {
    return (
      <div className="text-center text-gray-600 text-sm py-8">
        No hay conversaciones activas
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {projects.map(project => (
        <ProjectChatRow
          key={project.id}
          project={project}
          isSelected={project.id === selectedProjectId}
          onClick={() => onSelectProject(project.id)}
          viewRole={viewRole}
        />
      ))}
    </div>
  );
}

function ProjectChatRow({
  project,
  isSelected,
  onClick,
  viewRole,
}: {
  project: MarketplaceProject;
  isSelected: boolean;
  onClick: () => void;
  viewRole: string;
}) {
  const displayName = viewRole === 'brand' ? project.creator.display_name : project.brand_name;
  const avatar = viewRole === 'brand' ? project.creator.avatar_url : project.brand_logo;
  const timeAgo = project.last_message_at
    ? formatTimeAgo(new Date(project.last_message_at))
    : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
        isSelected
          ? 'bg-purple-500/10 border border-purple-500/30'
          : 'hover:bg-white/5 border border-transparent',
      )}
    >
      {avatar ? (
        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-sm flex-shrink-0">
          {displayName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">{displayName}</span>
          <span className="text-gray-600 text-xs flex-shrink-0">{timeAgo}</span>
        </div>
        <p className="text-gray-500 text-xs truncate">{project.brief.product_name}</p>
      </div>
      {project.unread_messages > 0 && (
        <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
          {project.unread_messages}
        </span>
      )}
    </button>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 7) return `${diffD}d`;
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
}
