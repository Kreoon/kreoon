import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabProps, ContentFormData } from '../types';
import { useScriptPermissions } from './useScriptPermissions';
import { useBlockConfig } from '../hooks/useBlockConfig';
import { SCRIPT_SUB_TABS, ScriptSubTab } from './types';
import { BlockKey } from '../Config/types';

// Sub-tab components
import { IASubTab } from './subtabs/IASubTab';
import { ScriptSubTab as ScriptSubTabComponent } from './subtabs/ScriptSubTab';
import { EditorSubTab } from './subtabs/EditorSubTab';
import { StrategistSubTab } from './subtabs/StrategistSubTab';
import { DesignerSubTab } from './subtabs/DesignerSubTab';
import { TraffickerSubTab } from './subtabs/TraffickerSubTab';
import { AdminSubTab } from './subtabs/AdminSubTab';

// Map ScriptSubTab to BlockKey
const SUBTAB_TO_BLOCK: Record<ScriptSubTab, BlockKey> = {
  ia: 'ia',
  script: 'script',
  editor: 'editor',
  strategist: 'strategist',
  designer: 'designer',
  trafficker: 'trafficker',
  admin: 'admin',
};

interface ScriptsTabContainerProps extends TabProps {
  selectedProduct: any;
  onProductChange: (productId: string) => void;
}

export function ScriptsTabContainer({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  permissions: contentPermissions,
  onUpdate,
  selectedProduct,
  onProductChange,
}: ScriptsTabContainerProps) {
  const scriptPerms = useScriptPermissions(content);
  const blockConfig = useBlockConfig(content);
  
  // Combine both permission systems: script permissions AND block config
  const effectiveVisibleTabs = useMemo(() => {
    return SCRIPT_SUB_TABS.filter(tab => {
      const blockKey = SUBTAB_TO_BLOCK[tab.key];
      // Must pass BOTH checks: script permissions AND block visibility
      const hasScriptPermission = scriptPerms.canView(tab.key);
      const isBlockVisible = blockConfig.canViewBlock(blockKey);
      return hasScriptPermission && isBlockVisible;
    }).map(tab => tab.key);
  }, [scriptPerms, blockConfig]);

  const [activeTab, setActiveTab] = useState<ScriptSubTab>(() => {
    // Default to first visible tab
    return effectiveVisibleTabs[0] || 'script';
  });

  // Check if tab is locked via block config
  const isTabLocked = (tabKey: ScriptSubTab): boolean => {
    const blockKey = SUBTAB_TO_BLOCK[tabKey];
    return blockConfig.isBlockLocked(blockKey);
  };

  // Check effective read-only state (either from script perms or block lock)
  const isEffectiveReadOnly = (tabKey: ScriptSubTab): boolean => {
    const blockKey = SUBTAB_TO_BLOCK[tabKey];
    const scriptReadOnly = scriptPerms.isReadOnly(tabKey);
    const blockLocked = blockConfig.isBlockLocked(blockKey);
    const blockEditDenied = !blockConfig.canEditBlock(blockKey);
    return scriptReadOnly || blockLocked || blockEditDenied;
  };

  // Common props for all sub-tabs
  const subTabProps = {
    content,
    formData,
    setFormData,
    editMode: editMode && !isTabLocked(activeTab), // Disable edit if locked
    setEditMode,
    onUpdate,
    selectedProduct,
    onProductChange,
    scriptPermissions: scriptPerms,
  };

  // Render the appropriate sub-tab component
  const renderSubTab = (tabKey: ScriptSubTab) => {
    switch (tabKey) {
      case 'ia':
        return <IASubTab {...subTabProps} />;
      case 'script':
        return <ScriptSubTabComponent {...subTabProps} />;
      case 'editor':
        return <EditorSubTab {...subTabProps} />;
      case 'strategist':
        return <StrategistSubTab {...subTabProps} />;
      case 'designer':
        return <DesignerSubTab {...subTabProps} />;
      case 'trafficker':
        return <TraffickerSubTab {...subTabProps} />;
      case 'admin':
        return <AdminSubTab {...subTabProps} />;
      default:
        return null;
    }
  };

  if (scriptPerms.loading || blockConfig.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Cargando permisos...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScriptSubTab)} className="w-full">
        {/* Sub-tab navigation */}
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg mb-4">
          {SCRIPT_SUB_TABS.map((tab) => {
            const blockKey = SUBTAB_TO_BLOCK[tab.key];
            const canViewScript = scriptPerms.canView(tab.key);
            const canViewBlock = blockConfig.canViewBlock(blockKey);
            const canView = canViewScript && canViewBlock;
            const isReadOnly = isEffectiveReadOnly(tab.key);
            const isLocked = isTabLocked(tab.key);
            const isActive = activeTab === tab.key;

            return (
              <Tooltip key={tab.key}>
                <TooltipTrigger asChild>
                  <div>
                    <TabsTrigger
                      value={tab.key}
                      disabled={!canView}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-all',
                        !canView && 'opacity-40 cursor-not-allowed',
                        isReadOnly && canView && 'border-dashed',
                        isLocked && canView && 'border-warning/50',
                        isActive && 'bg-background shadow-sm'
                      )}
                    >
                      <span className="text-base">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {!canView && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
                      {isLocked && canView && <Lock className="h-3 w-3 ml-1 text-warning" />}
                      {isReadOnly && canView && !isLocked && <Eye className="h-3 w-3 ml-1 text-muted-foreground" />}
                    </TabsTrigger>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{tab.label}</p>
                  <p className="text-xs text-muted-foreground">{tab.description}</p>
                  {!canView && (
                    <p className="text-xs text-warning mt-1">No tienes acceso a esta pestaña</p>
                  )}
                  {isLocked && canView && (
                    <p className="text-xs text-warning mt-1">🔒 Bloqueado para este estado</p>
                  )}
                  {isReadOnly && canView && !isLocked && (
                    <p className="text-xs text-info mt-1">Solo lectura</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TabsList>

        {/* Sub-tab content */}
        {SCRIPT_SUB_TABS.map((tab) => {
          const blockKey = SUBTAB_TO_BLOCK[tab.key];
          const canViewScript = scriptPerms.canView(tab.key);
          const canViewBlock = blockConfig.canViewBlock(blockKey);
          const canView = canViewScript && canViewBlock;
          const isReadOnly = isEffectiveReadOnly(tab.key);
          const isLocked = isTabLocked(tab.key);

          return (
            <TabsContent
              key={tab.key}
              value={tab.key}
              className="mt-0 focus-visible:outline-none focus-visible:ring-0"
            >
              {canView ? (
                <div className="relative">
                  {/* Locked overlay indicator */}
                  {isLocked && (
                    <div className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1 text-xs bg-warning/20 rounded-bl-lg text-warning">
                      <Lock className="h-3 w-3" />
                      Bloqueado
                    </div>
                  )}
                  {/* Read-only overlay indicator */}
                  {isReadOnly && !isLocked && (
                    <div className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2 py-1 text-xs bg-muted/80 rounded-bl-lg text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Solo lectura
                    </div>
                  )}
                  {renderSubTab(tab.key)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg">
                  <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No tienes acceso a esta sección</p>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </TooltipProvider>
  );
}
