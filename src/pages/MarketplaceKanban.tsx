import { useAuth } from '@/hooks/useAuth';
import { MarketplaceKanbanBoard } from '@/components/marketplace/kanban/MarketplaceKanbanBoard';
import { BRAND_COLUMNS, CREATOR_COLUMNS, EDITOR_COLUMNS } from '@/hooks/useMarketplaceProjects';

export default function MarketplaceKanban() {
  const { activeRole, isCreator, isEditor } = useAuth();

  let columns = BRAND_COLUMNS;
  let viewRole: 'brand' | 'creator' | 'editor' = 'brand';

  if (isCreator || activeRole === 'creator') {
    columns = CREATOR_COLUMNS;
    viewRole = 'creator';
  } else if (isEditor || activeRole === 'editor') {
    columns = EDITOR_COLUMNS;
    viewRole = 'editor';
  }

  return <MarketplaceKanbanBoard columns={columns} viewRole={viewRole} />;
}
