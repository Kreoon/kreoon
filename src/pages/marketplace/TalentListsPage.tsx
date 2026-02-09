import { useState } from 'react';
import { Plus, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTalentLists } from '@/hooks/useTalentLists';
import { TalentListCard } from '@/components/marketplace/talent-lists/TalentListCard';
import { CreateTalentListDialog } from '@/components/marketplace/talent-lists/CreateTalentListDialog';

export default function TalentListsPage() {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id || null;
  const { lists, loading } = useTalentLists(orgId);
  const [showCreate, setShowCreate] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Listas de Talento</h1>
            <p className="text-sm text-gray-500 mt-1">Organiza y guarda creadores para tus proyectos</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Lista
          </Button>
        </div>

        {/* Lists grid */}
        {lists.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No tienes listas aún</h3>
            <p className="text-sm text-gray-500 mb-6">Crea tu primera lista para empezar a organizar talento</p>
            <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Lista
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map(list => (
              <TalentListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </div>

      <CreateTalentListDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        organizationId={orgId}
      />
    </div>
  );
}
