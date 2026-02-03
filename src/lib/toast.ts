import { toast } from "sonner";

const DEFAULT_DURATION = 4000;

/**
 * Helpers para mostrar toasts con estilo Kreoon.
 * Requiere <KreoonToastProvider /> en el árbol de la app.
 */
export const kreoonToast = {
  success: (title: string, description?: string) =>
    toast.success(title, { description, duration: DEFAULT_DURATION }),

  error: (title: string, description?: string) =>
    toast.error(title, { description, duration: DEFAULT_DURATION }),

  warning: (title: string, description?: string) =>
    toast.warning(title, { description, duration: DEFAULT_DURATION }),

  info: (title: string, description?: string) =>
    toast.info(title, { description, duration: DEFAULT_DURATION }),

  loading: (title: string) =>
    toast.loading(title, { duration: Number.POSITIVE_INFINITY }),

  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) =>
    toast.promise(promise, {
      ...messages,
      duration: DEFAULT_DURATION,
    }),

  dismiss: (id?: string | number) => toast.dismiss(id),
};
