import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Star, Video, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { CreatorDetailDialog } from "@/components/team/CreatorDetailDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Creator {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: 'creator' | 'editor';
  content_count: number;
  is_ambassador: boolean;
}

const Creators = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      // Get creators and editors
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['creator', 'editor']);

      if (!roles?.length) {
        setCreators([]);
        setLoading(false);
        return;
      }

      const userIds = roles.map(r => r.user_id);
      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, phone, bio, is_ambassador')
        .in('id', userIds);

      // Get content counts
      const { data: creatorCounts } = await supabase
        .from('content')
        .select('creator_id')
        .in('creator_id', userIds);

      const { data: editorCounts } = await supabase
        .from('content')
        .select('editor_id')
        .in('editor_id', userIds);

      const countMap = new Map<string, number>();
      creatorCounts?.forEach(c => {
        if (c.creator_id) {
          countMap.set(c.creator_id, (countMap.get(c.creator_id) || 0) + 1);
        }
      });
      editorCounts?.forEach(c => {
        if (c.editor_id) {
          countMap.set(c.editor_id, (countMap.get(c.editor_id) || 0) + 1);
        }
      });

      const creatorsData: Creator[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        phone: p.phone,
        bio: p.bio,
        role: roleMap.get(p.id) as 'creator' | 'editor',
        content_count: countMap.get(p.id) || 0,
        is_ambassador: p.is_ambassador || false
      }));

      setCreators(creatorsData);
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleDelete = async (creatorId: string, creatorName: string) => {
    try {
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', creatorId);

      if (roleError) throw roleError;

      toast({
        title: "Eliminado",
        description: `${creatorName} ha sido eliminado del equipo`
      });

      fetchCreators();
    } catch (error) {
      console.error('Error deleting creator:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al usuario",
        variant: "destructive"
      });
    }
  };

  const toggleAmbassador = async (creator: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !creator.is_ambassador;
    
    // Optimistic update
    setCreators(prev => prev.map(c => 
      c.id === creator.id ? { ...c, is_ambassador: newStatus } : c
    ));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_ambassador: newStatus })
        .eq('id', creator.id);

      if (error) throw error;

      toast({
        description: newStatus 
          ? `${creator.full_name} es ahora embajador ⭐` 
          : `${creator.full_name} ya no es embajador`
      });
    } catch (error) {
      console.error('Error toggling ambassador:', error);
      // Revert on error
      setCreators(prev => prev.map(c => 
        c.id === creator.id ? { ...c, is_ambassador: !newStatus } : c
      ));
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de embajador",
        variant: "destructive"
      });
    }
  };

  const filteredCreators = creators.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabels = {
    creator: { label: "Creador", className: "bg-primary/10 text-primary" },
    editor: { label: "Editor", className: "bg-info/10 text-info" }
  };

  return (
    <>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6 gap-2">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground">Creadores & Editores</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Gestiona tu equipo de contenido</p>
            </div>
            
            {isAdmin && (
              <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar Miembro</span>
                <span className="sm:hidden">Agregar</span>
              </Button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar creadores o editores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 md:h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-40 md:h-48 rounded-xl" />
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <User className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">No hay creadores o editores registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredCreators.map((creator) => (
                <div 
                  key={creator.id}
                  onClick={() => setSelectedCreator(creator)}
                  className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    {creator.avatar_url ? (
                      <img 
                        src={creator.avatar_url} 
                        alt={creator.full_name}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleLabels[creator.role].className}`}>
                        {roleLabels[creator.role].label}
                      </span>
                      {creator.is_ambassador && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary gap-0.5">
                          <Star className="h-3 w-3 fill-primary" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-card-foreground">{creator.full_name}</h3>
                    {creator.is_ambassador && (
                      <Star className="h-4 w-4 text-primary fill-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 truncate">{creator.email}</p>

                  {/* Ambassador toggle for admins */}
                  {isAdmin && (
                    <div 
                      onClick={(e) => toggleAmbassador(creator, e)}
                      className={cn(
                        "flex items-center gap-2 mb-4 p-2 rounded-lg border cursor-pointer transition-all",
                        creator.is_ambassador 
                          ? "bg-primary/10 border-primary/30 hover:bg-primary/20" 
                          : "bg-muted/50 border-border hover:bg-muted"
                      )}
                    >
                      <Checkbox 
                        checked={creator.is_ambassador}
                        className="pointer-events-none"
                      />
                      <div className="flex items-center gap-1.5">
                        <Star className={cn(
                          "h-4 w-4 transition-colors",
                          creator.is_ambassador ? "text-primary fill-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-xs font-medium",
                          creator.is_ambassador ? "text-primary" : "text-muted-foreground"
                        )}>
                          Embajador
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{creator.content_count}</span>
                      <span className="text-xs text-muted-foreground">videos</span>
                    </div>

                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar a {creator.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el rol de {roleLabels[creator.role].label.toLowerCase()} de este usuario. 
                              El perfil seguirá existiendo pero no tendrá acceso como miembro del equipo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(creator.id, creator.full_name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreatorDetailDialog
        creator={selectedCreator}
        open={!!selectedCreator}
        onOpenChange={(open) => !open && setSelectedCreator(null)}
        onUpdate={fetchCreators}
      />
    </>
  );
};

export default Creators;
