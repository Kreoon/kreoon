import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Video, Image, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AvailableContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: string;
  content_type: string | null;
  approved_at: string | null;
  client_id: string | null;
  client_name: string | null;
  client_logo: string | null;
}

interface ContentSelectorProps {
  organizationId: string | null | undefined;
  clientId?: string | null;
  selectedContentIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ContentSelector({
  organizationId,
  clientId,
  selectedContentIds,
  onSelectionChange,
}: ContentSelectorProps) {
  const [content, setContent] = useState<AvailableContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchContent();
    }
  }, [organizationId, clientId]);

  const fetchContent = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    
    let query = supabase
      .from('content')
      .select(`
        id,
        title,
        description,
        video_url,
        thumbnail_url,
        status,
        content_type,
        approved_at,
        client_id,
        clients(id, name, logo_url)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['approved', 'paid', 'delivered'])
      .order('approved_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      const mappedContent: AvailableContent[] = data.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        video_url: item.video_url,
        thumbnail_url: item.thumbnail_url,
        status: item.status || 'approved',
        content_type: item.content_type,
        approved_at: item.approved_at,
        client_id: item.client_id,
        client_name: (item.clients as any)?.name || null,
        client_logo: (item.clients as any)?.logo_url || null,
      }));
      setContent(mappedContent);
    }
    setLoading(false);
  };

  const toggleContent = (contentId: string) => {
    if (selectedContentIds.includes(contentId)) {
      onSelectionChange(selectedContentIds.filter(id => id !== contentId));
    } else {
      onSelectionChange([...selectedContentIds, contentId]);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Cargando contenido disponible...
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
        No hay contenido aprobado disponible
      </div>
    );
  }

  return (
    <ScrollArea className="h-48 border rounded-md p-2">
      <div className="space-y-2">
        {content.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
              selectedContentIds.includes(item.id)
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-muted/50 border border-transparent'
            }`}
            onClick={() => toggleContent(item.id)}
          >
            <Checkbox
              checked={selectedContentIds.includes(item.id)}
              onCheckedChange={() => toggleContent(item.id)}
            />
            
            {/* Thumbnail or icon */}
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : item.video_url ? (
                <Video className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Image className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.client_name && (
                  <span className="truncate">{item.client_name}</span>
                )}
                {item.approved_at && (
                  <>
                    <span>•</span>
                    <span>
                      {format(new Date(item.approved_at), "d MMM", { locale: es })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {item.status === 'approved' ? 'Aprobado' : 
               item.status === 'paid' ? 'Pagado' : 
               item.status === 'delivered' ? 'Entregado' : item.status}
            </Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
