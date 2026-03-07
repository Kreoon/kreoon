/**
 * AdnResearchV3Dashboard
 * Dashboard principal con navegación lateral y 22 pestañas de resultados
 */

import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Globe,
  Target,
  Briefcase,
  Users,
  Brain,
  Lightbulb,
  Compass,
  PenTool,
  Gift,
  Video,
  Calendar,
  Magnet,
  Share2,
  Facebook,
  Music2,
  Search,
  Mail,
  Layout,
  Rocket,
  BarChart3,
  FileText,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdnResearchV3Result } from "@/types/adn-research-v3";

// Tab components
import { Tab01MarketOverview } from "./tabs/Tab01MarketOverview";
import { Tab02Competition } from "./tabs/Tab02Competition";
import { Tab03JTBD } from "./tabs/Tab03JTBD";
import { Tab04Avatars } from "./tabs/Tab04Avatars";
import { Tab05Psychology } from "./tabs/Tab05Psychology";
import { Tab06Neuromarketing } from "./tabs/Tab06Neuromarketing";
import { Tab07Positioning } from "./tabs/Tab07Positioning";
import { Tab08CopyAngles } from "./tabs/Tab08CopyAngles";
import { Tab09Offer } from "./tabs/Tab09Offer";
import { Tab10VideoCreatives } from "./tabs/Tab10VideoCreatives";
import { Tab11Calendar } from "./tabs/Tab11Calendar";
import { Tab12LeadMagnets } from "./tabs/Tab12LeadMagnets";
import { Tab13SocialMedia } from "./tabs/Tab13SocialMedia";
import { Tab14MetaAds } from "./tabs/Tab14MetaAds";
import { Tab15TikTokAds } from "./tabs/Tab15TikTokAds";
import { Tab16GoogleAds } from "./tabs/Tab16GoogleAds";
import { Tab17EmailMarketing } from "./tabs/Tab17EmailMarketing";
import { Tab18LandingPages } from "./tabs/Tab18LandingPages";
import { Tab19LaunchStrategy } from "./tabs/Tab19LaunchStrategy";
import { Tab20KPIs } from "./tabs/Tab20KPIs";
import { Tab21OrganicContent } from "./tabs/Tab21OrganicContent";
import { Tab22ExecutiveSummary } from "./tabs/Tab22ExecutiveSummary";
import { TabPlaceholder } from "./tabs/TabPlaceholder";

interface AdnResearchV3DashboardProps {
  result: AdnResearchV3Result;
  productName: string;
  sessionId?: string;
  organizationId?: string;
  onRegenerate?: (tabKey: string) => void;
  onExport?: () => void;
  onBack?: () => void;
}

// Tab configuration
const TABS = [
  // Block 1: Inteligencia de Mercado
  { id: 1, key: "market_overview", name: "Panorama de Mercado", icon: Globe, block: 1 },
  { id: 2, key: "competition", name: "Análisis de Competencia", icon: Target, block: 1 },
  { id: 3, key: "jtbd", name: "Jobs To Be Done", icon: Briefcase, block: 1 },
  // Block 2: Psicología del Cliente
  { id: 4, key: "avatars", name: "Avatares Ideales", icon: Users, block: 2 },
  { id: 5, key: "psychology", name: "Psicología Profunda", icon: Brain, block: 2 },
  { id: 6, key: "neuromarketing", name: "Neuromarketing", icon: Lightbulb, block: 2 },
  // Block 3: Estrategia
  { id: 7, key: "positioning", name: "Posicionamiento", icon: Compass, block: 3 },
  { id: 8, key: "copy_angles", name: "Ángulos de Copy", icon: PenTool, block: 3 },
  { id: 9, key: "offer", name: "Oferta Irresistible", icon: Gift, block: 3 },
  // Block 4: Contenido
  { id: 10, key: "video_creatives", name: "Creativos de Video", icon: Video, block: 4 },
  { id: 11, key: "calendar", name: "Calendario 30 Días", icon: Calendar, block: 4 },
  { id: 12, key: "lead_magnets", name: "Lead Magnets", icon: Magnet, block: 4 },
  // Block 5: Canales y Publicidad
  { id: 13, key: "social_media", name: "Redes Sociales", icon: Share2, block: 5 },
  { id: 14, key: "meta_ads", name: "Meta Ads", icon: Facebook, block: 5 },
  { id: 15, key: "tiktok_ads", name: "TikTok Ads", icon: Music2, block: 5 },
  { id: 16, key: "google_ads", name: "Google Ads", icon: Search, block: 5 },
  { id: 17, key: "email_marketing", name: "Email Marketing", icon: Mail, block: 5 },
  { id: 18, key: "landing_pages", name: "Landing Pages", icon: Layout, block: 5 },
  // Block 6: Síntesis
  { id: 19, key: "launch_strategy", name: "Estrategia de Lanzamiento", icon: Rocket, block: 6 },
  { id: 20, key: "kpis", name: "KPIs y Métricas", icon: BarChart3, block: 6 },
  { id: 21, key: "organic_content", name: "Contenido Orgánico", icon: FileText, block: 6 },
  { id: 22, key: "executive_summary", name: "Resumen Ejecutivo", icon: ClipboardList, block: 6 },
];

const BLOCKS = [
  { id: 1, name: "Inteligencia de Mercado", color: "blue" },
  { id: 2, name: "Psicología del Cliente", color: "purple" },
  { id: 3, name: "Estrategia", color: "green" },
  { id: 4, name: "Contenido", color: "orange" },
  { id: 5, name: "Canales y Publicidad", color: "red" },
  { id: 6, name: "Síntesis", color: "pink" },
];

export function AdnResearchV3Dashboard({
  result,
  productName,
  sessionId,
  organizationId,
  onRegenerate,
  onExport,
  onBack,
}: AdnResearchV3DashboardProps) {
  const [activeTab, setActiveTab] = useState(22); // Start with executive summary
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeTabConfig = useMemo(
    () => TABS.find((t) => t.id === activeTab),
    [activeTab]
  );

  const tabsByBlock = useMemo(() => {
    const grouped: Record<number, typeof TABS> = {};
    TABS.forEach((tab) => {
      if (!grouped[tab.block]) grouped[tab.block] = [];
      grouped[tab.block].push(tab);
    });
    return grouped;
  }, []);

  const renderTabContent = () => {
    const tabConfig = TABS.find((t) => t.id === activeTab);
    if (!tabConfig) return null;

    const tabData = result.tabs?.[tabConfig.key as keyof typeof result.tabs];

    // Render tab component based on active tab
    switch (activeTab) {
      // Block 1: Inteligencia de Mercado
      case 1:
        return <Tab01MarketOverview data={tabData} />;
      case 2:
        return <Tab02Competition data={tabData} />;
      case 3:
        return <Tab03JTBD data={tabData} />;
      // Block 2: Psicología del Cliente
      case 4:
        return <Tab04Avatars data={tabData} />;
      case 5:
        return <Tab05Psychology data={tabData} />;
      case 6:
        return <Tab06Neuromarketing data={tabData} />;
      // Block 3: Estrategia
      case 7:
        return <Tab07Positioning data={tabData} />;
      case 8:
        return <Tab08CopyAngles data={tabData} />;
      case 9:
        return <Tab09Offer data={tabData} />;
      // Block 4: Contenido
      case 10:
        return <Tab10VideoCreatives data={tabData} />;
      case 11:
        return <Tab11Calendar data={tabData} />;
      case 12:
        return <Tab12LeadMagnets data={tabData} />;
      // Block 5: Canales y Publicidad
      case 13:
        return <Tab13SocialMedia data={tabData} />;
      case 14:
        return <Tab14MetaAds data={tabData} />;
      case 15:
        return <Tab15TikTokAds data={tabData} />;
      case 16:
        return <Tab16GoogleAds data={tabData} />;
      case 17:
        return <Tab17EmailMarketing data={tabData} />;
      case 18:
        return <Tab18LandingPages data={tabData} />;
      // Block 6: Síntesis
      case 19:
        return <Tab19LaunchStrategy data={tabData} />;
      case 20:
        return <Tab20KPIs data={tabData} />;
      case 21:
        return <Tab21OrganicContent data={tabData} />;
      case 22:
        return <Tab22ExecutiveSummary data={tabData} />;
      default:
        return <TabPlaceholder tabName={tabConfig.name} data={tabData} />;
    }
  };

  return (
    <div className="flex h-full min-h-[600px] bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "border-r bg-muted/30 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-sm">ADN Recargado</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <TooltipProvider delayDuration={0}>
            {BLOCKS.map((block) => (
              <div key={block.id} className="mb-2">
                {!sidebarCollapsed && (
                  <div className="px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {block.name}
                    </span>
                  </div>
                )}
                {sidebarCollapsed && block.id > 1 && (
                  <Separator className="mx-2 my-2" />
                )}
                <div className="space-y-0.5 px-2">
                  {tabsByBlock[block.id]?.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const hasData = !!result.tabs?.[tab.key as keyof typeof result.tabs];

                    const button = (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground/70 hover:text-foreground",
                          !hasData && "opacity-50"
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="truncate flex-1 text-left">
                              {tab.name}
                            </span>
                            {!hasData && (
                              <Badge variant="outline" className="text-[10px] px-1">
                                -
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    );

                    if (sidebarCollapsed) {
                      return (
                        <Tooltip key={tab.id}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{tab.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </ScrollArea>

        {/* Footer Actions */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t space-y-2">
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div>
            <h1 className="text-xl font-semibold">
              {activeTabConfig?.name || "Resumen"}
            </h1>
            <p className="text-sm text-muted-foreground">{productName}</p>
          </div>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Volver
              </Button>
            )}
            {onRegenerate && activeTabConfig && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerate(activeTabConfig.key)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerar
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">{renderTabContent()}</div>
        </ScrollArea>
      </div>
    </div>
  );
}
