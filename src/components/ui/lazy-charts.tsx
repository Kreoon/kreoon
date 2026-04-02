import React, { Suspense } from 'react';
import { cn } from '@/lib/utils';

// Skeleton component for chart loading state
interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export const ChartSkeleton = ({ height = 300, className }: ChartSkeletonProps) => (
  <div
    className={cn(
      "animate-pulse bg-muted/50 rounded-lg flex items-center justify-center",
      className
    )}
    style={{ height }}
  >
    <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <span className="text-xs">Cargando grafico...</span>
    </div>
  </div>
);

// Lazy load individual Recharts components
// These create separate chunks that only load when needed

export const LazyLineChart = React.lazy(() =>
  import('recharts').then(m => ({ default: m.LineChart }))
);

export const LazyBarChart = React.lazy(() =>
  import('recharts').then(m => ({ default: m.BarChart }))
);

export const LazyPieChart = React.lazy(() =>
  import('recharts').then(m => ({ default: m.PieChart }))
);

export const LazyAreaChart = React.lazy(() =>
  import('recharts').then(m => ({ default: m.AreaChart }))
);

export const LazyRadarChart = React.lazy(() =>
  import('recharts').then(m => ({ default: m.RadarChart }))
);

export const LazyComposedChart = React.lazy(() =>
  import('recharts').then(m => ({ default: m.ComposedChart }))
);

// Re-export commonly used non-chart components (these are lighter weight)
// We export them from a central place so components can import from here
export {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  Area,
  Pie,
  Cell,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  Treemap,
  Funnel,
  FunnelChart,
  Scatter,
  ScatterChart,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  ErrorBar,
  LabelList,
} from 'recharts';

// Wrapper with Suspense for easy usage
interface LazyChartContainerProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export const LazyChartContainer = ({
  children,
  height = 300,
  className,
  fallback,
}: LazyChartContainerProps) => (
  <Suspense fallback={fallback || <ChartSkeleton height={height} className={className} />}>
    {children}
  </Suspense>
);

// Higher-order component to wrap any chart component with lazy loading
export function withLazyChart<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  height?: number
) {
  const LazyWrapper = (props: P) => (
    <LazyChartContainer height={height}>
      <WrappedComponent {...props} />
    </LazyChartContainer>
  );
  LazyWrapper.displayName = `LazyChart(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return LazyWrapper;
}
