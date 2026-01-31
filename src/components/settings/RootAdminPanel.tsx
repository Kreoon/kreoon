import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseLovable } from "@/integrations/supabase/lovable-client";
import { toast } from "sonner";
import { 
  Trash2, Search, Building2, FileVideo, MessageSquare, 
  Package, Bell, Image, Share2, Loader2, RefreshCw,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EntityData {
  clients: any[];
  content: any[];
  conversations: any[];
  products: any[];
  notifications: any[];
  portfolioPosts: any[];
  referrals: any[];
}

type EntityType = 'client' | 'content' | 'conversation' | 'product' | 'notification' | 'portfolio_post' | 'referral';

export function RootAdminPanel() {
  const [entities, setEntities] = useState<EntityData>({
    clients: [],
    content: [],
    conversations: [],
    products: [],
    notifications: [],
    portfolioPosts: [],
    referrals: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: EntityType; id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseLovable.functions.invoke("admin-users", {
        body: { action: "list_all_entities" }
      });

      if (error) throw error;
      setEntities(data);
    } catch (error: any) {
      console.error("Error fetching entities:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const actionMap: Record<EntityType, { action: string; idKey: string }> = {
      client: { action: "delete_client", idKey: "clientId" },
      content: { action: "delete_content", idKey: "contentId" },
      conversation: { action: "delete_conversation", idKey: "conversationId" },
      product: { action: "delete_product", idKey: "productId" },
      notification: { action: "delete_notification", idKey: "notificationId" },
      portfolio_post: { action: "delete_portfolio_post", idKey: "postId" },
      referral: { action: "delete_referral", idKey: "referralId" },
    };

    const config = actionMap[deleteConfirm.type];
    setActionLoading(deleteConfirm.id);

    try {
      const { error } = await supabaseLovable.functions.invoke("admin-users", {
        body: { action: config.action, [config.idKey]: deleteConfirm.id }
      });

      if (error) throw error;
      
      toast.success(`${deleteConfirm.name} eliminado correctamente`);
      fetchEntities();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Error al eliminar");
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const filterItems = (items: any[], fields: string[]) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      fields.some(field => 
        item[field]?.toString().toLowerCase().includes(term)
      )
    );
  };

  const EntityCard = ({ 
    item, 
    type, 
    title, 
    subtitle,
    icon: Icon 
  }: { 
    item: any; 
    type: EntityType; 
    title: string; 
    subtitle?: string;
    icon: any;
  }) => (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          <p className="text-xs text-muted-foreground/70">{item.id.slice(0, 8)}...</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setDeleteConfirm({ type, id: item.id, name: title })}
        disabled={actionLoading === item.id}
      >
        {actionLoading === item.id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Panel Root - Eliminar Cualquier Cosa
          </h2>
          <p className="text-sm text-muted-foreground">
            Acceso total para eliminar cualquier entidad de la plataforma
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEntities}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en todas las entidades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{entities.clients.length}</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <FileVideo className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{entities.content.length}</p>
            <p className="text-xs text-muted-foreground">Contenido</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{entities.conversations.length}</p>
            <p className="text-xs text-muted-foreground">Chats</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{entities.products.length}</p>
            <p className="text-xs text-muted-foreground">Productos</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{entities.notifications.length}</p>
            <p className="text-xs text-muted-foreground">Notificaciones</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Image className="w-6 h-6 mx-auto mb-2 text-pink-500" />
            <p className="text-2xl font-bold">{entities.portfolioPosts.length}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 text-center">
            <Share2 className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold">{entities.referrals.length}</p>
            <p className="text-xs text-muted-foreground">Referidos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileVideo className="w-4 h-4" />
            Contenido
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="portfolioPosts" className="gap-2">
            <Image className="w-4 h-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Share2 className="w-4 h-4" />
            Referidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clientes / Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterItems(entities.clients, ['name', 'id']).map(client => (
                    <EntityCard
                      key={client.id}
                      item={client}
                      type="client"
                      title={client.name}
                      subtitle={new Date(client.created_at).toLocaleDateString()}
                      icon={Building2}
                    />
                  ))}
                  {filterItems(entities.clients, ['name', 'id']).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay clientes</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contenido / Proyectos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterItems(entities.content, ['title', 'id', 'status']).map(item => (
                    <EntityCard
                      key={item.id}
                      item={item}
                      type="content"
                      title={item.title}
                      subtitle={item.status}
                      icon={FileVideo}
                    />
                  ))}
                  {filterItems(entities.content, ['title', 'id', 'status']).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay contenido</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversaciones / Chats</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterItems(entities.conversations, ['name', 'id']).map(conv => (
                    <EntityCard
                      key={conv.id}
                      item={conv}
                      type="conversation"
                      title={conv.name || "Chat sin nombre"}
                      subtitle={conv.is_group ? "Grupo" : "1:1"}
                      icon={MessageSquare}
                    />
                  ))}
                  {filterItems(entities.conversations, ['name', 'id']).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay conversaciones</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterItems(entities.products, ['name', 'id']).map(product => (
                    <EntityCard
                      key={product.id}
                      item={product}
                      type="product"
                      title={product.name}
                      subtitle={new Date(product.created_at).toLocaleDateString()}
                      icon={Package}
                    />
                  ))}
                  {filterItems(entities.products, ['name', 'id']).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay productos</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolioPosts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posts de Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterItems(entities.portfolioPosts, ['id', 'media_type']).map(post => (
                    <EntityCard
                      key={post.id}
                      item={post}
                      type="portfolio_post"
                      title={`Post ${post.media_type}`}
                      subtitle={new Date(post.created_at).toLocaleDateString()}
                      icon={Image}
                    />
                  ))}
                  {filterItems(entities.portfolioPosts, ['id', 'media_type']).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay posts</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Referidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filterItems(entities.referrals, ['referred_email', 'id', 'status']).map(ref => (
                    <EntityCard
                      key={ref.id}
                      item={ref}
                      type="referral"
                      title={ref.referred_email}
                      subtitle={ref.status}
                      icon={Share2}
                    />
                  ))}
                  {filterItems(entities.referrals, ['referred_email', 'id', 'status']).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay referidos</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar <strong>{deleteConfirm?.name}</strong>?
              <br /><br />
              Esta acción es <strong>irreversible</strong> y eliminará todos los datos relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
