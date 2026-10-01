import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";

/**
 * Aviso de una sola vez al estrenar el editor V2 como editor por defecto.
 * Se recuerda por usuario (clave con user id). El enlace «Usar el editor anterior» abre V1 (?v=1),
 * disponible como respaldo hasta retirar V1 (paso 2 de D3, docs/movil/plan-implementacion.md).
 */
const storageKey = (userId: string) => `kreoon:profile-builder-v2-notice:${userId}`;

function wasDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

interface NewEditorNoticeProps {
  userId?: string;
}

export function NewEditorNotice({ userId }: NewEditorNoticeProps) {
  const [visible, setVisible] = useState(() => (userId ? !wasDismissed(userId) : false));

  if (!userId || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey(userId), "1");
    } catch {
      // Sin almacenamiento (modo privado): el aviso solo se oculta en esta visita
    }
  };

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 border-b border-primary/20 bg-primary/10 px-3 py-2 text-xs sm:px-4 sm:text-sm"
    >
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1">
        Renovamos el editor. Tus cambios se guardan solos.{" "}
        <Link to="/profile-builder?v=1" className="font-medium text-primary underline hover:no-underline">
          Usar el editor anterior
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
