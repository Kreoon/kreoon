import { RefreshCw, Trash2, Loader2, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_CONFIG } from "../config";
import type { AdLibrarySearch } from "../types/ad-intelligence.types";

interface SavedSearchesProps {
  searches: AdLibrarySearch[];
  isLoading: boolean;
  onSync: (searchId: string) => void;
  isSyncing: boolean;
}

export function SavedSearches({ searches, isLoading, onSync, isSyncing }: SavedSearchesProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const { error } = await supabase
        .from("ad_library_searches")
        .delete()
        .eq("id", searchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-searches"] });
      toast({ title: "Búsqueda eliminada" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ad_library_searches")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-library-searches"] });
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

  if (!searches.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">No hay búsquedas guardadas</p>
        <p className="text-sm mt-1">Haz una búsqueda y guárdala para sincronizarla automáticamente</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {searches.map((search) => {
        const platformConfig = PLATFORM_CONFIG[search.platform] || PLATFORM_CONFIG.meta;
        const config = search.search_config || {};

        return (
          <Card key={search.id} className="group">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{search.name}</CardTitle>
                <Badge
                  className={`text-xs cursor-pointer ${search.is_active ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}
                  onClick={() => toggleActiveMutation.mutate({ id: search.id, isActive: !search.is_active })}
                >
                  {search.is_active ? "Activo" : "Pausado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className={`text-xs ${platformConfig.bgColor} ${platformConfig.color}`}>
                  {platformConfig.label}
                </Badge>
                {config.search_terms && (
                  <Badge variant="outline" className="text-xs">"{config.search_terms}"</Badge>
                )}
                {config.countries?.[0] && (
                  <Badge variant="outline" className="text-xs">{config.countries[0]}</Badge>
                )}
              </div>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {search.total_ads_found} ads
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Cada {search.sync_interval_hours}h
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                Último sync: {formatDate(search.last_synced_at)}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => onSync(search.id)}
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
                  onClick={() => deleteMutation.mutate(search.id)}
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
