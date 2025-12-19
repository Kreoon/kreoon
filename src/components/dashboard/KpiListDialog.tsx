import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, User, Mail, Phone, DollarSign, Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Client, Profile, ClientPackage, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from "@/types/database";

type ListType = 'clients' | 'creators' | 'editors' | 'packages-sold' | 'packages-paid' | 'packages-pending';

interface KpiListDialogProps {
  title: string;
  type: ListType;
  clients?: Client[];
  profiles?: (Profile & { content_count?: number; total_payment?: number })[];
  packages?: (ClientPackage & { client?: Client })[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient?: (client: Client) => void;
}

export function KpiListDialog({
  title,
  type,
  clients = [],
  profiles = [],
  packages = [],
  open,
  onOpenChange,
  onSelectClient
}: KpiListDialogProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "Sin fecha";
    return format(new Date(date), "d MMM yyyy", { locale: es });
  };

  const getItemCount = () => {
    if (type === 'clients') return clients.length;
    if (type === 'creators' || type === 'editors') return profiles.length;
    return packages.length;
  };

  const getItemLabel = () => {
    if (type === 'clients') return 'clientes';
    if (type === 'creators') return 'creadores';
    if (type === 'editors') return 'editores';
    return 'paquetes';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary">{getItemCount()} {getItemLabel()}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {getItemCount() === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No hay datos en esta categoría
            </div>
          ) : (
            <div className="space-y-3">
              {/* Clients List */}
              {type === 'clients' && clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => onSelectClient?.(client)}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={client.logo_url || undefined} />
                      <AvatarFallback>
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{client.name}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {client.contact_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{client.contact_email}</span>
                          </div>
                        )}
                        {client.contact_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{client.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Creators/Editors List */}
              {(type === 'creators' || type === 'editors') && profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{profile.full_name}</h4>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </div>
                    <div className="text-right">
                      {profile.content_count !== undefined && (
                        <p className="text-sm font-medium">{profile.content_count} contenidos</p>
                      )}
                      {profile.total_payment !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          ${profile.total_payment.toLocaleString()} total
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Packages List */}
              {(type === 'packages-sold' || type === 'packages-paid' || type === 'packages-pending') && packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <h4 className="font-medium text-sm">{pkg.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pkg.client?.name || 'Sin cliente'}
                      </p>
                    </div>
                    <Badge className={PAYMENT_STATUS_COLORS[pkg.payment_status]}>
                      {PAYMENT_STATUS_LABELS[pkg.payment_status]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Total: ${pkg.total_value?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-success" />
                      <span>Pagado: ${pkg.paid_amount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-warning" />
                      <span>Pendiente: ${((pkg.total_value || 0) - (pkg.paid_amount || 0)).toLocaleString()}</span>
                    </div>
                    {pkg.created_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(pkg.created_at)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    {pkg.content_quantity} videos • {pkg.hooks_per_video || 1} hooks/video
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}