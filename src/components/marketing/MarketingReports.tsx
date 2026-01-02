import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileBarChart, Calendar, Eye, Download, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MarketingReport } from "./types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MarketingReportsProps {
  organizationId: string | null | undefined;
}

export function MarketingReports({ organizationId }: MarketingReportsProps) {
  const [reports, setReports] = useState<MarketingReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchReports();
    }
  }, [organizationId]);

  const fetchReports = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('marketing_reports')
        .select(`
          *,
          marketing_client:marketing_clients(
            id,
            client:clients(id, name, logo_url)
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports((data || []).map(item => ({
        ...item,
        metrics: item.metrics || {},
        platforms_data: item.platforms_data || {},
        campaign_ids: item.campaign_ids || [],
      })) as unknown as MarketingReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensual';
      case 'campaign':
        return 'Campaña';
      case 'custom':
        return 'Personalizado';
      default:
        return type;
    }
  };

  if (loading) {
    return (
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Reporte
        </Button>
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
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer reporte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
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
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Reporte
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">
                    {getReportTypeLabel(report.report_type)}
                  </Badge>
                  <Badge variant={report.status === 'published' ? 'default' : 'secondary'}>
                    {report.status === 'published' ? 'Publicado' : 'Borrador'}
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
                    {report.metrics.impressions && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs">Impresiones</div>
                        <div className="font-semibold">{report.metrics.impressions.toLocaleString()}</div>
                      </div>
                    )}
                    {report.metrics.clicks && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs">Clicks</div>
                        <div className="font-semibold">{report.metrics.clicks.toLocaleString()}</div>
                      </div>
                    )}
                    {report.metrics.conversions && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs">Conversiones</div>
                        <div className="font-semibold">{report.metrics.conversions.toLocaleString()}</div>
                      </div>
                    )}
                    {report.metrics.spend && (
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground text-xs">Inversión</div>
                        <div className="font-semibold">${report.metrics.spend.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendations preview */}
                {report.recommendations && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {report.recommendations}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
