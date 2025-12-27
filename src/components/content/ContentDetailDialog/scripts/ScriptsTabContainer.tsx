import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabProps, ContentFormData } from '../types';
import { useScriptPermissions } from './useScriptPermissions';
import { SCRIPT_SUB_TABS, ScriptSubTab } from './types';

// Sub-tab components
import { IASubTab } from './subtabs/IASubTab';
import { ScriptSubTab as ScriptSubTabComponent } from './subtabs/ScriptSubTab';
import { EditorSubTab } from './subtabs/EditorSubTab';
import { StrategistSubTab } from './subtabs/StrategistSubTab';
import { DesignerSubTab } from './subtabs/DesignerSubTab';
import { TraffickerSubTab } from './subtabs/TraffickerSubTab';
import { AdminSubTab } from './subtabs/AdminSubTab';

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
  const [activeTab, setActiveTab] = useState<ScriptSubTab>(() => {
    // Default to first visible tab
    return scriptPerms.visibleTabs[0] || 'script';
  });

  // Common props for all sub-tabs
  const subTabProps = {
    content,
    formData,
    setFormData,
    editMode,
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

  if (scriptPerms.loading) {
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
            const canView = scriptPerms.canView(tab.key);
            const isReadOnly = scriptPerms.isReadOnly(tab.key);
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
                        isActive && 'bg-background shadow-sm'
                      )}
                    >
                      <span className="text-base">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {!canView && <Lock className="h-3 w-3 ml-1 text-muted-foreground" />}
                      {isReadOnly && canView && <Eye className="h-3 w-3 ml-1 text-muted-foreground" />}
                    </TabsTrigger>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{tab.label}</p>
                  <p className="text-xs text-muted-foreground">{tab.description}</p>
                  {!canView && (
                    <p className="text-xs text-warning mt-1">No tienes acceso a esta pestaña</p>
                  )}
                  {isReadOnly && canView && (
                    <p className="text-xs text-info mt-1">Solo lectura</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TabsList>

        {/* Sub-tab content */}
        {SCRIPT_SUB_TABS.map((tab) => (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className="mt-0 focus-visible:outline-none focus-visible:ring-0"
          >
            {scriptPerms.canView(tab.key) ? (
              <div className="relative">
                {/* Read-only overlay indicator */}
                {scriptPerms.isReadOnly(tab.key) && (
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
        ))}
      </Tabs>
    </TooltipProvider>
  );
}
