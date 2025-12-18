import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Search, Plus, Star, Video, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Creator {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  role: 'creator' | 'editor';
  content_count: number;
}

const Creators = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        .select('id, full_name, email, avatar_url, phone')
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
        role: roleMap.get(p.id) as 'creator' | 'editor',
        content_count: countMap.get(p.id) || 0
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

  const filteredCreators = creators.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabels = {
    creator: { label: "Creador", className: "bg-primary/10 text-primary" },
    editor: { label: "Editor", className: "bg-info/10 text-info" }
  };

  return (
    <MainLayout>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-foreground">Creadores & Editores</h1>
              <p className="text-sm text-muted-foreground">Gestiona tu equipo de contenido</p>
            </div>
            
            {isAdmin && (
              <Button variant="glow" className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Miembro
              </Button>
            )}
          </div>
        </header>

        <div className="p-6">
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar creadores o editores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay creadores o editores registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCreators.map((creator) => (
                <div 
                  key={creator.id}
                  className="group rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/20"
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
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleLabels[creator.role].className}`}>
                      {roleLabels[creator.role].label}
                    </span>
                  </div>

                  <h3 className="font-semibold text-card-foreground mb-1">{creator.full_name}</h3>
                  <p className="text-xs text-muted-foreground mb-4 truncate">{creator.email}</p>

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
    </MainLayout>
  );
};

export default Creators;
