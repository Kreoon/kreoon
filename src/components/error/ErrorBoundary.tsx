import * as React from "react";
import { AlertTriangle, Home, RefreshCw, Mail } from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";

const isDev = import.meta.env.DEV;

export interface ErrorFallbackProps {
  error?: Error | null;
  resetErrorBoundary?: () => void;
}

/**
 * UI por defecto cuando ErrorBoundary captura un error.
 * Usa window.location en vez de useNavigate porque ErrorBoundary puede estar fuera de Router.
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  const goHome = () => {
    window.location.href = "/";
  };

  const reportHref = React.useMemo(() => {
    const subject = encodeURIComponent("Reporte de error - Kreoon");
    const body = error
      ? encodeURIComponent(
          `Error: ${error.message}\n\nStack:\n${error.stack ?? "N/A"}`
        )
      : "";
    return `mailto:soporte@kreoon.com?subject=${subject}&body=${body}`;
  }, [error]);

  return (
    <StatusPageLayout
      variant="error"
      icon={<AlertTriangle className="h-12 w-12" />}
      title="Algo salió mal"
      subtitle="Ha ocurrido un error inesperado"
      backgroundOrbs
    >
      <StatusCard variant="glass" className="mb-6">
        <div className="space-y-4">
          {error && (
            <div>
              <p className="mb-1 font-medium text-kreoon-text-primary">
                Mensaje de error
              </p>
              <p className="text-sm text-kreoon-text-secondary">
                {error.message}
              </p>
              {isDev && error.stack && (
                <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-kreoon-border bg-kreoon-bg-secondary p-3 text-xs text-kreoon-text-muted">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
          <ul className="list-inside list-disc space-y-1 text-sm text-kreoon-text-secondary">
            <li>Intenta recargar la página</li>
            <li>Si el problema persiste, contacta soporte</li>
          </ul>
        </div>
      </StatusCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
        {resetErrorBoundary && (
          <KreoonButton
            type="button"
            variant="primary"
            size="md"
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </KreoonButton>
        )}
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          onClick={goHome}
          className="inline-flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </KreoonButton>
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          asChild
          className="inline-flex items-center gap-2"
        >
          <a href={reportHref} target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" />
            Reportar problema
          </a>
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary en clase para capturar errores y mostrar UI amigable.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    if (typeof window !== "undefined" && window.__KREOON_ERROR_SERVICE__) {
      (window as unknown as { __KREOON_ERROR_SERVICE__: (err: Error, info: React.ErrorInfo) => void })
        .__KREOON_ERROR_SERVICE__(error, errorInfo);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }
    return this.props.children;
  }
}
