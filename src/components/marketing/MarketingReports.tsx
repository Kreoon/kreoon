import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, 
  Calendar, 
  Eye, 
  Download, 
  MoreHorizontal, 
  Send,
  Trash2,
  CheckCircle,
  TrendingUp,
  Users,
  MousePointerClick,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { MarketingReport } from "./types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AddReportDialog } from "./AddReportDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MarketingReportsProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

export function MarketingReports({ organizationId, selectedClientId }: MarketingReportsProps) {
  const [reports, setReports] = useState<MarketingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<MarketingReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchReports();
    }
  }, [organizationId, selectedClientId]);

  const fetchReports = async () => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from('marketing_reports')
        .select(`
          *,
          marketing_client:marketing_clients(
            id,
            client:clients(id, name, logo_url)
          )
        `)
        .eq('organization_id', organizationId);
      
      if (selectedClientId) {
        query = query.eq('marketing_client.client_id', selectedClientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports((data || []).map(item => ({
        ...item,
        metrics: item.metrics || {},
        platforms_data: item.platforms_data || {},
        campaign_ids: item.campaign_ids || [],
        highlights: item.highlights || [],
      })) as unknown as MarketingReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      campaign: 'Campaña',
      custom: 'Personalizado',
    };
    return types[type] || type;
  };

  const updateStatus = async (reportId: string, status: string) => {
    try {
      const updates: Record<string, any> = { status };
      if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('marketing_reports')
        .update(updates)
        .eq('id', reportId);

      if (error) throw error;
      toast.success(status === 'published' ? 'Reporte publicado' : 'Estado actualizado');
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Error al actualizar');
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm('¿Eliminar este reporte?')) return;

    try {
      const { error } = await supabase
        .from('marketing_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      toast.success('Reporte eliminado');
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Error al eliminar');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      maximumFractionDigits: 0 
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reportes</h2>
          <p className="text-sm text-muted-foreground">
            {reports.length} reportes generados
          </p>
        </div>
        <AddReportDialog organizationId={organizationId} onSuccess={fetchReports} />
      </div>

      {/* Reports Grid */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Sin reportes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Genera reportes para analizar el rendimiento de tus campañas
            </p>
            <AddReportDialog organizationId={organizationId} onSuccess={fetchReports} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-1">{report.title}</CardTitle>
                    <CardDescription>
                      {(report.marketing_client as any)?.client?.name || 'Cliente'}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedReport(report);
                        setShowPreview(true);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Reporte
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </DropdownMenuItem>
                      {report.status === 'draft' && (
                        <DropdownMenuItem onClick={() => updateStatus(report.id, 'published')}>
                          <Send className="h-4 w-4 mr-2" />
                          Publicar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteReport(report.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">
                    {getReportTypeLabel(report.report_type)}
                  </Badge>
                  <Badge variant={report.status === 'published' ? 'default' : 'secondary'}>
                    {report.status === 'published' ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Publicado</>
                    ) : 'Borrador'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Period */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(report.period_start), "d MMM", { locale: es })} - {format(new Date(report.period_end), "d MMM yyyy", { locale: es })}
                  </span>
                </div>

                {/* Quick Metrics */}
                {report.metrics && Object.keys(report.metrics).length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {report.metrics.impressions !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Impresiones
                        </div>
                        <div className="font-semibold">{report.metrics.impressions.toLocaleString()}</div>
                      </div>
                    )}
                    {report.metrics.clicks !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" /> Clicks
                        </div>
                        <div className="font-semibold">{report.metrics.clicks.toLocaleString()}</div>
                      </div>
                    )}
                    {report.metrics.leads !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <Users className="h-3 w-3" /> Leads
                        </div>
                        <div className="font-semibold">{report.metrics.leads.toLocaleString()}</div>
                      </div>
                    )}
                    {report.metrics.spend !== undefined && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Inversión
                        </div>
                        <div className="font-semibold">{formatCurrency(report.metrics.spend)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* View Button */}
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => {
                    setSelectedReport(report);
                    setShowPreview(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              {selectedReport?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                {/* Header Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{(selectedReport.marketing_client as any)?.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Periodo</p>
                    <p className="font-medium">
                      {format(new Date(selectedReport.period_start), "d MMM", { locale: es })} - {format(new Date(selectedReport.period_end), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Metrics Grid */}
                <div>
                  <h4 className="font-semibold mb-3">Métricas del Periodo</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <TrendingUp className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="text-2xl font-bold">{selectedReport.metrics?.impressions?.toLocaleString() || 0}</p>
                        <p className="text-sm text-muted-foreground">Impresiones</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <MousePointerClick className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                        <p className="text-2xl font-bold">{selectedReport.metrics?.clicks?.toLocaleString() || 0}</p>
                        <p className="text-sm text-muted-foreground">Clicks</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <Users className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="text-2xl font-bold">{selectedReport.metrics?.leads?.toLocaleString() || 0}</p>
                        <p className="text-sm text-muted-foreground">Leads</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <DollarSign className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                        <p className="text-2xl font-bold">{formatCurrency(selectedReport.metrics?.spend || 0)}</p>
                        <p className="text-sm text-muted-foreground">Inversión</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Highlights */}
                {selectedReport.highlights && (selectedReport.highlights as string[]).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Highlights</h4>
                    <ul className="space-y-2">
                      {(selectedReport.highlights as string[]).map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {selectedReport.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-3">Recomendaciones</h4>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-sm whitespace-pre-wrap">{selectedReport.recommendations}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                  {selectedReport.status === 'draft' && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        updateStatus(selectedReport.id, 'published');
                        setShowPreview(false);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Publicar
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
