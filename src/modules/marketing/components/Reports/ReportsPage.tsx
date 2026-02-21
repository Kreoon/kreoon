import { useState } from 'react';
import {
  FileText, Download, Plus, Trash2, BarChart3, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAdReports } from '../../hooks/useAdReports';
import { DateRangePresetPicker } from '@/components/ui/date-range-preset-picker';
import { useDateRangePreset } from '@/hooks/useDateRangePreset';
import type { ReportConfig } from '../../types/marketing.types';
import { toast } from 'sonner';

export function ReportsPage() {
  const { reports, isLoading, generateReport, downloadReport, deleteReport } = useAdReports();
  const [showCreate, setShowCreate] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('campaign');
  const dateRange = useDateRangePreset({ defaultPreset: 'last_30' });

  const handleGenerate = async () => {
    if (!reportName.trim()) {
      toast.error('Ingresa un nombre para el reporte');
      return;
    }
    try {
      await generateReport.mutateAsync({
        name: reportName,
        report_type: reportType,
        config: { date_from: dateRange.fromDateStr, date_to: dateRange.toDateStr } as ReportConfig,
      });
      toast.success('Reporte generado');
      setShowCreate(false);
      setReportName('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDownload = async (reportId: string, format: 'csv' | 'pdf') => {
    try {
      const result = await downloadReport.mutateAsync({ reportId, format });
      const blob = new Blob([result.content], { type: result.content_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      await deleteReport.mutateAsync(reportId);
      toast.success('Reporte eliminado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const reportTypeLabels: Record<string, string> = {
    campaign: 'Campaña',
    comparison: 'Comparación',
    cross_platform: 'Multi-plataforma',
    content_performance: 'Rendimiento de contenido',
    custom: 'Personalizado',
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse bg-muted/20"><CardContent className="h-20" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Reportes</h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo reporte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generar reporte</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Nombre</Label>
                <Input value={reportName} onChange={e => setReportName(e.target.value)} placeholder="Reporte mensual..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tipo</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Rango de fechas</Label>
                <DateRangePresetPicker
                  value={dateRange.value}
                  onChange={dateRange.setValue}
                  align="start"
                  presets={['last_7', 'last_15', 'last_30', 'last_90', 'this_month', 'last_month', 'custom']}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generateReport.isPending} className="w-full">
                {generateReport.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                Generar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reports.length === 0 ? (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <FileText className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No hay reportes generados aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map(report => (
            <Card key={report.id} className="bg-card/50">
              <CardContent className="flex items-center gap-4 py-3">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{report.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[9px]">
                      {reportTypeLabels[report.report_type] || report.report_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                    {report.last_generated_at && (
                      <span className="text-[10px] text-muted-foreground">
                        Generado: {new Date(report.last_generated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleDownload(report.id, 'csv')}
                    title="Descargar CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400"
                    onClick={() => handleDelete(report.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
