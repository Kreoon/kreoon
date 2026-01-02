import { MarketingReport } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReportPdfData {
  report: MarketingReport;
  clientName: string;
}

export function generateReportPdf({ report, clientName }: ReportPdfData) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const periodStart = format(new Date(report.period_start), "d 'de' MMMM", { locale: es });
  const periodEnd = format(new Date(report.period_end), "d 'de' MMMM yyyy", { locale: es });

  // Create HTML content for the PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${report.title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #1a1a1a; 
          line-height: 1.6;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { 
          border-bottom: 3px solid #3b82f6; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 { 
          font-size: 28px; 
          color: #1e40af; 
          margin-bottom: 8px;
        }
        .header .subtitle { 
          color: #6b7280; 
          font-size: 14px;
        }
        .meta-info {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .meta-info .item { text-align: center; }
        .meta-info .label { font-size: 12px; color: #6b7280; }
        .meta-info .value { font-weight: 600; color: #1e293b; }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }
        .metric-card:nth-child(2) { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .metric-card:nth-child(3) { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .metric-card:nth-child(4) { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .metric-card .value { font-size: 24px; font-weight: 700; }
        .metric-card .label { font-size: 12px; opacity: 0.9; }

        .section { margin-bottom: 30px; }
        .section h2 { 
          font-size: 18px; 
          color: #1e293b; 
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .highlights-list { list-style: none; }
        .highlights-list li {
          padding: 12px 16px;
          background: #f0fdf4;
          border-left: 4px solid #10b981;
          margin-bottom: 8px;
          border-radius: 0 8px 8px 0;
        }
        
        .recommendations {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          border-radius: 0 8px 8px 0;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #9ca3af;
          font-size: 12px;
        }

        @media print {
          body { padding: 20px; }
          .metric-card { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${report.title}</h1>
        <p class="subtitle">Reporte de Marketing Digital</p>
      </div>

      <div class="meta-info">
        <div class="item">
          <div class="label">Cliente</div>
          <div class="value">${clientName}</div>
        </div>
        <div class="item">
          <div class="label">Periodo</div>
          <div class="value">${periodStart} - ${periodEnd}</div>
        </div>
        <div class="item">
          <div class="label">Tipo</div>
          <div class="value">${report.report_type === 'monthly' ? 'Mensual' : report.report_type === 'weekly' ? 'Semanal' : report.report_type}</div>
        </div>
      </div>

      <div class="section">
        <h2>📊 Métricas Principales</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="value">${(report.metrics?.impressions || 0).toLocaleString()}</div>
            <div class="label">Impresiones</div>
          </div>
          <div class="metric-card">
            <div class="value">${(report.metrics?.clicks || 0).toLocaleString()}</div>
            <div class="label">Clicks</div>
          </div>
          <div class="metric-card">
            <div class="value">${(report.metrics?.leads || 0).toLocaleString()}</div>
            <div class="label">Leads</div>
          </div>
          <div class="metric-card">
            <div class="value">${formatCurrency(report.metrics?.spend || 0)}</div>
            <div class="label">Inversión</div>
          </div>
        </div>
      </div>

      ${report.highlights && (report.highlights as string[]).length > 0 ? `
      <div class="section">
        <h2>✨ Highlights</h2>
        <ul class="highlights-list">
          ${(report.highlights as string[]).map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${report.recommendations ? `
      <div class="section">
        <h2>💡 Recomendaciones</h2>
        <div class="recommendations">
          ${report.recommendations}
        </div>
      </div>
      ` : ''}

      <div class="footer">
        Generado el ${format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing/saving as PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
