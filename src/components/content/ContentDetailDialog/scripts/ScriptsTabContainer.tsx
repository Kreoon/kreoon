import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Eye, Video, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoPauseVideo } from '@/components/content/AutoPauseVideo';
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

  // Reference video URL (visible to everyone when present)
  // Use formData as source of truth (may be '' after user clears it); only fall back to content if formData has no key
  const referenceUrl = 'reference_url' in (formData || {})
    ? ((formData as any).reference_url || '')
    : (content?.reference_url || '');
  const hasReferenceVideo = !!referenceUrl;

  const [activeTab, setActiveTab] = useState<string>(() => {
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

  // Build advanced config for subtabs
  const advancedConfig = blockConfig.advanced ? {
    enable_comments: blockConfig.advanced.enable_comments,
    require_approval_before_advance: blockConfig.advanced.require_approval_before_advance,
    client_read_only_mode: blockConfig.advanced.client_read_only_mode,
    enable_custom_fields: blockConfig.advanced.enable_custom_fields,
    content_types: blockConfig.advanced.content_types,
    text_editor_features: blockConfig.advanced.text_editor_features,
  } : null;

  // Common props for all sub-tabs
  const getSubTabProps = (tabKey: ScriptSubTab) => ({
    content,
    formData,
    setFormData,
    editMode: editMode && !isTabLocked(tabKey) && !isEffectiveReadOnly(tabKey), // Combine all checks
    setEditMode,
    onUpdate,
    selectedProduct,
    onProductChange,
    scriptPermissions: scriptPerms,
    advancedConfig,
    readOnly: isEffectiveReadOnly(tabKey), // Explicit read-only flag
  });

  // Render the appropriate sub-tab component
  const renderSubTab = (tabKey: ScriptSubTab) => {
    const props = getSubTabProps(tabKey);
    switch (tabKey) {
      case 'ia':
        return <IASubTab {...props} />;
      case 'script':
        return <ScriptSubTabComponent {...props} />;
      case 'editor':
        return <EditorSubTab {...props} />;
      case 'strategist':
        return <StrategistSubTab {...props} />;
      case 'designer':
        return <DesignerSubTab {...props} />;
      case 'trafficker':
        return <TraffickerSubTab {...props} />;
      case 'admin':
        return <AdminSubTab {...props} />;
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Sub-tab navigation */}
        <TabsList className="w-full h-auto gap-0.5 sm:gap-1 grid grid-cols-4 sm:flex sm:flex-wrap sm:justify-start bg-muted/50 p-0.5 sm:p-1 rounded-sm mb-4">
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
                        'flex items-center justify-center gap-1 sm:gap-1.5 px-1 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm transition-all rounded-sm',
                        !canView && 'opacity-40 cursor-not-allowed',
                        isReadOnly && canView && 'border-dashed',
                        isLocked && canView && 'border-warning/50',
                        isActive && 'bg-background shadow-sm'
                      )}
                    >
                      <span className="text-sm sm:text-base">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {!canView && <Lock className="h-3 w-3 text-muted-foreground" />}
                      {isLocked && canView && <Lock className="h-3 w-3 text-warning" />}
                      {isReadOnly && canView && !isLocked && <Eye className="h-3 w-3 text-muted-foreground" />}
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

          {/* Reference video tab — visible to everyone when URL exists */}
          {hasReferenceVideo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <TabsTrigger
                    value="reference"
                    className={cn(
                      'flex items-center justify-center gap-1 sm:gap-1.5 px-1 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm transition-all rounded-sm',
                      activeTab === 'reference' && 'bg-background shadow-sm'
                    )}
                  >
                    <span className="text-sm sm:text-base">🎥</span>
                    <span className="hidden sm:inline">Referencia</span>
                  </TabsTrigger>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">Referencia</p>
                <p className="text-xs text-muted-foreground">Video de referencia para este contenido</p>
              </TooltipContent>
            </Tooltip>
          )}
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
                    <div className="absolute top-0 right-0 z-10 flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs bg-warning/20 rounded-bl-lg text-warning">
                      <Lock className="h-3 w-3" />
                      Bloqueado
                    </div>
                  )}
                  {/* Read-only overlay indicator */}
                  {isReadOnly && !isLocked && (
                    <div className="absolute top-0 right-0 z-10 flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs bg-muted/80 rounded-bl-lg text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Solo lectura
                    </div>
                  )}
                  {renderSubTab(tab.key)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-muted/20 rounded-sm">
                  <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No tienes acceso a esta sección</p>
                </div>
              )}
            </TabsContent>
          );
        })}

        {/* Reference video content */}
        {hasReferenceVideo && (
          <TabsContent value="reference" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <ReferenceVideoSection url={referenceUrl} contentId={content?.id} />
          </TabsContent>
        )}
      </Tabs>
    </TooltipProvider>
  );
}

// ============================================================
// Reference Video Section
// ============================================================

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') && u.pathname === '/watch') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname === 'www.youtube.com' && u.pathname.startsWith('/embed/')) return url;
    const tiktokMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (tiktokMatch) return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
    const instaReelMatch = url.match(/instagram\.com\/reel\/([A-Za-z0-9_-]+)/);
    if (instaReelMatch) return `https://www.instagram.com/reel/${instaReelMatch[1]}/embed/`;
    const instaPostMatch = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
    if (instaPostMatch) return `https://www.instagram.com/p/${instaPostMatch[1]}/embed/`;
    if (u.hostname.includes('facebook.com') && url.includes('/video')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  } catch { /* invalid URL */ }
  return null;
}

function isBunnyOrDirectVideo(url: string): boolean {
  if (!url) return false;
  return (
    url.includes('iframe.mediadelivery.net') ||
    url.includes('b-cdn.net') ||
    /\.(mp4|webm|ogg)(\?|$)/i.test(url)
  );
}

function ReferenceVideoSection({ url, contentId }: { url: string; contentId?: string }) {
  const isBunny = isBunnyOrDirectVideo(url);
  const embedUrl = !isBunny ? toEmbedUrl(url) : null;
  const hasVideo = isBunny || !!embedUrl;

  return (
    <div className="space-y-4 py-2">
      <h4 className="font-semibold flex items-center gap-2">
        <Video className="h-4 w-4" />
        Video de Referencia
      </h4>

      {hasVideo ? (
        <div className="aspect-[9/16] max-h-[500px] rounded-sm overflow-hidden bg-black mx-auto w-full max-w-[280px] sm:max-w-[320px]">
          {isBunny ? (
            <AutoPauseVideo src={url} className="w-full h-full" contentId={contentId} />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/30 rounded-sm border">
          <LinkIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1 min-w-0">
            {url}
          </a>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
