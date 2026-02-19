import { useState } from "react";
import { Send, Calendar, MoreHorizontal, Trash2, XCircle, Eye, Plus, Search, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmailCampaigns, useCancelCampaign, computeCampaignAnalytics } from "@/hooks/useEmailMarketing";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_COLORS,
  type EmailCampaignStatus,
  type EmailCampaign,
} from "@/types/email-marketing.types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface CampaignListProps {
  onEdit: (campaign: EmailCampaign) => void;
  onCreate: () => void;
  onDetail: (campaign: EmailCampaign) => void;
}

export function CampaignList({ onEdit, onCreate, onDetail }: CampaignListProps) {
  const [statusFilter, setStatusFilter] = useState<EmailCampaignStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data: campaigns = [], isLoading } = useEmailCampaigns({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const cancelMutation = useCancelCampaign();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campañas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Campaña
        </Button>
      </div>

      {/* Campaign Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando campañas...</div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No hay campañas aún</p>
          <Button onClick={onCreate} variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Crear primera campaña
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((campaign) => {
            const analytics = computeCampaignAnalytics(campaign);
            return (
              <Card
                key={campaign.id}
                className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => onDetail(campaign)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{campaign.name}</h3>
                      <Badge variant="outline" className={CAMPAIGN_STATUS_COLORS[campaign.status]}>
                        {CAMPAIGN_STATUS_LABELS[campaign.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{campaign.subject}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {campaign.email_segments && (
                        <span>Segmento: {(campaign.email_segments as any).name}</span>
                      )}
                      {campaign.sent_at && (
                        <span>Enviada {formatDistanceToNow(new Date(campaign.sent_at), { addSuffix: true, locale: es })}</span>
                      )}
                      {campaign.scheduled_at && campaign.status === "scheduled" && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Programada: {new Date(campaign.scheduled_at).toLocaleDateString("es")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics (only for sent campaigns) */}
                  {campaign.status === "sent" && campaign.total_sent > 0 && (
                    <div className="flex items-center gap-4 text-xs mr-4">
                      <div className="text-center">
                        <div className="font-semibold text-green-400">{(analytics.open_rate * 100).toFixed(1)}%</div>
                        <div className="text-muted-foreground">Apertura</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-400">{(analytics.click_rate * 100).toFixed(1)}%</div>
                        <div className="text-muted-foreground">Clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-slate-400">{campaign.total_sent}</div>
                        <div className="text-muted-foreground">Enviados</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDetail(campaign); }}>
                        <Eye className="h-4 w-4 mr-2" /> Ver detalle
                      </DropdownMenuItem>
                      {campaign.status === "draft" && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(campaign); }}>
                          <Send className="h-4 w-4 mr-2" /> Editar y enviar
                        </DropdownMenuItem>
                      )}
                      {campaign.status === "scheduled" && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelMutation.mutate(campaign.id);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Cancelar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
