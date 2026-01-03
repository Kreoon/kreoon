import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from "recharts";

interface ClientPackage {
  id: string;
  name: string;
  content_quantity: number;
  total_value: number;
  paid_amount: number;
  payment_status: string;
  is_active: boolean;
  created_at: string;
}

interface ContentItem {
  id: string;
  status: string;
  created_at: string | null;
  approved_at?: string | null;
  views_count?: number;
  likes_count?: number;
}

interface ClientFinanceChartProps {
  packages: ClientPackage[];
  content: ContentItem[];
  chartType: 'investment' | 'content-status' | 'engagement';
  title: string;
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const STATUS_CATEGORIES = {
  pending: { label: 'Pendiente', color: 'hsl(var(--warning))' },
  inProgress: { label: 'En Proceso', color: 'hsl(var(--info))' },
  review: { label: 'Revisión', color: 'hsl(var(--primary))' },
  completed: { label: 'Completado', color: 'hsl(var(--success))' }
};

export function ClientFinanceChart({ packages, content, chartType, title }: ClientFinanceChartProps) {
  const investmentData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyData: { [key: number]: { invested: number; pending: number } } = {};
    
    packages.forEach(pkg => {
      const date = new Date(pkg.created_at);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth() + 1;
        if (!monthlyData[month]) {
          monthlyData[month] = { invested: 0, pending: 0 };
        }
        monthlyData[month].invested += Number(pkg.paid_amount) || 0;
        monthlyData[month].pending += (Number(pkg.total_value) || 0) - (Number(pkg.paid_amount) || 0);
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      name: MONTHS_SHORT[parseInt(month) - 1],
      pagado: data.invested,
      pendiente: data.pending
    }));
  }, [packages]);

  const contentStatusData = useMemo(() => {
    const pending = content.filter(c => ['draft', 'script_pending', 'assigned'].includes(c.status)).length;
    const inProgress = content.filter(c => ['script_approved', 'recording', 'editing'].includes(c.status)).length;
    const review = content.filter(c => c.status === 'review').length;
    const completed = content.filter(c => ['approved', 'paid', 'delivered', 'corrected'].includes(c.status)).length;

    return [
      { name: 'Pendiente', value: pending, fill: STATUS_CATEGORIES.pending.color },
      { name: 'En Proceso', value: inProgress, fill: STATUS_CATEGORIES.inProgress.color },
      { name: 'Revisión', value: review, fill: STATUS_CATEGORIES.review.color },
      { name: 'Completado', value: completed, fill: STATUS_CATEGORIES.completed.color }
    ].filter(item => item.value > 0);
  }, [content]);

  const engagementData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyData: { [key: number]: { views: number; likes: number; count: number } } = {};
    
    content.forEach(item => {
      if (item.approved_at) {
        const date = new Date(item.approved_at);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth() + 1;
          if (!monthlyData[month]) {
            monthlyData[month] = { views: 0, likes: 0, count: 0 };
          }
          monthlyData[month].views += item.views_count || 0;
          monthlyData[month].likes += item.likes_count || 0;
          monthlyData[month].count += 1;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      name: MONTHS_SHORT[parseInt(month) - 1],
      vistas: data.views,
      likes: data.likes,
      videos: data.count
    }));
  }, [content]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-muted-foreground">
                {entry.name}: <span className="font-medium" style={{ color: entry.color }}>
                  {chartType === 'investment' ? `$${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
                </span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartType === 'investment') {
    if (investmentData.length === 0) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No hay datos de inversión disponibles
        </div>
      );
    }

    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={investmentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="pagado" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pendiente" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'content-status') {
    if (contentStatusData.length === 0) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No hay contenido para mostrar
        </div>
      );
    }

    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={contentStatusData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {contentStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'engagement') {
    if (engagementData.length === 0) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No hay datos de engagement disponibles
        </div>
      );
    }

    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={engagementData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="vistas" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="likes" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
