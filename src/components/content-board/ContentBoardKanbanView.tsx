import { EnhancedKanbanColumn, EnhancedContentCard } from "@/components/board";
import { Content, ContentStatus } from "@/types/database";
import { canMoveToStatusWithRules, OrgStatus, StatusRule } from "@/lib/contentBoardPermissions";

interface BoardColumn {
  status: string;
  title: string;
  color: string;
  sortOrder: number;
}

interface BoardSettings {
  card_size?: string;
  visible_fields?: string[];
}

const CARDS_PER_COLUMN = 8;

const FALLBACK_COLORS: Record<string, string> = {
  'bg-muted-foreground': '#6b7280',
  'bg-info': '#3b82f6',
  'bg-purple-500': '#8b5cf6',
  'bg-purple-600': '#9333ea',
  'bg-orange-500': '#f97316',
  'bg-cyan-500': '#06b6d4',
  'bg-pink-500': '#ec4899',
  'bg-emerald-500': '#10b981',
  'bg-destructive': '#ef4444',
  'bg-blue-500': '#3b82f6',
  'bg-success': '#22c55e',
};

export interface ContentBoardKanbanViewProps {
  allBoardColumns: BoardColumn[];
  getContentByStatus: (status: ContentStatus | string) => Content[];
  dropTarget: ContentStatus | string | null;
  draggingContent: Content | null;
  primaryRole: string;
  targetUserId: string | undefined;
  orgStatuses: OrgStatus[];
  rules: StatusRule[];
  roles: string[];
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetStatus: ContentStatus | string) => void;
  handleDragEnter: (status: ContentStatus | string) => void;
  handleDragStart: (e: React.DragEvent, content: Content) => void;
  expandedColumns: Set<string>;
  toggleColumnExpand: (status: string) => void;
  settings: BoardSettings | null | undefined;
  updateSettings: (settings: Partial<BoardSettings>) => void;
  setSelectedContent: (content: Content | null) => void;
  showAdminControls: boolean;
  ambassadorIds: Set<string>;
  updateContentStatus: (contentId: string, newStatus: ContentStatus) => Promise<void>;
  refetch: () => void;
  setAIPanelMode: (mode: 'card' | 'board') => void;
  setAIContentId: (id: string | undefined) => void;
  setAIContentTitle: (title: string | undefined) => void;
  setShowAIPanel: (show: boolean) => void;
  setMarketingPanelContent: (content: Content | null) => void;
  setShowMarketingPanel: (show: boolean) => void;
  assignableCreators: any[];
  assignableEditors: any[];
  handleAssignCreator?: (contentId: string, userId: string) => Promise<void>;
  handleAssignEditor?: (contentId: string, userId: string) => Promise<void>;
  socialStatusMap: Record<string, any> | undefined;
}

export function ContentBoardKanbanView({
  allBoardColumns, getContentByStatus, dropTarget, draggingContent, primaryRole, targetUserId,
  orgStatuses, rules, roles, handleDragOver, handleDrop, handleDragEnter, handleDragStart,
  expandedColumns, toggleColumnExpand, settings, updateSettings, setSelectedContent,
  showAdminControls, ambassadorIds, updateContentStatus, refetch, setAIPanelMode, setAIContentId,
  setAIContentTitle, setShowAIPanel, setMarketingPanelContent, setShowMarketingPanel,
  assignableCreators, assignableEditors, handleAssignCreator, handleAssignEditor, socialStatusMap,
}: ContentBoardKanbanViewProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-sm">
      <div
        className="flex overflow-x-auto gap-3 p-3 md:p-4 scroll-smooth"
        style={{
          background: "linear-gradient(180deg, #0a0118 0%, #0d0220 100%)",
          height: "calc(100vh - 180px)",
          minHeight: "450px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(139, 92, 246, 0.3) transparent",
        }}
      >
        {allBoardColumns.map(column => {
          const columnContent = getContentByStatus(column.status);
          const isCurrentDropTarget = dropTarget === column.status;
          const canDropHere = draggingContent
            ? canMoveToStatusWithRules(primaryRole, draggingContent.status, column.status, draggingContent, targetUserId || '', orgStatuses, rules, roles)
            : true;

          // Get dynamic color and title from organization settings
          const orgStatus = orgStatuses.find(s => s.status_key === column.status);
          const columnTitle = orgStatus?.label || column.title;

          // Convert CSS class to hex for fallback, or use orgStatus color
          const columnColor = orgStatus?.color || FALLBACK_COLORS[column.color] || column.color || '#6b7280';

          return (
            <EnhancedKanbanColumn
              key={column.status}
              id={column.status}
              title={columnTitle}
              count={columnContent.length}
              color={columnColor}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
              onDragEnter={() => handleDragEnter(column.status)}
              isDropTarget={isCurrentDropTarget}
              canDrop={canDropHere}
            >
              {(() => {
                const isExpanded = expandedColumns.has(column.status);
                const visibleItems = isExpanded ? columnContent : columnContent.slice(0, CARDS_PER_COLUMN);
                const hiddenCount = columnContent.length - CARDS_PER_COLUMN;
                return (
                  <>
                    {visibleItems.map(item => (
                      <EnhancedContentCard
                        key={item.id}
                        content={item}
                        cardSize={settings?.card_size || 'normal'}
                        visibleFields={settings?.visible_fields || ['title', 'status', 'client', 'deadline', 'responsible']}
                        showFieldsCustomizer={true}
                        onVisibleFieldsChange={(fields) => updateSettings({ visible_fields: fields })}
                        onClick={() => setSelectedContent(item)}
                        onDragStart={(e) => handleDragStart(e, item)}
                        isDragging={draggingContent?.id === item.id}
                        showAIIndicators={showAdminControls}
                        organizationStatuses={orgStatuses}
                        userRole={primaryRole as any}
                        userId={targetUserId}
                        onStatusChange={async (contentId, newStatus) => {
                          await updateContentStatus(contentId, newStatus);
                          refetch();
                        }}
                        showStatusControls={true}
                        ambassadorIds={ambassadorIds}
                        onAnalyzeWithAI={showAdminControls ? (contentId, title) => {
                          setAIPanelMode('card');
                          setAIContentId(contentId);
                          setAIContentTitle(title);
                          setShowAIPanel(true);
                        } : undefined}
                        onShowMarketingInfo={(content) => {
                          setMarketingPanelContent(content);
                          setShowMarketingPanel(true);
                        }}
                        creators={assignableCreators}
                        editors={assignableEditors}
                        onAssignCreator={showAdminControls || primaryRole === "team_leader" ? handleAssignCreator : undefined}
                        onAssignEditor={showAdminControls || primaryRole === "team_leader" ? handleAssignEditor : undefined}
                        onUpdate={refetch}
                        socialStatus={socialStatusMap?.[item.id]}
                      />
                    ))}
                    {!isExpanded && hiddenCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleColumnExpand(column.status); }}
                        className="w-full py-2 px-3 rounded-sm text-xs font-medium text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
                        style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px dashed rgba(139, 92, 246, 0.25)' }}
                      >
                        Ver {hiddenCount} más
                      </button>
                    )}
                    {isExpanded && hiddenCount > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleColumnExpand(column.status); }}
                        className="w-full py-2 px-3 rounded-sm text-xs font-medium text-[#64748b] hover:text-[#94a3b8] transition-colors"
                        style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.1)' }}
                      >
                        Mostrar menos
                      </button>
                    )}
                  </>
                );
              })()}
              {columnContent.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-sm p-4 md:p-8 text-center text-muted-foreground text-xs md:text-sm">
                  Sin contenido
                </div>
              )}
            </EnhancedKanbanColumn>
          );
        })}
      </div>
    </div>
  );
}
