import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useTalentListMembers, useTalentLists } from '@/hooks/useTalentLists';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TalentListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id || null;
  const { lists } = useTalentLists(orgId);
  const { members, loading } = useTalentListMembers(id);

  const list = lists.find(l => l.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <button onClick={() => navigate(-1)} className="md:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-1">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <Link to="/marketplace/talent-lists" className="text-gray-500 hover:text-foreground">Listas de Talento</Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
          <span className="text-foreground">{list?.name || 'Lista'}</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {list?.color && (
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: list.color }} />
          )}
          <h1 className="text-2xl font-bold text-foreground">{list?.name || 'Lista'}</h1>
          <span className="text-sm text-gray-500">({members.length} creadores)</span>
        </div>

        {/* Members */}
        {members.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">Esta lista está vacía</p>
            <p className="text-sm text-gray-500 mt-1">Agrega creadores desde el marketplace</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map(member => {
              const initials = (member.creator?.full_name || '?')
                .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={member.id} className="flex items-center gap-3 p-4 rounded-sm border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.creator?.avatar_url || ''} />
                    <AvatarFallback className="text-xs bg-purple-500/20 text-purple-400">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.creator?.full_name || 'Creador'}</p>
                    {member.notes && <p className="text-xs text-gray-500 truncate">{member.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
