import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateTalentListDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

export function CreateTalentListDialog({ open, onClose, organizationId }: CreateTalentListDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizationId || !user) return;

    setSaving(true);
    const { error } = await (supabase as any)
      .from('org_talent_lists')
      .insert({
        organization_id: organizationId,
        name: name.trim(),
        description: description.trim() || null,
        color,
        created_by: user.id,
      });

    setSaving(false);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['talent-lists'] });
      setName('');
      setDescription('');
      setColor(COLORS[0]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear lista de talento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              required
              placeholder="Ej: Creadores UGC favoritos"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Describe esta lista..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={saving || !name.trim()} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear Lista
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
