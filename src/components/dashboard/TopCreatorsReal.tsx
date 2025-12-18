import { Star, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CreatorStats {
  id: string;
  name: string;
  avatar: string | null;
  videosCompleted: number;
}

export function TopCreatorsReal() {
  const [creators, setCreators] = useState<CreatorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopCreators = async () => {
      try {
        // Obtener creadores con rol 'creator'
        const { data: creatorRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'creator');

        if (!creatorRoles?.length) {
          setLoading(false);
          return;
        }

        const creatorIds = creatorRoles.map(r => r.user_id);

        // Obtener perfiles de creadores
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', creatorIds);

        // Contar contenido aprobado por creador
        const { data: contentCounts } = await supabase
          .from('content')
          .select('creator_id')
          .in('creator_id', creatorIds)
          .eq('status', 'approved');

        // Crear mapa de conteo
        const countMap: Record<string, number> = {};
        contentCounts?.forEach(c => {
          if (c.creator_id) {
            countMap[c.creator_id] = (countMap[c.creator_id] || 0) + 1;
          }
        });

        // Crear stats y ordenar
        const stats: CreatorStats[] = (profiles || [])
          .map(p => ({
            id: p.id,
            name: p.full_name,
            avatar: p.avatar_url,
            videosCompleted: countMap[p.id] || 0
          }))
          .sort((a, b) => b.videosCompleted - a.videosCompleted)
          .slice(0, 5);

        setCreators(stats);
      } catch (error) {
        console.error('Error fetching top creators:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopCreators();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-card-foreground mb-4">Top Creadores</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!creators.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold text-card-foreground mb-4">Top Creadores</h3>
        <p className="text-sm text-muted-foreground">No hay creadores registrados</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-card-foreground mb-4">Top Creadores</h3>
      
      <div className="space-y-4">
        {creators.map((creator, index) => (
          <div key={creator.id} className="flex items-center gap-3">
            <div className="relative">
              {creator.avatar ? (
                <img 
                  src={creator.avatar} 
                  alt={creator.name}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                  <span className="text-sm font-medium text-primary">
                    {creator.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {index + 1}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-card-foreground truncate">
                {creator.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {creator.videosCompleted} videos completados
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span className="text-sm font-medium text-card-foreground">
                  {creator.videosCompleted}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
