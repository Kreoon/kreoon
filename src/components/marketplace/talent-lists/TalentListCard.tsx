import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import type { TalentList } from '../types/marketplace';

interface TalentListCardProps {
  list: TalentList;
}

export function TalentListCard({ list }: TalentListCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/marketplace/talent-lists/${list.id}`)}
      className="group cursor-pointer p-4 rounded-sm border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${list.color}20` }}
        >
          <Users className="h-5 w-5" style={{ color: list.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{list.name}</h3>
          {list.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{list.description}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {list.member_count} {list.member_count === 1 ? 'creador' : 'creadores'}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
