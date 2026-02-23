import { RefreshCw, Trash2, Loader2, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SOCIAL_PLATFORM_CONFIG } from "../config";
import type { ScrapeTarget, SocialPlatform } from "../types/social-scraper.types";

interface TargetManagerProps {
  targets: ScrapeTarget[];
  isLoading: boolean;
  onSync: (targetId: string) => void;
  isSyncing: boolean;
}

export function TargetManager({ targets, isLoading, onSync, isSyncing }: TargetManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from("social_scrape_targets")
        .delete()
        .eq("id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-targets"] });
      toast({ title: "Target eliminado" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("social_scrape_targets")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-targets"] });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!targets.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">No hay targets guardados</p>
        <p className="text-sm mt-1">Usa la barra de busqueda para scrapear y guardar targets</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {targets.map((target) => {
        const platformConfig = SOCIAL_PLATFORM_CONFIG[target.platform as SocialPlatform] || SOCIAL_PLATFORM_CONFIG.instagram;

        return (
          <Card key={target.id} className="group">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">
                  {target.display_name || target.target_value}
                </CardTitle>
                <Badge
                  className={`text-xs cursor-pointer ${target.is_active ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}
                  onClick={() => toggleActiveMutation.mutate({ id: target.id, isActive: !target.is_active })}
                >
                  {target.is_active ? "Activo" : "Pausado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className={`text-xs ${platformConfig.bgColor} ${platformConfig.color}`}>
                  {platformConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">{target.target_type}</Badge>
                <Badge variant="outline" className="text-xs">{target.target_value}</Badge>
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {target.total_items_found} items
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Cada {target.sync_interval_hours}h
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                Ultimo sync: {formatDate(target.last_synced_at)}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => onSync(target.id)}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sincronizar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(target.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
