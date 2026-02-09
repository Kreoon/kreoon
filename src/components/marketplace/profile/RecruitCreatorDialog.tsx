import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendRecruitment } from '@/hooks/useMarketplaceOrgInvitations';

interface RecruitCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorUserId: string;
  creatorName: string;
}

const ROLE_OPTIONS = [
  { value: 'creator', label: 'Creador de Contenido' },
  { value: 'editor', label: 'Productor Audio-Visual' },
  { value: 'strategist', label: 'Estratega' },
  { value: 'trafficker', label: 'Trafficker' },
];

export function RecruitCreatorDialog({
  open,
  onOpenChange,
  creatorUserId,
  creatorName,
}: RecruitCreatorDialogProps) {
  const [role, setRole] = useState('creator');
  const [message, setMessage] = useState('');
  const sendMutation = useSendRecruitment();

  const handleSend = async () => {
    await sendMutation.mutateAsync({
      creator_user_id: creatorUserId,
      proposed_role: role,
      message: message.trim() || undefined,
    });
    setMessage('');
    setRole('creator');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-purple-400" />
            Reclutar a {creatorName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Envía una invitación para que se una a tu organización.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Rol propuesto</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                {ROLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Mensaje <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Cuéntale por qué te gustaría que se una a tu equipo..."
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none h-24"
            />
            <p className="text-xs text-gray-500 text-right">{message.length}/500</p>
          </div>

          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Enviar Invitación
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
