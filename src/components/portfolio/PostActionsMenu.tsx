import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, Pin, PinOff, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostActionsMenuProps {
  postId: string;
  isPinned: boolean;
  caption: string | null;
  onUpdate: () => void;
}

export function PostActionsMenu({ postId, isPinned, caption, onUpdate }: PostActionsMenuProps) {
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newCaption, setNewCaption] = useState(caption || '');

  const handleTogglePin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('toggle_post_pin', { post_id: postId });
      if (error) throw error;
      toast.success(data ? 'Post fijado' : 'Post desfijado');
      onUpdate();
    } catch (err: any) {
      if (err.message?.includes('Maximum 3')) {
        toast.error('Solo puedes fijar hasta 3 posts');
      } else {
        toast.error('Error al cambiar el pin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCaption = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('portfolio_posts')
        .update({ caption: newCaption || null })
        .eq('id', postId);
      if (error) throw error;
      toast.success('Caption actualizado');
      setEditOpen(false);
      onUpdate();
    } catch {
      toast.error('Error al actualizar caption');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('portfolio_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      toast.success('Post eliminado');
      setDeleteOpen(false);
      onUpdate();
    } catch {
      toast.error('Error al eliminar post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4 text-white" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={handleTogglePin} disabled={loading}>
            {isPinned ? (
              <>
                <PinOff className="h-4 w-4 mr-2" />
                Desfijar
              </>
            ) : (
              <>
                <Pin className="h-4 w-4 mr-2" />
                Fijar arriba
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setNewCaption(caption || ''); setEditOpen(true); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar caption
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Caption Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Caption</DialogTitle>
          </DialogHeader>
          <Textarea
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="Escribe un caption..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCaption} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El post será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive hover:bg-destructive/90">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
