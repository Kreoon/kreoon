import { useState } from 'react';
import {
  Building2, Phone, Mail, MapPin, Crown, Shield, Eye,
  Unlink, Link as LinkIcon, Users, MessageCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DetailPanelShell } from '@/components/crm/DetailPanelShell';
import { DetailSection } from '@/components/crm/DetailSection';
import { CopyButton } from '@/components/crm/CopyButton';
import type { ClientUser } from '@/types/unifiedClient.types';

const ROLE_ICON: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  viewer: Eye,
};

const ROLE_LABEL: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  viewer: 'Visor',
};

interface ClientUserDetailPanelProps {
  user: ClientUser;
  organizationId: string;
  allCompanies: Array<{ id: string; name: string }>;
  onClose: () => void;
  onUpdate: () => void;
}

export function ClientUserDetailPanel({
  user, organizationId, allCompanies, onClose, onUpdate,
}: ClientUserDetailPanelProps) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);

  const linkedIds = new Set(user.linked_companies.map(c => c.client_id));
  const availableCompanies = allCompanies.filter(c => !linkedIds.has(c.id));

  const handleUnlink = async (clientId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('client_id', clientId)
        .eq('user_id', user.user_id);
      if (error) throw error;
      toast.success('Usuario desvinculado de la empresa');
      onUpdate();
    } catch (err: any) {
      toast.error('Error al desvincular: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (clientId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .insert({ client_id: clientId, user_id: user.user_id, role: 'viewer' });
      if (error) {
        if (error.code === '23505') {
          toast.info('El usuario ya está vinculado a esta empresa');
        } else {
          throw error;
        }
      } else {
        toast.success('Usuario vinculado a la empresa');
      }
      onUpdate();
    } catch (err: any) {
      toast.error('Error al vincular: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Avatar
  const avatarEl = user.avatar_url ? (
    <img src={user.avatar_url} alt={user.full_name} className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
  ) : (
    <div className="h-11 w-11 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-border">
      <Users className="h-5 w-5 text-emerald-400" />
    </div>
  );

  return (
    <DetailPanelShell
      onClose={onClose}
      avatar={avatarEl}
      name={user.full_name}
      subtitle={user.email}
      badges={
        <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Usuario Cliente
        </Badge>
      }
    >
      {/* Contact Info */}
      <DetailSection title="Contacto">
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
              <span className="text-xs text-white/70 truncate">{user.email}</span>
            </div>
            <CopyButton text={user.email} />
          </div>
          {user.phone && (
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                <span className="text-xs text-white/70">{user.phone}</span>
              </div>
              <div className="flex items-center gap-1">
                <CopyButton text={user.phone} />
                <a
                  href={`https://wa.me/${user.phone.replace(/[^0-9+]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-green-400"
                  onClick={e => e.stopPropagation()}
                >
                  <MessageCircle className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
          {user.city && (
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/5">
              <MapPin className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
              <span className="text-xs text-white/70">{user.city}</span>
            </div>
          )}
        </div>
      </DetailSection>

      {/* Linked Companies */}
      <DetailSection
        title="Empresas vinculadas"
        action={
          <Badge variant="outline" className="text-[10px] h-5 bg-white/5 text-white/50 border-white/10">
            {user.linked_companies.length}
          </Badge>
        }
      >
        {user.linked_companies.length > 0 ? (
          <div className="space-y-1.5">
            {user.linked_companies.map(company => {
              const RoleIcon = ROLE_ICON[company.role] || Eye;
              return (
                <div
                  key={company.client_id}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-white/80 font-medium truncate">{company.client_name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <RoleIcon className="h-3 w-3 text-white/30" />
                      <span className="text-[10px] text-white/40">{ROLE_LABEL[company.role] || company.role}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/30 hover:text-red-400 hover:bg-red-500/10"
                          disabled={loading}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desvincular usuario</AlertDialogTitle>
                          <AlertDialogDescription>
                            {user.full_name} será desvinculado de {company.client_name}. Podrás volver a vincularlo después.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleUnlink(company.client_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Desvincular
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-amber-400/70 px-2 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
            Sin empresas vinculadas
          </p>
        )}
      </DetailSection>

      {/* Link to Company */}
      {isAdmin && availableCompanies.length > 0 && (
        <DetailSection title="Vincular empresa">
          <div className="space-y-1">
            {availableCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => handleLink(company.id)}
                disabled={loading}
                className="w-full flex items-center gap-2 py-2 px-2.5 rounded-lg border border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors text-left disabled:opacity-50"
              >
                <LinkIcon className="h-3.5 w-3.5 text-white/30" />
                <span className="text-xs text-white/60">{company.name}</span>
              </button>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Details */}
      <DetailSection title="Detalles">
        <div className="grid grid-cols-2 gap-2">
          <div className="py-1.5 px-2 rounded-lg bg-white/5">
            <p className="text-[10px] text-white/30 uppercase">Registrado</p>
            <p className="text-xs text-white/70 mt-0.5">
              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
          <div className="py-1.5 px-2 rounded-lg bg-white/5">
            <p className="text-[10px] text-white/30 uppercase">Empresas</p>
            <p className="text-xs text-white/70 mt-0.5">{user.linked_companies.length}</p>
          </div>
        </div>
        {user.bio && (
          <div className="py-1.5 px-2 rounded-lg bg-white/5 mt-2">
            <p className="text-[10px] text-white/30 uppercase">Bio</p>
            <p className="text-xs text-white/70 mt-0.5 line-clamp-3">{user.bio}</p>
          </div>
        )}
      </DetailSection>
    </DetailPanelShell>
  );
}
