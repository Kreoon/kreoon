import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { AlertTriangle, FileQuestion } from "lucide-react";
import { StatusPageLayout } from "@/components/status/StatusPageLayout";
import { StatusCard } from "@/components/status/StatusCard";
import { KreoonButton } from "@/components/ui/kreoon";

const isDev = import.meta.env.DEV;

/**
 * Pantalla "Página no encontrada" para errores 404 en rutas.
 */
function NotFoundErrorView() {
  const navigate = useNavigate();

  return (
    <StatusPageLayout
      variant="info"
      icon={<FileQuestion className="h-12 w-12" />}
      title="Página no encontrada"
      subtitle="La ruta que buscas no existe o no está disponible"
      backgroundOrbs
    >
      <StatusCard variant="glass" className="mb-6">
        <p className="text-sm text-kreoon-text-secondary">
          Revisa la URL o usa los botones para volver a una sección válida.
        </p>
      </StatusCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <KreoonButton
          type="button"
          variant="primary"
          size="md"
          onClick={() => navigate("/")}
        >
          Ir al inicio
        </KreoonButton>
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate(-1)}
        >
          Volver atrás
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}

/**
 * Pantalla de error genérico para rutas (errores de loader/action/render).
 */
function GenericRouteErrorView({
  status,
  statusText,
  message,
  data,
}: {
  status?: number;
  statusText?: string;
  message?: string;
  data?: unknown;
}) {
  const navigate = useNavigate();
  const displayMessage =
    message ??
    (typeof data === "object" && data !== null && "message" in data &&
    typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : statusText ?? "Ha ocurrido un error inesperado");

  const reportHref = `mailto:soporte@kreoon.com?subject=${encodeURIComponent(
    "Error en ruta - Kreoon"
  )}&body=${encodeURIComponent(
    `Status: ${status ?? "N/A"}\nMensaje: ${displayMessage}`
  )}`;

  return (
    <StatusPageLayout
      variant="error"
      icon={<AlertTriangle className="h-12 w-12" />}
      title="Algo salió mal"
      subtitle={displayMessage}
      backgroundOrbs
    >
      {isDev && status != null && (
        <StatusCard variant="glass" className="mb-6">
          <p className="text-sm text-kreoon-text-secondary">
            Código: {status} {statusText ?? ""}
          </p>
        </StatusCard>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <KreoonButton
          type="button"
          variant="primary"
          size="md"
          onClick={() => navigate("/")}
        >
          Ir al inicio
        </KreoonButton>
        <KreoonButton
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate(-1)}
        >
          Volver atrás
        </KreoonButton>
        <KreoonButton type="button" variant="secondary" size="md" asChild>
          <a href={reportHref} target="_blank" rel="noopener noreferrer">
            Reportar problema
          </a>
        </KreoonButton>
      </div>
    </StatusPageLayout>
  );
}

/**
 * Error boundary para usar con errorElement de React Router.
 * Distingue 404 (página no encontrada) de otros errores.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundErrorView />;
    }
    return (
      <GenericRouteErrorView
        status={error.status}
        statusText={error.statusText}
        data={error.data}
      />
    );
  }

  const err = error instanceof Error ? error : new Error(String(error));
  return (
    <GenericRouteErrorView
      message={err.message}
      status={undefined}
      statusText={undefined}
      data={isDev ? { stack: err.stack } : undefined}
    />
  );
}
